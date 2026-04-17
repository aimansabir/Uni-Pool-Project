import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ridesApi } from '../../api/rides.api';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import { validatePublishRideForm, hasErrors } from '../../utils/validators';
import { formatPKR, formatDistance, formatDuration } from '../../utils/formatters';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import './PublishRidePage.css';

export default function PublishRidePage() {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [intelligence, setIntelligence] = useState(null);

  const [form, setForm] = useState({
    vehicleId: '',
    startLocation: '',
    destinationLocation: '',
    rideType: 'SCHEDULED',
    departureTime: '',
    seatsTotal: 2,
    farePerSeat: '',
    genderPreference: 'ANY',
    confirmedStops: [],
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await vehiclesApi.list();
        const data = res.data || [];
        setVehicles(data);
        if (data.length === 1) {
          setForm((f) => ({ ...f, vehicleId: data[0].id }));
        }
      } catch (err) {
        showError('Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const handleSeatsChange = (delta) => {
    setForm((f) => ({
      ...f,
      seatsTotal: Math.max(1, Math.min(6, f.seatsTotal + delta)),
    }));
  };

  const handlePreview = async () => {
    if (!form.startLocation || !form.destinationLocation) {
      showError('Enter start and drop-off locations first');
      return;
    }

    setPreviewing(true);
    try {
      const res = await ridesApi.previewIntelligence({
        startLocation: form.startLocation,
        destinationLocation: form.destinationLocation,
        seatsTotal: form.seatsTotal,
        rideType: form.rideType,
        departureTime: form.rideType === 'SCHEDULED' ? form.departureTime : undefined,
      });
      setIntelligence(res.data);
      showInfo('Route intelligence loaded!');

      // Auto-set suggested fare
      if (res.data?.fareSuggestion?.suggestedFarePerSeat && !form.farePerSeat) {
        setForm((f) => ({
          ...f,
          farePerSeat: res.data.fareSuggestion.suggestedFarePerSeat,
        }));
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  const toggleStop = (landmark) => {
    setForm((f) => {
      const exists = f.confirmedStops.find((s) => s.stopName === landmark.stopName);
      if (exists) {
        return { ...f, confirmedStops: f.confirmedStops.filter((s) => s.stopName !== landmark.stopName) };
      }
      return {
        ...f,
        confirmedStops: [
          ...f.confirmedStops,
          { stopName: landmark.stopName, sequence: f.confirmedStops.length + 1, lat: landmark.lat, lng: landmark.lng },
        ],
      };
    });
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    const validationErrors = validatePublishRideForm(form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        ...form,
        seatsTotal: Number(form.seatsTotal),
        farePerSeat: Number(form.farePerSeat),
        departureTime: form.rideType === 'INSTANT'
          ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
          : new Date(form.departureTime).toISOString(),
      };

      const res = await ridesApi.publish(payload);
      showSuccess('Ride published successfully!');
      navigate(`/rides/${res.data.id}/confirmed`, { state: { ride: res.data } });
    } catch (err) {
      showError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <FullPageSpinner />;

  if (vehicles.length === 0) {
    return (
      <div className="publish-page fade-in">
        <div className="publish-page__no-vehicle">
          <span style={{ fontSize: 48 }}>🚗</span>
          <h3>No vehicle found</h3>
          <p>You need to register a vehicle before publishing a ride.</p>
          <Button variant="primary" onClick={() => navigate('/vehicles/new')}>
            Add Vehicle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="publish-page fade-in">
      <form className="publish-form" onSubmit={handlePublish}>
        {/* Vehicle selector */}
        <div className="publish-form__section">
          <label className="publish-form__label">Select Vehicle</label>
          <select
            name="vehicleId"
            value={form.vehicleId}
            onChange={handleChange}
            className="publish-form__select"
          >
            <option value="">Choose a car</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} — {v.registrationNumber}
              </option>
            ))}
          </select>
          {errors.vehicleId && <span className="publish-form__error">{errors.vehicleId}</span>}
        </div>

        {/* Locations */}
        <Input
          name="startLocation"
          label="Starting Location"
          placeholder="e.g. Maskan Gate"
          value={form.startLocation}
          onChange={handleChange}
          error={errors.startLocation}
          icon={<span style={{ color: 'var(--color-accent)' }}>●</span>}
        />

        <Input
          name="destinationLocation"
          label="Drop-off Location"
          placeholder="e.g. IBA City Campus"
          value={form.destinationLocation}
          onChange={handleChange}
          error={errors.destinationLocation}
          icon={<span style={{ color: 'var(--color-danger)' }}>●</span>}
        />

        {/* Route Preview Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePreview}
          loading={previewing}
        >
          🗺️ Preview Route
        </Button>

        {/* Intelligence Results */}
        {intelligence && (
          <div className="publish-form__intel slide-up">
            <div className="publish-form__intel-header">
              <span className="publish-form__intel-badge">Route Intelligence</span>
            </div>
            <div className="publish-form__intel-stats">
              <div className="publish-form__intel-stat">
                <span className="publish-form__intel-stat-label">Distance</span>
                <span className="publish-form__intel-stat-value">{formatDistance(intelligence.distanceKm)}</span>
              </div>
              <div className="publish-form__intel-stat">
                <span className="publish-form__intel-stat-label">Duration</span>
                <span className="publish-form__intel-stat-value">{formatDuration(intelligence.durationMin)}</span>
              </div>
              <div className="publish-form__intel-stat">
                <span className="publish-form__intel-stat-label">Suggested Fare</span>
                <span className="publish-form__intel-stat-value">{formatPKR(intelligence.fareSuggestion?.suggestedFarePerSeat)}</span>
              </div>
              <div className="publish-form__intel-stat">
                <span className="publish-form__intel-stat-label">Fare Cap</span>
                <span className="publish-form__intel-stat-value">{formatPKR(intelligence.fareSuggestion?.fareCap)}</span>
              </div>
            </div>

            {/* Suggested Stops */}
            {intelligence.suggestedLandmarks?.length > 0 && (
              <div className="publish-form__stops">
                <span className="publish-form__stops-title">Suggested Stops (tap to add)</span>
                <div className="publish-form__stops-list">
                  {intelligence.suggestedLandmarks.map((lm) => {
                    const isSelected = form.confirmedStops.some((s) => s.stopName === lm.stopName);
                    return (
                      <button
                        key={lm.stopName}
                        type="button"
                        className={`publish-form__stop-chip ${isSelected ? 'publish-form__stop-chip--selected' : ''}`}
                        onClick={() => toggleStop(lm)}
                      >
                        📍 {lm.stopName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ride Type Toggle */}
        <div className="publish-form__section">
          <label className="publish-form__label">Schedule</label>
          <div className="publish-form__toggle">
            <button
              type="button"
              className={`publish-form__toggle-btn ${form.rideType === 'SCHEDULED' ? 'publish-form__toggle-btn--active' : ''}`}
              onClick={() => setForm((f) => ({ ...f, rideType: 'SCHEDULED' }))}
            >
              🕐 Scheduled Ride
            </button>
            <button
              type="button"
              className={`publish-form__toggle-btn ${form.rideType === 'INSTANT' ? 'publish-form__toggle-btn--active publish-form__toggle-btn--instant' : ''}`}
              onClick={() => setForm((f) => ({ ...f, rideType: 'INSTANT' }))}
            >
              ⚡ Leaving Now!
            </button>
          </div>
        </div>

        {/* Departure Time — only for SCHEDULED */}
        {form.rideType === 'SCHEDULED' && (
          <Input
            name="departureTime"
            label="Departure Time"
            type="datetime-local"
            value={form.departureTime}
            onChange={handleChange}
            error={errors.departureTime}
            icon={<span>📅</span>}
          />
        )}

        {/* Seats */}
        <div className="publish-form__section">
          <label className="publish-form__label">Available Seats</label>
          <div className="publish-form__seats">
            <button type="button" className="publish-form__seat-btn" onClick={() => handleSeatsChange(-1)}>−</button>
            <span className="publish-form__seat-count">{form.seatsTotal} seats</span>
            <button type="button" className="publish-form__seat-btn" onClick={() => handleSeatsChange(1)}>+</button>
          </div>
        </div>

        {/* Fare */}
        <Input
          name="farePerSeat"
          label="Fare per Seat (PKR)"
          type="number"
          placeholder={intelligence ? `Suggested: ${intelligence.fareSuggestion?.suggestedFarePerSeat}` : 'Rs.'}
          value={form.farePerSeat}
          onChange={handleChange}
          error={errors.farePerSeat}
          icon={<span>💰</span>}
        />

        {/* Gender Preference */}
        <div className="publish-form__section">
          <label className="publish-form__label">Gender Preference</label>
          <select
            name="genderPreference"
            value={form.genderPreference}
            onChange={handleChange}
            className="publish-form__select"
          >
            <option value="ANY">Any</option>
            <option value="FEMALES_ONLY">Females Only</option>
          </select>
        </div>

        {/* Publish Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={publishing}
          className="mt-md"
        >
          Publish
        </Button>
      </form>
    </div>
  );
}

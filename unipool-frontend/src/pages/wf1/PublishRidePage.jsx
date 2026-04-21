import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ridesApi } from '../../api/rides.api';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import { validatePublishRideForm, hasErrors } from '../../utils/validators';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import MapPicker from '../../components/common/MapPicker/MapPicker';
import './PublishRidePage.css';

export default function PublishRidePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [activeMapInput, setActiveMapInput] = useState(null);

  // If we navigated from "My Vehicles", we have a vehicleId
  const preSelectedVehicleId = location.state?.vehicleId || '';

  const [form, setForm] = useState({
    vehicleId: preSelectedVehicleId,
    startLocation: '',
    destinationLocation: '',
    rideType: 'SCHEDULED', // or 'INSTANT'
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
        // Auto-select if there's only 1 and we didn't come from 'My Vehicles'
        if (data.length === 1 && !preSelectedVehicleId) {
          setForm((f) => ({ ...f, vehicleId: data[0].id }));
        } else if (!preSelectedVehicleId && data.length > 0) {
          // Default to first if none selected
          setForm((f) => ({ ...f, vehicleId: data[0].id }));
        }
      } catch (err) {
        showError('Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, [preSelectedVehicleId, showError]);

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

  const setRideType = (type) => {
    setForm((f) => ({ ...f, rideType: type }));
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    const validationErrors = validatePublishRideForm(form);
    
    // Custom check if no vehicle selected
    if (!form.vehicleId) {
      validationErrors.vehicleId = 'Please select a vehicle first natively.';
      showError('No vehicle selected');
    }

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
          : new Date(form.departureTime || Date.now()).toISOString(),
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
        <div className="publish-page__banner">
          <button className="publish-page__back" onClick={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h2 className="publish-page__banner-title">Publish a Ride</h2>
        </div>
        <div className="publish-page__no-vehicle">
          <div className="publish-page__no-vehicle-icon">🚙</div>
          <h3 className="publish-page__no-vehicle-title">No vehicle found</h3>
          <p className="publish-page__no-vehicle-desc">You need to register a vehicle before publishing a ride.</p>
          <button 
            className="publish-page__add-btn" 
            onClick={() => navigate('/vehicles/new')}
          >
            Add Vehicle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="publish-page fade-in">
      {/* Integrated Banner Header */}
      <div className="publish-page__banner">
        <button className="publish-page__back" onClick={() => navigate(-1)} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h2 className="publish-page__banner-title">Publish a Ride</h2>
      </div>

      <form className="publish-form" onSubmit={handlePublish}>
        
        {/* Location Inputs */}
        <div className="publish-form__locations">
          <div className="publish-input-pill">
            <span className="publish-input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </span>
            <input
              type="text"
              name="startLocation"
              placeholder="Starting Location"
              value={form.startLocation}
              onChange={handleChange}
              className="publish-input-field"
            />
            <span className="publish-target-icon" onClick={() => setActiveMapInput('startLocation')} style={{ cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </span>
          </div>

          <div className="publish-input-pill">
            <span className="publish-input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </span>
            <input
              type="text"
              name="destinationLocation"
              placeholder="Drop-off Location"
              value={form.destinationLocation}
              onChange={handleChange}
              className="publish-input-field"
            />
            <span className="publish-target-icon" onClick={() => setActiveMapInput('destinationLocation')} style={{ cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </span>
          </div>
        </div>

        {/* Ride Type Selection */}
        <div className="publish-form__ride-types">
          <button
            type="button"
            className={`publish-type-btn ${form.rideType === 'SCHEDULED' ? 'publish-type-btn--active' : ''}`}
            onClick={() => setRideType('SCHEDULED')}
          >
            <span className="publish-type-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <path d="M12 14v4"></path>
                <path d="M10 16h4"></path>
              </svg>
            </span>
            Scheduled Ride
          </button>

          <button
            type="button"
            className={`publish-type-btn publish-type-btn--instant ${form.rideType === 'INSTANT' ? 'publish-type-btn--instant-active' : ''}`}
            onClick={() => setRideType('INSTANT')}
          >
             <span className="publish-type-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </span>
            Leaving Now!
          </button>
        </div>

        {/* Departure Time for SCHEDULED */}
        {form.rideType === 'SCHEDULED' && (
           <div className="publish-form__row mt-xs">
             <label className="publish-row-label">Time:</label>
             <input
               type="datetime-local"
               name="departureTime"
               className="publish-gray-input publish-gray-input--date"
               value={form.departureTime}
               onChange={handleChange}
             />
           </div>
        )}

        {/* Available Seats */}
        <div className="publish-form__row mt-md">
          <label className="publish-row-label">
            <span className="seat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14h-6v-2h6v2z"></path>
                <path d="M10 14H4v-2h6v2z"></path>
                <path d="M4 12V6c0-1.1.9-2 2-2h4v8H4z"></path>
                <path d="M20 12V6c0-1.1-.9-2-2-2h-4v8h6z"></path>
                <path d="M4 22v-4h16v4"></path>
              </svg>
            </span>
            Available Seats
          </label>
          <div className="publish-seat-control">
            <button type="button" className="seat-circle-btn" onClick={() => handleSeatsChange(-1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <div className="seat-chunk">{form.seatsTotal} seats</div>
            <button type="button" className="seat-circle-btn" onClick={() => handleSeatsChange(1)}>
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>

        {/* Fare per Seat */}
        <div className="publish-form__row mt-md">
          <label className="publish-row-label">Fare per Seat :</label>
          <input
            type="number"
            name="farePerSeat"
            className="publish-gray-input"
            placeholder="Rs."
            value={form.farePerSeat}
            onChange={handleChange}
          />
        </div>

        {/* Gender Preference */}
        <div className="publish-form__row mt-md mb-xl">
          <label className="publish-row-label">Gender Preference:</label>
          <select
            name="genderPreference"
            className="publish-gray-select"
            value={form.genderPreference}
            onChange={handleChange}
          >
            <option value="ANY">Any</option>
            <option value="FEMALES_ONLY">Females Only</option>
            <option value="MALES_ONLY">Males Only</option>
          </select>
        </div>

        {/* Publish Button */}
        <button type="submit" className="publish-action-btn mt-2xl" disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish'}
        </button>

      </form>

      {/* Full Screen Map Picker Overlay */}
      {activeMapInput && (
        <MapPicker 
          onClose={() => setActiveMapInput(null)} 
          onConfirm={(address) => {
            setForm((f) => ({ ...f, [activeMapInput]: address }));
            setActiveMapInput(null);
          }} 
        />
      )}
    </div>
  );
}

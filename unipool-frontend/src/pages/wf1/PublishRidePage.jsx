import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocation as useGeoLocation } from '../../context/LocationContext';
import { ridesApi } from '../../api/rides.api';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import { validatePublishRideForm, hasErrors } from '../../utils/validators';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import MapPicker from '../../components/common/MapPicker/MapPicker';
import './PublishRidePage.css';

const SLOTS = [
  { id: '1', label: '8:30 AM – 9:45 AM', start: '08:30' },
  { id: '2', label: '10:00 AM – 11:15 AM', start: '10:00' },
  { id: '3', label: '11:30 AM – 12:45 PM', start: '11:30' },
  { id: '4', label: '1:00 PM – 2:15 PM', start: '13:00' },
  { id: '5', label: '2:30 PM – 3:45 PM', start: '14:30' },
  { id: '6', label: '4:00 PM – 5:15 PM', start: '16:00' },
  { id: '7', label: '5:30 PM – 6:45 PM', start: '17:30' },
  { id: '8', label: '7:00 PM – 8:15 PM', start: '19:00' },
];

export default function PublishRidePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [activeMapInput, setActiveMapInput] = useState(null);
  const { status: locationStatus } = useGeoLocation();
  const dateInputRef = useRef(null);

  // If we navigated from "My Vehicles", we have a vehicleId
  const preSelectedVehicleId = location.state?.vehicleId || '';
  
  useEffect(() => {
    // If permission is explicitly denied, or if we're in a state that requires location 
    // and it's not granted, we redirect to the Enable Location page.
    if (locationStatus === 'denied') {
      navigate('/enable-location', { state: { from: '/rides/publish' } });
    }
  }, [locationStatus, navigate]);

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

  const [scheduling, setScheduling] = useState({
    dateType: 'today', // today, tomorrow, custom
    mode: 'slot',      // slot, exact
    selectedSlot: null,
    customDate: '',
    exactTime: '',
  });

  const [errors, setErrors] = useState({});
  const [suggestedFare, setSuggestedFare] = useState(0); // Base suggested fare
  const [fareCap, setFareCap] = useState(0); // Capped limit from backend
  const [fetchingFare, setFetchingFare] = useState(false);

  useEffect(() => {
    if (form.startLocation && form.destinationLocation) {
      const timer = setTimeout(async () => {
        try {
          setFetchingFare(true);
          const res = await ridesApi.previewIntelligence({
            ...form,
            // Provide a fallback departure time if not set yet for preview
            departureTime: form.departureTime || new Date(Date.now() + 30 * 60 * 1000).toISOString()
          });
          
          const fare = res.data.fareSuggestion?.suggestedFarePerSeat || 0;
          const cap = res.data.fareSuggestion?.fareCap || 0;
          setSuggestedFare(fare);
          setFareCap(cap);
          
          // Auto-populate if empty
          if (!form.farePerSeat) {
            setForm(f => ({ ...f, farePerSeat: fare.toString() }));
          }
        } catch (err) {
          console.error('Fare intelligence failed:', err);
        } finally {
          setFetchingFare(false);
        }
      }, 800); // Debounce
      
      return () => clearTimeout(timer);
    }
  }, [form.startLocation, form.destinationLocation, form.seatsTotal]);

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
    const { name, value, type } = e.target;
    let newValue = value;
    
    // Prevent negative values
    if (type === 'number' && Number(value) < 0) {
      newValue = '0';
    }

    // Capped Limit: Cannot exceed backend's fareCap
    if (name === 'farePerSeat' && fareCap > 0 && Number(newValue) > fareCap) {
      newValue = fareCap.toString();
      showError(`Fare cannot exceed PKR ${fareCap} for this route.`);
    }
    
    setForm((f) => ({ ...f, [name]: newValue }));
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
  
  const handleCustomDateClick = () => {
    if (dateInputRef.current) {
      // Modern browsers support showPicker()
      if (dateInputRef.current.showPicker) {
        try {
          dateInputRef.current.showPicker();
        } catch (e) {
          dateInputRef.current.click();
        }
      } else {
        dateInputRef.current.click();
      }
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();

    // Final safety check: If location is not granted, block publishing and redirect
    if (locationStatus !== 'granted') {
      showError('Please enable your location to publish a ride.');
      navigate('/enable-location', { state: { from: '/rides/publish' } });
      return;
    }

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
              </svg>
            </span>
            Scheduled
          </button>

          <button
            type="button"
            className={`publish-type-btn publish-type-btn--instant ${form.rideType === 'INSTANT' ? 'publish-type-btn--instant-active' : ''}`}
            onClick={() => {
              setRideType('INSTANT');
              // Auto-set time to Now + 10 mins
              const now = new Date();
              now.setMinutes(now.getMinutes() + 10);
              setForm(f => ({ ...f, departureTime: now.toISOString() }));
            }}
          >
             <span className="publish-type-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </span>
            Leaving Now
          </button>
        </div>

        {/* Departure Section */}
        <div className="departure-section">
          {form.rideType === 'INSTANT' ? (
            <div className="leaving-now-status">
              <div className="leaving-now-text">
                <span className="leaving-now-title">⚡ Leaving Now</span>
                <span className="leaving-now-time">
                  Departure set for {new Date(form.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <span className="leaving-now-edit" onClick={() => setRideType('SCHEDULED')}>Change</span>
            </div>
          ) : (
            <>
              {/* Date Selection */}
              <div className="date-pills">
                {['today', 'tomorrow', 'custom'].map((d) => {
                  const isActive = scheduling.dateType === d;
                  if (d === 'custom') {
                    return (
                      <div 
                        key={d}
                        className={`date-pill ${isActive ? 'date-pill--active' : ''} date-pill--custom`}
                        onClick={handleCustomDateClick}
                      >
                        {scheduling.customDate 
                          ? new Date(scheduling.customDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) 
                          : 'Pick Date'}
                      </div>
                    );
                  }
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`date-pill ${isActive ? 'date-pill--active' : ''}`}
                      onClick={() => setScheduling(s => ({ ...s, dateType: d }))}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  );
                })}

                {/* Centered hidden input for calendar popover anchoring */}
                <input
                  ref={dateInputRef}
                  type="date"
                  className="date-pill-hidden-input"
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setScheduling(s => ({ ...s, dateType: 'custom', customDate: val }));
                    }
                  }}
                />
              </div>

              {/* Mode Toggle */}
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-btn ${scheduling.mode === 'slot' ? 'mode-btn--active' : ''}`}
                  onClick={() => setScheduling(s => ({ ...s, mode: 'slot' }))}
                >
                  Class Slot
                </button>
                <button
                  type="button"
                  className={`mode-btn ${scheduling.mode === 'exact' ? 'mode-btn--active' : ''}`}
                  onClick={() => setScheduling(s => ({ ...s, mode: 'exact' }))}
                >
                  Exact Time
                </button>
              </div>

              {/* Selection Area */}
              {scheduling.mode === 'slot' ? (
                <div className="slots-grid">
                  {SLOTS.map((slot) => {
                    const isToday = scheduling.dateType === 'today';
                    const now = new Date();
                    const slotTime = new Date();
                    const [h, m] = slot.start.split(':');
                    slotTime.setHours(parseInt(h), parseInt(m), 0);
                    const isDisabled = isToday && slotTime < now;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isDisabled}
                        className={`slot-card ${scheduling.selectedSlot === slot.id ? 'slot-card--active' : ''} ${isDisabled ? 'slot-card--disabled' : ''}`}
                        onClick={() => {
                          setScheduling(s => ({ ...s, selectedSlot: slot.id }));
                          // Update form departureTime
                          const baseDate = new Date();
                          if (scheduling.dateType === 'tomorrow') baseDate.setDate(baseDate.getDate() + 1);
                          if (scheduling.dateType === 'custom' && scheduling.customDate) {
                            const [y, mm, dd] = scheduling.customDate.split('-');
                            baseDate.setFullYear(y, mm - 1, dd);
                          }
                          baseDate.setHours(parseInt(h), parseInt(m), 0);
                          setForm(f => ({ ...f, departureTime: baseDate.toISOString() }));
                        }}
                      >
                        <span className="slot-label">{slot.label.split(' – ')[0]}</span>
                        <span className="slot-sub">Class Slot</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="time"
                  step="900"
                  className="exact-time-input"
                  value={scheduling.exactTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScheduling(s => ({ ...s, exactTime: val }));
                    
                    const baseDate = new Date();
                    if (scheduling.dateType === 'tomorrow') baseDate.setDate(baseDate.getDate() + 1);
                    if (scheduling.dateType === 'custom' && scheduling.customDate) {
                      const [y, mm, dd] = scheduling.customDate.split('-');
                      baseDate.setFullYear(y, mm - 1, dd);
                    }
                    const [h, m] = val.split(':');
                    baseDate.setHours(parseInt(h), parseInt(m), 0);
                    
                    // Prevent past time if today
                    if (scheduling.dateType === 'today' && baseDate < new Date()) {
                      showError('Cannot select a past time for today.');
                      return;
                    }
                    setForm(f => ({ ...f, departureTime: baseDate.toISOString() }));
                  }}
                />
              )}
            </>
          )}
        </div>

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

        {/* Premium Fare Card */}
        <div className="publish-fare-card mt-md">
          <div className="publish-fare-main">
            <label className="publish-row-label">
              <span className="fare-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </span>
              Fare per Seat
            </label>
            <div className="publish-fare-input-wrapper">
              <span className="currency-prefix">Rs.</span>
              <input
                type="number"
                name="farePerSeat"
                className="fare-input-field"
                placeholder="0"
                min="0"
                value={form.farePerSeat}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="publish-fare-meta">
            {fetchingFare ? (
              <span className="publish-suggested-tag publish-suggested-tag--loading">
                Calculating fare...
              </span>
            ) : suggestedFare > 0 ? (
              <>
                <div className="meta-labels">
                  <span className="meta-suggested">Suggested: Rs. {suggestedFare}</span>
                  {fareCap > 0 && <span className="meta-max">Maximum Limit: Rs. {fareCap}</span>}
                </div>
                <button 
                  type="button" 
                  className="meta-apply-btn"
                  onClick={() => setForm(f => ({ ...f, farePerSeat: suggestedFare.toString() }))}
                >
                  Apply Suggested
                </button>
              </>
            ) : (
              <span className="meta-placeholder">Enter locations to see suggested fare</span>
            )}
          </div>
        </div>

        {/* Gender Preference */}
        <div className="publish-form__row mt-md mb-xl">
          <label className="publish-row-label">Gender Preference:</label>
          <div className="publish-gender-pills">
            <button
              type="button"
              className={`publish-gender-pill ${form.genderPreference === 'ANY' ? 'publish-gender-pill--active' : ''}`}
              onClick={() => setForm(f => ({ ...f, genderPreference: 'ANY' }))}
            >
              Any
            </button>
            <button
              type="button"
              className={`publish-gender-pill ${form.genderPreference === 'FEMALES_ONLY' ? 'publish-gender-pill--active' : ''}`}
              onClick={() => setForm(f => ({ ...f, genderPreference: 'FEMALES_ONLY' }))}
            >
              Females
            </button>
            <button
              type="button"
              className={`publish-gender-pill ${form.genderPreference === 'MALES_ONLY' ? 'publish-gender-pill--active' : ''}`}
              onClick={() => setForm(f => ({ ...f, genderPreference: 'MALES_ONLY' }))}
            >
              Males
            </button>
          </div>
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

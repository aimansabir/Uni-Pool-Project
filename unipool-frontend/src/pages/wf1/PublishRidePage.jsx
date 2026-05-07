import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocation as useGeoLocation } from '../../context/LocationContext';
import { ridesApi } from '../../api/rides.api';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import { reverseGeocode } from '../../utils/geocoding';
import { validatePublishRideForm, hasErrors } from '../../utils/validators';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import MapPicker from '../../components/common/MapPicker/MapPicker';
import publishIllustration from '../../assets/images/publish_ride_header_bg.png';
import { MapPin, Calendar, X, Clock, Users, CheckCircle, Check, ChevronRight, Wallet, Minus, Plus, Zap, Locate, Car, Route, Navigation, MapPinned } from 'lucide-react';
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
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [activeMapInput, setActiveMapInput] = useState(null);
  const { status: locationStatus, latitude, longitude, requestLocation } = useGeoLocation();
  const dateInputRef = useRef(null);

  // If we navigated from "My Vehicles", we have a vehicleId
  const preSelectedVehicleId = location.state?.vehicleId || '';

  const [form, setForm] = useState({
    vehicleId: preSelectedVehicleId,
    startLocation: '',
    destinationLocation: '',
    startCoords: null,
    destinationCoords: null,
    rideType: '',
    departureTime: '',
    seatsTotal: 2,
    farePerSeat: '',
    genderPreference: 'ANY',
    confirmedStops: [],
  });

  // Route intelligence state
  const [routeIntelligence, setRouteIntelligence] = useState(null);
  const [selectedRouteOptionNumber, setSelectedRouteOptionNumber] = useState(null);
  const [confirmedStopIndexes, setConfirmedStopIndexes] = useState(new Set());

  // Client-side fare constants (mirrors backend defaults)
  const FARE_BASE = 60;
  const FARE_PER_KM = 18;
  const FARE_MULTIPLIER = 1.25;
  const roundTo10 = (v) => Math.ceil(v / 10) * 10;

  const COORDS_ONLY_REGEX =
    /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;

  const cleanAddressLabel = (value, fallback = 'Current Location') => {
    if (!value) return fallback;

    const str = String(value).trim();
    if (!str || COORDS_ONLY_REGEX.test(str)) return fallback;

    const parts = str
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 3);

    return parts.length ? parts.join(', ') : fallback;
  };

  const handleGetLocation = useCallback(async (fieldName = 'startLocation') => {
    try {
      const loc = await requestLocation();
      const rawAddress = await reverseGeocode(loc.latitude, loc.longitude);
      const cleanAddress = cleanAddressLabel(rawAddress, 'Current Location');

      setForm((f) => ({
        ...f,
        [fieldName]: cleanAddress,
        [`${fieldName === 'startLocation' ? 'start' : 'destination'}Coords`]: {
          lat: loc.latitude,
          lng: loc.longitude,
        },
      }));

      showSuccess('Current location updated');
    } catch (err) {
      showError('Failed to get current location');
    }
  }, [requestLocation, showSuccess, showError]);

  useEffect(() => {
    if (locationStatus === 'denied') {
      navigate('/enable-location', { state: { from: '/rides/publish' } });
    } else if (locationStatus === 'granted' && latitude && longitude && !form.startLocation) {
      // Auto-set start location on load if granted
      reverseGeocode(latitude, longitude).then((rawAddress) => {
        const cleanAddress = cleanAddressLabel(rawAddress, 'Current Location');

        setForm((f) => ({
          ...f,
          startLocation: cleanAddress,
          startCoords: { lat: latitude, lng: longitude },
        }));
      });
    }
  }, [locationStatus, latitude, longitude, navigate]);

  const [scheduling, setScheduling] = useState({
    dateType: null, // today, tomorrow, custom
    mode: 'slot',      // slot, exact
    selectedSlot: null,
    customDate: '',
    exactTime: '',
    slotDepartureTime: '', // actual departure time when slot mode is active
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (scheduling.mode === 'slot' && scheduling.selectedSlot && scheduling.dateType) {
      const slot = SLOTS.find(s => s.id === scheduling.selectedSlot);
      if (slot) {
        const [h, m] = slot.start.split(':');
        let depH = parseInt(h) - 1;
        let depM = parseInt(m);
        if (depH < 0) depH += 24;
        let defaultTimeStr = `${depH.toString().padStart(2, '0')}:${depM.toString().padStart(2, '0')}`;
        
        if (scheduling.dateType === 'today') {
          const defaultDate = new Date();
          defaultDate.setHours(depH, depM, 0, 0);
          if (defaultDate < new Date()) {
            // Round to nearest 5 mins from now
            const coeff = 1000 * 60 * 5;
            const roundedNow = new Date(Math.ceil((new Date().getTime()) / coeff) * coeff);
            defaultTimeStr = `${roundedNow.getHours().toString().padStart(2, '0')}:${roundedNow.getMinutes().toString().padStart(2, '0')}`;
          }
        }

        setScheduling(s => {
          // If the computed default is different and we haven't manually set a valid one recently, update it
          return { ...s, slotDepartureTime: defaultTimeStr };
        });

        // Compute form departureTime iso string
        const baseDate = new Date();
        if (scheduling.dateType === 'tomorrow') baseDate.setDate(baseDate.getDate() + 1);
        else if (scheduling.dateType === 'custom' && scheduling.customDate) {
          const [y, mm, dd] = scheduling.customDate.split('-');
          baseDate.setFullYear(parseInt(y), parseInt(mm) - 1, parseInt(dd));
        }
        const [dH, dM] = defaultTimeStr.split(':');
        baseDate.setHours(parseInt(dH), parseInt(dM), 0, 0);
        setForm(f => ({ ...f, departureTime: baseDate.toISOString() }));
      }
    }
  }, [scheduling.selectedSlot, scheduling.dateType, scheduling.customDate, scheduling.mode]);
  const [suggestedFare, setSuggestedFare] = useState(0);
  const [fareCap, setFareCap] = useState(0);
  const [fetchingFare, setFetchingFare] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Helper to map our new UI to the existing scheduling state
  const selectedDate = scheduling.dateType === 'custom' ? scheduling.customDate : scheduling.dateType;

  const setSelectedDate = (val) => {
    if (val === 'today' || val === 'tomorrow') {
      setScheduling(s => ({ ...s, dateType: val, customDate: '' }));
    } else {
      setScheduling(s => ({ ...s, dateType: 'custom', customDate: val }));
    }
  };

  // Generate calendar days for the current month
  const getCalendarDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Last day of current month
    const lastDay = new Date(year, month + 1, 0);

    const days = [];

    // Add padding for start of month (e.g. if month starts on Wed)
    const startDay = firstDay.getDay(); // 0 is Sunday
    const padding = startDay === 0 ? 6 : startDay - 1; // Adjust to start with Monday
    for (let i = 0; i < padding; i++) {
      days.push(null);
    }

    // Add actual days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    // Add next month days to fill 14-day requirement or just show full month
    // User wants a "Real Calendar Layout", so showing the full month is better.
    return days;
  };

  const getMonthName = () => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDateNum = (date) => {
    return date.getDate();
  };

  const formatFullDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleCustomDateSelect = (dateStr) => {
    const selected = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selected < today) return; // Prevent past dates
    setSelectedDate(dateStr);
  };

  useEffect(() => {
    if (form.startLocation && form.destinationLocation) {
      if (form.startLocation === form.destinationLocation) {
        setSuggestedFare(0);
        setFareCap(0);
        setRouteIntelligence(null);
        setSelectedRouteOptionNumber(null);
        return;
      }

      const timer = setTimeout(async () => {
        try {
          setFetchingFare(true);
          const res = await ridesApi.previewIntelligence({
            ...form,
            departureTime: form.departureTime || new Date(Date.now() + 30 * 60 * 1000).toISOString()
          });

          // Fix: Extract data from the backend success envelope { success: true, data: { ... } }
          const intelligenceData = res.data;
          setRouteIntelligence(intelligenceData);

          const fare = intelligenceData?.fareSuggestion?.suggestedFarePerSeat || 0;
          const cap = intelligenceData?.fareSuggestion?.fareCap || 0;

          setSuggestedFare(fare);
          setFareCap(cap);

          // Auto-select primary route
          if (intelligenceData?.routeOptions?.length) {
            setSelectedRouteOptionNumber(1);
            setConfirmedStopIndexes(new Set());
          }

          if (!form.farePerSeat || form.farePerSeat === '0') {
            setForm(f => ({ ...f, farePerSeat: fare.toString() }));
          }
        } catch (err) {
          console.error('Fare intelligence failed:', err);
          setRouteIntelligence(null);
        } finally {
          setFetchingFare(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [form.startLocation, form.destinationLocation, form.seatsTotal, form.departureTime]);

  // Recalculate fare when route selection changes
  const handleRouteSelect = (optionNumber) => {
    setSelectedRouteOptionNumber(optionNumber);
    setConfirmedStopIndexes(new Set());

    const option = routeIntelligence?.routeOptions?.find(o => o.optionNumber === optionNumber);
    if (option) {
      const seats = Math.max(form.seatsTotal || 1, 1);
      const rawTotal = FARE_BASE + option.distanceKm * FARE_PER_KM;
      const newSuggested = roundTo10(rawTotal / seats);
      const newCap = roundTo10(newSuggested * FARE_MULTIPLIER);
      setSuggestedFare(newSuggested);
      setFareCap(newCap);

      // Auto-apply suggested fare if user hasn't manually set one
      if (!form.farePerSeat || form.farePerSeat === '0' || form.farePerSeat === suggestedFare.toString()) {
        setForm(f => ({ ...f, farePerSeat: newSuggested.toString() }));
      }
    }
  };

  const toggleStopIndex = (index) => {
    setConfirmedStopIndexes(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Get selected route option
  const selectedRouteOption = routeIntelligence?.routeOptions?.find(
    o => o.optionNumber === selectedRouteOptionNumber
  );
  const routeOptions = routeIntelligence?.routeOptions || [];
  const showRouteSelection = routeOptions.length > 1;
  const selectedLandmarks = selectedRouteOption?.suggestedLandmarks || [];

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await vehiclesApi.list();
        const data = res.data || [];
        setVehicles(data);
        if (data.length === 1 && !preSelectedVehicleId) {
          setForm((f) => ({ ...f, vehicleId: data[0].id }));
        } else if (!preSelectedVehicleId && data.length > 0) {
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

    if (type === 'number' && Number(value) < 0) {
      newValue = '0';
    }

    if (name === 'farePerSeat' && fareCap > 0 && Number(newValue) > fareCap) {
      newValue = fareCap.toString();
      showError(`Fare cannot exceed PKR ${fareCap} for this route.`);
    }

    setForm((f) => ({ ...f, [name]: newValue }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const handleExactTimeChange = (val) => {
    setScheduling(s => ({ ...s, exactTime: val }));
    const baseDate = new Date();
    if (selectedDate === 'tomorrow') baseDate.setDate(baseDate.getDate() + 1);
    else if (selectedDate !== 'today' && selectedDate !== 'tomorrow') {
      const [y, mm, dd] = selectedDate.split('-');
      baseDate.setFullYear(parseInt(y), parseInt(mm) - 1, parseInt(dd));
    }
    const [h, m] = val.split(':');
    baseDate.setHours(parseInt(h), parseInt(m), 0);

    setForm(f => ({ ...f, departureTime: baseDate.toISOString() }));
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

    // Prevent any re-entry — button is already disabled by the `publishing` state
    if (publishing) return;

    // Lock the button immediately on first click
    setPublishing(true);

    try {
      if (locationStatus !== 'granted') {
        showError('Please enable your location to publish a ride.');
        setPublishing(false);
        navigate('/enable-location', { state: { from: '/rides/publish' } });
        return;
      }

      const validationErrors = {};
      if (!form.startLocation) validationErrors.startLocation = 'Please select a starting location';
      if (!form.destinationLocation) validationErrors.destinationLocation = 'Please select a drop-off location';
      if (!form.vehicleId) validationErrors.vehicleId = 'Please select a vehicle first';

      if (form.rideType === 'SCHEDULED') {
        if (!scheduling.dateType) validationErrors.dateType = 'Please select a date';
        if (scheduling.mode === 'slot') {
          if (!scheduling.selectedSlot) {
            validationErrors.selectedSlot = 'Please select a class slot';
          }
          if (!scheduling.slotDepartureTime) {
            validationErrors.slotDepartureTime = 'Please enter your departure time';
          } else if (scheduling.selectedSlot) {
            const slotObj = SLOTS.find(s => s.id === scheduling.selectedSlot);
            if (slotObj) {
              const [sH, sM] = slotObj.start.split(':');
              const [dH, dM] = scheduling.slotDepartureTime.split(':');
              const sTime = parseInt(sH) * 60 + parseInt(sM);
              const dTime = parseInt(dH) * 60 + parseInt(dM);
              
              if (dTime >= sTime) {
                validationErrors.slotDepartureTime = 'Departure must be before class slot starts';
              } else if (scheduling.dateType === 'today') {
                const now = new Date();
                const dDate = new Date();
                dDate.setHours(parseInt(dH), parseInt(dM), 0, 0);
                if (dDate < now) {
                  validationErrors.slotDepartureTime = 'Departure time cannot be in the past';
                }
              }
            }
          }
        }
        if (scheduling.mode === 'exact' && !scheduling.exactTime) {
          validationErrors.exactTime = 'Please select an exact time';
        }
        // Past time check for exact mode on today
        if (scheduling.mode === 'exact' && scheduling.exactTime && scheduling.dateType === 'today') {
          const [h, m] = scheduling.exactTime.split(':');
          const candidate = new Date();
          candidate.setHours(parseInt(h), parseInt(m), 0, 0);
          if (candidate <= new Date()) {
            validationErrors.exactTime = 'Departure time cannot be in the past';
          }
        }
      } else if (!form.rideType) {
        validationErrors.rideType = 'Please select ride type';
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        showError('Please fix the errors in the form');
        setPublishing(false);
        return;
      }

      // Build confirmedStops from selected landmark indexes
      const builtStops = selectedLandmarks
        .filter((_, i) => confirmedStopIndexes.has(i))
        .map((lm, i) => ({
          stopName: lm.stopName,
          sequence: i + 1,
          lat: lm.lat ?? null,
          lng: lm.lng ?? null,
        }));

      const payload = {
        ...form,
        targetSlot: scheduling.mode === 'slot'
          ? SLOTS.find(s => s.id === scheduling.selectedSlot)?.label
          : null,
        seatsTotal: Number(form.seatsTotal),
        farePerSeat: Number(form.farePerSeat),
        departureTime: form.rideType === 'INSTANT'
          ? new Date(Date.now() + 10 * 60 * 1000).toISOString()
          : (() => {
              // In slot mode, use the separate slotDepartureTime the driver entered
              if (scheduling.mode === 'slot' && scheduling.slotDepartureTime) {
                return form.departureTime; // already set by slotDepartureTime handler
              }
              return new Date(form.departureTime || Date.now()).toISOString();
            })(),
        confirmedStops: builtStops,
        ...(selectedRouteOptionNumber ? { selectedRouteOptionNumber } : {}),
      };

      const res = await ridesApi.publish(payload);
      showSuccess('Ride published successfully!');
      navigate(`/rides/${res.data.id}/confirmed`, { state: { ride: res.data } });
      // Do not reset publishing — we are navigating away
    } catch (err) {
      showError(err.message || 'Failed to publish ride. Please try again.');
      // Re-enable button only on failure so user can retry
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
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className="publish-page__banner-title">Publish a Ride</h2>
        </div>
        <div className="publish-page__no-vehicle">
          <div className="publish-page__no-vehicle-icon">
            <Car size={64} strokeWidth={1.5} color="#FBBF24" />
          </div>
          <h3 className="publish-page__no-vehicle-title">No vehicles yet</h3>
          <p className="publish-page__no-vehicle-desc">Add your first vehicle to start offering rides</p>
          <button
            className="publish-page__add-btn"
            onClick={() => navigate('/vehicles/new')}
          >
            Add Car
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="publish-page fade-in">
      <div className="publish-header">
        <div className="publish-header__bg-gradient" />

        <div className="publish-header__content">
          <button className="publish-header__back" onClick={() => navigate('/vehicles', { state: { vehicleId: form.vehicleId } })} type="button">
            <svg width="24" height="27" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="publish-header__text">
            <h1 className="publish-header__title">Publish a Ride</h1>
            <p className="publish-header__subtitle">Fill in trip details to get started</p>
          </div>
        </div>
      </div>

      <form className="publish-container" onSubmit={handlePublish}>

        {/* ── Location Cards ── */}
        <div className="location-section">
          <div className="location-connector" />

          <div className={`location-card ${errors.startLocation ? 'has-error' : ''}`} onClick={() => setActiveMapInput('startLocation')}>
            <div className="location-card__icon-box">
              <div className="icon-circle">
                <MapPin size={18} strokeWidth={2.5} />
              </div>
            </div>
            <div className="location-card__content">
              <span className="location-card__label">Starting Location</span>
              <span className={`location-card__value ${!form.startLocation ? 'placeholder' : ''}`}>
                {form.startLocation || 'Select starting location'}
              </span>
            </div>
            <button
              type="button"
              className="location-card__target-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMapInput('startLocation');
                setErrors(prev => ({ ...prev, startLocation: false }));
              }}
            >
              <Locate size={18} strokeWidth={2.5} />
            </button>
          </div>
          {errors.startLocation && <p className="field-error-text fade-in">{errors.startLocation}</p>}

          <div className={`location-card ${errors.destinationLocation ? 'has-error' : ''}`} onClick={() => setActiveMapInput('destinationLocation')}>
            <div className="location-card__icon-box">
              <div className="icon-circle">
                <MapPin size={18} strokeWidth={2.5} />
              </div>
            </div>
            <div className="location-card__content">
              <span className="location-card__label">Drop-off Location</span>
              <span className={`location-card__value ${!form.destinationLocation ? 'placeholder' : ''}`}>
                {form.destinationLocation || 'Select drop-off location'}
              </span>
            </div>
            <button
              type="button"
              className="location-card__target-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMapInput('destinationLocation');
                setErrors(prev => ({ ...prev, destinationLocation: false }));
              }}
            >
              <Locate size={18} strokeWidth={2.5} />
            </button>
          </div>
          {errors.destinationLocation && <p className="field-error-text fade-in">{errors.destinationLocation}</p>}
        </div>

        {/* ── Timing Selection Cards ── */}
        <div className={`timing-toggle-grid ${errors.rideType ? 'has-error-grid' : ''}`}>
          <div
            className={`timing-card ${form.rideType === 'SCHEDULED' ? 'active' : ''}`}
            onClick={() => {
              setRideType('SCHEDULED');
              setErrors(prev => ({ ...prev, rideType: false }));
            }}
          >
            <div className="timing-card__icon-box">
              <Calendar size={20} strokeWidth={2.5} />
            </div>
            <div className="timing-card__text">
              <span className="timing-card__title">Scheduled</span>
              <span className="timing-card__subtitle">Plan your ride</span>
            </div>
            {form.rideType === 'SCHEDULED' && (
              <div className="timing-card__check">
                <Check size={14} strokeWidth={4} />
              </div>
            )}
          </div>

          <div
            className={`timing-card ${form.rideType === 'INSTANT' ? 'active' : ''}`}
            onClick={() => {
              setRideType('INSTANT');
              const now = new Date();
              now.setMinutes(now.getMinutes() + 10);
              setForm(f => ({ ...f, departureTime: now.toISOString() }));
              setErrors(prev => ({ ...prev, rideType: false }));
            }}
          >
            <div className="timing-card__icon-box">
              <Zap size={20} strokeWidth={2.5} />
            </div>
            <div className="timing-card__text">
              <span className="timing-card__title">Leaving Now</span>
              <span className="timing-card__subtitle">Go at the moment</span>
            </div>
            {form.rideType === 'INSTANT' && (
              <div className="timing-card__check">
                <Check size={14} strokeWidth={4} />
              </div>
            )}
          </div>
        </div>
        {errors.rideType && <p className="field-error-text fade-in">{errors.rideType}</p>}

        {form.rideType === 'SCHEDULED' && (
          <div className="scheduling-section fade-in">
            <div className={`date-tabs ${errors.dateType ? 'has-error' : ''}`}>
              <button
                type="button"
                className={`date-tab ${scheduling.dateType === 'today' ? 'active' : ''}`}
                onClick={() => {
                  setScheduling(s => ({ ...s, dateType: 'today' }));
                  setErrors(prev => ({ ...prev, dateType: false }));
                }}
              >
                Today
              </button>
              <button
                type="button"
                className={`date-tab ${scheduling.dateType === 'tomorrow' ? 'active' : ''}`}
                onClick={() => {
                  setScheduling(s => ({ ...s, dateType: 'tomorrow' }));
                  setErrors(prev => ({ ...prev, dateType: false }));
                }}
              >
                Tomorrow
              </button>
              <button
                type="button"
                className={`date-tab custom-date-tab ${scheduling.dateType === 'custom' ? 'active' : ''}`}
                onClick={() => {
                  setIsDatePickerOpen(true);
                  setErrors(prev => ({ ...prev, dateType: false }));
                }}
              >
                <Calendar size={16} />
                <span>
                  {scheduling.dateType === 'custom' && scheduling.customDate
                    ? new Date(scheduling.customDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Pick Date'}
                </span>
              </button>
            </div>
            {errors.dateType && <p className="field-error-text fade-in">{errors.dateType}</p>}

            {scheduling.dateType && (
              <>
                <div className="scheduling-mode-toggle fade-in">
                  <button
                    type="button"
                    className={`mode-toggle-btn ${scheduling.mode === 'slot' ? 'active' : ''}`}
                    onClick={() => setScheduling(s => ({ ...s, mode: 'slot' }))}
                  >
                    Class Slot
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${scheduling.mode === 'exact' ? 'active' : ''}`}
                    onClick={() => setScheduling(s => ({ ...s, mode: 'exact' }))}
                  >
                    Exact Time
                  </button>
                </div>

                {scheduling.mode === 'slot' ? (
                  <>
                    <div className={`slots-grid fade-in ${errors.selectedSlot ? 'has-error-grid' : ''}`}>
                      {SLOTS.map((slot) => {
                        const isActive = scheduling.selectedSlot === slot.id;
                        const [h, m] = slot.start.split(':');
                        const isMorning = parseInt(h) < 12;

                        let isPassed = false;
                        if (scheduling.dateType === 'today') {
                          const now = new Date();
                          const slotTime = new Date();
                          slotTime.setHours(parseInt(h), parseInt(m), 0, 0);
                          isPassed = now > slotTime;
                        }

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={isPassed}
                            className={`slot-item ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''}`}
                            onClick={() => {
                              setScheduling(s => ({ ...s, selectedSlot: slot.id }));
                              setErrors(prev => ({ ...prev, selectedSlot: false, slotDepartureTime: false }));
                            }}
                          >
                            <div className="slot-item__icon">
                              {isMorning ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                              ) : (
                                <Clock size={16} strokeWidth={2.5} />
                              )}
                            </div>
                            <div className="slot-item__content">
                              <span className="slot-item__time">{slot.label.split(' – ')[0]}</span>
                              <span className="slot-item__label">Class Slot</span>
                            </div>
                            {isActive && (
                              <div className="slot-item__check">
                                <Check size={14} strokeWidth={4} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {errors.selectedSlot && <p className="field-error-text fade-in">{errors.selectedSlot}</p>}

                    {/* ── When are you leaving? (slot mode departure time) ── */}
                    {scheduling.selectedSlot && (
                      <div className="slot-departure-section fade-in" style={{ marginTop: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                          <Clock size={14} strokeWidth={2.5} />
                          When are you leaving?
                          <span style={{ fontWeight: '400', color: '#6B7280', fontSize: '12px' }}>(Your actual departure time)</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="time"
                            value={scheduling.slotDepartureTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setScheduling(s => ({ ...s, slotDepartureTime: val }));
                              setErrors(prev => ({ ...prev, slotDepartureTime: false }));
                              if (val) {
                                const baseDate = new Date();
                                if (scheduling.dateType === 'tomorrow') baseDate.setDate(baseDate.getDate() + 1);
                                else if (scheduling.dateType === 'custom' && scheduling.customDate) {
                                  const [y, mm, dd] = scheduling.customDate.split('-');
                                  baseDate.setFullYear(parseInt(y), parseInt(mm) - 1, parseInt(dd));
                                }
                                const [h, m] = val.split(':');
                                baseDate.setHours(parseInt(h), parseInt(m), 0, 0);
                                setForm(f => ({ ...f, departureTime: baseDate.toISOString() }));
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '10px 14px',
                              borderRadius: '12px',
                              border: errors.slotDepartureTime ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
                              fontSize: '15px',
                              fontWeight: '600',
                              color: '#111827',
                              background: '#F9FAFB',
                              outline: 'none',
                            }}
                          />
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '5px' }}>
                          Departure must be before your selected class slot starts.
                        </p>
                        {errors.slotDepartureTime && <p className="field-error-text fade-in">{errors.slotDepartureTime}</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={`custom-time-picker-container fade-in ${errors.exactTime ? 'has-error' : ''}`}>
                      <div
                        className={`time-display-card ${isTimePickerOpen ? 'active' : ''} ${errors.exactTime ? 'error' : ''}`}
                        onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
                      >
                        <Clock size={20} className="time-card-icon" />
                        <div className="time-values">
                          <span className="time-val">{scheduling.exactTime ? (
                            (() => {
                              const [h, m] = scheduling.exactTime.split(':');
                              const hh = parseInt(h);
                              const period = hh >= 12 ? 'PM' : 'AM';
                              const displayH = hh % 12 || 12;
                              return `${displayH.toString().padStart(2, '0')}:${m} ${period}`;
                            })()
                          ) : '--:-- --'}</span>
                        </div>
                        <ChevronRight size={18} className={`arrow-icon ${isTimePickerOpen ? 'rotate' : ''}`} />
                      </div>

                      {isTimePickerOpen && (
                        <div className="time-picker-dropdown fade-in">
                          <div className="picker-columns">
                            <div className="picker-column">
                              <span className="column-label">Hour</span>
                              <div className="column-options scroll-wheel">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                  <button
                                    key={h}
                                    className={`option-btn ${scheduling.exactTime && parseInt(scheduling.exactTime.split(':')[0]) % 12 === h % 12 ? 'selected' : ''}`}
                                    onClick={() => {
                                      const m = scheduling.exactTime ? scheduling.exactTime.split(':')[1] : '00';
                                      const hh = scheduling.exactTime ? parseInt(scheduling.exactTime.split(':')[0]) : 0;
                                      const isPM = hh >= 12;
                                      const newH = isPM ? (h % 12) + 12 : h % 12;
                                      handleExactTimeChange(`${newH.toString().padStart(2, '0')}:${m}`);
                                      setErrors(prev => ({ ...prev, exactTime: false }));
                                    }}
                                  >
                                    {h.toString().padStart(2, '0')}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="picker-column">
                              <span className="column-label">Min</span>
                              <div className="column-options scroll-wheel">
                                {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map(m => (
                                  <button
                                    key={m}
                                    className={`option-btn ${scheduling.exactTime && scheduling.exactTime.split(':')[1] === m ? 'selected' : ''}`}
                                    onClick={() => {
                                      const h = scheduling.exactTime ? scheduling.exactTime.split(':')[0] : '08';
                                      handleExactTimeChange(`${h}:${m}`);
                                      setErrors(prev => ({ ...prev, exactTime: false }));
                                    }}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="picker-column">
                              <span className="column-label">Period</span>
                              <div className="column-options scroll-wheel">
                                {['AM', 'PM'].map(p => {
                                  const hh = scheduling.exactTime ? parseInt(scheduling.exactTime.split(':')[0]) : 8;
                                  const isPM = hh >= 12;
                                  const isActive = (p === 'PM' && isPM) || (p === 'AM' && !isPM);
                                  return (
                                    <button
                                      key={p}
                                      className={`option-btn ${isActive ? 'selected' : ''}`}
                                      onClick={() => {
                                        const h = scheduling.exactTime ? scheduling.exactTime.split(':')[0] : '08';
                                        const m = scheduling.exactTime ? scheduling.exactTime.split(':')[1] : '00';
                                        let newHH = parseInt(h) % 12;
                                        if (p === 'PM') newHH += 12;
                                        handleExactTimeChange(`${newHH.toString().padStart(2, '0')}:${m}`);
                                        setErrors(prev => ({ ...prev, exactTime: false }));
                                      }}
                                    >
                                      {p}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <button
                            className="picker-done-btn"
                            type="button"
                            onClick={() => setIsTimePickerOpen(false)}
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                    {errors.exactTime && <p className="field-error-text fade-in">{errors.exactTime}</p>}
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className="trip-details-grid">
          <div className="detail-card">
            <div className="detail-card__header">
              <div className="detail-card__icon">
                <Users size={18} strokeWidth={2.5} />
              </div>
              <span className="detail-card__label">Seats</span>
            </div>

            <div className="stepper-container">
              <button type="button" className="stepper-btn" onClick={() => handleSeatsChange(-1)}>
                <Minus size={18} strokeWidth={3} />
              </button>
              <span className="stepper-value">{form.seatsTotal}</span>
              <button type="button" className="stepper-btn" onClick={() => handleSeatsChange(1)}>
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>

            <span className="detail-card__helper">Available seats for passengers</span>
          </div>

          <div className="detail-card">
            <div className="detail-card__header">
              <div className="detail-card__icon">
                <Wallet size={18} strokeWidth={2.5} />
              </div>
              <span className="detail-card__label">Fare per Seat</span>
            </div>

            <div className="fare-input-wrapper">
              <div className="fare-hero-field">
                <span className="fare-currency">Rs</span>
                <input
                  type="number"
                  name="farePerSeat"
                  className="fare-main-input"
                  value={form.farePerSeat}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>

              <div className="fare-intelligence-v2">
                {fetchingFare ? (
                  <span className="intelligence-loading pulse">Calculating...</span>
                ) : form.startLocation && form.destinationLocation && form.startLocation === form.destinationLocation ? (
                  <span className="intelligence-hint error-hint">Start and end locations must be different</span>
                ) : suggestedFare > 0 ? (
                  <>
                    <div className="suggestion-row">
                      <div className="suggestion-details">
                        <span className="suggestion-text">Suggested Rs {suggestedFare}</span>
                        {fareCap > 0 && (
                          <span className="max-cap-text">Max allowed Rs {fareCap}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="apply-pill-btn"
                        onClick={() => {
                          setForm(f => ({ ...f, farePerSeat: suggestedFare.toString() }));
                          setErrors(prev => ({ ...prev, farePerSeat: false }));
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="intelligence-hint">Enter locations for suggestions</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Route Selection ── */}
        {showRouteSelection && (
          <div className="route-selection-section fade-in">
            <div className="route-selection-header">
              <div className="route-selection-icon">
                <Route size={18} strokeWidth={2.5} />
              </div>
              <span className="section-label">Choose Route</span>
            </div>
            <div className="route-options-grid">
              {routeOptions.map((opt) => {
                const isActive = selectedRouteOptionNumber === opt.optionNumber;
                return (
                  <div
                    key={opt.optionNumber}
                    className={`route-option-card ${isActive ? 'active' : ''}`}
                    onClick={() => handleRouteSelect(opt.optionNumber)}
                  >
                    <div className="route-option-card__top">
                      <span className="route-option-card__badge">Route {opt.optionNumber}</span>
                      {isActive && (
                        <div className="route-option-card__check">
                          <Check size={12} strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    <div className="route-option-card__stats">
                      <div className="route-stat">
                        <Navigation size={13} strokeWidth={2.5} />
                        <span>{opt.distanceKm} km</span>
                      </div>
                      <div className="route-stat">
                        <Clock size={13} strokeWidth={2.5} />
                        <span>{opt.durationMin} min</span>
                      </div>
                    </div>
                    {opt.roadHighlights?.length > 0 && (
                      <div className="route-option-card__highlights">
                        {opt.roadHighlights.slice(0, 3).map((road, i) => (
                          <span key={i} className="road-highlight-pill">{road}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Suggested Stops ── */}
        {selectedLandmarks.length > 0 && (
          <div className="stops-section fade-in">
            <div className="stops-section__header">
              <div className="stops-section__icon">
                <MapPinned size={18} strokeWidth={2.5} />
              </div>
              <div className="stops-section__text">
                <span className="section-label">Suggested Stops</span>
                <span className="stops-section__hint">Tap to confirm key pickup points</span>
              </div>
            </div>
            <div className="stops-chips-grid">
              {selectedLandmarks.map((lm, idx) => {
                const isSelected = confirmedStopIndexes.has(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`stop-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleStopIndex(idx)}
                  >
                    <MapPin size={14} strokeWidth={2.5} />
                    <span className="stop-chip__name">{lm.stopName}</span>
                    {isSelected && (
                      <div className="stop-chip__check">
                        <Check size={10} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="gender-section">
          <span className="section-label">Gender Preference</span>
          <div className="gender-pills">
            {[
              { id: 'ANY', label: 'Any' },
              { id: 'FEMALES_ONLY', label: 'Females' }
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                className={`gender-pill ${form.genderPreference === g.id ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, genderPreference: g.id }))}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="publish-submit-btn" disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish Ride'}
        </button>

      </form>

      {activeMapInput && (
        <MapPicker
          initialLocation={{
            lat:
              activeMapInput === 'startLocation'
                ? form.startCoords?.lat ?? latitude
                : form.destinationCoords?.lat ?? latitude,
            lng:
              activeMapInput === 'startLocation'
                ? form.startCoords?.lng ?? longitude
                : form.destinationCoords?.lng ?? longitude,
            address:
              activeMapInput === 'startLocation'
                ? form.startLocation
                : form.destinationLocation,
          }}
          onClose={() => setActiveMapInput(null)}
          onConfirm={(address, coords) => {
            const cleanAddress = cleanAddressLabel(
              address,
              activeMapInput === 'startLocation' ? 'Current Location' : 'Pinned Location'
            );

            setForm((f) => ({
              ...f,
              [activeMapInput]: cleanAddress,
              [`${activeMapInput === 'startLocation' ? 'start' : 'destination'}Coords`]: coords,
            }));

            setErrors((prev) => ({ ...prev, [activeMapInput]: false }));
            setActiveMapInput(null);
          }}
        />
      )}

      {isDatePickerOpen && (
        <div className="date-picker-overlay fade-in" onClick={() => setIsDatePickerOpen(false)}>
          <div className="date-picker-sheet slide-up" onClick={e => e.stopPropagation()}>
            <div className="date-picker-header">
              <div className="date-picker-header__line" />
              <div className="date-picker-header__content">
                <div className="header-title-group">
                  <h3>Select Date</h3>
                  <p>Choose your departure date</p>
                </div>
                <button className="close-sheet-btn" onClick={() => setIsDatePickerOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="calendar-container">
              <div className="calendar-month-header">
                {getMonthName()}
              </div>

              <div className="calendar-weekdays">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => <span key={d}>{d}</span>)}
              </div>

              <div className="calendar-grid">
                {getCalendarDays().map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="calendar-day empty" />;

                  const dateStr = formatFullDate(date);
                  const isSelected = selectedDate === dateStr;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPast = date < today;
                  const isToday = date.getTime() === today.getTime();

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isPast}
                      className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
                      onClick={() => handleCustomDateSelect(dateStr)}
                    >
                      {formatDateNum(date)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="date-picker-footer">
              <div className="selected-date-preview">
                {selectedDate && !['today', 'tomorrow'].includes(selectedDate) ? (
                  <>
                    <span className="preview-label">Selected:</span>
                    <span className="preview-value">
                      {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </>
                ) : (
                  <span className="preview-placeholder">No date selected</span>
                )}
              </div>
              <button
                className="confirm-date-btn"
                onClick={() => setIsDatePickerOpen(false)}
                disabled={!selectedDate || ['today', 'tomorrow'].includes(selectedDate)}
              >
                Confirm Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocation as useGeoLocation } from '../../context/LocationContext';
import { reverseGeocode } from '../../utils/geocoding';
import { MapPin, Calendar, Users, Edit3, Search, ChevronRight, Locate, ChevronLeft, Navigation, Clock, Check, X } from 'lucide-react';
import MapPicker from '../../components/common/MapPicker/MapPicker';
import findRideIllustration from '../../assets/images/find_ride_header_bg.png';
import './FindRidePage.css';

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

export default function FindRidePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status: locationStatus, latitude, longitude, requestLocation } = useGeoLocation();

  const prevFilters = location.state?.filters;

  const [form, setForm] = useState({
    pickupLocation: prevFilters?.pickupLocation || '',
    dropoffLocation: prevFilters?.dropoffLocation || '',
    pickupCoords: prevFilters?.pickupCoords || null,
    dropoffCoords: prevFilters?.dropoffCoords || null,
    targetSlot: prevFilters?.targetSlot || '',
    genderPreference: prevFilters?.genderPreference || 'ANY',
    details: prevFilters?.details || ''
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    if (!prevFilters?.date) return null;
    if (prevFilters.date === 'today' || prevFilters.date === 'tomorrow') return prevFilters.date;
    return 'custom';
  });
  
  const [customDate, setCustomDate] = useState(() => {
    if (prevFilters?.date && prevFilters.date !== 'today' && prevFilters.date !== 'tomorrow') {
      return prevFilters.date;
    }
    return '';
  });

  const [schedulingMode, setSchedulingMode] = useState(prevFilters?.mode || 'slot'); 
  const [selectedSlot, setSelectedSlot] = useState(() => {
    if (prevFilters?.mode === 'slot' && prevFilters.time) {
      return SLOTS.find(s => s.start === prevFilters.time)?.id || null;
    }
    return null;
  });

  const [exactTime, setExactTime] = useState(prevFilters?.mode === 'exact' ? prevFilters.time : '');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [activeMapInput, setActiveMapInput] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (locationStatus === 'granted' && latitude && longitude && !form.pickupLocation) {
      reverseGeocode(latitude, longitude).then(address => {
        setForm(f => ({ ...f, pickupLocation: address, pickupCoords: { lat: latitude, lng: longitude } }));
      });
    }
  }, [locationStatus, latitude, longitude]);

  const handleGetLocation = useCallback(async (fieldName) => {
    try {
      const loc = await requestLocation();
      const address = await reverseGeocode(loc.latitude, loc.longitude);
      setForm(prev => ({
        ...prev,
        [fieldName]: address,
        [`${fieldName.replace('Location', '')}Coords`]: { lat: loc.latitude, lng: loc.longitude }
      }));
      setErrors(prev => ({ ...prev, [fieldName]: false }));
    } catch (err) {
      console.error('Failed to get location:', err);
    }
  }, [requestLocation]);

  const handleMapConfirm = (address, coords) => {
    setForm(prev => ({
      ...prev,
      [activeMapInput]: address,
      [`${activeMapInput.replace('Location', '')}Coords`]: coords
    }));
    setErrors(prev => ({ ...prev, [activeMapInput]: false })); // Clear error
    setActiveMapInput(null);
  };

  const handleSearch = () => {
    const newErrors = {};
    if (!form.pickupLocation) newErrors.pickupLocation = 'Please select a pickup location';
    if (!form.dropoffLocation) newErrors.dropoffLocation = 'Please select a drop-off location';
    if (!selectedDate) newErrors.selectedDate = 'Please select a date';
    
    if (selectedDate) {
      if (schedulingMode === 'slot' && !selectedSlot) {
        newErrors.selectedSlot = 'Please select a class slot';
      }
      if (schedulingMode === 'exact' && !exactTime) {
        newErrors.exactTime = 'Please select an exact time';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalDate = selectedDate === 'custom' ? customDate : selectedDate;
    const finalTime = schedulingMode === 'slot' 
      ? SLOTS.find(s => s.id === selectedSlot)?.start 
      : exactTime;

    navigate('/rides/results', { 
      state: { 
        filters: { 
          ...form, 
          date: finalDate,
          time: finalTime,
          mode: schedulingMode,
          targetSlot: schedulingMode === 'slot' 
            ? SLOTS.find(s => s.id === selectedSlot)?.label 
            : undefined
        } 
      } 
    });
  };

  const getCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    const startDay = firstDay.getDay();
    const padding = startDay === 0 ? 6 : startDay - 1;
    for (let i = 0; i < padding; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const formatFullDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="find-ride-page fade-in">
      {/* 1. Branded Header */}
      <div className="find-header">
        <div className="find-header__nav-group">
          <button className="header-back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>

          <div className="find-header__content">
            <h1 className="find-header__title">Find a Ride</h1>
            <p className="find-header__subtitle">Search for a ride that <br /> matches your journey</p>
          </div>
        </div>

        <div className="find-header__illustration">
          <img src={findRideIllustration} alt="Find Ride" />
        </div>
      </div>

      {/* 2. Main Search Form */}
      <div className="find-container">
        <div className="find-card">
          {/* Location Inputs Group */}
          <div className="location-card-container">
            <div className="location-connector-line" />

            {/* Pickup */}
            <div className={`location-card ${errors.pickupLocation ? 'has-error' : ''}`} onClick={() => setActiveMapInput('pickupLocation')}>
              <div className="location-card__icon-box">
                <div className="icon-circle pickup">
                  <Navigation size={22} strokeWidth={2.5} color="#10B981" style={{ position: 'relative', zIndex: 2 }} />
                </div>
              </div>
              <div className="location-card__content">
                <span className="location-card__label">PICKUP LOCATION</span>
                <span className={`location-card__value ${!form.pickupLocation ? 'placeholder' : ''}`}>
                  {form.pickupLocation || 'Select pickup location'}
                </span>
              </div>
              <button 
                type="button" 
                className="location-card__target-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMapInput('pickupLocation');
                }}
              >
                <Locate size={18} strokeWidth={2.5} />
              </button>
            </div>
            {errors.pickupLocation && <p className="field-error-text fade-in">{errors.pickupLocation}</p>}

            {/* Drop-off */}
            <div className={`location-card ${errors.dropoffLocation ? 'has-error' : ''}`} onClick={() => setActiveMapInput('dropoffLocation')}>
              <div className="location-card__icon-box">
                <div className="icon-circle dropoff">
                  <MapPin size={22} strokeWidth={2.5} color="#EF4444" style={{ position: 'relative', zIndex: 2 }} />
                </div>
              </div>
              <div className="location-card__content">
                <span className="location-card__label">DROP-OFF LOCATION</span>
                <span className={`location-card__value ${!form.dropoffLocation ? 'placeholder' : ''}`}>
                  {form.dropoffLocation || 'Select drop-off location'}
                </span>
              </div>
              <button 
                type="button" 
                className="location-card__target-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMapInput('dropoffLocation');
                }}
              >
                <Locate size={18} strokeWidth={2.5} />
              </button>
            </div>
            {errors.dropoffLocation && <p className="field-error-text fade-in">{errors.dropoffLocation}</p>}
          </div>

          {/* Timing Section */}
          <div className="timing-selection-container">
            <div className={`date-tabs ${errors.selectedDate ? 'has-error' : ''}`}>
              <button
                type="button"
                className={`date-tab ${selectedDate === 'today' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDate('today');
                  setErrors(prev => ({ ...prev, selectedDate: false }));
                }}
              >
                Today
              </button>
              <button
                type="button"
                className={`date-tab ${selectedDate === 'tomorrow' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDate('tomorrow');
                  setErrors(prev => ({ ...prev, selectedDate: false }));
                }}
              >
                Tomorrow
              </button>
              <button
                type="button"
                className={`date-tab custom-date-tab ${selectedDate === 'custom' ? 'active' : ''}`}
                onClick={() => {
                  setIsDatePickerOpen(true);
                  setErrors(prev => ({ ...prev, selectedDate: false }));
                }}
              >
                <Calendar size={16} />
                <span>
                  {selectedDate === 'custom' && customDate
                    ? new Date(customDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Pick Date'}
                </span>
              </button>
            </div>
            {errors.selectedDate && <p className="field-error-text fade-in">{errors.selectedDate}</p>}

            {selectedDate && (
              <>
                <div className="scheduling-mode-toggle fade-in">
                  <button
                    type="button"
                    className={`mode-toggle-btn ${schedulingMode === 'slot' ? 'active' : ''}`}
                    onClick={() => setSchedulingMode('slot')}
                  >
                    Class Slot
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${schedulingMode === 'exact' ? 'active' : ''}`}
                    onClick={() => setSchedulingMode('exact')}
                  >
                    Exact Time
                  </button>
                </div>

                {schedulingMode === 'slot' ? (
                  <>
                    <div className={`slots-grid fade-in ${errors.selectedSlot ? 'has-error-grid' : ''}`}>
                      {SLOTS.map((slot) => {
                        const isActive = selectedSlot === slot.id;
                        const [h, m] = slot.start.split(':');
                        const isMorning = parseInt(h) < 12;

                        let isPassed = false;
                        if (selectedDate === 'today') {
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
                              setSelectedSlot(slot.id);
                              setErrors(prev => ({ ...prev, selectedSlot: false }));
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
                          <span className="time-val">{exactTime ? (
                            (() => {
                              const [h, m] = exactTime.split(':');
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
                              <div className="column-options">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                  <button 
                                    key={h}
                                    className={`option-btn ${exactTime && parseInt(exactTime.split(':')[0]) % 12 === h % 12 ? 'selected' : ''}`}
                                    onClick={() => {
                                      const m = exactTime ? exactTime.split(':')[1] : '00';
                                      const hh = exactTime ? parseInt(exactTime.split(':')[0]) : 0;
                                      const isPM = hh >= 12;
                                      const newH = isPM ? (h % 12) + 12 : h % 12;
                                      setExactTime(`${newH.toString().padStart(2, '0')}:${m}`);
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
                              <div className="column-options">
                                {['00', '15', '30', '45'].map(m => (
                                  <button 
                                    key={m}
                                    className={`option-btn ${exactTime && exactTime.split(':')[1] === m ? 'selected' : ''}`}
                                    onClick={() => {
                                      const h = exactTime ? exactTime.split(':')[0] : '08';
                                      setExactTime(`${h}:${m}`);
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
                              <div className="column-options">
                                {['AM', 'PM'].map(p => {
                                  const hh = exactTime ? parseInt(exactTime.split(':')[0]) : 8;
                                  const isPM = hh >= 12;
                                  const isActive = (p === 'PM' && isPM) || (p === 'AM' && !isPM);
                                  return (
                                    <button 
                                      key={p}
                                      className={`option-btn ${isActive ? 'selected' : ''}`}
                                      onClick={() => {
                                        const h = exactTime ? exactTime.split(':')[0] : '08';
                                        const m = exactTime ? exactTime.split(':')[1] : '00';
                                        let newHH = parseInt(h) % 12;
                                        if (p === 'PM') newHH += 12;
                                        setExactTime(`${newHH.toString().padStart(2, '0')}:${m}`);
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

          {/* Gender Preference Pills */}
          <div className="gender-section">
            <div className="section-header">
              <Users size={16} className="section-icon" />
              <span className="section-label">Gender Preference</span>
            </div>
            <div className="gender-pills">
              {[
                { id: 'ANY', label: 'Any' },
                { id: 'FEMALES_ONLY', label: 'Females' },
                { id: 'MALES_ONLY', label: 'Males' }
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`gender-pill ${form.genderPreference === g.id ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, genderPreference: g.id })}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="details-section">
            <div className="section-header">
              <Edit3 size={16} className="section-icon" />
              <span className="section-label">Additional Details <small>(Optional)</small></span>
            </div>
            <textarea
              className="details-textarea"
              placeholder="I will be waiting near the main gate..."
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
            />
          </div>

          {/* Search CTA */}
          <button className="find-search-btn" onClick={handleSearch}>
            <span>Search</span>
            <Search size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <div className="date-picker-overlay fade-in" onClick={() => setIsDatePickerOpen(false)}>
          <div className="date-picker-sheet slide-up" onClick={e => e.stopPropagation()}>
            <div className="date-picker-header">
              <div className="date-picker-header__line" />
              <div className="date-picker-header__content">
                <div className="header-title-group">
                  <h3>Select Date</h3>
                  <p>Choose your journey date</p>
                </div>
                <button className="close-sheet-btn" onClick={() => setIsDatePickerOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="calendar-container">
              <div className="calendar-month-header">
                <button type="button" className="month-nav-btn" onClick={handlePrevMonth}>
                  <ChevronLeft size={18} />
                </button>
                <span className="month-label">
                  {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button type="button" className="month-nav-btn" onClick={handleNextMonth}>
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="calendar-weekdays">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="calendar-grid">
                {getCalendarDays(viewDate).map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="calendar-day empty" />;
                  const dateStr = formatFullDate(date);
                  const isSelected = customDate === dateStr;
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const isPast = date < today;
                  const isToday = date.getTime() === today.getTime();

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isPast}
                      className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
                      onClick={() => {
                        setCustomDate(dateStr);
                        setSelectedDate('custom');
                      }}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="date-picker-footer">
              <div className="selected-date-preview">
                {customDate ? (
                  <>
                    <span className="preview-label">Selected:</span>
                    <span className="preview-value">
                      {new Date(customDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </>
                ) : (
                  <span className="preview-placeholder">No date selected</span>
                )}
              </div>
              <button 
                className="confirm-date-btn" 
                onClick={() => setIsDatePickerOpen(false)}
                disabled={!customDate}
              >
                Confirm Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Picker Modal */}
      {activeMapInput && (
        <MapPicker
          initialLocation={{ lat: latitude, lng: longitude }}
          onClose={() => setActiveMapInput(null)}
          onConfirm={handleMapConfirm}
        />
      )}
    </div>
  );
}


import React from 'react';
import { MapPin, User, Star, Users, Zap, Clock, Navigation, Map, ArrowRight } from 'lucide-react';
import './RideCard.css';

export default function RideCard({ ride, onAction }) {
  const isInstant = ride.rideType === 'INSTANT';

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;

  const getShortAddress = (address) => {
    if (!address) return 'Unknown';
    const trimmed = address.trim();
    if (COORDS_ONLY_REGEX.test(trimmed)) return 'Pinned Location';
    return trimmed.split(',')[0].trim();
  };

  return (
    <div className={`ride-card-v4 ${isInstant ? 'instant' : 'scheduled'}`} onClick={() => onAction(ride)}>
      {isInstant && (
        <div className="v4-badge">
          <Zap size={12} fill="#fff" color="#fff" />
          <span>URGENT: LEAVING NOW</span>
        </div>
      )}
      {ride.genderPreference === 'FEMALES_ONLY' && (
        <div className={`v4-badge female ${!isInstant ? 'female-only-right' : ''}`}>
          <User size={12} fill="#fff" color="#fff" />
          <span>FEMALES ONLY</span>
        </div>
      )}

      {/* Main Row: Avatar + Info + Price */}
      <div className="v4-header">
        <div className="v4-driver">
          <div className="v4-avatar">
            {ride.driver?.fullName?.[0]?.toUpperCase() || <User size={20} />}
          </div>
          <div className="v4-driver-info">
            <h4 className="v4-name">{ride.driver?.fullName || 'Driver'}</h4>
            <div className="v4-rating">
              <Star size={12} fill="#F59E0B" color="#F59E0B" />
              <span>{((ride.driver?.trustScore || 100) / 20).toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="v4-price">
          <span className="v4-currency">Rs.</span>
          <span className="v4-amount">{ride.farePerSeat}</span>
        </div>
      </div>

      {/* Route Section */}
      <div className="v4-route">
        <div className="v4-timeline">
          <div className="v4-dot start" />
          <div className="v4-line" />
          <div className="v4-dot end" />
        </div>
        <div className="v4-locations">
          <div className="v4-loc-item">
            <span className="v4-loc-label">PICKUP</span>
            <span className="v4-loc-name">{getShortAddress(ride.startLocation)}</span>
          </div>
          <div className="v4-loc-item">
            <span className="v4-loc-label">DROP-OFF</span>
            <span className="v4-loc-name">{getShortAddress(ride.destinationLocation)}</span>
          </div>
        </div>
        <button className="v4-map-btn" onClick={(e) => { e.stopPropagation(); onAction(ride); }}>
          <Map size={20} />
        </button>
      </div>

      {/* Footer: Time + Safety Mix + Action */}
      <div className="v4-footer">
        <div className="v4-meta">
          <div className="v4-meta-item time">
            <Clock size={14} />
            <span>{formatTime(ride.departureTime)} • {formatDate(ride.departureTime)}</span>
          </div>
          
          <div className="v4-meta-item mix">
            <Users size={14} />
            <div className="v4-mix-breakdown">
              <span className={`v4-mix-driver ${ride.occupancyMix?.maleDriverCount > 0 ? 'm' : 'f'}`}>
                Driver ({ride.occupancyMix?.maleDriverCount > 0 ? 'M' : 'F'})
              </span>
              <span className="v4-mix-passengers">
                {ride.occupancyMix?.malePassengerCount > 0 || ride.occupancyMix?.femalePassengerCount > 0 ? (
                  <>• {ride.occupancyMix?.malePassengerCount || 0}M, {ride.occupancyMix?.femalePassengerCount || 0}F</>
                ) : (
                  '• Solo'
                )}
              </span>
            </div>
          </div>
        </div>
        
        <button className="v4-action-btn" onClick={(e) => { e.stopPropagation(); onAction(ride); }}>
          {isInstant ? 'Join' : 'Request'}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}




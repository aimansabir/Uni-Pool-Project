import React from 'react';
import { MapPin, User, Star, Users, Zap, Clock, ChevronRight, Navigation } from 'lucide-react';
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

  return (
    <div className={`ride-card-v3 ${isInstant ? 'instant' : 'scheduled'}`} onClick={() => onAction(ride)}>
      {/* Header: Driver & Fare */}
      <div className="card-v3__header">
        <div className="driver-profile">
          <div className="avatar-wrapper">
            {ride.driver?.imageUrl ? (
              <img src={ride.driver.imageUrl} alt={ride.driver.fullName} />
            ) : (
              <User size={22} color="#9CA3AF" />
            )}
          </div>
          <div className="driver-meta">
            <h4 className="driver-name">{ride.driver?.fullName}</h4>
            <div className="driver-rating">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  size={12} 
                  fill={s <= Math.round((ride.driver?.trustScore || 100) / 20) ? "#FDBA2E" : "none"} 
                  color="#FDBA2E" 
                />
              ))}
              <span className="rating-num">{((ride.driver?.trustScore || 100) / 20).toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="fare-badge">
          <span className="fare-currency">PKR</span>
          <span className="fare-amount">{ride.farePerSeat}</span>
        </div>
      </div>

      {/* Body: Route & Time */}
      <div className="card-v3__body">
        <div className="route-visual">
          <div className="route-dot start" />
          <div className="route-line" />
          <div className="route-dot end" />
        </div>
        <div className="route-details">
          <div className="route-stop">
            <span className="stop-label">Pickup</span>
            <span className="stop-name">{ride.startLocation}</span>
          </div>
          <div className="route-stop">
            <span className="stop-label">Drop-off</span>
            <span className="stop-name">{ride.destinationLocation}</span>
          </div>
        </div>
      </div>

      {/* Footer: Meta & Action */}
      <div className="card-v3__footer">
        <div className="ride-meta">
          <div className="meta-item">
            <Clock size={14} />
            <span>{isInstant ? 'Now' : formatTime(ride.departureTime)}</span>
          </div>
          <div className="meta-item">
            <Users size={14} />
            <span>{ride.occupancyMix?.text || '1 Driver'}</span>
          </div>
          <div className="meta-item status-pill">
            <span>{formatDate(ride.departureTime)}</span>
          </div>
        </div>
        <button className="book-btn" onClick={(e) => { e.stopPropagation(); onAction(ride); }}>
          Request Seat
        </button>
      </div>
    </div>
  );
}

import React from 'react';
import { MapPin, User, Star, Users, Zap, Clock } from 'lucide-react';
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
    <div className={`ride-card-v2 ${isInstant ? 'instant' : 'scheduled'}`} onClick={() => onAction(ride)}>
      <div className="card-v2__top">
        <div className="card-v2__profile">
          <div className="avatar-frame">
            {ride.driver?.imageUrl ? (
                <img src={ride.driver.imageUrl} alt={ride.driver.fullName} />
            ) : (
                <User size={24} color="#9CA3AF" />
            )}
          </div>
          <div className="driver-info">
            <h4 className="driver-name">{ride.driver?.fullName}</h4>
            <div className="driver-score">
              <Star size={10} fill="#FDBA2E" color="#FDBA2E" />
              <span>{ride.driver?.trustScore || '4.8'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-v2__content">
        <div className="details-grid">
          <div className="detail-item">
            <MapPin size={14} className="detail-icon" />
            <div className="detail-copy">
              <span className="label">Route</span>
              <span className="value">{ride.startLocation} → {ride.destinationLocation}</span>
            </div>
          </div>
          <div className="detail-item">
            <User size={14} className="detail-icon" />
            <div className="detail-copy">
              <span className="label">Gender Preference</span>
              <span className="value">{ride.genderPreference === 'ANY' ? 'Any Gender' : 'Females Only'}</span>
            </div>
          </div>
          {!isInstant && ride.targetSlot && (
            <div className="detail-item">
              <Clock size={14} className="detail-icon" />
              <div className="detail-copy">
                <span className="label">Target Slot</span>
                <span className="value">{ride.targetSlot}</span>
              </div>
            </div>
          )}
          <div className="detail-item">
            <Users size={14} className="detail-icon" />
            <div className="detail-copy">
              <span className="label">Occupants</span>
              <span className="value">{ride.occupancyMix?.text || '1 Male (Driver)'}</span>
            </div>
          </div>
        </div>

        <div className="card-v2__right-status">
          <div className="fare-tag-sidebar">Fare: {ride.farePerSeat}Rs</div>
          
          <div className={`status-box-sidebar ${isInstant ? 'instant' : 'scheduled'}`}>
            {isInstant ? (
              <div className="status-value-combined highlight">
                <Zap size={14} fill="#F59E0B" color="#F59E0B" className="status-icon" />
                <span className="status-label-small">LEAVING</span>
                <span className="status-main-text">Now</span>
              </div>
            ) : (
              <div className="status-value-combined scheduled">
                <Clock size={14} className="status-icon" />
                <span className="status-label-small">SCHEDULED</span>
                <span className="status-main-text">{formatTime(ride.departureTime)}</span>
                <span className="status-day-pill">{formatDate(ride.departureTime)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card-v2__actions">
        <button className={`cta-button ${isInstant ? 'primary' : 'secondary'}`} onClick={() => onAction(ride)}>
          {isInstant && <Zap size={16} fill="white" />}
          <span>{isInstant ? 'Join Instantly' : 'Request Seat'}</span>
        </button>
      </div>
    </div>
  );
}

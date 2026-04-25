import React from 'react';
import { MapPin, User, Star, Users, Zap, Clock, ChevronRight, Navigation, Map, ArrowRight } from 'lucide-react';
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

  const getShortAddress = (address) => {
    if (!address) return '';
    return address.split(',')[0].trim();
  };

  return (
    <div className={`ride-card-v3 ${isInstant ? 'instant' : 'scheduled'}`}>
      {isInstant && (
        <div className="card-v3__instant-badge">
          <Zap size={14} fill="#F59E0B" color="#F59E0B" />
          <span>Live Feed: Leaving Now</span>
        </div>
      )}
      {/* Header: Driver & Fare */}
      <div className="card-v3__header">
        <div className="driver-profile">
          <div className="avatar-wrapper">
            {ride.driver?.imageUrl ? (
              <img src={ride.driver.imageUrl} alt={ride.driver.fullName} />
            ) : (
              <User size={28} color="#9CA3AF" />
            )}
          </div>
          <div className="driver-meta">
            <h4 className="driver-name">{ride.driver?.fullName || 'Driver Name'}</h4>
            <div className="driver-rating">
              <div className="stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={10}
                    fill={s <= Math.round((ride.driver?.trustScore || 100) / 20) ? "#FDBA2E" : "none"}
                    color="#FDBA2E"
                  />
                ))}
              </div>
              <span className="rating-num">{((ride.driver?.trustScore || 100) / 20).toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="fare-badge">
            <span className="fare-currency">PKR</span>
            <span className="fare-amount">{ride.farePerSeat}</span>
          </div>
        </div>
      </div>

      {/* Body: Route Timeline */}
      <div className="card-v3__body">
        <div className="route-visual">
          <div className="route-dot start">
            <div className="dot-inner" />
          </div>
          <div className="route-line-dashed" />
          <div className="route-dot end">
            <div className="dot-inner" />
          </div>
        </div>
        <div className="route-details">
          <div className="route-stop">
            <div className="badge-wrapper">
              <span className="stop-badge pickup">PICKUP</span>
            </div>
            <span className="stop-name">{getShortAddress(ride.startLocation)}</span>
          </div>
          <div className="route-stop">
            <div className="badge-wrapper">
              <span className="stop-badge dropoff">DROP-OFF</span>
            </div>
            <span className="stop-name">{getShortAddress(ride.destinationLocation)}</span>
          </div>
        </div>
        <div className="route-action">
          <button className="body-route-btn" onClick={(e) => { e.stopPropagation(); onAction(ride); }}>
            <Map size={25} />
          </button>
        </div>
      </div>

      {/* Footer: Row-based with dividers */}
      <div className="card-v3__footer-row">
        {/* Time Section */}
        <div className="footer-section time">
          <div className="section-icon">
            <Clock size={14} />
          </div>
          <div className="section-content">
            <span className="time-val">{formatTime(ride.departureTime)}</span>
            <span className="date-val">{formatDate(ride.departureTime)}</span>
          </div>
        </div>

        <div className="section-divider" />

        {/* Mix Section */}
        <div className="footer-section mix">
          <div className="section-icon">
            <Users size={14} />
          </div>
          <div className="section-content">
            <div className="mix-line">Driver: {ride.occupancyMix?.maleDriverCount > 0 ? 'Male' : 'Female'}</div>
            <div className="mix-line">Passengers: {ride.occupancyMix?.malePassengerCount || 0}M, {ride.occupancyMix?.femalePassengerCount || 0}F</div>
          </div>
        </div>

        <div className="section-divider" />

        {/* Actions Section */}
        <div className="footer-section actions">
          <button className="mini-action-btn request" onClick={(e) => { e.stopPropagation(); onAction(ride); }}>
            <span>Request<br />Seat</span>
          </button>
        </div>
      </div>
    </div>
  );
}




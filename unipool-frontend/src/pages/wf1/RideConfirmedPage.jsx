import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatPKR, formatDateTime } from '../../utils/formatters';
import Button from '../../components/common/Button/Button';
import './RideConfirmedPage.css';

export default function RideConfirmedPage() {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const ride = state?.ride;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
  const cleanLocation = (addr) => {
    if (!addr) return 'Unknown';
    const trimmed = addr.trim();
    if (COORDS_ONLY_REGEX.test(trimmed)) return 'Pinned Location';
    return trimmed.split(',')[0].trim();
  };

  return (
    <div className="ride-confirmed fade-in">
      <div className="ride-confirmed__illustration">
        <div className="illustration-wrapper">
          <svg width="160" height="120" viewBox="0 0 160 120" fill="none" className="car-svg">
            {/* Ground shadow */}
            <ellipse cx="80" cy="100" rx="65" ry="10" fill="#F1F5F9"/>
            
            {/* Car body */}
            <rect x="30" y="55" width="100" height="35" rx="12" fill="var(--color-accent-primary)" />
            <path d="M45 55L55 35H105L115 55H45Z" fill="#FBBF24" />
            
            {/* Windows */}
            <path d="M58 39H78V52H53L58 39Z" fill="#1F2937" fillOpacity="0.1" />
            <path d="M82 39H102L107 52H82V39Z" fill="#1F2937" fillOpacity="0.1" />
            
            {/* Wheels */}
            <circle cx="50" cy="90" r="10" fill="#1F2937" />
            <circle cx="50" cy="90" r="4" fill="#4B5563" />
            <circle cx="110" cy="90" r="10" fill="#1F2937" />
            <circle cx="110" cy="90" r="4" fill="#4B5563" />
            
            {/* Headlights */}
            <rect x="122" y="65" width="8" height="6" rx="3" fill="#FFFBEB" />
          </svg>
          
          <div className="success-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </div>

      <div className="ride-confirmed__text-group">
        <h2 className="ride-confirmed__title">Ride Confirmed!</h2>
        <p className="ride-confirmed__subtitle">
          Your ride has been successfully published. Please pick up the passengers on your way.
        </p>
      </div>

      {ride && (
        <div className="ride-confirmed__details-card">
          <div className="detail-item">
            <div className="detail-item__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div className="detail-item__content">
              <span className="detail-item__label">Route</span>
              <span className="detail-item__value">
                {cleanLocation(ride.startLocation)} → {cleanLocation(ride.destinationLocation)}
              </span>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-item__icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="detail-item__content">
              <span className="detail-item__label">Departure</span>
              <span className="detail-item__value">
                {formatDateTime(ride.departureTime)}
              </span>
            </div>
          </div>

          <div className="detail-item-row">
            <div className="detail-item">
              <div className="detail-item__icon icon--gold">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="M17.3 12.3l.7.7" />
                </svg>
              </div>
              <div className="detail-item__content">
                <span className="detail-item__label">Fare</span>
                <span className="detail-item__value font-bold">{formatPKR(ride.farePerSeat)}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-item__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="detail-item__content">
                <span className="detail-item__label">Seats</span>
                <span className="detail-item__value">{ride.seatsAvailable} available</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="ride-confirmed__actions-vertical">
        <Button variant="accent" className="btn-tracking" onClick={() => navigate('/active-ride', { state: { rideId: id || ride?.id } })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
          </svg>
          Ride live tracking
        </Button>
        
        <div className="actions-row">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Home
          </Button>
          <Button variant="primary" onClick={() => navigate(`/rides/${id || ride?.id}`)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Details
          </Button>
        </div>
      </div>
    </div>
  );
}

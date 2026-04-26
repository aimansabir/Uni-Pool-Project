import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatPKR, formatDateTime } from '../../utils/formatters';
import Button from '../../components/common/Button/Button';
import './RideConfirmedPage.css';

export default function RideConfirmedPage() {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const ride = state?.ride;

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
        <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
          <ellipse cx="70" cy="85" rx="60" ry="8" fill="#E8E8E8"/>
          <rect x="25" y="40" width="90" height="35" rx="10" fill="#F3A32D"/>
          <rect x="35" y="28" width="70" height="28" rx="8" fill="#E8941F"/>
          <circle cx="40" cy="78" r="8" fill="#333" stroke="#555" strokeWidth="2"/>
          <circle cx="100" cy="78" r="8" fill="#333" stroke="#555" strokeWidth="2"/>
          <rect x="42" y="34" width="18" height="14" rx="3" fill="#87CEEB" opacity="0.8"/>
          <rect x="68" y="34" width="18" height="14" rx="3" fill="#87CEEB" opacity="0.8"/>
          <circle cx="108" cy="50" r="4" fill="#fff" opacity="0.7"/>
          <circle cx="70" cy="18" r="12" fill="#18A085" stroke="#fff" strokeWidth="3"/>
          <path d="M64 18l4 4 8-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h2 className="ride-confirmed__title">Ride Confirmed!</h2>
      <p className="ride-confirmed__subtitle">
        Please pick up the passengers on your way
      </p>

      {ride && (
        <div className="ride-confirmed__details">
          <div className="ride-confirmed__detail-row">
            <span className="ride-confirmed__detail-label">Route</span>
            <span className="ride-confirmed__detail-value">
              {cleanLocation(ride.startLocation)} → {cleanLocation(ride.destinationLocation)}
            </span>
          </div>
          <div className="ride-confirmed__detail-row">
            <span className="ride-confirmed__detail-label">Departure</span>
            <span className="ride-confirmed__detail-value">
              {formatDateTime(ride.departureTime)}
            </span>
          </div>
          <div className="ride-confirmed__detail-row">
            <span className="ride-confirmed__detail-label">Fare per Seat</span>
            <span className="ride-confirmed__detail-value text-primary font-bold">
              {formatPKR(ride.farePerSeat)}
            </span>
          </div>
          <div className="ride-confirmed__detail-row">
            <span className="ride-confirmed__detail-label">Seats</span>
            <span className="ride-confirmed__detail-value">{ride.seatsAvailable} available</span>
          </div>
        </div>
      )}

      <div className="ride-confirmed__actions">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          🏠 Back to home
        </Button>
        <Button variant="accent" onClick={() => navigate('/active-ride', { state: { rideId: id || ride?.id } })}>
          🗺️ Ride live tracking
        </Button>
        <Button variant="primary" onClick={() => navigate(`/rides/${id || ride?.id}`)}>
          📋 View Details
        </Button>
      </div>
    </div>
  );
}

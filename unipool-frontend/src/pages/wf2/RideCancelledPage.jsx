import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import BottomNav from '../../layouts/BottomNav';
import './RideCancelledPage.css';

export default function RideCancelledPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const driverName = state?.driverName || 'The driver';
  const isInstant = state?.rideType === 'INSTANT';

  return (
    <div className="ride-cancelled-page fade-in">
      <div className="rc-content">
        {/* Warning Icon */}
        <div className="rc-icon-wrap">
          <AlertTriangle size={56} strokeWidth={2} />
        </div>

        {/* Heading */}
        <h1 className="rc-title">
          {isInstant ? '🚨 URGENT: Ride Cancelled!' : 'Ride Cancelled'}
        </h1>

        {/* Message */}
        <p className="rc-message">
          {isInstant
            ? `${driverName} has cancelled this Instant Ride. Your seat has been refunded. Please book an alternative ride immediately from the Live Feed.`
            : `${driverName} has cancelled this ride. Your booking has been removed. Please search for another available ride.`
          }
        </p>

        {/* Action Button */}
        <button
          className="rc-action-btn"
          onClick={() => navigate('/rides/find', { replace: true })}
        >
          {isInstant ? 'Back to Live Feed' : 'Find Another Ride'}
        </button>

        <button
          className="rc-secondary-btn"
          onClick={() => navigate('/bookings', { replace: true })}
        >
          View My Bookings
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

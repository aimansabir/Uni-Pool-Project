import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { bookingRequestsApi } from '../../api/bookingRequests.api';
import { chatApi } from '../../api/chat.api';
import { useToast } from '../../context/ToastContext';
import BottomNav from '../../layouts/BottomNav';
import { CheckCircle, Calendar, ChevronLeft, Zap, MessageCircle } from 'lucide-react';
import './BookingConfirmedPage.css';

const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const cleanLoc = (addr) => {
  if (!addr) return 'Location';
  const t = addr.trim();
  return COORDS_ONLY_REGEX.test(t) ? 'Pinned Location' : t.split(',')[0].trim();
};

export default function BookingConfirmedPage() {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [cancelling, setCancelling] = useState(false);

  const booking = state?.booking;
  const ride = booking?.ride || state?.ride;
  const isInstant = ride?.rideType === 'INSTANT';
  const driverName = ride?.driver?.fullName || booking?.ride?.driver?.fullName || 'the driver';

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const handleCancel = async () => {
    const bookingId = id || booking?.id;
    if (!bookingId) return;
    setCancelling(true);
    try {
      await bookingRequestsApi.cancel(bookingId);
      showSuccess('Booking cancelled. Seat freed up.');
      navigate('/bookings', { replace: true });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenChat = async () => {
    const bookingId = id || booking?.id;
    if (!bookingId) return;
    try {
      const res = await chatApi.openByBooking(bookingId);
      navigate(`/chat/${res.data.id}`, {
        state: { otherUser: ride?.driver, ride }
      });
    } catch (err) {
      showError(err.message || 'Could not open chat');
    }
  };

  return (
    <div className={`booking-confirmed-page fade-in ${isInstant ? 'instant-variant' : ''}`}>
      <div className="bc-content">
        {/* Status Icon */}
        <div className={`bc-status-icon ${isInstant ? 'instant' : 'scheduled'}`}>
          {isInstant ? (
            <Zap size={42} fill="#fff" color="#fff" />
          ) : (
            <CheckCircle size={52} strokeWidth={2} />
          )}
        </div>

        {/* Heading */}
        <h1 className="bc-title">
          {isInstant ? 'Instant Ride Confirmed!' : 'Your ride has been Requested'}
        </h1>
        <p className="bc-subtitle">
          {isInstant
            ? 'Your driver will wait ONLY 5 mins'
            : `Request Sent to ${driverName}!`
          }
        </p>

        {/* Date */}
        {ride?.departureTime && (
          <div className="bc-date">
            <Calendar size={16} strokeWidth={2.5} />
            <span>{formatDate(ride.departureTime)}</span>
          </div>
        )}

        {/* Route Card */}
        <div className="bc-route-card">
          <div className="bc-route-item">
            <div className="bc-route-dot start" />
            <span>{cleanLoc(ride?.startLocation)}</span>
          </div>
          <div className="bc-route-connector" />
          <div className="bc-route-item">
            <div className="bc-route-dot end" />
            <span>{cleanLoc(ride?.destinationLocation)}</span>
          </div>
        </div>

        {/* Fare Box */}
        <div className="bc-fare-box">
          <span className="bc-fare-label">Total price for 1 passenger</span>
          <span className="bc-fare-amount">Rs {ride?.farePerSeat || '—'}</span>
        </div>

        {/* Instant-specific: Track Ride button */}
        {isInstant && (
          <button
            className="bc-track-btn"
            onClick={() => navigate('/active-ride', { state: { rideId: ride?.id } })}
          >
            Track Ride
          </button>
        )}

        {/* Message Driver button */}
        {(id || booking?.id) && (
          <button
            className="bc-msg-btn"
            onClick={handleOpenChat}
          >
            <MessageCircle size={18} />
            Message Driver
          </button>
        )}

        {/* Cancel Button */}
        <button
          className="bc-cancel-btn"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? 'Cancelling...' : 'Cancel Request'}
        </button>

        {/* Info note */}
        {!isInstant && (
          <p className="bc-info-note">
            We'll notify you when the driver responds to your request.
          </p>
        )}
      </div>
    </div>
  );
}

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { bookingRequestsApi } from '../../api/bookingRequests.api';
import { chatApi } from '../../api/chat.api';
import { useToast } from '../../context/ToastContext';
import { CheckCircle, Calendar, Zap, MessageCircle, Info } from 'lucide-react';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
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
  
  const [booking, setBooking] = useState(state?.booking || null);
  const [ride, setRide] = useState(state?.ride || booking?.ride || null);
  const [loading, setLoading] = useState(!booking);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!booking && id) {
      bookingRequestsApi.getById(id)
        .then(res => {
          setBooking(res.data);
          setRide(res.data.ride);
          setLoading(false);
        })
        .catch(err => {
          showError('Failed to load booking details');
          setLoading(false);
        });
    }
  }, [id, booking]); // eslint-disable-line

  if (loading) return <FullPageSpinner />;
  if (!booking) return <div className="p-4 text-center">Booking not found</div>;

  const isInstant = ride?.rideType === 'INSTANT';
  const driverName = ride?.driver?.fullName || 'the driver';

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const handleCancel = async () => {
    if (!booking.id) return;
    setCancelling(true);
    try {
      await bookingRequestsApi.cancel(booking.id);
      showSuccess('Booking cancelled. Seat freed up.');
      navigate('/bookings', { replace: true });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenChat = async () => {
    if (!booking.id) return;
    try {
      const res = await chatApi.openByBooking(booking.id);
      navigate(`/chat/${res.data.id}`, {
        state: { otherUser: ride?.driver, ride }
      });
    } catch (err) {
      showError(err.message || 'Could not open chat');
    }
  };

  // Determine Title and Subtitle
  let title = 'Ride Details';
  let subtitle = '';
  let canCancel = false;
  let showTrack = false;
  
  if (booking.status === 'PENDING') {
    title = 'Ride Requested';
    subtitle = `Request sent to ${driverName}`;
    canCancel = true;
  } else if (booking.status === 'CANCELLED' || booking.status === 'REJECTED') {
    title = `Ride ${booking.status === 'CANCELLED' ? 'Cancelled' : 'Rejected'}`;
    subtitle = 'This request is no longer active.';
  } else if (booking.status === 'ACCEPTED') {
    if (ride?.status === 'PUBLISHED') {
      title = isInstant ? 'Instant Ride Confirmed!' : 'Ride Confirmed';
      subtitle = isInstant ? 'Your driver will wait ONLY 5 mins' : `You are booked with ${driverName}`;
      canCancel = true;
    } else if (ride?.status === 'IN_PROGRESS') {
      title = 'Ride In Progress';
      subtitle = 'Driver is currently on the way';
      showTrack = true;
    } else if (ride?.status === 'COMPLETED') {
      title = 'Ride Completed';
      subtitle = `Hope you had a great trip with ${driverName}!`;
    } else if (ride?.status === 'CANCELLED') {
      title = 'Ride Cancelled';
      subtitle = 'The driver cancelled this ride.';
    }
  }

  return (
    <div className={`booking-confirmed-page fade-in ${isInstant ? 'instant-variant' : ''}`}>
      <div className="bc-content">
        {/* Status Icon */}
        <div className={`bc-status-icon ${isInstant && booking.status === 'ACCEPTED' ? 'instant' : 'scheduled'}`}>
          {isInstant && booking.status === 'ACCEPTED' ? (
            <Zap size={42} fill="#fff" color="#fff" />
          ) : ride?.status === 'COMPLETED' ? (
            <CheckCircle size={52} strokeWidth={2} color="#10b981" />
          ) : booking.status === 'CANCELLED' || booking.status === 'REJECTED' || ride?.status === 'CANCELLED' ? (
            <Info size={52} strokeWidth={2} color="#ef4444" />
          ) : (
            <CheckCircle size={52} strokeWidth={2} />
          )}
        </div>

        {/* Heading */}
        <h1 className="bc-title">{title}</h1>
        <p className="bc-subtitle">{subtitle}</p>

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
          <span className="bc-fare-label">Total price for {booking.requestedSeats} passenger{booking.requestedSeats > 1 ? 's' : ''}</span>
          <span className="bc-fare-amount">Rs {ride?.farePerSeat * (booking.requestedSeats || 1) || '—'}</span>
        </div>

        {/* Vehicle Info if available */}
        {ride?.vehicle && (
          <div className="bc-fare-box" style={{ marginTop: '12px', background: 'transparent', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span className="bc-fare-label">Vehicle</span>
            <span className="bc-fare-amount" style={{fontSize: '15px'}}>{ride.vehicle.make} {ride.vehicle.model} • {ride.vehicle.color}</span>
            <span className="bc-fare-label" style={{marginTop: '4px'}}>{ride.vehicle.registrationNumber}</span>
          </div>
        )}

        {/* Actions */}
        {showTrack && (
          <button
            className="bc-track-btn"
            style={{marginTop: '24px'}}
            onClick={() => navigate(`/rides/${ride?.id}/track`)}
          >
            Track Ride
          </button>
        )}

        {/* Payment & Rating status if available */}
        {booking.status === 'ACCEPTED' && ride?.status === 'COMPLETED' && (
           <div className="bc-fare-box" style={{ marginTop: '24px', background: 'transparent', border: 'none', padding: 0 }}>
             {booking.settlementCompleted ? (
               <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                 <CheckCircle size={16} /> Payment & Rating Completed
               </div>
             ) : (
               <button
                 className="bc-track-btn"
                 onClick={() => navigate(`/rides/${ride.id}/payment-rating`)}
               >
                 Payment & Rating
               </button>
             )}
           </div>
        )}

        {/* Message Driver button */}
        {(booking.id && booking.status !== 'CANCELLED' && booking.status !== 'REJECTED') && (
          <button
            className="bc-msg-btn"
            onClick={handleOpenChat}
            style={{marginTop: showTrack || ride?.status === 'COMPLETED' ? '12px' : '24px'}}
          >
            <MessageCircle size={18} />
            Message Driver
          </button>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <button
            className="bc-cancel-btn"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Request'}
          </button>
        )}

        {/* Info note */}
        {booking.status === 'PENDING' && (
          <p className="bc-info-note">
            We'll notify you when the driver responds to your request.
          </p>
        )}
      </div>
    </div>
  );
}

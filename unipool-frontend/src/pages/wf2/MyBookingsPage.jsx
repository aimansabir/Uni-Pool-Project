import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingRequestsApi } from '../../api/bookingRequests.api';
import { useToast } from '../../context/ToastContext';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import BottomNav from '../../layouts/BottomNav';
import {
  MapPin, Clock, Zap, ChevronRight, CheckCircle,
  XCircle, AlertCircle, Car, Users, ChevronLeft
} from 'lucide-react';
import './MyBookingsPage.css';

const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const cleanLoc = (addr) => {
  if (!addr) return 'Location';
  const t = addr.trim();
  return COORDS_ONLY_REGEX.test(t) ? 'Pinned Location' : t.split(',')[0].trim();
};

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: '#3B82F6', bg: '#EFF6FF', icon: AlertCircle },
  ACCEPTED:  { label: 'Confirmed', color: '#10B981', bg: '#F0FDF4', icon: CheckCircle },
  REJECTED:  { label: 'Rejected',  color: '#EF4444', bg: '#FEF2F2', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: '#6B7280', bg: '#F9FAFB', icon: XCircle },
};

function BookingCard({ booking, onCancel, cancelling }) {
  const navigate = useNavigate();
  const ride = booking.ride;
  const isInstant = ride?.rideType === 'INSTANT';
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  const canCancel = ['PENDING', 'ACCEPTED'].includes(booking.status) && ride?.status === 'PUBLISHED';

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const handleCardClick = () => {
    if (ride?.status === 'IN_PROGRESS' && booking.status === 'ACCEPTED') {
      navigate(`/rides/${ride.id}/track`);
    } else if (booking.status === 'ACCEPTED' || booking.status === 'PENDING') {
      navigate(`/bookings/${booking.id}/confirmed`, { state: { booking, ride } });
    }
  };

  return (
    <div
      className={`booking-card ${isInstant ? 'instant' : ''} ${booking.status.toLowerCase()}`}
      onClick={handleCardClick}
      style={{ cursor: canCancel || booking.status === 'ACCEPTED' ? 'pointer' : 'default' }}
    >
      {/* Instant badge */}
      {isInstant && (
        <div className="bc-instant-badge">
          <Zap size={12} fill="#F59E0B" color="#F59E0B" />
          <span>Live Feed · Leaving Now</span>
        </div>
      )}

      {/* Header row */}
      <div className="bc-header">
        {/* Driver avatar placeholder */}
        <div className="bc-avatar">
          <Users size={20} color="#9CA3AF" />
        </div>
        <div className="bc-driver-info">
          <span className="bc-driver-name">{ride?.driver?.fullName || 'Driver'}</span>
          <span className="bc-time">
            <Clock size={12} /> {formatDate(ride?.departureTime)} · {formatTime(ride?.departureTime)}
          </span>
        </div>
        <div className="bc-status-pill" style={{ background: cfg.bg, color: cfg.color }}>
          <StatusIcon size={12} />
          <span>{cfg.label}</span>
        </div>
      </div>

      <div className="bc-route">
        <div className="bc-stop">
          <div className="bc-dot green" />
          <span className="bc-stop-name">{cleanLoc(ride?.startLocation)}</span>
        </div>
        <div className="bc-route-line" />
        <div className="bc-stop">
          <MapPin size={14} color="#EF4444" strokeWidth={3} className="bc-stop-icon" />
          <span className="bc-stop-name">{cleanLoc(ride?.destinationLocation)}</span>
        </div>
      </div>

      {/* Fare + Actions */}
      <div className="bc-footer">
        <div className="bc-fare">
          <Car size={14} color="#D97706" />
          <span>Rs {ride?.farePerSeat} / seat</span>
        </div>
        {booking.status === 'ACCEPTED' && (
          <button
            className="bc-track-chip"
            onClick={(e) => {
              e.stopPropagation();
              if (ride?.status === 'IN_PROGRESS') {
                navigate(`/rides/${ride?.id}/track`);
              } else {
                navigate(`/rides/${ride?.id}/preview`);
              }
            }}
          >
            {ride?.status === 'IN_PROGRESS' ? 'Track Ride' : isInstant ? 'Track Ride' : 'View Route'} <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Cancel button */}
      {canCancel && (
        <button
          className="bc-cancel-btn"
          disabled={cancelling === booking.id}
          onClick={(e) => { e.stopPropagation(); onCancel(booking.id, booking.status); }}
        >
          {cancelling === booking.id ? 'Cancelling…' : 'Cancel Request'}
        </button>
      )}
    </div>
  );
}

export default function MyBookingsPage({ embedded = false }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [cancelling, setCancelling] = useState(null);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await bookingRequestsApi.listMyRequests();
      setBookings(res.data || []);
    } catch (err) {
      showError('Failed to load your bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId, currentStatus) => {
    setCancelling(bookingId);
    try {
      await bookingRequestsApi.cancel(bookingId);
      showSuccess('Booking cancelled. Seat freed up for others.');
      setBookings(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b)
      );
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  const FILTERS = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'];
  const filtered = filter === 'ALL'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const activeCount = bookings.filter(b => ['PENDING', 'ACCEPTED'].includes(b.status)).length;

  if (loading) return <FullPageSpinner />;

  return (
    <div className={`my-bookings-page fade-in ${embedded ? 'embedded' : ''}`}>
      {/* Header — hidden when embedded inside PoolingPage */}
      {!embedded && (
        <div className="mb-header">
          <div className="mb-header__content">
            <button className="mb-back-btn" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="mb-title">My Bookings</h1>
              <p className="mb-subtitle">
                {activeCount > 0 ? `${activeCount} active request${activeCount > 1 ? 's' : ''}` : 'Your ride requests'}
              </p>
            </div>
            <button className="mb-find-btn" onClick={() => navigate('/rides/find')}>
              Find Ride
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`mb-filter ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Find Ride button when embedded */}
      {embedded && (
        <div style={{ padding: '0 16px 4px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="mb-find-btn" onClick={() => navigate('/rides/find')}>
            + Find Ride
          </button>
        </div>
      )}

      {/* List */}
      <div className="mb-list">
        {filtered.length === 0 ? (
          <div className="mb-empty">
            <div className="mb-empty__icon">🚗</div>
            <h3 className="mb-empty__title">
              {filter === 'ALL' ? 'No bookings yet' : `No ${STATUS_CONFIG[filter]?.label || filter} bookings`}
            </h3>
            <p className="mb-empty__desc">Start by finding a ride near your campus</p>
            <button className="mb-empty__cta" onClick={() => navigate('/rides/find')}>
              Find a Ride
            </button>
          </div>
        ) : (
          filtered.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          ))
        )}
      </div>

      {!embedded && <BottomNav />}
    </div>
  );
}

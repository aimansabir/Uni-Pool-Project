import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingRequestsApi } from '../../api/bookingRequests.api';
import { chatApi } from '../../api/chat.api';
import { useToast } from '../../context/ToastContext';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import BottomNav from '../../layouts/BottomNav';
import { ChevronLeft, Users, Zap, Check, X, Clock, MapPin, MessageCircle } from 'lucide-react';
import './IncomingRequestsPage.css';

const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const cleanLoc = (addr) => {
  if (!addr) return 'Location';
  const t = addr.trim();
  return COORDS_ONLY_REGEX.test(t) ? 'Pinned Location' : t.split(',')[0].trim();
};

function PassengerCard({ request, onRespond, responding, onOpenChat }) {
  const isInstant = request.ride?.rideType === 'INSTANT';
  const isProcessing = responding === request.id;
  const isProcessed = ['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(request.status);

  const genderLabel = request.passenger?.gender === 'male' ? '♂ Male' : '♀ Female';
  const genderColor = request.passenger?.gender === 'male' ? '#3B82F6' : '#EC4899';

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className={`ir-card ${isInstant ? 'instant' : ''} ${isProcessed ? `processed ${request.status.toLowerCase()}` : ''}`}>
      {isInstant && !isProcessed && (
        <div className="ir-urgent-banner">
          <Zap size={13} fill="#fff" color="#fff" />
          <span>Instant Ride — Respond NOW</span>
        </div>
      )}

      {/* Passenger row */}
      <div className="ir-passenger-row">
        <div className="ir-avatar">
          <Users size={22} color="#9CA3AF" />
        </div>
        <div className="ir-passenger-info">
          <span className="ir-name">{request.passenger?.fullName || 'Passenger'}</span>
          <span className="ir-gender" style={{ color: genderColor }}>{genderLabel}</span>
        </div>
        {isProcessed && (
          <div className={`ir-done-badge ${request.status.toLowerCase()}`}>
            {request.status === 'ACCEPTED' ? (
              <><Check size={12} /> Accepted</>
            ) : request.status === 'REJECTED' ? (
              <><X size={12} /> Rejected</>
            ) : (
              <><X size={12} /> Cancelled</>
            )}
          </div>
        )}
      </div>

      {/* Route info if available */}
      {(request.pickupStop || request.dropStop) && (
        <div className="ir-stops">
          {request.pickupStop && (
            <div className="ir-stop">
              <div className="ir-stop-dot green" />
              <span>Pickup: {request.pickupStop.stopName}</span>
            </div>
          )}
          {request.dropStop && (
            <div className="ir-stop">
              <div className="ir-stop-dot red" />
              <span>Drop-off: {request.dropStop.stopName}</span>
            </div>
          )}
        </div>
      )}

      {/* Ride info */}
      <div className="ir-meta">
        <div className="ir-meta-item">
          <Clock size={13} />
          <span>{formatTime(request.ride?.departureTime)}</span>
        </div>
        <div className="ir-meta-item">
          <MapPin size={13} />
          <span>{cleanLoc(request.ride?.startLocation)} → {cleanLoc(request.ride?.destinationLocation)}</span>
        </div>
      </div>

      {/* Action buttons */}
      {!isProcessed && (
        <div className="ir-actions">
          <button
            className="ir-btn reject"
            disabled={isProcessing}
            onClick={() => onRespond(request.id, 'REJECTED')}
          >
            <X size={16} strokeWidth={2.5} />
            Reject
          </button>
          <button
            className="ir-btn accept"
            disabled={isProcessing}
            onClick={() => onRespond(request.id, 'ACCEPTED')}
          >
            {isProcessing ? (
              <span className="ir-spinner" />
            ) : (
              <Check size={16} strokeWidth={2.5} />
            )}
            Accept
          </button>
        </div>
      )}

      {/* Message button for accepted requests */}
      {request.status === 'ACCEPTED' && (
        <button
          className="ir-msg-btn"
          onClick={() => onOpenChat(request.id)}
        >
          <MessageCircle size={15} />
          Message Passenger
        </button>
      )}
    </div>
  );
}

export default function IncomingRequestsPage() {
  const { id: rideId } = useParams(); // optional rideId filter
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [responding, setResponding] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = rideId ? { rideId } : {};
      const res = await bookingRequestsApi.getIncoming(params);
      setRequests(res.data || []);
    } catch (err) {
      showError('Failed to load incoming requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId, status) => {
    setResponding(requestId);
    try {
      await bookingRequestsApi.respond(requestId, status);
      showSuccess(status === 'ACCEPTED' ? '✅ Request accepted! Seat reserved.' : 'Request rejected.');
      setRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, status } : r)
      );
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to respond');
    } finally {
      setResponding(null);
    }
  };

  const handleOpenChat = async (bookingRequestId) => {
    try {
      const booking = requests.find(r => r.id === bookingRequestId);
      const res = await chatApi.openByBooking(bookingRequestId);
      navigate(`/chat/${res.data.id}`, {
        state: {
          otherUser: booking?.passenger,
          ride: booking?.ride,
        },
      });
    } catch (err) {
      showError(err.message || 'Could not open chat');
    }
  };

  const pending = requests.filter(r => r.status === 'PENDING');
  const processed = requests.filter(r => r.status !== 'PENDING');
  const filtered = filter === 'PENDING' ? pending : filter === 'PROCESSED' ? processed : requests;

  if (loading) return <FullPageSpinner />;

  return (
    <div className="incoming-page fade-in">
      {/* Header */}
      <div className="ir-header">
        <div className="ir-header__row">
          <button className="ir-back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="ir-header__title">Ride Requests</h1>
            <p className="ir-header__sub">
              {pending.length > 0 ? `${pending.length} pending response${pending.length > 1 ? 's' : ''}` : 'All requests processed'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="ir-tabs">
        {[
          { key: 'PENDING', label: `Pending (${pending.length})` },
          { key: 'PROCESSED', label: `Processed (${processed.length})` },
          { key: 'ALL', label: 'All' },
        ].map(t => (
          <button
            key={t.key}
            className={`ir-tab ${filter === t.key ? 'active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="ir-list">
        {filtered.length === 0 ? (
          <div className="ir-empty">
            <div className="ir-empty__icon">📭</div>
            <p className="ir-empty__text">
              {filter === 'PENDING' ? 'No pending requests right now' : 'Nothing here yet'}
            </p>
          </div>
        ) : (
          filtered.map(r => (
            <PassengerCard
              key={r.id}
              request={r}
              onRespond={handleRespond}
              responding={responding}
              onOpenChat={handleOpenChat}
            />
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

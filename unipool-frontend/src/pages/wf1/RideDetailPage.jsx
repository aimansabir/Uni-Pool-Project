import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ridesApi } from '../../api/rides.api';
import { bookingRequestsApi } from '../../api/bookingRequests.api';
import { rideExecutionApi } from '../../api/rideExecution.api';
import { chatApi } from '../../api/chat.api';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, formatPKR, timeAgo } from '../../utils/formatters';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import {
  ChevronLeft,
  MapPin,
  Users,
  Star,
  MessageSquare,
  Check,
  X,
  TrendingUp,
  Clock,
  Wallet,
  Calendar,
  Car,
  Map as MapIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PassengerRideDetailsView from './PassengerRideDetailsView';
import './RideDetailPage.css';

const STATUS_MAP = {
  PUBLISHED: { variant: 'primary', label: 'Published' },
  IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
  COMPLETED: { variant: 'accent', label: 'Completed' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' },
};

const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const cleanLocation = (addr) => {
  if (!addr) return 'Unknown';
  const trimmed = addr.trim();
  if (COORDS_ONLY_REGEX.test(trimmed)) return 'Pinned Location';
  return trimmed;
};

export default function RideDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [ride, setRide] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [requestLoadingId, setRequestLoadingId] = useState(null);

  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [showConfirmReject, setShowConfirmReject] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const rideRes = await ridesApi.getById(id);
      if (!rideRes.data) throw new Error('Ride not found');
      setRide(rideRes.data);

      try {
        const requestsRes = await bookingRequestsApi.getIncoming({ rideId: id });
        const allRequests = Array.isArray(requestsRes.data) ? requestsRes.data : [];
        setPendingRequests(allRequests.filter(req => req.status === 'PENDING'));
        setAcceptedRequests(allRequests.filter(req => req.status === 'ACCEPTED'));
      } catch (reqErr) {
        console.warn('Failed to load booking requests:', reqErr);
      }
    } catch (err) {
      showError(err.message || 'Failed to load ride details');
      navigate('/rides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRespond = async (requestId, status) => {
    setRequestLoadingId(requestId);
    try {
      await bookingRequestsApi.respond(requestId, status);
      showSuccess(`Request ${status.toLowerCase()}ed successfully`);
      await fetchData();
    } catch (err) {
      showError(err.response?.data?.message || `Failed to ${status.toLowerCase()} request`);
    } finally {
      setRequestLoadingId(null);
      setShowConfirmReject(null);
    }
  };

  const handleStartRide = async () => {
    if (acceptedRequests.length === 0) {
      showError('Accept at least one passenger before starting.');
      return;
    }
    setActionLoading(true);
    try {
      await rideExecutionApi.startRide(id);
      showSuccess('Ride started! Drive safely.');
      navigate(`/rides/${id}/live`);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to start ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRide = async () => {
    setActionLoading(true);
    try {
      await ridesApi.delete(id);
      showSuccess('Ride cancelled successfully');
      navigate('/rides', { replace: true });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel ride');
    } finally {
      setActionLoading(false);
      setShowConfirmCancel(false);
    }
  };

  if (loading) return <FullPageSpinner />;
  if (!ride) return null;

  if (ride.userRole === 'PASSENGER') {
    const myBooking = ride.bookingRequests?.find(b => b.passengerId === user?.id);
    return (
      <PassengerRideDetailsView
        ride={ride}
        myBooking={myBooking}
        onCancelSuccess={() => navigate('/rides')}
      />
    );
  }

  const badge = STATUS_MAP[ride.status] || STATUS_MAP.PUBLISHED;
  const totalSeats = ride.seatsTotal || 0;
  const earnings = ride.farePerSeat * acceptedRequests.length;

  const extractTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const PassengerCard = ({ req, isConfirmed }) => {
    const passenger = req.passenger || {};
    
    const handleOpenGoogleMaps = () => {
      // Try multiple sources for coordinates
      let finalLat = req.pickupLat || req.pickupStop?.lat;
      let finalLng = req.pickupLng || req.pickupStop?.lng;
      
      // Fallback 1: If passenger is picking up at the ride's start, use start coords
      if (!finalLat && ride?.routeGeometry?.coordinates?.length > 0) {
        // Many rides don't have explicit passenger coords, so we use the ride start
        const [lng, lat] = ride.routeGeometry.coordinates[0];
        finalLat = lat;
        finalLng = lng;
      }

      // Fallback 2: Check the first confirmed stop
      if (!finalLat && ride?.stops?.length > 0) {
        const firstStop = ride.stops.find(s => s.lat != null);
        if (firstStop) {
          finalLat = firstStop.lat;
          finalLng = firstStop.lng;
        }
      }

      if (finalLat && finalLng) {
        window.open(`https://www.google.com/maps?q=${finalLat},${finalLng}`, '_blank');
      } else {
        showError('Exact coordinates not found. Please coordinate pickup via Message.');
      }
    };

    const rawLocation = req.pickupStopName || req.pickupStop?.stopName || ride?.startLocation || 'Pickup Point';
    const mainLocation = rawLocation.split(',')[0].trim();

    return (
      <div className="d-passenger-card">
        <div className="d-passenger-header">
          <div className="d-passenger-info-row">
            <div className="d-passenger-avatar-box">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(passenger.fullName || 'User')}&background=random`}
                alt="Avatar"
                className="d-passenger-avatar"
              />
              {isConfirmed && (
                <div className="d-confirmed-check">
                  <Check size={10} color="white" strokeWidth={3} />
                </div>
              )}
            </div>
            
            <div className="d-passenger-details">
              <div className="d-passenger-name-row">
                <span className="d-passenger-name">{passenger.fullName}</span>
                <div className="d-badge-stack">
                  {isConfirmed && <span className="d-status-badge confirmed">Confirmed</span>}
                  {(passenger.totalRatingsReceived || 0) === 0 && (
                    <span className="d-status-badge new">New</span>
                  )}
                </div>
              </div>
              
              <div className="d-passenger-meta-grid">
                <div className="d-pax-meta-item">
                  <MapPin size={11} />
                  <span>{mainLocation}</span>
                </div>
                <div className="d-pax-meta-item">
                  <Clock size={11} />
                  <span>{timeAgo(req.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {req.additionalInfo && (
          <div className="d-passenger-note">
            <MessageSquare size={12} />
            <p>{req.additionalInfo}</p>
          </div>
        )}

        {!isConfirmed && (
          <div className="d-action-buttons">
            <button
              className="d-btn-accept"
              onClick={() => handleRespond(req.id, 'ACCEPTED')}
              disabled={requestLoadingId === req.id}
            >
              Accept
            </button>
            <button
              className="d-btn-reject"
              onClick={() => setShowConfirmReject(req.id)}
              disabled={requestLoadingId === req.id}
            >
              Reject
            </button>
          </div>
        )}

        <div className="d-passenger-footer">
          <button className="d-footer-link message" onClick={async () => {
            try {
              const res = await chatApi.openByBooking(req.id);
              navigate(`/chat/${res.data.id}`, {
                state: { otherUser: passenger, ride }
              });
            } catch (err) {
              showError('Failed to open chat');
            }
          }}>
            <MessageSquare size={14} /> Message
          </button>
          <div className="d-footer-divider" />
          <button className="d-footer-link maps" onClick={handleOpenGoogleMaps}>
            <MapIcon size={14} /> Google Maps
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="d-ride-page fade-in">
      <div className="d-ride-container">
        <div className="d-status-section">
          <div className="status-text-group">
            <span className="d-status-subtitle">MANAGE RIDE</span>
            <h1 className="d-status-title">Your Ride</h1>
          </div>
          <div className={`d-badge ${ride.status.toLowerCase()}`}>
            <span className="badge-dot"></span>
            {badge.label}
          </div>
        </div>

        {/* Ride Info Card */}
        <div className="d-card d-info-card">
          <div className="d-premium-route">
            <div className="route-item">
              <div className="route-icon-box start">
                <MapPin size={14} />
              </div>
              <div className="route-content">
                <span className="route-label">STARTING FROM</span>
                <span className="route-value">{cleanLocation(ride.startLocation)}</span>
              </div>
            </div>
            <div className="route-connector-line" />
            <div className="route-item">
              <div className="route-icon-box end">
                <MapPin size={14} />
              </div>
              <div className="route-content">
                <span className="route-label">DESTINATION</span>
                <span className="route-value">{cleanLocation(ride.destinationLocation)}</span>
              </div>
            </div>
          </div>

          <div className="premium-divider" />

          <div className="d-compact-grid">
            <div className="compact-item">
              <div className="compact-icon-box">
                <Calendar size={18} />
              </div>
              <div className="compact-content">
                <span className="compact-label">SLOT</span>
                <span className="compact-value">{ride.targetSlot || 'Flexible'}</span>
              </div>
            </div>

            <div className="compact-item">
              <div className="compact-icon-box">
                <Clock size={18} />
              </div>
              <div className="compact-content">
                <span className="compact-label">DEPARTURE</span>
                <span className="compact-value">{extractTime(ride.departureTime)}</span>
              </div>
            </div>

            <div className="compact-item">
              <div className="compact-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="M17.3 12.3l.7.7" />
                </svg>
              </div>
              <div className="compact-content">
                <span className="compact-label">FARE</span>
                <span className="compact-value">Rs. {ride.farePerSeat}</span>
              </div>
            </div>

            <div className="compact-item">
              <div className="compact-icon-box">
                <Users size={18} />
              </div>
              <div className="compact-content">
                <span className="compact-label">OCCUPANCY</span>
                <span className="compact-value">{acceptedRequests.length} / {totalSeats}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmed Passengers */}
        {acceptedRequests.length > 0 && (
          <section className="d-section">
            <h2 className="d-section-title">Confirmed Passenger</h2>
            <div className="d-list">
              {acceptedRequests.map(req => <PassengerCard key={req.id} req={req} isConfirmed={true} />)}
            </div>
          </section>
        )}

        {/* Incoming Requests */}
        <section className="d-section">
          <h2 className="d-section-title">Incoming Requests</h2>
          <div className="d-list">
            {pendingRequests.length === 0 ? (
              <div className="d-empty-state">No pending requests at the moment.</div>
            ) : (
              pendingRequests.map(req => <PassengerCard key={req.id} req={req} isConfirmed={false} />)
            )}
          </div>
        </section>

        {/* Bottom Actions */}
        <div className="d-footer-actions">
          {ride.status === 'PUBLISHED' ? (
            <>
              <button
                className="d-btn-main primary"
                onClick={handleStartRide}
                disabled={actionLoading}
              >
                <Car size={20} /> Start Ride
              </button>
              <button
                className="d-btn-main danger-outline"
                onClick={() => setShowConfirmCancel(true)}
                disabled={actionLoading}
              >
                <X size={20} /> Cancel
              </button>
            </>
          ) : ride.status === 'IN_PROGRESS' ? (
            <button
              className="d-btn-main primary"
              onClick={() => navigate(`/rides/${id}/live`)}
            >
              <Car size={20} /> Continue Live Ride
            </button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={handleCancelRide}
        title="Cancel Ride?"
        message="Are you sure you want to cancel? This will notify any accepted passengers."
        confirmText="Yes, Cancel"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={!!showConfirmReject}
        onClose={() => setShowConfirmReject(null)}
        onConfirm={() => handleRespond(showConfirmReject, 'REJECTED')}
        title="Reject Request?"
        message="Are you sure you want to reject this booking request?"
        confirmText="Yes, Reject"
        loading={requestLoadingId === showConfirmReject}
      />
    </div>
  );
}

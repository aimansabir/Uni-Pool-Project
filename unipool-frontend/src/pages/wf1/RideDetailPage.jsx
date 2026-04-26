import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ridesApi } from '../../api/rides.api';
import { bookingRequestsApi } from '../../api/bookingRequests.api';
import { rideExecutionApi } from '../../api/rideExecution.api';
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
    return (
      <div className="d-passenger-card">
        <div className="d-passenger-header">
          <div className="d-passenger-info-row">
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(passenger.fullName || 'User')}&background=random`} 
              alt="Avatar" 
              className="d-passenger-avatar" 
            />
            <div className="d-passenger-details">
              <div className="d-passenger-name-row">
                <span className="d-passenger-name">{passenger.fullName}</span>
                <span className="d-passenger-rating">
                  <Star size={12} color="#f59e0b" fill="#f59e0b" />
                  {(passenger.trustScore ? (passenger.trustScore / 20).toFixed(1) : '5.0')}
                  <span className="d-passenger-trips">({passenger.totalRides || 0} rides)</span>
                </span>
              </div>
              <div className="d-passenger-meta-lines">
                <div className="d-passenger-meta-item">
                  <MapPin size={12} />
                  <span>Current Location: {req.pickupLocation || 'Main Gate'}</span>
                </div>
                <div className="d-passenger-meta-item">
                  <Clock size={12} />
                  <span>Request Time: {formatDateTime(req.createdAt)}</span>
                </div>
                {req.additionalInfo && (
                  <div className="d-passenger-meta-item note">
                    <MessageSquare size={12} />
                    <span>{req.additionalInfo}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {isConfirmed && <div className="d-confirmed-badge">Confirmed</div>}
        </div>
        
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
          <button className="d-footer-link" onClick={() => showSuccess('Messaging coming soon!')}>
            <MessageSquare size={14} /> Message
          </button>
          <div className="d-footer-divider" />
          <button className="d-footer-link" onClick={() => showSuccess('Map view coming soon!')}>
            <MapIcon size={14} /> View on Map
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="d-ride-page fade-in">
      <div className="d-ride-container">
        
        {/* Header */}
        <header className="d-header">
          <button className="d-back-btn" onClick={() => navigate('/rides')}>
            <ChevronLeft size={24} />
          </button>
          <div className="d-header-title">Ride Details</div>
          <div style={{ width: 24 }} />
        </header>

        <div className="d-status-section">
          <div>
            <span className="d-status-subtitle">MANAGE RIDE</span>
            <h1 className="d-status-title">Your Ride</h1>
          </div>
          <div className={`d-badge ${ride.status.toLowerCase()}`}>{badge.label}</div>
        </div>

        {/* Ride Info Card */}
        <div className="d-card d-info-card">
          <div className="d-route">
            <div className="d-route-node">
              <div className="d-node-icon start"><MapPin size={14} /></div>
              <div className="d-node-info">
                <div className="d-node-label">START LOCATION</div>
                <div className="d-node-value">{ride.startLocation}</div>
              </div>
            </div>
            <div className="d-route-connector" />
            <div className="d-route-node">
              <div className="d-node-icon end"><MapPin size={14} /></div>
              <div className="d-node-info">
                <div className="d-node-label">DESTINATION</div>
                <div className="d-node-value">{ride.destinationLocation}</div>
              </div>
            </div>
          </div>

          <div className="d-divider" />

          <div className="d-grid-2x2">
            <div className="d-grid-item">
              <Calendar size={18} className="d-grid-icon" />
              <div>
                <div className="d-grid-label">TARGET SLOT</div>
                <div className="d-grid-value">{ride.targetSlot || 'Flexible'}</div>
              </div>
            </div>
            <div className="d-grid-item">
              <Clock size={18} className="d-grid-icon highlight-icon" />
              <div>
                <div className="d-grid-label">DEPARTING TIME</div>
                <div className="d-grid-value">{extractTime(ride.departureTime)}</div>
              </div>
            </div>
            <div className="d-grid-item">
              <Wallet size={18} className="d-grid-icon highlight-icon" />
              <div>
                <div className="d-grid-label">FARE / SEAT</div>
                <div className="d-grid-value">Rs. {ride.farePerSeat}</div>
              </div>
            </div>
            <div className="d-grid-item">
              <TrendingUp size={18} className="d-grid-icon highlight-icon" />
              <div>
                <div className="d-grid-label">EXPECTED EARNINGS</div>
                <div className="d-grid-value highlight-text">Rs. {earnings}</div>
              </div>
            </div>
          </div>
          
          <div className="d-divider" />
          
          <div className="d-grid-item" style={{ paddingLeft: '8px' }}>
            <Users size={18} className="d-grid-icon" />
            <div>
              <div className="d-grid-label">PASSENGERS</div>
              <div className="d-grid-value">{acceptedRequests.length} / {totalSeats}</div>
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

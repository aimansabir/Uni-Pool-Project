import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, formatPKR } from '../../utils/formatters';
import { bookingRequestsApi } from '../../api/bookingRequests.api';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Wallet,
  Car,
  CheckCircle2,
  Copy,
  Lock,
  MessageSquare,
  X,
  Star,
  Hourglass,
  Info
} from 'lucide-react';
import './PassengerRideDetailsView.css';

const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const cleanLocation = (addr) => {
  if (!addr) return 'Unknown';
  const trimmed = addr.trim();
  if (COORDS_ONLY_REGEX.test(trimmed)) return 'Pinned Location';
  return trimmed;
};

export default function PassengerRideDetailsView({ ride, myBooking, onCancelSuccess }) {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [cancelLoading, setCancelLoading] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const handleCancelBooking = async () => {
    setCancelLoading(true);
    try {
      await bookingRequestsApi.cancel(myBooking.id);
      showSuccess('Booking cancelled successfully');
      setShowConfirmCancel(false);
      onCancelSuccess(); // Refresh parent or navigate
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleCopyPlate = () => {
    const plate = ride.vehicle?.registrationNumber || '';
    if (plate) {
      navigator.clipboard.writeText(plate);
      showSuccess('Plate number copied to clipboard');
    }
  };

  if (!ride || !myBooking) return null;

  const isConfirmed = myBooking.status === 'ACCEPTED';
  const isPending = myBooking.status === 'PENDING';
  const isRejected = myBooking.status === 'REJECTED';
  const isCancelled = myBooking.status === 'CANCELLED';

  const driver = ride.driver || {};
  const vehicle = ride.vehicle || {};
  const vehicleLabel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const seatsBooked = myBooking.requestedSeats || 1;
  const myFare = ride.farePerSeat * seatsBooked;

  const getStatusBadge = () => {
    if (isConfirmed) return <div className="p-badge confirmed"><CheckCircle2 size={14} /> Confirmed</div>;
    if (isPending) return <div className="p-badge pending"><Hourglass size={14} /> Pending</div>;
    if (isRejected) return <div className="p-badge rejected"><X size={14} /> Rejected</div>;
    if (isCancelled) return <div className="p-badge cancelled"><X size={14} /> Cancelled</div>;
    return null;
  };

  return (
    <div className="p-ride-page fade-in">
      <div className="p-ride-container">
        
        {/* Header */}
        <header className="p-header">
          <button className="p-back-btn" onClick={() => navigate('/rides')}>
            <ChevronLeft size={24} />
          </button>
          <div className="p-header-title">Ride Details</div>
          <div style={{ width: 24 }} /> {/* Spacer */}
        </header>

        <div className="p-status-section">
          <div className="p-status-header">
            <div>
              <span className="p-status-subtitle">BOOKING STATUS</span>
              <h1 className="p-status-title">Your Booking</h1>
            </div>
            {getStatusBadge()}
          </div>
          
          {isConfirmed && ride.status === 'PUBLISHED' && (
            <div className="p-wait-banner">
              <div className="p-wait-icon-wrapper">
                <Hourglass size={24} color="#f59e0b" />
              </div>
              <div className="p-wait-text">
                <h3>Waiting for driver to start ride</h3>
                <p>You'll be able to track the ride once it begins.</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="p-wait-banner" style={{ background: '#f3f4f6', borderColor: '#e5e7eb' }}>
              <div className="p-wait-icon-wrapper" style={{ background: '#e5e7eb' }}>
                <Info size={24} color="#6b7280" />
              </div>
              <div className="p-wait-text">
                <h3 style={{ color: '#374151' }}>Request sent to driver</h3>
                <p>The driver will review your request soon.</p>
              </div>
            </div>
          )}
        </div>

        {/* Route & Fare Card */}
        <div className="p-card">
          <div className="p-route">
            <div className="p-route-node">
              <div className="p-node-icon start"><MapPin size={16} /></div>
              <div className="p-node-info">
                <div className="p-node-label">START LOCATION</div>
                <div className="p-node-value">{cleanLocation(ride.startLocation)}</div>
              </div>
            </div>
            <div className="p-route-connector" />
            <div className="p-route-node">
              <div className="p-node-icon end"><MapPin size={16} /></div>
              <div className="p-node-info">
                <div className="p-node-label">DESTINATION</div>
                <div className="p-node-value">{cleanLocation(ride.destinationLocation)}</div>
              </div>
            </div>
          </div>

          <div className="p-divider" />

          <div className="p-details-grid">
            <div className="p-detail-item">
              <Calendar size={18} className="p-detail-icon" />
              <div>
                <div className="p-detail-label">DEPARTURE</div>
                <div className="p-detail-value">{formatDateTime(ride.departureTime).split(' at ')[0]}</div>
                <div className="p-detail-subvalue">at {formatDateTime(ride.departureTime).split(' at ')[1] || formatDateTime(ride.departureTime)}</div>
              </div>
            </div>
            <div className="p-detail-item">
              <div className="p-detail-icon"><Car size={18} /></div>
              <div>
                <div className="p-detail-label">SEAT BOOKED</div>
                <div className="p-detail-value">{seatsBooked} / {ride.seatsTotal}</div>
              </div>
            </div>
            <div className="p-detail-item">
              <Wallet size={18} className="p-detail-icon" />
              <div>
                <div className="p-detail-label">FARE / SEAT</div>
                <div className="p-detail-value">Rs. {ride.farePerSeat}</div>
              </div>
            </div>
            <div className="p-detail-item">
              <Wallet size={18} className="p-detail-icon highlight-icon" />
              <div>
                <div className="p-detail-label">YOUR FARE</div>
                <div className="p-detail-value highlight-text">Rs. {myFare}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Details Card */}
        <div className="p-card p-driver-card">
          <div className="p-driver-header">
            <h3>Driver Details</h3>
            <div className="p-verified-badge">
              <CheckCircle2 size={12} /> Verified Driver
            </div>
          </div>
          
          <div className="p-driver-content">
            <div className="p-driver-info">
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.fullName || 'Driver')}&background=random&size=100`} 
                alt="Driver" 
                className="p-driver-avatar"
              />
              <div>
                <div className="p-driver-name">{driver.fullName || 'Unknown Driver'}</div>
                <div className="p-driver-rating">
                  <Star size={14} color="#f59e0b" fill="#f59e0b" />
                  <span>{driver.trustScore ? (driver.trustScore / 20).toFixed(1) : '5.0'}</span>
                  <span className="p-trips">({driver.totalRides || 0} trips)</span>
                </div>
                <div className="p-top-driver-badge">
                  👑 Top Driver
                </div>
              </div>
            </div>
            
            <div className="p-vehicle-info">
              <div className="p-vehicle-name">
                <Car size={16} /> {vehicleLabel || 'Standard Vehicle'}
              </div>
              <div className="p-vehicle-color">
                {vehicle.color || 'Silver'} • {vehicle.year || '2018'}
              </div>
              <button className="p-plate-btn" onClick={handleCopyPlate}>
                {vehicle.registrationNumber || 'ABC-123'} <Copy size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* What Happens Next Section */}
        <div className="p-card p-next-steps">
          <h3 className="p-next-title">What happens next</h3>
          <div className="p-stepper">
            <div className="p-step">
              <div className={`p-step-circle ${isConfirmed ? 'completed' : 'active'}`}>1</div>
              <div className="p-step-text">Booking confirmed</div>
              {isConfirmed && <CheckCircle2 size={18} color="#10b981" className="p-step-icon" />}
            </div>
            <div className="p-step-line" />
            <div className="p-step">
              <div className={`p-step-circle ${ride.status === 'IN_PROGRESS' ? 'completed' : isConfirmed ? 'active' : 'pending'}`}>2</div>
              <div className="p-step-text">Driver will start the ride</div>
            </div>
            <div className="p-step-line" />
            <div className="p-step">
              <div className="p-step-circle pending">3</div>
              <div className="p-step-text">Live tracking unlocks when ride begins</div>
              <Lock size={16} color="#9ca3af" className="p-step-icon" />
            </div>
          </div>

          <div className="p-actions">
            <button className="p-action-btn primary" onClick={() => showSuccess('Messaging coming soon!')}>
              <MessageSquare size={18} /> Message Driver
            </button>
            
            {(isPending || isConfirmed) && (
              <button 
                className="p-action-btn danger-outline" 
                onClick={() => setShowConfirmCancel(true)}
              >
                <X size={18} /> {isPending ? 'Cancel Request' : 'Cancel Booking'}
              </button>
            )}
          </div>
        </div>

      </div>

      <ConfirmDialog
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={handleCancelBooking}
        title={isPending ? 'Cancel Request?' : 'Cancel Booking?'}
        message={`Are you sure you want to cancel your ${isPending ? 'request' : 'booking'}?`}
        confirmText="Yes, Cancel"
        loading={cancelLoading}
      />
    </div>
  );
}

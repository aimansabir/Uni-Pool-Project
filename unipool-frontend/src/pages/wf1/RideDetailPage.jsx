import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ridesApi } from '../../api/rides.api';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, formatPKR, formatDistance, formatDuration } from '../../utils/formatters';
import Button from '../../components/common/Button/Button';
import Badge from '../../components/common/Badge/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
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
  const { showSuccess, showError } = useToast();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const res = await ridesApi.getById(id);
        setRide(res.data);
      } catch (err) {
        showError('Failed to load ride details');
        navigate('/rides');
      } finally {
        setLoading(false);
      }
    };
    fetchRide();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await ridesApi.delete(id);
      showSuccess('Ride cancelled and deleted.');
      navigate('/rides', { replace: true });
    } catch (err) {
      showError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <FullPageSpinner />;
  if (!ride) return null;

  const badge = STATUS_MAP[ride.status] || STATUS_MAP.PUBLISHED;

  return (
    <div className="ride-detail fade-in">
      {/* Status Header */}
      <div className="ride-detail__status-bar">
        <span className="ride-detail__label">Your ride</span>
        <Badge variant={badge.variant} size="md">{badge.label}</Badge>
      </div>

      {/* Route Card */}
      <div className="ride-detail__card">
        <div className="ride-detail__route">
          <div className="ride-detail__route-item">
            <span className="ride-detail__route-dot ride-detail__route-dot--start" />
            <div>
              <span className="ride-detail__route-label">Start Location</span>
              <span className="ride-detail__route-value">{cleanLocation(ride.startLocation)}</span>
            </div>
          </div>
          <div className="ride-detail__route-line" />
          <div className="ride-detail__route-item">
            <span className="ride-detail__route-dot ride-detail__route-dot--end" />
            <div>
              <span className="ride-detail__route-label">Target Location</span>
              <span className="ride-detail__route-value">{cleanLocation(ride.destinationLocation)}</span>
            </div>
          </div>
        </div>

        <div className="ride-detail__info-grid">
          <div className="ride-detail__info-item">
            <span className="ride-detail__info-label">Target slot</span>
            <span className="ride-detail__info-value">{ride.targetSlot || '—'}</span>
          </div>
          <div className="ride-detail__info-item">
            <span className="ride-detail__info-label">Departing time</span>
            <span className="ride-detail__info-value">{formatDateTime(ride.departureTime)}</span>
          </div>
          <div className="ride-detail__info-item">
            <span className="ride-detail__info-label">Fare per Seat</span>
            <span className="ride-detail__info-value font-bold">{formatPKR(ride.farePerSeat)}</span>
          </div>
          <div className="ride-detail__info-item">
            <span className="ride-detail__info-label">Current members</span>
            <span className="ride-detail__info-value">
              {ride.seatsTotal - ride.seatsAvailable}/{ride.seatsTotal}
            </span>
          </div>
        </div>

        {ride.distanceKm && (
          <div className="ride-detail__expected">
            <span>Expected Earnings: </span>
            <strong>{formatPKR(ride.farePerSeat * (ride.seatsTotal - ride.seatsAvailable))}</strong>
          </div>
        )}
      </div>

      {/* Stops */}
      {ride.stops && ride.stops.length > 0 && (
        <div className="ride-detail__section">
          <h3 className="ride-detail__section-title">Stops</h3>
          <div className="ride-detail__stops">
            {ride.stops.map((stop) => (
              <div key={stop.id} className="ride-detail__stop">
                <span className="ride-detail__stop-marker">📍</span>
                <span className="ride-detail__stop-name">{stop.stopName}</span>
                {stop.isSuggested && <Badge variant="default">Suggested</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle Info */}
      {ride.vehicle && (
        <div className="ride-detail__section">
          <h3 className="ride-detail__section-title">Vehicle</h3>
          <div className="ride-detail__vehicle">
            <span className="ride-detail__vehicle-icon">🚗</span>
            <div>
              <strong>{ride.vehicle.make} {ride.vehicle.model}</strong>
              <br />
              <span className="text-secondary">{ride.vehicle.color} · {ride.vehicle.registrationNumber}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {ride.status === 'PUBLISHED' && (
        <div className="ride-detail__actions">
          <Button
            variant="accent"
            fullWidth
            onClick={() => navigate(`/rides/${id}/confirmed`)}
          >
            ▶️ Start ride
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={() => setShowDelete(true)}
          >
            Cancel
          </Button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Cancel Ride?"
        message="This will permanently delete this ride. Booked passengers will be notified."
        confirmText="Yes, Cancel"
        loading={deleting}
      />
    </div>
  );
}

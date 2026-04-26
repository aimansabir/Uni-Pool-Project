import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ridesApi } from '../../api/rides.api';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, formatPKR, formatDistance } from '../../utils/formatters';
import Badge from '../../components/common/Badge/Badge';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import Button from '../../components/common/Button/Button';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import './MyRidesPage.css';

const STATUS_BADGE = {
  PUBLISHED: { variant: 'primary', label: 'Published' },
  IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
  COMPLETED: { variant: 'accent', label: 'Completed' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' },
};

export default function MyRidesPage() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const navigate = useNavigate();
  const { showError } = useToast();

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const res = await ridesApi.list();
        setRides(res.data || []);
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRides();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filter === 'ALL'
    ? rides
    : rides.filter((r) => r.status === filter);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="my-rides fade-in">
      {/* Filter Tabs */}
      <div className="my-rides__filters">
        {['ALL', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
          <button
            key={f}
            className={`my-rides__filter ${filter === f ? 'my-rides__filter--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : (STATUS_BADGE[f]?.label || f)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🛣️"
          title={filter === 'ALL' ? 'No rides yet' : `No ${STATUS_BADGE[filter]?.label || filter} rides`}
          description="Your published rides will appear here"
          action={
            <Button variant="primary" onClick={() => navigate('/rides/publish')}>
              Publish a Ride
            </Button>
          }
        />
      ) : (
        <div className="my-rides__list">
          {filtered.map((ride) => {
            const badge = STATUS_BADGE[ride.status] || STATUS_BADGE.PUBLISHED;
            return (
              <button
                key={ride.id}
                className="ride-card"
                onClick={() => {
                  if (ride.status === 'IN_PROGRESS') {
                    if (ride.userRole === 'DRIVER') {
                      navigate(`/rides/${ride.id}/live`);
                    } else {
                      navigate(`/rides/${ride.id}/track`);
                    }
                  } else {
                    navigate(`/rides/${ride.id}`);
                  }
                }}
              >
                <div className="ride-card__header">
                  <div className="ride-card__route">
                    <span className="ride-card__dot ride-card__dot--start" />
                    <span className="ride-card__location">{ride.startLocation}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {ride.userRole === 'PASSENGER' && (
                      <Badge variant="info" size="sm">Passenger</Badge>
                    )}
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </div>

                <div className="ride-card__route ride-card__route--end">
                  <span className="ride-card__dot ride-card__dot--end" />
                  <span className="ride-card__location">{ride.destinationLocation}</span>
                </div>

                <div className="ride-card__meta">
                  <span className="ride-card__meta-item">
                    🕐 {formatDateTime(ride.departureTime)}
                  </span>
                  <span className="ride-card__meta-item">
                    💰 {formatPKR(ride.farePerSeat)}/seat
                  </span>
                  <span className="ride-card__meta-item">
                    💺 {ride.seatsAvailable}/{ride.seatsTotal} seats
                  </span>
                </div>

                {ride.isUrgent && (
                  <Badge variant="urgent" size="sm">⚡ INSTANT</Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

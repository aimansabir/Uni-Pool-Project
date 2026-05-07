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

import { Coins, Sofa, Calendar, Clock, MapPin, Zap, Car } from 'lucide-react';

const STATUS_BADGE = {
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
  return trimmed.split(',')[0].trim();
};

export default function MyRidesPage({ embedded = false }) {
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
            const departureDate = new Date(ride.departureTime);

            return (
              <div
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
                <div className="ride-card__top">
                  <div className="ride-card__locations">
                    <div className="location-item location-item--start">
                      <div className="indicator__dot indicator__dot--start" />
                      <span className="location-text location-text--start">{cleanLocation(ride.startLocation)}</span>
                    </div>
                    <div className="location-item location-item--end">
                      <MapPin size={14} color="#F43F5E" strokeWidth={3} className="location-icon" />
                      <span className="location-text location-text--end">{cleanLocation(ride.destinationLocation)}</span>
                    </div>
                  </div>

                  <div className={`status-pill status-pill--${ride.status.toLowerCase()}`}>
                    {badge.label}
                  </div>
                </div>

                <div className="ride-card__divider" />

                <div className="ride-card__info-row">
                  <div className="info-block">
                    <div className="info-block__icon">
                      <Calendar size={14} strokeWidth={2.5} />
                    </div>
                    <div className="info-block__content">
                      <span className="info-value">{departureDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="info-label">{departureDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}</span>
                    </div>
                  </div>

                  <div className="info-block info-block--price">
                    <div className="info-block__icon">
                      <Coins size={14} strokeWidth={2.5} />
                    </div>
                    <div className="info-block__content">
                      <span className="info-value">Rs. {ride.farePerSeat}/seat</span>
                    </div>
                  </div>

                  <div className="info-block">
                    <div className="info-block__icon">
                      <Sofa size={14} strokeWidth={2.5} />
                    </div>
                    <div className="info-block__content">
                      <span className="info-value">{ride.seatsTotal - ride.seatsAvailable}/{ride.seatsTotal} seats</span>
                    </div>
                  </div>

                  {ride.vehicle && (
                    <div className="info-block">
                      {ride.vehicle.imageUrl ? (
                        <img src={ride.vehicle.imageUrl} alt="Car" style={{width: '28px', height: '28px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0}} />
                      ) : (
                        <div className="info-block__icon">
                          <Car size={14} strokeWidth={2.5} />
                        </div>
                      )}
                      <div className="info-block__content">
                        <span className="info-value">{ride.vehicle.make}</span>
                        <span className="info-label">{ride.vehicle.color}</span>
                      </div>
                    </div>
                  )}
                </div>

                {ride.isUrgent && (
                  <div className="ride-card__instant-bar">
                    <Zap size={13} fill="#FBBF24" color="#FBBF24" strokeWidth={2.5} />
                    <span className="instant-text">INSTANT RIDE</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

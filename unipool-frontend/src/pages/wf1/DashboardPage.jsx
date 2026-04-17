import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ridesApi } from '../../api/rides.api';
import Badge from '../../components/common/Badge/Badge';
import { formatPKR, formatTime, formatDate } from '../../utils/formatters';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentRides, setRecentRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await ridesApi.list();
        setRecentRides((res.data || []).slice(0, 4));
      } catch {
        // Silently fail — dashboard should always render
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, []);

  const stats = {
    faresEarned: recentRides
      .filter((r) => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + (r.farePerSeat * (r.seatsTotal - r.seatsAvailable)), 0),
    faresSplit: recentRides.length > 0
      ? Math.round((recentRides.filter(r => r.status === 'COMPLETED').length / recentRides.length) * 100)
      : 0,
  };

  return (
    <div className="dashboard fade-in">
      {/* Welcome Section */}
      <div className="dashboard__welcome">
        <div className="dashboard__welcome-bg" />
        <div className="dashboard__welcome-content">
          <h2 className="dashboard__greeting">
            Welcome {user?.fullName?.split(' ')[0] || 'Driver'} 👋
          </h2>

          <div className="dashboard__actions">
            <button
              className="dashboard__action-card dashboard__action-card--offer"
              onClick={() => navigate('/rides/publish')}
            >
              <span className="dashboard__action-icon">🚗</span>
              <span className="dashboard__action-label">Offer a ride</span>
            </button>

            <button
              className="dashboard__action-card dashboard__action-card--find"
              onClick={() => navigate('/select-role')}
            >
              <span className="dashboard__action-icon">🔍</span>
              <span className="dashboard__action-label">Find a ride</span>
            </button>
          </div>

          <div className="dashboard__quick-links">
            <button
              className="dashboard__quick-link"
              onClick={() => navigate('/rides')}
            >
              <span>📋</span> Ride History
            </button>
            <button
              className="dashboard__quick-link dashboard__quick-link--active"
              onClick={() => navigate('/rides')}
            >
              <span>🟢</span> Active ride
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="dashboard__stats">
        <h3 className="dashboard__section-title">Current Month</h3>
        <div className="dashboard__stats-row">
          <div className="dashboard__stat">
            <span className="dashboard__stat-dot dashboard__stat-dot--earned" />
            <span className="dashboard__stat-label">Fares Earned</span>
            <span className="dashboard__stat-value">{stats.faresEarned > 0 ? `${stats.faresEarned}%` : '—'}</span>
          </div>
          <div className="dashboard__stat">
            <span className="dashboard__stat-dot dashboard__stat-dot--split" />
            <span className="dashboard__stat-label">Fares Split</span>
            <span className="dashboard__stat-value">{stats.faresSplit > 0 ? `${stats.faresSplit}%` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="dashboard__recent">
        <div className="dashboard__section-header">
          <h3 className="dashboard__section-title">Recent Activities</h3>
          <button className="dashboard__see-all" onClick={() => navigate('/rides')}>
            See All
          </button>
        </div>

        {loading ? (
          <div className="dashboard__skeleton">
            {[1,2].map(i => <div key={i} className="dashboard__skeleton-item" />)}
          </div>
        ) : recentRides.length === 0 ? (
          <p className="dashboard__empty">No rides yet. Start by publishing one!</p>
        ) : (
          <div className="dashboard__activity-list">
            {recentRides.map((ride) => (
              <button
                key={ride.id}
                className="dashboard__activity-item"
                onClick={() => navigate(`/rides/${ride.id}`)}
              >
                <div className="dashboard__activity-icon">
                  <span>{ride.rideType === 'INSTANT' ? '⚡' : '🕐'}</span>
                </div>
                <div className="dashboard__activity-info">
                  <span className="dashboard__activity-role">Driver</span>
                  <span className="dashboard__activity-date">
                    {formatDate(ride.departureTime)}
                  </span>
                </div>
                <div className="dashboard__activity-meta">
                  <span className={`dashboard__activity-fare ${ride.status === 'COMPLETED' ? 'text-accent' : 'text-primary'}`}>
                    {ride.status === 'COMPLETED' ? '+' : ''} {formatPKR(ride.farePerSeat)}
                  </span>
                  <span className="dashboard__activity-time">
                    {formatTime(ride.departureTime)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

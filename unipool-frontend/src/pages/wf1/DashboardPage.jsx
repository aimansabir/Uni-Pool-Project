import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocation as useGeoLocation } from '../../context/LocationContext';
import { ridesApi } from '../../api/rides.api';

// Assets
import dashCar from '../../assets/images/dash_car1.png';
// import dashAvatar from '../../assets/images/dash_avatar.png'; // Removed non-existent file
import './DashboardPage.css';

/* ── REUSABLE COMPONENTS ── */

/**
 * Donut Chart Component
 */
const DonutChart = ({ earned, split, size = 150 }) => {
  const total = earned + split;
  const earnedPct = total > 0 ? (earned / total) : 0; // Fixed zero total NaN issue

  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2 - 4; // Ensure it stays within bounds
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const earnedOffset = total === 0 ? circumference : circumference * (1 - earnedPct); // Empty state grey circle if 0

  return (
    <div className="chart-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        {/* Base Track (Secondary Color / Navy) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#1F2937"
          strokeWidth={strokeWidth}
        />
        {/* Active Overlay (Primary Color / Yellow) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#FFB946"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={earnedOffset}
          strokeLinecap="butt"
        />
      </svg>
      <div className="chart-center">
        <div className="chart-center__label">Total</div>
        <div className="chart-center__value">Rs {total.toLocaleString()}</div>
      </div>
    </div>
  );
};



const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;

const getShortAddress = (address) => {
  if (!address) return 'Unknown';
  const trimmed = address.trim();
  if (COORDS_ONLY_REGEX.test(trimmed)) return 'Pinned Location';
  return trimmed.split(',')[0].trim();
};

/**
 * Activity Card Component
 */
const ActivityCard = ({ role, date, time, from, to, amount, status }) => {
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'activity__status-pill--completed';
      case 'published': return 'activity__status-pill--published';
      case 'pending': return 'activity__status-pill--pending';
      case 'cancelled': return 'activity__status-pill--cancelled';
      case 'rejected': return 'activity__status-pill--cancelled';
      case 'paid': return 'activity__status-pill--completed';
      case 'payment confirmed': return 'activity__status-pill--completed';
      case 'pending payment': return 'activity__status-pill--pending';
      case 'no show': return 'activity__status-pill--cancelled';
      default: return 'activity__status-pill--default';
    }
  };

  const isPassenger = role === 'Passenger';
  const amountPrefix = isPassenger ? '-' : '+';
  const amountClass = isPassenger && amount > 0 ? 'activity__amount--expense' : '';
  const amountStr = amount > 0 ? `${amountPrefix} Rs ${amount}` : `Rs 0`;

  return (
    <div className="card--activity">
      <div className={`activity__avatar-box ${isPassenger ? 'activity__avatar-box--passenger' : ''}`}>
        <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </div>

      <div className="activity__main">
        <div className="activity__info-row">
          <span className="activity__role">{role}</span>
          <span className="activity__date-time">{date}  •  {time}</span>
        </div>

        <div className="activity__route-row">
          <div className="route-point">
            <span className="route-dot--green" />
            <span className="route-address-trunc" title={from}>{getShortAddress(from)}</span>
          </div>
          <div className="route-connector" />
          <div className="route-point">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#F43F5E">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span className="route-address-trunc" title={to}>{getShortAddress(to)}</span>
          </div>
        </div>
      </div>

      <div className="activity__right">
        <span className={`activity__amount ${amountClass}`}>{amountStr}</span>
        <div className={`activity__status-pill ${getStatusClass(status)}`}>{status}</div>
      </div>
    </div>
  );
};


/* ── MAIN PAGE COMPONENT ── */

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { status: locationStatus } = useGeoLocation();

  // Location-gated navigation: if location not granted and not skipped,
  // redirect to EnableLocationPage with the intended destination.
  const locationSkipped = sessionStorage.getItem('unipool_location_skipped') === 'true';
  const navigateWithLocationGuard = useCallback((destination) => {
    if (locationStatus === 'granted' || locationSkipped) {
      navigate(destination);
    } else {
      navigate('/enable-location', { state: { from: destination } });
    }
  }, [locationStatus, locationSkipped, navigate]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ earned: 0, split: 0, total: 0, pendingReceivables: 0, pendingPayables: 0, recentActivities: [] });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await ridesApi.getDashboardStats();
        setStats(res.data || { earned: 0, split: 0, total: 0, pendingReceivables: 0, pendingPayables: 0, recentActivities: [] });
      } catch (err) {
        console.error("Failed to load dashboard stats:", err);
        setError("Could not load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const firstName = user?.fullName?.split(' ')[0] || 'User';

  return (
    <div className="dashboard fade-in">
      {/* 1. Header Section */}
      <header className="dashboard__header">
        <div className="dashboard__user">
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt="Profile" 
              className="dashboard__avatar" 
            />
          ) : (
            <div className="dashboard__avatar dashboard__avatar--placeholder">
              {firstName.charAt(0)}
            </div>
          )}
          <div className="dashboard__greeting">
            <span className="dashboard__welcome-text">Welcome back,</span>
            <span className="dashboard__user-name">{firstName} 👋</span>
          </div>
        </div>
        <button className="dashboard__notification" onClick={() => navigate('/notifications')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="dashboard__notification-dot" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="dashboard__content">

        {/* 2. Main Action Cards Row */}
        <div className="dashboard__main-actions">
          {/* Offer a Ride Card */}
          <div className="card--action card--offer" onClick={() => navigateWithLocationGuard('/vehicles')}>
            <div className="card__skyline" />
            <div className="card__icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
            </div>
            <h3 className="card__title">Offer a ride</h3>
            <p className="card__subtitle">Share your journey and earn more</p>
            <img src={dashCar} alt="Car illustration" className="card__illustration" />
            <div className="card__cta">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>

          {/* Find a Ride Card */}
          <div className="card--action card--find" onClick={() => navigateWithLocationGuard('/rides/find')}>
            <div className="card--find__decoration" />
            <div className="card__icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <h3 className="card__title">Find a ride</h3>
            <p className="card__subtitle">Find nearby rides and travel together</p>
            <div className="card__cta">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
          </div>

        </div>

        {/* 3. Quick Action Cards Row */}
        <div className="dashboard__quick-actions">
          <div className="card--quick" onClick={() => navigate('/rides')}>
            <div className="card--quick__icon icon--blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="card--quick__content">
              <span className="card--quick__title">Ride history</span>
              <span className="card--quick__subtitle">View past rides</span>
            </div>
            <svg className="dashboard__secondary-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto', color: '#D1D5DB' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>


          <div className="card--quick" onClick={() => navigate('/active-ride')}>
            <div className="card--quick__icon icon--green">
              <svg width="24.5" height="24.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="card--quick__content">
              <span className="card--quick__title">Active ride</span>
              <span className="card--quick__subtitle">Check ongoing ride</span>
            </div>
            <svg className="dashboard__secondary-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 'auto', color: '#D1D5DB' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

        </div>

        {/* 4. Monthly Overview Card */}
        <div className="card--overview">
          <div className="overview__header">
            <div className="overview__title-group">
              <div className="overview__icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 20V10" /><path d="M12 20v-4" /><path d="M6 20v-2" />
                  <polyline points="3 11 7 7 11 11 21 1" /><polyline points="16 1 21 1 21 6" />
                </svg>
              </div>

              <h3 className="overview__title">Month Overview</h3>
            </div>
            <button className="btn--details" onClick={() => navigate('/financials')}>View details</button>
          </div>

          <div className="overview__body">
            {/* Left Stats */}
            <div className="overview__left">
              <div className="stat-item">
                <span className="stat-item__label">
                  <span className="stat-dot stat-dot--earned" />
                  Fares Earned
                </span>
                <span className="stat-item__value text-success">Rs {stats.earned.toLocaleString()}</span>
                {stats.pendingReceivables > 0 && (
                  <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', display: 'block' }}>
                    + Rs {stats.pendingReceivables.toLocaleString()} pending
                  </span>
                )}
              </div>
              <div className="stat-item" style={{ marginTop: stats.pendingReceivables > 0 ? '8px' : '0' }}>
                <span className="stat-item__label">
                  <span className="stat-dot stat-dot--split" />
                  Fares Split
                </span>
                <span className="stat-item__value">Rs {stats.split.toLocaleString()}</span>
                {stats.pendingPayables > 0 && (
                  <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', display: 'block' }}>
                    + Rs {stats.pendingPayables.toLocaleString()} unpaid
                  </span>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="overview__divider" />

            {/* Chart */}
            <DonutChart earned={stats.earned} split={stats.split} size={135} />

            {/* Right Percentages */}
            <div className="overview__right">
              <div className="pct-item">
                <span className="pct-value text-gold">
                  {stats.total > 0 ? Math.round((stats.earned / stats.total) * 100) : 0}%
                </span>
                <span className="pct-label">Earned</span>
              </div>
              <div className="pct-item">
                <span className="pct-value">
                  {stats.total > 0 ? Math.round((stats.split / stats.total) * 100) : 0}%
                </span>
                <span className="pct-label">Split</span>
              </div>
            </div>
          </div>
        </div>


        {/* 5. Recent Activities Section */}
        <div className="dashboard__activities">
          <div className="dashboard__section-header">
            <h3 className="section-title">Recent Activities</h3>
            <button className="btn--see-all" onClick={() => navigate('/rides')}>See all</button>
          </div>
          
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>Loading activities...</div>
          ) : error ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#EF4444' }}>{error}</div>
          ) : stats.recentActivities.length > 0 ? (
            stats.recentActivities.map((activity, index) => (
              <ActivityCard key={activity.id || index} {...activity} />
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280', background: 'white', borderRadius: '16px' }}>
              No recent activities to show.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}


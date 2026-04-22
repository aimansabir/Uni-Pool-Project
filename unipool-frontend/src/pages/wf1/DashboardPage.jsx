import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ridesApi } from '../../api/rides.api';
import { formatPKR, formatTime, formatDate } from '../../utils/formatters';
import mapBg from '../../assets/images/pakistan-map.png';
import './DashboardPage.css';

/* ── Simple Pie Chart (SVG) ──────────────────────────── */
function PieChart({ earned, split, size = 110 }) {
  const [hoveredSlice, setHoveredSlice] = useState(null); // 'earned' or 'split'
  const total = earned + split;
  const earnedAngle = total > 0 ? (earned / total) * 360 : 252; // 70% default

  // SVG arc helper
  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
  };

  const cx = size / 2, cy = size / 2, r = size / 2 - 5;

  return (
    <div className="pie-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dash-pie">
        {/* Earned slice */}
        <path
          d={describeArc(cx, cy, r, 0, earnedAngle)}
          fill="#EFB24E"
          className={`pie-slice ${hoveredSlice === 'earned' ? 'pie-slice--active' : ''}`}
          onMouseEnter={() => setHoveredSlice('earned')}
          onMouseLeave={() => setHoveredSlice(null)}
          style={{ 
            transformOrigin: `${cx}px ${cy}px`,
            cursor: 'pointer'
          }}
        />
        {/* Split slice */}
        <path
          d={describeArc(cx, cy, r, earnedAngle, 360)}
          fill="#1F2937"
          className={`pie-slice ${hoveredSlice === 'split' ? 'pie-slice--active' : ''}`}
          onMouseEnter={() => setHoveredSlice('split')}
          onMouseLeave={() => setHoveredSlice(null)}
          style={{ 
            transformOrigin: `${cx}px ${cy}px`,
            cursor: 'pointer'
          }}
        />
      </svg>
      
      {/* Dynamic Tooltip */}
      {hoveredSlice && (
        <div className="pie-tooltip fade-in">
          <span className="pie-tooltip-label">
            {hoveredSlice === 'earned' ? 'Fares Earned' : 'Fares Split'}
          </span>
          <span className="pie-tooltip-value">
            {hoveredSlice === 'earned' ? earned : split}%
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Mock Activity Data ──────────────────────────────── */
const MOCK_ACTIVITIES = [
  { id: 1, role: 'Driver',    date: '25/02/2025', time: '10:00 AM', fare: 1000, type: 'earned' },
  { id: 2, role: 'Passenger', date: '25/02/2025', time: '10:00 AM', fare: 220,  type: 'split'  },
  { id: 3, role: 'Driver',    date: '24/02/2025', time: '09:30 AM', fare: 750,  type: 'earned' },
];

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
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, []);

  const firstName = user?.fullName?.split(' ')[0] || 'Aiman';

  // Mock stats for pie chart
  const earnedPct = 70;
  const splitPct = 30;

  return (
    <div className="dashboard fade-in">
      {/* ── Map Background Layer ── */}
      <div className="dashboard__map-bg">
        <img src={mapBg} alt="" className="dashboard__map-img" />
        <div className="dashboard__map-overlay" />
      </div>

      {/* ── Welcome Banner (Dark Stripe) ── */}
      <div className="dashboard__banner">
        <h2 className="dashboard__welcome-text">Welcome {firstName}</h2>
      </div>

      {/* ── Action Deck (Unified Giant Cards) ── */}
      <div className="dashboard__action-deck">
        <button
          className="dashboard__action-giant dashboard__action-giant--offer"
          onClick={() => navigate('/rides/publish')}
        >
          <div className="dashboard__action-giant-icon">
            <div className="icon-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
          </div>
          <span className="dashboard__action-giant-label">Offer a ride</span>
        </button>

        <button
          className="dashboard__action-giant dashboard__action-giant--find"
          onClick={() => navigate('/select-role')}
        >
          <div className="dashboard__action-giant-icon">
            <div className="icon-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
          </div>
          <span className="dashboard__action-giant-label">Find a ride</span>
        </button>
      </div>

      {/* ── Quick Links (Pills with Icons) ── */}
      <div className="dashboard__quick-links">
        <button className="dashboard__quick-pill" onClick={() => navigate('/rides')}>
          <div className="icon-circle icon-circle--small">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          Ride history
        </button>
        <button className="dashboard__quick-pill" onClick={() => navigate('/rides')}>
          <div className="icon-circle icon-circle--small">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          Active ride
        </button>
      </div>

      {/* ── Monthly Stats with Pie Chart ── */}
      <div className="dashboard__stats-card">
        <div className="dashboard__stats-content">
          <h3 className="dashboard__stats-title">Current Month</h3>
          <div className="dashboard__stat-table">
            <div className="dashboard__stat-item">
              <span className="dashboard__stat-indicator dashboard__stat-indicator--earned" />
              <span className="dashboard__stat-name">Fares Earned</span>
              <span className="dashboard__stat-percent">{earnedPct}%</span>
            </div>
            <div className="dashboard__stat-item">
              <span className="dashboard__stat-indicator dashboard__stat-indicator--split" />
              <span className="dashboard__stat-name">Fares Split</span>
              <span className="dashboard__stat-percent">{splitPct}%</span>
            </div>
          </div>
        </div>
        <div className="dashboard__stats-visual">
          <PieChart earned={earnedPct} split={splitPct} size={110} />
        </div>
      </div>

      {/* ── Recent Activities (pushed down) ── */}
      <div className="dashboard__recent">
        <div className="dashboard__section-header">
          <h3 className="dashboard__section-title">Recent Activities</h3>
          <button className="dashboard__see-all" onClick={() => navigate('/rides')}>
            See All
          </button>
        </div>

        {loading ? (
          <div className="dashboard__skeleton">
            {[1, 2].map((i) => <div key={i} className="dashboard__skeleton-item" />)}
          </div>
        ) : recentRides.length === 0 ? (
          /* Show mock data when no real rides */
          <div className="dashboard__activity-list">
            {MOCK_ACTIVITIES.map((act) => (
              <div key={act.id} className="dashboard__activity-item">
                <div className={`dashboard__activity-stripe ${act.type === 'earned' ? 'dashboard__activity-stripe--earned' : 'dashboard__activity-stripe--split'}`} />
                <div className="dashboard__activity-info">
                  <span className="dashboard__activity-role">{act.role}</span>
                  <span className="dashboard__activity-date">{act.date}</span>
                </div>
                <div className="dashboard__activity-meta">
                  <span className={`dashboard__activity-fare ${act.type === 'earned' ? 'fare--earned' : 'fare--split'}`}>
                    {act.type === 'earned' ? '+' : '-'} Rs {act.fare}
                  </span>
                  <span className="dashboard__activity-time">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard__activity-list">
            {recentRides.map((ride) => (
              <button
                key={ride.id}
                className="dashboard__activity-item"
                onClick={() => navigate(`/rides/${ride.id}`)}
              >
                <div className="dashboard__activity-stripe dashboard__activity-stripe--earned" />
                <div className="dashboard__activity-info">
                  <span className="dashboard__activity-role">Driver</span>
                  <span className="dashboard__activity-date">{formatDate(ride.departureTime)}</span>
                </div>
                <div className="dashboard__activity-meta">
                  <span className="dashboard__activity-fare fare--earned">
                    + {formatPKR(ride.farePerSeat)}
                  </span>
                  <span className="dashboard__activity-time">{formatTime(ride.departureTime)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

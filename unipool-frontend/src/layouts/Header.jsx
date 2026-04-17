import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return '';
    if (path === '/vehicles') return 'My Vehicles';
    if (path === '/vehicles/new') return 'Add Vehicle';
    if (path.includes('/vehicles/') && path.includes('/edit')) return 'Edit Vehicle';
    if (path === '/rides/publish') return 'Publish a Ride';
    if (path === '/rides') return 'My Rides';
    if (path.includes('/rides/') && path.includes('/confirmed')) return 'Ride Published';
    if (path.includes('/rides/')) return 'Ride Details';
    if (path === '/notifications') return 'Notifications';
    if (path === '/messages') return 'Messages';
    if (path === '/profile') return 'Profile';
    if (path === '/search') return 'Find a Ride';
    return '';
  };

  const title = getTitle();
  const showBack = location.pathname !== '/dashboard';
  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="header">
      <div className="header__left">
        {showBack && !isDashboard && (
          <button className="header__back" onClick={() => navigate(-1)} aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}
        {isDashboard && user && (
          <div className="header__greeting">
            <span className="header__greeting-emoji">👋</span>
          </div>
        )}
      </div>

      <h1 className="header__title">{title}</h1>

      <div className="header__right">
        {isDashboard && (
          <button
            className="header__icon-btn"
            onClick={() => navigate('/notifications')}
            aria-label="Notifications"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}

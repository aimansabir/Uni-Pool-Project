import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';
import userAvatar from '../assets/images/user-avatar.png';

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const mainTabs = ['/dashboard', '/pooling', '/messages', '/profile', '/map'];
  const isDashboard = location.pathname === '/dashboard';
  const showBack = !mainTabs.includes(location.pathname);

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return '';
    if (path === '/pooling') return 'Pooling';
    if (path === '/vehicles') return 'My Vehicles';
    if (path === '/vehicles/new') return 'Add Vehicle';
    if (path.includes('/vehicles/') && path.includes('/edit')) return 'Edit Vehicle';
    if (path === '/rides/publish') return 'Publish a Ride';
    if (path === '/rides') return 'My Rides';
    if (path === '/active-ride') return 'Live Ride';
    if (path.includes('/live')) return 'Active Ride';
    if (path.includes('/track')) return 'Live Tracking';
    if (path.includes('/rides/') && path.includes('/confirmed')) return 'Ride Published';
    if (path.includes('/rides/')) return 'Ride Details';
    if (path === '/notifications') return 'Notifications';
    if (path === '/messages') return 'Messages';
    if (path === '/profile') return 'Profile';
    if (path === '/search') return 'Find a Ride';
    if (path === '/map') return 'Explore Map';
    if (path.includes('/preview')) return 'Route Preview';
    if (path.includes('/bookings/') && path.includes('/confirmed')) return 'Ride Requested';
    if (path === '/financials') return 'Financials';
    if (path.startsWith('/chat')) return 'Chat';
    return '';
  };

  const title = getTitle();

  return (
    <header className={`header ${isDashboard ? 'header--dashboard' : ''}`}>
      <div className="header__main">
        <div className="header__left">
          {showBack && (
            <button className="header__back" onClick={() => navigate(-1)} aria-label="Go back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {isDashboard && (
            <div className="header__user-avatar-frame">
              <img
                src={user?.avatarUrl || userAvatar}
                alt="Profile"
                className="header__user-avatar-img"
              />
            </div>
          )}
        </div>

        <h1 className="header__title">{title}</h1>

        <div className="header__right">
          {isDashboard && (
            <button
              className="header__icon-btn header__icon-btn--dashboard"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zm6-6V10c0-3.07-1.63-5.64-4.5-6.32V3c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 4.36 6 6.92 6 10v6l-2 2v1h16v-1l-2-2z" />
              </svg>
            </button>
          )}
          {location.pathname === '/messages' && (
            <button
              className="header__icon-btn"
              onClick={() => { /* TODO: Search implementation */ }}
              aria-label="Search messages"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

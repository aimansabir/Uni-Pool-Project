import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { chatApi } from '../api/chat.api';
import './BottomNav.css';

const navItems = [
  {
    id: 'home',
    label: 'Home',
    path: '/dashboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'map',
    label: 'Map',
    path: '/map',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
        <line x1="8" y1="2" x2="8" y2="18"/>
        <line x1="16" y1="6" x2="16" y2="22"/>
      </svg>
    ),
  },
  {
    id: 'messages',
    label: 'Messages',
    path: '/messages',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id: 'pooling',
    label: 'Pooling',
    path: '/pooling',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
        <circle cx="8.5" cy="11.5" r="1.5"/>
        <circle cx="15.5" cy="11.5" r="1.5"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await chatApi.listConversations();
        const total = res.data?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || 0;
        setUnreadCount(total);
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) => {
            const isPoolingActive = item.id === 'pooling' &&
              (window.location.pathname.startsWith('/vehicles') ||
               window.location.pathname.startsWith('/rides') ||
               window.location.pathname.startsWith('/bookings'));
            return `bottom-nav__item ${(isActive || isPoolingActive) ? 'bottom-nav__item--active' : ''}`;
          }}
        >
          <div className="bottom-nav__icon-container">
            <span className="bottom-nav__icon">{item.icon}</span>
            {item.id === 'messages' && unreadCount > 0 && (
              <span className="bottom-nav__badge">{unreadCount}</span>
            )}
          </div>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

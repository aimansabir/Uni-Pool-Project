import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Header from './Header';
import './AppLayout.css';

export default function AppLayout() {
  const location = useLocation();

  // Pages where we hide the bottom nav for immersive experience
  const hideNav = ['/verify', '/chat', '/preview'].some((p) =>
    location.pathname.includes(p) || location.pathname.startsWith(p)
  );

  const hideHeader = location.pathname === '/rides/publish' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/rides/find' ||
    location.pathname === '/rides/results' ||
    location.pathname === '/financials' ||
    location.pathname.startsWith('/chat') ||
    location.pathname.includes('/preview') ||
    location.pathname.startsWith('/active-ride') ||
    location.pathname.includes('/live') ||
    location.pathname.includes('/track') ||
    location.pathname.includes('/requests') ||
    location.pathname.includes('/bookings') ||
    location.pathname.includes('/vehicles');

  const isChat = location.pathname.startsWith('/chat');
  const isFullWidth = location.pathname === '/financials' || 
    location.pathname.includes('/preview') ||
    location.pathname.startsWith('/active-ride') ||
    location.pathname.includes('/live') ||
    location.pathname.includes('/track') ||
    location.pathname.includes('/requests') ||
    location.pathname.includes('/bookings') ||
    location.pathname.includes('/vehicles') ||
    location.pathname === '/rides/publish' ||
    location.pathname === '/rides/find' ||
    location.pathname === '/rides/results';

  const isImmersive = location.pathname.includes('/preview') ||
    location.pathname.startsWith('/active-ride') ||
    location.pathname.includes('/live') ||
    location.pathname.includes('/track');

  return (
    <div className="app-shell">
      {!hideHeader && <Header />}
      <main className={`app-layout__content ${hideNav ? 'app-layout__content--no-nav' : ''} ${hideHeader ? 'app-layout__content--no-header' : ''} ${isChat ? 'app-layout__content--chat' : ''} ${isFullWidth ? 'app-layout__content--full-width' : ''} ${isImmersive ? 'app-layout__content--immersive' : ''}`}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

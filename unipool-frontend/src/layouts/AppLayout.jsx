import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Header from './Header';
import { GlobalToaster } from '../context/ToastContext';
import './AppLayout.css';

export default function AppLayout() {
  const location = useLocation();

  // Pages where we hide the bottom nav for immersive experience
  const hideNav = ['/verify', '/chat'].some((p) =>
    location.pathname.startsWith(p)
  );

  const hideHeader = location.pathname === '/rides/publish' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/rides/find' ||
    location.pathname === '/rides/results' ||
    location.pathname === '/financials' ||
    location.pathname === '/financials' ||
    location.pathname.startsWith('/chat');

  const isChat = location.pathname.startsWith('/chat');
  const isFullWidth = location.pathname === '/financials' || location.pathname.includes('/preview');

  return (
    <div className="app-shell">
      <GlobalToaster />
      {!hideHeader && <Header />}
      <main className={`app-layout__content ${hideNav ? 'app-layout__content--no-nav' : ''} ${hideHeader ? 'app-layout__content--no-header' : ''} ${isChat ? 'app-layout__content--chat' : ''} ${isFullWidth ? 'app-layout__content--full-width' : ''}`}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

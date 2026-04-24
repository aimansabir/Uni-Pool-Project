import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Header from './Header';
import { GlobalToaster } from '../context/ToastContext';
import './AppLayout.css';

export default function AppLayout() {
  const location = useLocation();

  // Pages where we hide the bottom nav
  const hideNav = ['/verify'].some((p) =>
    location.pathname.startsWith(p)
  );

  const hideHeader = location.pathname === '/rides/publish' || location.pathname === '/dashboard' || location.pathname === '/rides/find' || location.pathname === '/rides/results' || location.pathname.includes('/preview');

  return (
    <div className="app-shell">
      <GlobalToaster />
      {!hideHeader && <Header />}
      <main className={`app-layout__content ${hideNav ? 'app-layout__content--no-nav' : ''} ${hideHeader ? 'app-layout__content--no-header' : ''}`}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

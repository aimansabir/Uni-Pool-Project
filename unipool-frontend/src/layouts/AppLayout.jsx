import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Header from './Header';
import './AppLayout.css';

export default function AppLayout() {
  const location = useLocation();

  // Pages where we hide the bottom nav
  const hideNav = ['/select-role', '/verify'].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <div className="app-shell">
      <Header />
      <main className={`app-layout__content ${hideNav ? 'app-layout__content--no-nav' : ''}`}>
        <Outlet />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

export default function AuthLayout() {
  return (
    <div className="app-shell">
      <main className="auth-layout">
        <Outlet />
      </main>
    </div>
  );
}

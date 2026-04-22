import { Outlet } from 'react-router-dom';
import { GlobalToaster } from '../context/ToastContext';
import './AuthLayout.css';

export default function AuthLayout() {
  return (
    <div className="app-shell">
      <GlobalToaster />
      <main className="auth-layout">
        <Outlet />
      </main>
    </div>
  );
}

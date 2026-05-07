import { createContext, useContext, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext(null);

/* ── Shared base style for all toasts ──────────────────── */
const BASE = {
  fontFamily: "'Inter', -apple-system, sans-serif",
  fontSize: '13.5px',
  borderRadius: '14px',
  padding: '12px 16px',
  maxWidth: '100%',
  wordBreak: 'break-word',
  lineHeight: '1.45',
  boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
};

export function ToastProvider({ children }) {
  const showSuccess = useCallback((message, opts = {}) => {
    toast.success(message, {
      duration: opts.duration || 4000,
      style: { ...BASE, background: '#18A085', color: '#fff' },
      iconTheme: { primary: '#fff', secondary: '#18A085' },
    });
  }, []);

  const showError = useCallback((message, opts = {}) => {
    toast.error(message, {
      duration: opts.duration || 5000,
      style: { ...BASE, background: '#E74C3C', color: '#fff' },
      iconTheme: { primary: '#fff', secondary: '#E74C3C' },
    });
  }, []);

  const showInfo = useCallback((message, opts = {}) => {
    toast(message, {
      duration: opts.duration || 4000,
      style: { ...BASE, background: '#3498DB', color: '#fff' },
      icon: 'ℹ️',
    });
  }, []);

  const showWelcomeToast = useCallback((name) => {
    const msg = name ? `Welcome back, ${name}!` : 'Welcome back!';
    toast.success(msg, {
      duration: 4200,
      style: { ...BASE, background: '#18A085', color: '#fff' },
      iconTheme: { primary: '#fff', secondary: '#18A085' },
    });
  }, []);

  const showRideToast = useCallback((data) => {
    toast(
      () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '100%' }}>
          <strong style={{ fontSize: '13.5px', lineHeight: '1.3' }}>{data.title || 'Ride Alert'}</strong>
          <span style={{ fontSize: '12px', opacity: 0.9, lineHeight: '1.4' }}>{data.message}</span>
        </div>
      ),
      {
        duration: 6000,
        style: { ...BASE, background: '#F3A32D', color: '#fff', padding: '14px 16px' },
        icon: '🚗',
      }
    );
  }, []);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWelcomeToast, showRideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * GlobalToaster — MUST be mounted exactly ONCE in the entire app.
 * 
 * We use a CSS class `unipool-toaster` on the container so that global
 * CSS can position it correctly inside the phone-frame `.app-shell`.
 * The toaster is rendered in the BrowserRouter in AppRoutes so it
 * survives all route transitions (login → dashboard etc.)
 */
export function GlobalToaster() {
  return (
    <Toaster
      position="top-center"
      containerClassName="unipool-toaster"
      containerStyle={{
        zIndex: 50000,
      }}
      toastOptions={{
        style: {
          maxWidth: '100%',
          margin: '0 auto',
        },
      }}
    />
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastContext;

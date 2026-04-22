import { createContext, useContext, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const showSuccess = useCallback((message) => {
    toast.success(message, {
      duration: 3000,
      style: {
        background: '#18A085',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        borderRadius: '10px',
        padding: '12px 16px',
      },
      iconTheme: { primary: '#fff', secondary: '#18A085' },
    });
  }, []);

  const showError = useCallback((message) => {
    toast.error(message, {
      duration: 4000,
      style: {
        background: '#E74C3C',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        borderRadius: '10px',
        padding: '12px 16px',
      },
      iconTheme: { primary: '#fff', secondary: '#E74C3C' },
    });
  }, []);

  const showInfo = useCallback((message) => {
    toast(message, {
      duration: 3000,
      style: {
        background: '#3498DB',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        borderRadius: '10px',
        padding: '12px 16px',
      },
      icon: 'ℹ️',
    });
  }, []);

  const showRideToast = useCallback((data) => {
    toast(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <strong style={{ fontSize: '14px' }}>{data.title || 'Ride Alert'}</strong>
          <span style={{ fontSize: '12px', opacity: 0.9 }}>{data.message}</span>
        </div>
      ),
      {
        duration: 6000,
        style: {
          background: '#F3A32D',
          color: '#fff',
          fontFamily: 'Inter, sans-serif',
          borderRadius: '10px',
          padding: '14px 16px',
        },
        icon: '🚗',
      }
    );
  }, []);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showRideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function GlobalToaster() {
  return (
    <Toaster
      position="top-center"
      containerStyle={{ 
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        zIndex: 9999 
      }}
      toastOptions={{ 
        style: { 
          maxWidth: '100%',
          margin: 0
        } 
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

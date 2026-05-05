import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { notificationsApi } from '../api/notifications.api';

export default function NotificationStream() {
  const { isAuthenticated, token } = useAuth();
  const { showRideToast } = useToast();
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    if (eventSourceRef.current) return; // already connected

    try {
      const source = notificationsApi.connectStream();
      eventSourceRef.current = source;

      source.addEventListener('connected', (e) => {
        // Connected successfully, no toast needed
        console.log('SSE Stream Connected');
      });

      const handleNotification = (e) => {
        try {
          const data = JSON.parse(e.data);
          showRideToast(data);
        } catch (err) {
          console.error('Failed to parse SSE event data', err);
        }
      };

      source.addEventListener('ride-toast', handleNotification);
      source.addEventListener('ride-notification', handleNotification);
      
      source.addEventListener('ride-cancelled', (e) => {
        try {
          const data = JSON.parse(e.data);
          showRideToast({ ...data, title: data.title || 'Ride Cancelled' });
        } catch (err) {
          console.error('Failed to parse ride-cancelled data', err);
        }
      });

      source.onerror = (err) => {
        console.error('SSE Error:', err);
        // EventSource automatically reconnects, so we just log it.
      };

    } catch (err) {
      console.error('Failed to initialize SSE stream', err);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAuthenticated, token, showRideToast]);

  return null;
}

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { notificationsApi } from '../api/notifications.api';
import { MapPin, Navigation, Zap, X } from 'lucide-react';
import './common/NotificationStream/NotificationStream.css'; // Using the CSS we just created

export default function NotificationStream() {
  const { isAuthenticated, token } = useAuth();
  const { showRideToast } = useToast();
  const navigate = useNavigate();
  const eventSourceRef = useRef(null);
  const [urgentAlert, setUrgentAlert] = useState(null);

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
        console.log('SSE Stream Connected');
      });

      const handleNotification = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'INSTANT_RIDE_AVAILABLE') {
            setUrgentAlert(data);
          } else {
            showRideToast(data);
          }
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

  if (!urgentAlert) return null;

  const handleView = () => {
    navigate(`/rides/${urgentAlert.rideId}/preview`);
    setUrgentAlert(null);
  };

  const handleDismiss = () => {
    setUrgentAlert(null);
  };

  return (
    <div className="urgent-alert-overlay">
      <div className="urgent-alert-modal fade-in">
        <button className="urgent-alert-close" onClick={handleDismiss}>
          <X size={20} />
        </button>
        <div className="urgent-alert-icon pulse">
          <Zap size={32} color="#F59E0B" />
        </div>
        <h2 className="urgent-alert-title">{urgentAlert.title || 'Instant ride available now'}</h2>
        
        <div className="urgent-alert-route">
          <div className="alert-route-item">
            <MapPin size={16} />
            <span>{urgentAlert.startLocation}</span>
          </div>
          <div className="alert-route-divider" />
          <div className="alert-route-item">
            <Navigation size={16} />
            <span>{urgentAlert.destinationLocation}</span>
          </div>
        </div>

        <div className="urgent-alert-details">
          <div className="alert-detail">
            <span className="label">Fare</span>
            <span className="value">Rs. {urgentAlert.farePerSeat}</span>
          </div>
        </div>

        <div className="urgent-alert-actions">
          <button className="d-btn-main primary" onClick={handleView}>
            View Ride
          </button>
          <button className="d-btn-main outline" onClick={handleDismiss} style={{ background: '#f8f9fa', color: '#666', border: '1px solid #ddd' }}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

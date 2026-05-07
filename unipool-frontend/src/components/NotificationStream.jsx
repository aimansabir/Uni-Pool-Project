import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { notificationsApi } from '../api/notifications.api';
import { MapPin, Navigation, Zap, X, Bell, AlertTriangle } from 'lucide-react';
import './common/NotificationStream/NotificationStream.css';

export default function NotificationStream() {
  const { isAuthenticated, token } = useAuth();
  const { showRideToast } = useToast();
  const navigate = useNavigate();
  const eventSourceRef = useRef(null);

  const [urgentAlert, setUrgentAlert] = useState(null);
  const [criticalCancelAlert, setCriticalCancelAlert] = useState(null);
  const [routeAlertBanner, setRouteAlertBanner] = useState(null);
  const [routeAlertModal, setRouteAlertModal] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    if (eventSourceRef.current) return;

    try {
      const source = notificationsApi.connectStream();
      eventSourceRef.current = source;

      source.addEventListener('connected', () => {
        console.log('SSE Stream Connected');
      });

      const handleNotification = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'INSTANT_RIDE_AVAILABLE') {
            setUrgentAlert(data);
          } else if (data.type === 'ROUTE_ALERT_RIDE_AVAILABLE') {
            setRouteAlertBanner(data);
            setTimeout(() => setRouteAlertBanner(prev => prev === data ? null : prev), 12000);
          } else {
            showRideToast(data);
          }
        } catch (err) {
          console.error('Failed to parse SSE event data', err);
        }
      };

      source.addEventListener('ride-toast', handleNotification);
      source.addEventListener('ride-notification', handleNotification);
      source.addEventListener('route-alert', handleNotification);

      source.addEventListener('instant-cancelled-critical', (e) => {
        try {
          setCriticalCancelAlert(JSON.parse(e.data));
        } catch (err) {
          console.error('Failed to parse instant-cancelled-critical', err);
        }
      });

      source.addEventListener('ride-cancelled', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.severity === 'critical' || data.presentation === 'FULL_SCREEN') {
            setCriticalCancelAlert(data);
          } else {
            showRideToast({ ...data, title: data.title || 'Ride Cancelled' });
          }
        } catch (err) {
          console.error('Failed to parse ride-cancelled', err);
        }
      });

      source.onerror = () => {};
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

  const fmt = (iso) => {
    if (!iso) return '--';
    try { return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }); }
    catch { return '--'; }
  };

  // ── Priority 3: Instant Ride Available Modal (yellow) ────────────
  const renderInstantRideModal = () => {
    if (!urgentAlert) return null;
    return (
      <div className="urgent-alert-overlay">
        <div className="urgent-alert-modal fade-in">
          <button className="urgent-alert-close" onClick={() => setUrgentAlert(null)}><X size={20} /></button>
          <div className="urgent-alert-icon pulse"><Zap size={32} color="#F59E0B" /></div>
          <h2 className="urgent-alert-title">{urgentAlert.title || 'Instant ride available now'}</h2>
          <div className="urgent-alert-route">
            <div className="alert-route-item"><MapPin size={16} /><span>{urgentAlert.startLocation}</span></div>
            <div className="alert-route-divider" />
            <div className="alert-route-item"><Navigation size={16} /><span>{urgentAlert.destinationLocation}</span></div>
          </div>
          <div className="urgent-alert-details">
            <div className="alert-detail">
              <span className="label">Fare</span>
              <span className="value">Rs. {urgentAlert.farePerSeat}</span>
            </div>
          </div>
          <div className="urgent-alert-actions">
            <button className="d-btn-main primary" onClick={() => { navigate(`/rides/${urgentAlert.rideId}/preview`); setUrgentAlert(null); }}>View Ride</button>
            <button className="d-btn-main outline" onClick={() => setUrgentAlert(null)} style={{ background: '#f8f9fa', color: '#666', border: '1px solid #ddd' }}>Dismiss</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Priority 1: Critical Instant Cancellation (full red screen) ──
  const renderCriticalCancel = () => {
    if (!criticalCancelAlert) return null;
    const d = criticalCancelAlert;
    return (
      <div className="critical-cancel-overlay">
        <div className="critical-cancel-content">
          {/* Emoji + Title */}
          <div className="critical-cancel-header">
            <span className="critical-cancel-emoji">🚨</span>
            <h1 className="critical-cancel-title">URGENT: Ride Cancelled!</h1>
          </div>

          {/* Message */}
          <p className="critical-cancel-message">
            {d.driverName ? `${d.driverName} has` : 'The driver has'} cancelled this Instant Ride.
            Your seat has been refunded. Please book an alternative ride immediately from the Live Feed.
          </p>

          {/* Warning triangle icon */}
          <div className="critical-cancel-warning-icon">
            <AlertTriangle size={64} color="#F59E0B" fill="#F59E0B" />
          </div>

          {/* CTA */}
          <div className="critical-cancel-actions">
            <button className="critical-cancel-btn-primary" onClick={() => {
              setCriticalCancelAlert(null);
              navigate('/rides/find');
            }}>
              Back to Live Feed
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Priority 4: Route Alert Push Banner ──────────────────────────
  const renderRouteAlertBanner = () => {
    if (!routeAlertBanner) return null;
    return (
      <div className="route-alert-banner" onClick={() => { setRouteAlertModal(routeAlertBanner); setRouteAlertBanner(null); }}>
        <div className="route-alert-banner__icon"><Bell size={20} color="#fff" /></div>
        <div className="route-alert-banner__content">
          <div className="route-alert-banner__title">{routeAlertBanner.title || 'Ride found for your saved route'}</div>
          <div className="route-alert-banner__subtitle">{routeAlertBanner.startLocation} → {routeAlertBanner.destinationLocation}</div>
        </div>
        <button className="route-alert-banner__close" onClick={(e) => { e.stopPropagation(); setRouteAlertBanner(null); }}><X size={14} /></button>
      </div>
    );
  };

  // ── Route Alert Modal (bottom sheet) ────────────────────────────
  const renderRouteAlertModal = () => {
    if (!routeAlertModal) return null;
    const d = routeAlertModal;
    return (
      <div className="route-alert-modal-overlay" onClick={() => setRouteAlertModal(null)}>
        <div className="route-alert-modal" onClick={e => e.stopPropagation()}>
          <div className="route-alert-modal__header">
            <span className="route-alert-modal__badge"><Bell size={12} />Route Alert</span>
            <button className="route-alert-modal__close-btn" onClick={() => setRouteAlertModal(null)}><X size={20} color="#666" /></button>
          </div>
          <h2 className="route-alert-modal__title">Ride Available on Your Saved Route</h2>
          <div className="route-alert-modal__route">
            <div className="route-alert-modal__route-row"><MapPin size={16} color="#6366f1" /><span>{d.startLocation}</span></div>
            <div className="route-alert-modal__route-divider" />
            <div className="route-alert-modal__route-row"><Navigation size={16} color="#10b981" /><span>{d.destinationLocation}</span></div>
          </div>
          <div className="route-alert-modal__details">
            {d.farePerSeat && (
              <div className="route-alert-modal__detail-card">
                <div className="route-alert-modal__detail-label">Fare / Seat</div>
                <div className="route-alert-modal__detail-value">Rs. {d.farePerSeat}</div>
              </div>
            )}
            {d.departureTime && (
              <div className="route-alert-modal__detail-card">
                <div className="route-alert-modal__detail-label">Departure</div>
                <div className="route-alert-modal__detail-value">{fmt(d.departureTime)}</div>
              </div>
            )}
            {d.genderPreference === 'FEMALES_ONLY' && (
              <div className="route-alert-modal__detail-card">
                <div className="route-alert-modal__detail-label">Preference</div>
                <div className="route-alert-modal__detail-value" style={{ fontSize: '13px', color: '#EC4899' }}>Females Only</div>
              </div>
            )}
          </div>
          <div className="route-alert-modal__actions">
            <button className="d-btn-main primary" onClick={() => { setRouteAlertModal(null); navigate(`/rides/${d.rideId}/preview`); }}>View Ride</button>
            <button className="d-btn-main outline" onClick={() => setRouteAlertModal(null)} style={{ background: '#f8f9fa', color: '#666', border: '1px solid #ddd' }}>Dismiss</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderCriticalCancel()}
      {renderInstantRideModal()}
      {renderRouteAlertBanner()}
      {renderRouteAlertModal()}
    </>
  );
}

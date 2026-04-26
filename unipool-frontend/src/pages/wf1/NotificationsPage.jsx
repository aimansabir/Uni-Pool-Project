import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/notifications.api';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import { timeAgo } from '../../utils/formatters';
import './NotificationsPage.css';

const NOTIF_ICONS = {
  INSTANT_BOOKING_ALERT:    '⚡',
  STANDARD_BOOKING_REQUEST: '📬',
  BOOKING_REQUEST_ACCEPTED: '✅',
  BOOKING_REQUEST_REJECTED: '❌',
  PASSENGER_CANCELLED_RIDE: '🚫',
  DRIVER_CANCELLED_RIDE:    '🚨',
  RIDE_STARTED:             '🚗',
  RIDE_COMPLETED:           '🏁',
};

function routeFromNotif(notif, navigate) {
  const p = notif.payload || {};
  switch (p.type) {
    case 'BOOKING_REQUEST_ACCEPTED':
      return p.bookingRequestId
        ? navigate(`/bookings/${p.bookingRequestId}/confirmed`, { state: { rideType: p.rideType } })
        : navigate('/bookings');
    case 'BOOKING_REQUEST_REJECTED':
      return navigate('/bookings');
    case 'DRIVER_CANCELLED_RIDE':
      return navigate(p.bookingRequestId ? `/bookings/${p.bookingRequestId}/cancelled` : '/bookings', {
        state: { rideType: p.rideType, driverName: p.driverName }
      });
    case 'INSTANT_BOOKING_ALERT':
    case 'STANDARD_BOOKING_REQUEST':
      return navigate(p.rideId ? `/rides/${p.rideId}/requests` : '/rides/requests');
    case 'PASSENGER_CANCELLED_RIDE':
      return navigate(p.rideId ? `/rides/${p.rideId}/requests` : '/rides/requests');
    default:
      return navigate('/notifications');
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await notificationsApi.list();
        setNotifications(res.data || []);
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n))
      );
    } catch { /* silent */ }
  };

  const handleClick = async (notif) => {
    if (notif.status !== 'READ') await markRead(notif.id);
    routeFromNotif(notif, navigate);
  };

  if (loading) return <FullPageSpinner />;

  const unreadCount = notifications.filter((n) => n.status !== 'READ').length;

  return (
    <div className="notifications-page fade-in">
      {unreadCount > 0 && (
        <div className="notifications-page__unread-bar">
          {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No notifications"
          description="You'll see ride alerts and updates here"
        />
      ) : (
        <div className="notifications-page__list">
          {notifications.map((notif) => {
            const icon = NOTIF_ICONS[notif.payload?.type] ||
              (notif.channel === 'IN_APP_TOAST' ? '⚡' : '🔔');
            const isUrgent = ['INSTANT_BOOKING_ALERT', 'DRIVER_CANCELLED_RIDE'].includes(notif.payload?.type);
            return (
              <button
                key={notif.id}
                className={`notif-item ${notif.status !== 'READ' ? 'notif-item--unread' : ''} ${isUrgent ? 'notif-item--urgent' : ''}`}
                onClick={() => handleClick(notif)}
              >
                <div className="notif-item__icon">{icon}</div>
                <div className="notif-item__content">
                  <span className="notif-item__title">{notif.title}</span>
                  <span className="notif-item__message">{notif.message}</span>
                  <span className="notif-item__time">{timeAgo(notif.createdAt)}</span>
                </div>
                {notif.status !== 'READ' && <span className="notif-item__dot" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

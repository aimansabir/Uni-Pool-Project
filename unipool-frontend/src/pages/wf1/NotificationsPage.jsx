import { useState, useEffect } from 'react';
import { notificationsApi } from '../../api/notifications.api';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import { timeAgo } from '../../utils/formatters';
import './NotificationsPage.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await notificationsApi.list();
        setNotifications(res.data || []);
      } catch (err) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n))
      );
    } catch {
      // Silently fail
    }
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
          {notifications.map((notif) => (
            <button
              key={notif.id}
              className={`notif-item ${notif.status !== 'READ' ? 'notif-item--unread' : ''}`}
              onClick={() => markRead(notif.id)}
            >
              <div className="notif-item__icon">
                {notif.channel === 'IN_APP_TOAST' ? '⚡' : notif.channel === 'EMAIL' ? '📧' : '🔔'}
              </div>
              <div className="notif-item__content">
                <span className="notif-item__title">{notif.title}</span>
                <span className="notif-item__message">{notif.message}</span>
                <span className="notif-item__time">{timeAgo(notif.createdAt)}</span>
              </div>
              {notif.status !== 'READ' && <span className="notif-item__dot" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

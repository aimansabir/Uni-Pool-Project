import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../api/chat.api';
import { useToast } from '../context/ToastContext';
import { FullPageSpinner } from '../components/common/Spinner/Spinner';
import './MessagesPage.css';

const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const cleanLoc = (s) => {
  if (!s) return '';
  const t = s.trim();
  return COORDS_ONLY_REGEX.test(t) ? 'Pinned Location' : t.split(',')[0].trim();
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showError } = useToast();

  const fetchConversations = useCallback(async () => {
    try {
      const res = await chatApi.listConversations();
      setConversations(res.data || []);
    } catch {
      showError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchConversations();
    // Refresh every 15 seconds for near-real-time unread counts
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const totalUnread = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="messages-page fade-in">
      {/* Header */}
      <div className="msg-header">
        <h1 className="msg-header__title">Messages</h1>
        {totalUnread > 0 && (
          <span className="msg-header__badge">{totalUnread}</span>
        )}
      </div>

      {conversations.length === 0 ? (
        <div className="msg-empty">
          <div className="msg-empty__icon">💬</div>
          <h3 className="msg-empty__title">No conversations yet</h3>
          <p className="msg-empty__desc">
            Once a booking is made, you can message the driver or passenger directly here.
          </p>
          <button className="msg-empty__cta" onClick={() => navigate('/rides/find')}>
            Find a Ride
          </button>
        </div>
      ) : (
        <div className="msg-thread-list">
          {conversations.map((conv) => {
            const hasUnread = conv.unreadCount > 0;
            const latest = conv.latestMessage;
            const rideLabel = conv.ride
              ? `${cleanLoc(conv.ride.startLocation)} → ${cleanLoc(conv.ride.destinationLocation)}`
              : 'Ride';

            return (
              <button
                key={conv.id}
                className={`msg-thread ${hasUnread ? 'unread' : ''}`}
                onClick={() => navigate(`/chat/${conv.id}`, {
                  state: { otherUser: conv.otherUser, ride: conv.ride }
                })}
              >
                {/* Avatar */}
                <div className="msg-thread__avatar">
                  <span>{conv.otherUser?.fullName?.[0]?.toUpperCase() || '?'}</span>
                </div>

                {/* Body */}
                <div className="msg-thread__body">
                  <div className="msg-thread__top">
                    <span className="msg-thread__name">{conv.otherUser?.fullName || 'User'}</span>
                    <span className="msg-thread__time">
                      {latest ? timeAgo(latest.createdAt) : timeAgo(conv.updatedAt)}
                    </span>
                  </div>
                  <p className="msg-thread__route">{rideLabel}</p>
                  <p className="msg-thread__preview">
                    {latest ? latest.body : 'Start a conversation…'}
                  </p>
                </div>

                {/* Unread dot */}
                {hasUnread && (
                  <div className="msg-thread__unread">
                    <span>{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

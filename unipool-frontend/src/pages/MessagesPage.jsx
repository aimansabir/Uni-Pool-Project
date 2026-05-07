import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '../api/chat.api';
import { useToast } from '../context/ToastContext';
import { FullPageSpinner } from '../components/common/Spinner/Spinner';
import { ChevronRight } from 'lucide-react';
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
      {/* 
          We removed the internal msg-header to avoid duplication 
          with the global app header shown in your screenshot.
      */}
      
      <div className="messages-inbox-container">
        {conversations.length === 0 ? (
          <div className="msg-empty">
            <div className="msg-empty__icon">💬</div>
            <h3 className="msg-empty__title">No conversations yet</h3>
            <p className="msg-empty__desc">
              Once a booking is made, you can message your driver or passenger directly here.
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
              const start = cleanLoc(conv.ride?.startLocation);
              const end = cleanLoc(conv.ride?.destinationLocation);
              const rideLabel = start && end ? `${start} → ${end}` : 'Ride Details';

              return (
                <div
                  key={conv.id}
                  className={`msg-thread-card ${hasUnread ? 'unread' : ''}`}
                  onClick={() => navigate(`/chat/${conv.id}`, {
                    state: { otherUser: conv.otherUser, ride: conv.ride }
                  })}
                >
                  <div className="msg-card-avatar">
                    {conv.otherUser?.avatarUrl ? (
                      <img src={conv.otherUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      conv.otherUser?.fullName?.[0]?.toUpperCase() || '?'
                    )}
                    <div className="msg-card-status-dot" />
                  </div>

                  <div className="msg-card-content">
                    <div className="msg-card-header">
                      <span className="msg-card-name">{conv.otherUser?.fullName || 'User'}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="msg-card-time">
                          {latest ? timeAgo(latest.createdAt) : timeAgo(conv.updatedAt)}
                        </span>
                        {hasUnread && <div className="msg-card-unread-indicator" />}
                      </div>
                    </div>
                    
                    <div className="msg-card-route">
                      <div className="route-pill">{rideLabel}</div>
                    </div>

                    <p className="msg-card-preview">
                      {latest ? latest.body : 'No messages yet...'}
                    </p>
                  </div>

                  {!hasUnread && (
                    <div className="msg-card-arrow">
                      <ChevronRight size={18} color="#9CA3AF" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

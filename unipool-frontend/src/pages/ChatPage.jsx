import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { chatApi } from '../api/chat.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ChevronLeft, Send, Loader2, MapPin, MoreVertical, Smile } from 'lucide-react';
import './ChatPage.css';

const COORDS_ONLY_REGEX = /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/;
const cleanLoc = (s) => {
  if (!s) return '';
  const t = s.trim();
  return COORDS_ONLY_REGEX.test(t) ? 'Pinned Location' : t.split(',')[0].trim();
};

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatDateLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;
  for (const msg of messages) {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (dateKey !== currentDate) {
      currentDate = dateKey;
      groups.push({ type: 'date', label: formatDateLabel(msg.createdAt), key: dateKey });
    }
    groups.push({ type: 'message', ...msg });
  }
  return groups;
}

export default function ChatPage() {
  const { id: conversationId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);
  const isFirstLoad = useRef(true);

  const otherUser = state?.otherUser;
  const ride = state?.ride;

  const fetchMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await chatApi.getMessages(conversationId);
      setMessages(res.data || []);
    } catch {
      if (!silent) showError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMessages();
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // Scroll to bottom logic
  useEffect(() => {
    if (!messages.length || !scrollRef.current) return;

    const container = scrollRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 200;
    const isMyMessage = messages[messages.length - 1]?.senderId === user?.id;
    const isOptimistic = messages[messages.length - 1]?.optimistic;

    if (isFirstLoad.current || isOptimistic || isAtBottom) {
      // Use 'smooth' only for your own NEW messages, otherwise 'auto' to prevent jitter
      const behavior = (isOptimistic && !isFirstLoad.current) ? 'smooth' : 'auto';
      bottomRef.current?.scrollIntoView({ behavior });
      
      if (isFirstLoad.current) {
        // Double scroll on first load to ensure we are at the very bottom
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'auto' });
          isFirstLoad.current = false;
        }, 50);
      }
    }
  }, [messages, user?.id]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending || !user?.id) return;

    // Optimistic insert
    const optimistic = {
      id: `opt-${Date.now()}`,
      senderId: user.id,
      body: trimmed,
      createdAt: new Date().toISOString(),
      readAt: null,
      optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);
    setBody('');
    setSending(true);

    try {
      const res = await chatApi.sendMessage(conversationId, trimmed);
      // Replace optimistic with real message
      setMessages(prev =>
        prev.map(m => m.id === optimistic.id ? { ...res.data, optimistic: false } : m)
      );
    } catch {
      // Remove the optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setBody(trimmed);
      showError('Failed to send message');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const grouped = groupMessagesByDate(messages);

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <div className="chat-header__info">
          <div className="chat-header__avatar">
            {otherUser?.avatarUrl ? (
              <img src={otherUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              otherUser?.fullName?.[0]?.toUpperCase() || '?'
            )}
          </div>
          <div className="chat-header__text">
            <h2 className="chat-header__name">{otherUser?.fullName || 'Chat'}</h2>
            {ride && (
              <div className="chat-header__route">
                <MapPin size={10} />
                <span>{cleanLoc(ride.startLocation)} → {cleanLoc(ride.destinationLocation)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="chat-header__actions">
          <button className="chat-more-btn" onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical size={20} color="#6B7280" />
          </button>
          
          {showMenu && (
            <div className="chat-menu-dropdown">
              <button onClick={() => { 
                navigate('/profile'); 
                setShowMenu(false); 
              }}>View Profile</button>
              <button onClick={() => {
                showSuccess('Notifications muted');
                setShowMenu(false);
              }}>Mute Notifications</button>
              <button className="danger" onClick={() => {
                showSuccess('User has been reported');
                setShowMenu(false);
              }}>Report User</button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={scrollRef}>
        {loading ? (
          <div className="chat-loading">
            <Loader2 size={28} className="spin" color="#F59E0B" />
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-container">
            <div className="chat-empty-state">
              <div className="chat-empty-icon">👋</div>
              <h3 className="chat-empty-title">Say hello to {otherUser?.fullName?.split(' ')[0] || 'them'}!</h3>
              <p className="chat-empty-text">Start a conversation to coordinate your ride details.</p>
            </div>
          </div>
        ) : (
          grouped.map((item) => {
            if (item.type === 'date') {
              return (
                <div key={item.key} className="chat-date-label">
                  <span>{item.label}</span>
                </div>
              );
            }
            const isMine = item.senderId === user?.id;
            return (
              <div key={item.id} className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'} ${item.optimistic ? 'optimistic' : ''}`}>
                  <span className="chat-bubble__text">{item.body}</span>
                  <span className="chat-bubble__time">
                    {formatTime(item.createdAt)}
                    {isMine && item.readAt && <span className="chat-bubble__read"> ✓✓</span>}
                    {isMine && !item.readAt && !item.optimistic && <span className="chat-bubble__sent"> ✓</span>}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar-container">
        {showEmoji && (
          <div className="emoji-picker-popover">
            {['😊', '😂', '😍', '👋', '👍', '🙏', '🙌', '🚗', '📍', '✨', '🔥', '💯', '😎', '🎉'].map(emoji => (
              <button key={emoji} onClick={() => {
                setBody(prev => prev + emoji);
                setShowEmoji(false);
              }}>{emoji}</button>
            ))}
          </div>
        )}
        <div className="chat-input-bar">
          <button className="chat-emoji-btn" onClick={() => setShowEmoji(!showEmoji)}>
            <Smile size={24} color={showEmoji ? '#F59E0B' : '#9CA3AF'} />
          </button>
          <textarea
            ref={inputRef}
            className="chat-input"
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!body.trim() || sending}
          >
            {sending ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <Send size={20} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

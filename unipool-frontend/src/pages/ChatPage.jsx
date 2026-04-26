import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { chatApi } from '../api/chat.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ChevronLeft, Send, Loader2, MapPin } from 'lucide-react';
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
  const { showError } = useToast();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

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

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;

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
            {otherUser?.fullName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="chat-header__name">{otherUser?.fullName || 'Chat'}</div>
            {ride && (
              <div className="chat-header__route">
                <MapPin size={11} />
                {cleanLoc(ride.startLocation)} → {cleanLoc(ride.destinationLocation)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-loading">
            <Loader2 size={28} className="spin" color="#F59E0B" />
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty__icon">👋</div>
            <p>Say hello to {otherUser?.fullName?.split(' ')[0] || 'them'}!</p>
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
      <div className="chat-input-bar">
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
  );
}

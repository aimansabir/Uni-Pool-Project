import client from './client';

export const chatApi = {
  /** List all conversations for current user */
  listConversations: () =>
    client.get('/api/conversations'),

  /** Open (get or create) conversation by bookingRequestId */
  openByBooking: (bookingRequestId) =>
    client.post(`/api/conversations/booking/${bookingRequestId}`),

  /** Fetch messages for a conversation (also marks them read server-side) */
  getMessages: (conversationId) =>
    client.get(`/api/conversations/${conversationId}/messages`),

  /** Send a message */
  sendMessage: (conversationId, body) =>
    client.post(`/api/conversations/${conversationId}/messages`, { body }),
};

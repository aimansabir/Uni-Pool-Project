import client from './client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const notificationsApi = {
  list: () => client.get('/api/notifications'),
  markRead: (id) => client.patch(`/api/notifications/${id}/read`),

  /**
   * Connect to SSE stream. Returns an EventSource.
   * Caller must close it when done.
   */
  connectStream: () => {
    const token = localStorage.getItem('unipool_token');
    const url = `${API_URL}/api/notifications/stream`;
    const eventSource = new EventSource(url, {
      // Note: EventSource doesn't support custom headers natively.
      // Backend SSE on this project reads from query param or cookie as fallback.
      // We'll pass token as query param.
    });
    // For backends that accept query-based auth, use:
    // const eventSource = new EventSource(`${url}?token=${token}`);
    return eventSource;
  },
};

export const subscriptionsApi = {
  create: (data) => client.post('/api/route-subscriptions', data),
  list: () => client.get('/api/route-subscriptions'),
  delete: (id) => client.delete(`/api/route-subscriptions/${id}`),
};

export const activeSearchesApi = {
  create: (data) => client.post('/api/active-searches', data),
  ping: (id) => client.patch(`/api/active-searches/${id}/ping`),
  deactivate: (id) => client.patch(`/api/active-searches/${id}/deactivate`),
};

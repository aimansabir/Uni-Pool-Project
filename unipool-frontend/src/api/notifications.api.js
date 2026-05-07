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
    // Pass token as query param since EventSource cannot set custom headers natively
    const eventSource = new EventSource(`${url}?token=${encodeURIComponent(token || '')}`);
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

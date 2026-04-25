import client from './client';

export const bookingRequestsApi = {
  create: (data) => client.post('/api/booking-requests', data),
  listMyRequests: () => client.get('/api/booking-requests'),
  getIncoming: (params) => client.get('/api/booking-requests/incoming', { params }),
  getById: (id) => client.get(`/api/booking-requests/${id}`),
  respond: (id, status) => client.patch(`/api/booking-requests/${id}/respond`, { status }),
  cancel: (id) => client.patch(`/api/booking-requests/${id}/cancel`),
  delete: (id) => client.delete(`/api/booking-requests/${id}`),
};

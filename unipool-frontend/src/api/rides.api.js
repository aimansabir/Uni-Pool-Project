import client from './client';

export const ridesApi = {
  previewIntelligence: (data) => client.post('/api/rides/intelligence/preview', data),
  publish: (data) => client.post('/api/rides', data),
  list: () => client.get('/api/rides'),
  searchRides: (params) => client.get('/api/search/rides', { params }),
  getById: (id) => client.get(`/api/rides/${id}`),
  getPreview: (id) => client.get(`/api/search/rides/${id}/preview`),
  update: (id, data) => client.put(`/api/rides/${id}`, data),
  delete: (id) => client.delete(`/api/rides/${id}`),
  getDashboardStats: () => client.get('/api/rides/dashboard/stats'),
};

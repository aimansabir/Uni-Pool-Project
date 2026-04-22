import client from './client';

export const ridesApi = {
  previewIntelligence: (data) => client.post('/api/rides/intelligence/preview', data),
  publish: (data) => client.post('/api/rides', data),
  list: () => client.get('/api/rides'),
  getById: (id) => client.get(`/api/rides/${id}`),
  update: (id, data) => client.put(`/api/rides/${id}`, data),
  delete: (id) => client.delete(`/api/rides/${id}`),
};

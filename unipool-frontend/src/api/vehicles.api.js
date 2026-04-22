import client from './client';

export const vehiclesApi = {
  list: () => client.get('/api/vehicles'),
  getById: (id) => client.get(`/api/vehicles/${id}`),
  create: (data) => client.post('/api/vehicles', data),
  update: (id, data) => client.put(`/api/vehicles/${id}`, data),
  delete: (id) => client.delete(`/api/vehicles/${id}`),
};

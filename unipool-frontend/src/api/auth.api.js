import client from './client';

export const authApi = {
  register: (data) => client.post('/api/auth/register', data),
  login: (data) => client.post('/api/auth/login', data),
  verify: (data) => client.post('/api/auth/verify', data),
  resendOtp: (data) => client.post('/api/auth/resend-otp', data),
  getMe: () => client.get('/api/auth/me'),
  updateProfile: (data) => client.patch('/api/auth/profile', data),
};

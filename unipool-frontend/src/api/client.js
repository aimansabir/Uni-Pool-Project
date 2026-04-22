import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor — attach JWT
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('unipool_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — normalize errors & handle 401
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Auto-logout on 401
      if (status === 401) {
        localStorage.removeItem('unipool_token');
        localStorage.removeItem('unipool_user');
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

      const message = data?.message || 'Something went wrong';
      const err = new Error(message);
      err.status = status;
      err.errors = data?.errors || null;
      return Promise.reject(err);
    }

    if (error.request) {
      const err = new Error('Network error — please check your connection.');
      err.status = 0;
      return Promise.reject(err);
    }

    return Promise.reject(error);
  }
);

export default client;

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token and client device ID to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lab_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const deviceId = localStorage.getItem('lab_device_id') || 'LAN-PC-01';
  config.headers['x-client-device-id'] = deviceId;

  return config;
});

// Response interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if unauthorized and not already on login
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('lab_token');
        localStorage.removeItem('lab_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

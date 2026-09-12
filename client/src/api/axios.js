import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle expired/invalid tokens globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');

      // Avoid redirect loop if already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Derives the backend origin (e.g. http://localhost:5000) from the API
// baseURL (e.g. http://localhost:5000/api), so relative paths returned
// by the server (like /uploads/contacts/xyz.jpg) can be turned into
// full, loadable URLs on the frontend.
export const API_ORIGIN = api.defaults.baseURL.replace(/\/api\/?$/, '');

export const resolveFileUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  return `${API_ORIGIN}${path}`;
};
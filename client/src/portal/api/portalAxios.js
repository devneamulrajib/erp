import axios from 'axios';

const ERP_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const portalApi = axios.create({
  baseURL: `${ERP_BASE}/portal`,
});

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('portalToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('portalToken');
      localStorage.removeItem('portalUser');
      window.location.href = '/portal/login';
    }
    return Promise.reject(err);
  }
);

export default portalApi;
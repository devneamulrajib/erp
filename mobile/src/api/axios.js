// Staff (ERP) API client — same shape as client/src/api/axios.js.
import axios from 'axios';
import { API_URL } from '../config';
import { getItem, removeItem, notifyUnauthorized } from '../storage/tokenStore';

// eslint-disable-next-line import/no-named-as-default-member
const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && getItem('token')) {
      await removeItem('token');
      await removeItem('user');
      notifyUnauthorized('staff');
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_ORIGIN, resolveFileUrl } from '../config';

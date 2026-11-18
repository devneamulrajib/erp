// Portal API client — same shape as client/src/portal/api/portalAxios.js,
// with localStorage replaced by the secure token store.
import axios from 'axios';
import { API_URL } from '../../config';
import { getItem, removeItem, notifyUnauthorized } from '../../storage/tokenStore';

// eslint-disable-next-line import/no-named-as-default-member
const portalApi = axios.create({ baseURL: `${API_URL}/portal`, timeout: 30000 });

portalApi.interceptors.request.use((config) => {
  const token = getItem('portalToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

portalApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response && err.response.status === 401 && getItem('portalToken')) {
      await removeItem('portalToken');
      await removeItem('portalUser');
      notifyUnauthorized('portal');
    }
    return Promise.reject(err);
  }
);

export default portalApi;

import api from './axios';

export async function getActivityLog(params = {}) {
  const res = await api.get('/activity-log', { params });
  return res.data;
}
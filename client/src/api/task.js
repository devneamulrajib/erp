import api from './axios';

export const getTaskOverview = () => api.get('/tasks/overview').then((r) => r.data);
export const listTasks = (params) => api.get('/tasks', { params }).then((r) => r.data);
export const getTask = (id) => api.get(`/tasks/${id}`).then((r) => r.data);
export const createTasks = (payload) => api.post('/tasks', payload).then((r) => r.data);
export const updateTask = (id, payload) => api.patch(`/tasks/${id}`, payload).then((r) => r.data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then((r) => r.data);
export const updateTimeLog = (id, payload) => api.patch(`/tasks/logs/${id}`, payload).then((r) => r.data);
export const deleteTimeLog = (id) => api.delete(`/tasks/logs/${id}`).then((r) => r.data);
export const getWorkLogReport = (params) => api.get('/tasks/worklog/report', { params }).then((r) => r.data);
export const exportWorkLog = async (params) => {
  const res = await api.get('/tasks/worklog/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `work-log-${params.from}_${params.to}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const fmtMinutes = (m) => {
  if (m == null) return '—';
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
};
export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
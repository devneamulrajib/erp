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

export const addSubtask = (taskId, payload) => api.post(`/tasks/${taskId}/subtasks`, payload).then((r) => r.data);
export const updateSubtask = (taskId, subtaskId, payload) =>
  api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, payload).then((r) => r.data);
export const deleteSubtask = (taskId, subtaskId) =>
  api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`).then((r) => r.data);

export const getTaskMessages = (taskId) => api.get(`/tasks/${taskId}/messages`).then((r) => r.data);
export const sendTaskMessage = (taskId, { message, files }) => {
  const fd = new FormData();
  if (message) fd.append('message', message);
  (files || []).forEach((f) => fd.append('files', f));
  return api.post(`/tasks/${taskId}/messages`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const exportWorkLog = async (params) => {
  const res = await api.get('/tasks/worklog/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `work-log-${params.from}_${params.to}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const resolveFileUrl = (p) => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = api.defaults.baseURL || '';
  if (/^https?:\/\//i.test(base)) {
    return `${new URL(base).origin}${p.startsWith('/') ? p : `/${p}`}`;
  }
  return p;
};

export const fmtMinutes = (m) => {
  if (m == null) return '—';
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
};

export const fmtSeconds = (secs) => {
  if (secs == null) return '—';
  const s = Math.max(0, Math.round(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
};

export const fmtClock = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
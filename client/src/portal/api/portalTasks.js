import portalApi from './portalAxios';

const base = '/employee/tasks';

export const listMyTasks = (status) =>
  portalApi.get(base, { params: status ? { status } : {} }).then((r) => r.data);
export const createMyTask = (payload) => portalApi.post(base, payload).then((r) => r.data);
export const getMyTask = (id) => portalApi.get(`${base}/${id}`).then((r) => r.data);
export const updateMyTask = (id, payload) => portalApi.patch(`${base}/${id}`, payload).then((r) => r.data);
export const addProgress = (id, payload) => portalApi.post(`${base}/${id}/progress`, payload).then((r) => r.data);
export const confirmAndStartTask = (id) => portalApi.post(`${base}/${id}/confirm`, { start: true }).then((r) => r.data);
export const startTimer = (id) => portalApi.post(`${base}/${id}/start`).then((r) => r.data);
export const stopTimer = (id) => portalApi.post(`${base}/${id}/stop`).then((r) => r.data);
export const getRunning = () => portalApi.get(`${base}/running`).then((r) => r.data);
export const getWorkLog = (date) =>
  portalApi.get(`${base}/worklog`, { params: date ? { date } : {} }).then((r) => r.data);
export const addManualTime = (payload) => portalApi.post(`${base}/time/manual`, payload).then((r) => r.data);

export const addMySubtask = (taskId, payload) =>
  portalApi.post(`${base}/${taskId}/subtasks`, payload).then((r) => r.data);
export const updateMySubtask = (taskId, subtaskId, payload) =>
  portalApi.patch(`${base}/${taskId}/subtasks/${subtaskId}`, payload).then((r) => r.data);
export const deleteMySubtask = (taskId, subtaskId) =>
  portalApi.delete(`${base}/${taskId}/subtasks/${subtaskId}`).then((r) => r.data);

export const getMyTaskMessages = (taskId) =>
  portalApi.get(`${base}/${taskId}/messages`).then((r) => r.data);
export const sendMyTaskMessage = (taskId, { message, files }) => {
  const fd = new FormData();
  if (message) fd.append('message', message);
  (files || []).forEach((f) => fd.append('files', f));
  return portalApi.post(`${base}/${taskId}/messages`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const checkOutAttendance = () =>
  portalApi.post('/employee/attendance/check-out').then((r) => r.data);

export const resolvePortalFileUrl = (p) => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const baseUrl = portalApi.defaults.baseURL || '';
  if (/^https?:\/\//i.test(baseUrl)) {
    return `${new URL(baseUrl).origin}${p.startsWith('/') ? p : `/${p}`}`;
  }
  return p;
};

/* ---------- formatting helpers ---------- */
export const fmtMinutes = (m) => {
  if (m == null) return '—';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}h ${String(mm).padStart(2, '0')}m` : `${mm}m`;
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
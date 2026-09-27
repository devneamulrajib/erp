import api from './axios';

export async function getNotifications() {
  const res = await api.get('/notifications');
  return res.data;
}
export async function getUnreadCount() {
  const res = await api.get('/notifications/unread-count');
  return res.data.count;
}
export async function markNotificationRead(id) {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
}
export async function markAllNotificationsRead() {
  const res = await api.patch('/notifications/read-all');
  return res.data;
}
export async function getUnreadCountByType() {
  const res = await api.get('/notifications/unread-count-by-type');
  return res.data;
}
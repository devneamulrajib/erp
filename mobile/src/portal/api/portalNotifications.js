import portalApi from './portalAxios';

export async function getPortalNotifications() {
  const res = await portalApi.get('/notifications');
  return res.data;
}
export async function getPortalUnreadCount() {
  const res = await portalApi.get('/notifications/unread-count');
  return res.data.count;
}
export async function markPortalNotificationRead(id) {
  const res = await portalApi.patch(`/notifications/${id}/read`);
  return res.data;
}
export async function markAllPortalNotificationsRead() {
  const res = await portalApi.patch('/notifications/read-all');
  return res.data;
}
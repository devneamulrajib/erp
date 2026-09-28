import { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { getPortalUser } from '../api/portalAuth';
import {
  getPortalNotifications, getPortalUnreadCount, markAllPortalNotificationsRead,
} from '../api/portalNotifications';
import { getPortalSocket } from '../api/portalSocket';
import { playNotificationSound } from '../utils/notificationSound';

const PortalNotificationsContext = createContext(null);

export function PortalNotificationsProvider({ children }) {
  const user = getPortalUser();
  const enabled = Boolean(user); // every portal role now gets notifications
  const isSupplier = user?.role === 'supplier' || user?.role === 'vendor';

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const refreshUnreadCount = useCallback(() => {
    if (!enabled) return;
    getPortalUnreadCount().then(setUnreadCount).catch(() => {});
  }, [enabled]);

  const refreshList = useCallback(async () => {
    if (!enabled) return;
    try {
      setNotifications(await getPortalNotifications());
    } catch {
      setNotifications([]);
    }
  }, [enabled]);

  const markAllRead = useCallback(async () => {
    if (!enabled) return;
    try {
      await markAllPortalNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // leave state as-is on failure
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    refreshUnreadCount();
    refreshList();

    const socket = getPortalSocket();
    if (!socket) return undefined;

    function handleNotification(n) {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
      playNotificationSound();
    }

    socket.on('notification', handleNotification);
    const interval = setInterval(refreshUnreadCount, 30000);

    return () => {
      socket.off('notification', handleNotification);
      clearInterval(interval);
    };
  }, [enabled, refreshUnreadCount, refreshList]);

  const unreadRelatedKeys = new Set(
    notifications.filter((n) => !n.read).map((n) => `${n.relatedType}:${n.relatedId}`)
  );

  return (
    <PortalNotificationsContext.Provider
      value={{ unreadCount, notifications, unreadRelatedKeys, isSupplier, enabled, refreshList, markAllRead }}
    >
      {children}
    </PortalNotificationsContext.Provider>
  );
}

export function usePortalNotifications() {
  return useContext(PortalNotificationsContext);
}
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
  const isSupplier = user?.role === 'supplier' || user?.role === 'vendor';

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const refreshUnreadCount = useCallback(() => {
    if (!isSupplier) return;
    getPortalUnreadCount().then(setUnreadCount).catch(() => {});
  }, [isSupplier]);

  const refreshList = useCallback(async () => {
    if (!isSupplier) return;
    try {
      const items = await getPortalNotifications();
      setNotifications(items);
    } catch {
      setNotifications([]);
    }
  }, [isSupplier]);

  const markAllRead = useCallback(async () => {
    if (!isSupplier) return;
    try {
      await markAllPortalNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // leave state as-is on failure
    }
  }, [isSupplier]);

  useEffect(() => {
    if (!isSupplier) return;
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

    // Fallback poll in case the socket connection drops without the client
    // noticing right away — keeps the badge accurate either way.
    const interval = setInterval(refreshUnreadCount, 30000);

    return () => {
      socket.off('notification', handleNotification);
      clearInterval(interval);
    };
  }, [isSupplier, refreshUnreadCount, refreshList]);

  // Keys like "MaterialRequisition:12" or "PurchaseOrder:7" for every
  // still-unread notification, so a list page can highlight the matching row.
  const unreadRelatedKeys = new Set(
    notifications.filter((n) => !n.read).map((n) => `${n.relatedType}:${n.relatedId}`)
  );

  return (
    <PortalNotificationsContext.Provider
      value={{ unreadCount, notifications, unreadRelatedKeys, isSupplier, refreshList, markAllRead }}
    >
      {children}
    </PortalNotificationsContext.Provider>
  );
}

export function usePortalNotifications() {
  return useContext(PortalNotificationsContext);
}
import { useEffect } from 'react';
import { View } from 'react-native';
import { getPortalNotifications, markAllPortalNotificationsRead } from '../../portal/api/portalNotifications';
import { Card, Empty, ErrorBox, List, Loading, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';

export default function NotificationsScreen() {
  const { data, loading, error, refreshing, refresh, reload } = useAsync(getPortalNotifications);
  useEffect(() => { markAllPortalNotificationsRead().catch(() => {}); }, []);
  if (loading) return <Loading />;
  const list = Array.isArray(data) ? data : data?.notifications || [];
  return (
    <List
      data={list}
      refreshing={refreshing}
      onRefresh={refresh}
      header={<ErrorBox message={error} onRetry={reload} />}
      empty={<Empty text="No notifications" />}
      renderItem={({ item: n }) => (
        <Card style={n.isRead === false ? { borderColor: colors.amber } : null}>
          <T>{n.message || n.title}</T>
          <View style={{ height: 4 }} />
          <Sub>{new Date(n.createdAt).toLocaleString()}</Sub>
        </Card>
      )}
    />
  );
}

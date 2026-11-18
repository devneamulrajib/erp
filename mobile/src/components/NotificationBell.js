import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getPortalUnreadCount } from '../portal/api/portalNotifications';
import { colors } from '../theme';

export default function NotificationBell() {
  const navigation = useNavigation();
  const [count, setCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getPortalUnreadCount().then((c) => alive && setCount(c || 0)).catch(() => {});
      return () => { alive = false; };
    }, [])
  );
  return (
    <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={10} style={{ marginRight: 16 }}>
      <Bell size={20} color={colors.muted} />
      {count > 0 ? <View style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber }} /> : null}
    </Pressable>
  );
}

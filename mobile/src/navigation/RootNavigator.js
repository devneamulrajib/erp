import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { Loading } from '../components/ui';
import LoginScreen from '../screens/auth/LoginScreen';
import StaffHomeScreen from '../screens/staff/StaffHomeScreen';
import ErpWebViewScreen from '../screens/staff/ErpWebViewScreen';
import PortalNavigator from './PortalNavigator';

const Stack = createNativeStackNavigator();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary, card: colors.white, text: colors.text, border: colors.border } };

export default function RootNavigator() {
  const { ready, session } = useAuth();
  if (!ready) return <Loading text="Starting Trikon ERP…" />;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontWeight: '700' } }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : session.kind === 'staff' ? (
          <>
            <Stack.Screen name="StaffHome" component={StaffHomeScreen} options={{ title: 'Trikon ERP' }} />
            <Stack.Screen name="ErpWeb" component={ErpWebViewScreen} options={({ route }) => ({ title: route.params?.title || 'ERP' })} />
          </>
        ) : (
          <Stack.Screen name="Portal" component={PortalNavigator} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

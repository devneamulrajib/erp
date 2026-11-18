// Admin / staff ERP inside a WebView. The web app reads its session from
// localStorage keys `token` and `user` (client/src/pages/Login.jsx, api/axios.js),
// so we seed those before any page script runs. If the web app navigates to
// /login (logout or expired token) we end the native session too.
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { WEB_URL } from '../../config';
import { getItem } from '../../storage/tokenStore';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { ErrorBox, Button } from '../../components/ui';

export default function ErpWebViewScreen({ route, navigation }) {
  const { logout } = useAuth();
  const ref = useRef(null);
  const canGoBack = useRef(false);
  const [error, setError] = useState('');
  const path = route.params?.path || '/dashboard';

  const injected = useMemo(() => {
    const token = JSON.stringify(getItem('token') || '');
    const user = JSON.stringify(getItem('user') || '');
    return `(function(){try{
      if(${token}){localStorage.setItem('token', ${token});localStorage.setItem('user', ${user});}
    }catch(e){}})();true;`;
  }, []);

  // Android hardware back: go back inside the WebView first.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack.current && ref.current) { ref.current.goBack(); return true; }
        return false;
      });
      return () => sub.remove();
    }, [])
  );

  const onNav = (nav) => {
    canGoBack.current = nav.canGoBack;
    if (nav.title && !/^https?:/.test(nav.title)) navigation.setOptions({ title: nav.title.replace(/\s*[|·-]\s*Trikon.*$/i, '') || route.params?.title });
    // (RN's URL polyfill is partial, so parse with a regex.)
    const m = /^(https?:\/\/[^/?#]+)(\/[^?#]*)?/i.exec(nav.url || '');
    if (m && m[1].toLowerCase() === WEB_URL.toLowerCase() && (m[2] || '/') === '/login' && !nav.loading) logout();
  };

  // Keep the WebView on the ERP domain; open everything else (maps, mailto, PDFs on other hosts) outside.
  const onShouldStart = (req) => {
    const url = req.url || '';
    if (url.startsWith(WEB_URL) || url.startsWith('about:') || url.startsWith('blob:') || url.startsWith('data:')) return true;
    Linking.openURL(url).catch(() => {});
    return false;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      {error ? (
        <View style={{ padding: 16 }}>
          <ErrorBox message={error} />
          <Button title="Reload" onPress={() => { setError(''); ref.current?.reload(); }} />
        </View>
      ) : null}
      <WebView
        ref={ref}
        source={{ uri: `${WEB_URL}${path}` }}
        injectedJavaScriptBeforeContentLoaded={injected}
        onNavigationStateChange={onNav}
        onShouldStartLoadWithRequest={onShouldStart}
        onError={(e) => setError(e.nativeEvent?.description || 'Could not load the ERP. Check your connection.')}
        onHttpError={(e) => { if (e.nativeEvent.statusCode >= 500) setError(`Server error (${e.nativeEvent.statusCode}).`); }}
        startInLoadingState
        renderLoading={() => <View style={StyleSheet.absoluteFill}><ActivityIndicator style={{ marginTop: 40 }} color={colors.text} /></View>}
        domStorageEnabled
        javaScriptEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        allowFileAccess={false}
        originWhitelist={['https://*', 'http://*']}
      />
    </View>
  );
}

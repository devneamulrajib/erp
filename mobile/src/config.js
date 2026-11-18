// Central runtime config. Mirrors the web client's VITE_API_URL, but read from
// app.config.js `extra` (which in turn reads EXPO_PUBLIC_API_URL at build time).
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra || {};

const DEFAULT_API_URL = 'https://api.erp.mwm247.com/api';
const DEFAULT_WEB_URL = 'https://erp.mwm247.com';

// The Android emulator cannot reach the host machine's "localhost";
// it is exposed as 10.0.2.2 instead. Only rewrite in dev builds.
function mapLocalhost(url) {
  if (!url) return url;
  if (__DEV__ && Platform.OS === 'android') {
    return url.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/i, '//10.0.2.2');
  }
  return url;
}

export const API_URL = mapLocalhost(process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || DEFAULT_API_URL).replace(/\/+$/, '');
export const WEB_URL = mapLocalhost(process.env.EXPO_PUBLIC_WEB_URL || extra.webUrl || DEFAULT_WEB_URL).replace(/\/+$/, '');

// e.g. https://api.erp.mwm247.com  (used for /uploads/... files and socket.io)
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export const resolveFileUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

// Expo app configuration for the Trikon ERP mobile app.
//
// API / web URLs can be overridden at build time with environment variables:
//   EXPO_PUBLIC_API_URL  (default https://api.erp.mwm247.com/api)
//   EXPO_PUBLIC_WEB_URL  (default https://erp.mwm247.com)
//   APP_VARIANT=development  -> allows plain-http (cleartext) traffic for local dev servers.
const IS_DEV = process.env.APP_VARIANT === 'development';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.erp.mwm247.com/api';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://erp.mwm247.com';

module.exports = {
  expo: {
    name: IS_DEV ? 'Trikon ERP (Dev)' : 'Trikon ERP',
    slug: 'trikon-erp',
    scheme: 'trikonerp',
    version: '1.0.3',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      bundleIdentifier: IS_DEV ? 'com.trikon.erp.dev' : 'com.trikon.erp',
      buildNumber: '2',
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // Only the dev variant may talk to plain-http servers on the local network.
        ...(IS_DEV ? { NSAppTransportSecurity: { NSAllowsLocalNetworking: true, NSAllowsArbitraryLoads: true } } : {}),
      },
    },
    android: {
      package: IS_DEV ? 'com.trikon.erp.dev' : 'com.trikon.erp',
      versionCode: 3,
      adaptiveIcon: {
        backgroundColor: '#FFFFFF',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      // Attachments are picked through the system document picker, which needs no
      // storage permission. Block permissions we never use.
      permissions: ['android.permission.INTERNET'],
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
    },
    web: { favicon: './assets/favicon.png' },
    plugins: [
      'expo-secure-store',
      'expo-sharing',
      '@react-native-community/datetimepicker',
      [
        'expo-build-properties',
        {
          android: { usesCleartextTraffic: IS_DEV },
        },
      ],
      // Trust system CAs + bundled SSL.com TLS RSA Root CA 2022 (older Android lacks it).
      ['./plugins/withNetworkSecurityConfig', { allowCleartext: IS_DEV }],
    ],
    extra: {
      apiUrl: API_URL,
      webUrl: WEB_URL,
      appVariant: IS_DEV ? 'development' : 'production',
      eas: {
        projectId: '41b61dd2-886c-4ed0-82c6-4acedd531a56',
      },
    },
  },
};
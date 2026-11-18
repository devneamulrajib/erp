// Native replacement for the web client's localStorage keys:
//   token / user             -> staff (ERP) session
//   portalToken / portalUser -> external portal session
// Values live in the device keychain/keystore via expo-secure-store and are
// mirrored in memory so axios interceptors can read them synchronously.
import * as SecureStore from 'expo-secure-store';

const KEYS = ['token', 'user', 'portalToken', 'portalUser'];
const cache = {};

export async function loadTokens() {
  await Promise.all(
    KEYS.map(async (k) => {
      try {
        cache[k] = await SecureStore.getItemAsync(k);
      } catch {
        cache[k] = null;
      }
    })
  );
  return { ...cache };
}

export function getItem(key) {
  return cache[key] ?? null;
}

export async function setItem(key, value) {
  cache[key] = value;
  await SecureStore.setItemAsync(key, value);
}

export async function removeItem(key) {
  cache[key] = null;
  await SecureStore.deleteItemAsync(key);
}

export function getJSON(key) {
  const raw = getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Called by axios interceptors on 401 so the app can drop back to the login screen.
let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}
export function notifyUnauthorized(kind) {
  if (unauthorizedHandler) unauthorizedHandler(kind);
}

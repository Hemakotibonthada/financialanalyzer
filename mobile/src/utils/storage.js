import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage split by sensitivity.
 *
 * Tokens go to SecureStore, which is the iOS Keychain and the Android
 * Keystore. AsyncStorage is plain unencrypted files - fine for a cached
 * dashboard payload, wrong for anything that grants access to an account.
 */

const ACCESS_TOKEN_KEY = 'fa.accessToken';
const REFRESH_TOKEN_KEY = 'fa.refreshToken';
const USER_KEY = 'fa.user';
const CACHE_PREFIX = 'fa.cache.';

/* ---------------------------------------------------------------- tokens */

export async function saveTokens({ accessToken, refreshToken }) {
  const writes = [];
  if (accessToken) writes.push(SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken));
  if (refreshToken) writes.push(SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken));
  await Promise.all(writes);
}

export async function getAccessToken() {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getRefreshToken() {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {})
  ]);
}

/* ------------------------------------------------------------------ user */

export async function saveUser(user) {
  if (!user) return;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearUser() {
  await AsyncStorage.removeItem(USER_KEY).catch(() => {});
}

/* ----------------------------------------------------------------- cache */

/**
 * Cache a successful GET so the screen has something to show when the device
 * is offline. Entries are stamped so the UI can say how stale the data is
 * rather than presenting it as live.
 */
export async function writeCache(key, data) {
  try {
    await AsyncStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, cachedAt: Date.now() })
    );
  } catch {
    // A full disk must never break a request.
  }
}

export async function readCache(key) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { data: parsed.data, cachedAt: parsed.cachedAt };
  } catch {
    return null;
  }
}

export async function clearCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // Best effort.
  }
}

/* --------------------------------------------------------------- prefs */

export async function getPreference(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(`fa.pref.${key}`);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function setPreference(key, value) {
  try {
    await AsyncStorage.setItem(`fa.pref.${key}`, JSON.stringify(value));
  } catch {
    // Preferences are not worth failing a screen over.
  }
}

/** Wipe everything. Used on sign-out so the next user starts clean. */
export async function clearAll() {
  await clearTokens();
  await clearUser();
  await clearCache();
}

export default {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  saveUser,
  getUser,
  clearUser,
  writeCache,
  readCache,
  clearCache,
  getPreference,
  setPreference,
  clearAll
};

import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getAccessToken, getRefreshToken, saveTokens, clearAll, writeCache, readCache } from '../utils/storage';

/**
 * HTTP client.
 *
 * Resolution order for the API base URL:
 *   1. EXPO_PUBLIC_API_URL   - set per build profile in eas.json
 *   2. app.json extra.apiUrl - the committed default
 *   3. platform dev fallback - emulator loopback
 *
 * The base URL already ends in /api, so endpoint paths must NOT repeat it.
 * Requesting '/api/transactions' here produces '/api/api/transactions'; that
 * exact bug shipped in the web app, so it is worth stating twice.
 */

function resolveBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  const fromConfig = Constants.expoConfig?.extra?.apiUrl;
  if (fromConfig) return fromConfig;

  // Development fallback. Android emulators cannot reach the host's localhost;
  // 10.0.2.2 is the loopback alias the emulator provides.
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:5001/api'
    : 'http://localhost:5001/api';
}

export const API_BASE_URL = resolveBaseUrl();

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

/* --------------------------------------------------- session expiry hook */

// The auth context registers here so a 401 can drop the user to the sign-in
// screen without this module importing React.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/* ------------------------------------------------------------- requests */

client.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Let the caller send FormData without fighting the default JSON header.
  if (config.data instanceof FormData) delete config.headers['Content-Type'];

  return config;
});

/* ------------------------------------------------------------ responses */

// Concurrent 401s must trigger exactly one refresh, otherwise a screen with
// four parallel requests burns four refresh tokens and rotation invalidates
// the session.
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  // A bare axios call, so this request cannot recurse through this very
  // interceptor when the refresh itself returns 401.
  const { data } = await axios.post(
    `${API_BASE_URL}/auth/refresh-token`,
    { refreshToken },
    { timeout: 20000 }
  );

  const accessToken = data?.data?.accessToken || data?.accessToken;
  const newRefresh = data?.data?.refreshToken || data?.refreshToken;
  if (!accessToken) throw new Error('Refresh response contained no access token');

  await saveTokens({ accessToken, refreshToken: newRefresh });
  return accessToken;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;

    if (status === 401 && !original.__isRetry && !original.url?.includes('/auth/')) {
      original.__isRetry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const token = await refreshPromise;
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return client(original);
      } catch {
        await clearAll();
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(new Error('Your session expired. Please sign in again.'));
      }
    }

    return Promise.reject(normaliseError(error));
  }
);

/**
 * Turn an axios failure into something a person can act on. Screens render
 * `error.message` directly, so it must never be "Request failed with status
 * code 500".
 */
function normaliseError(error) {
  if (error.response) {
    const body = error.response.data;
    const message =
      body?.message ||
      body?.error ||
      (error.response.status >= 500
        ? 'The server had a problem. Please try again shortly.'
        : 'That request could not be completed.');
    const wrapped = new Error(message);
    wrapped.status = error.response.status;
    wrapped.data = body;
    return wrapped;
  }

  if (error.code === 'ECONNABORTED') {
    return new Error('The request timed out. Check your connection and try again.');
  }

  return new Error('Could not reach the server. Check your internet connection.');
}

/* --------------------------------------------------------------- helpers */

/**
 * GET with transparent offline fallback.
 *
 * On success the payload is cached. On a network failure the cached copy is
 * returned along with the time it was stored, so the UI can label it as stale
 * rather than passing old numbers off as current.
 */
export async function getCached(path, config = {}) {
  const cacheKey = path;
  try {
    const res = await client.get(path, config);
    const payload = unwrap(res);
    await writeCache(cacheKey, payload);
    return { data: payload, fromCache: false, cachedAt: null };
  } catch (error) {
    const cached = await readCache(cacheKey);
    if (cached) {
      return { data: cached.data, fromCache: true, cachedAt: cached.cachedAt };
    }
    throw error;
  }
}

/**
 * Unwrap the standard { success, data } envelope so screens never reach for
 * `res.data.data`.
 */
export function unwrap(response) {
  const body = response?.data;
  if (body && typeof body === 'object' && 'success' in body) {
    return body.data !== undefined ? body.data : body;
  }
  return body;
}

/* ------------------------------------------------------------ downloads */

/**
 * Download a binary response (Excel/PDF export) to a local file.
 *
 * Deliberately does NOT go through axios. Two reasons:
 *
 *  1. Binary through axios in React Native arrives mangled unless responseType
 *     is set, and the response interceptor here would try to unwrap it as JSON.
 *  2. These export endpoints return password-protected workbooks and put the
 *     password in an `X-Document-Password` response header. A download that
 *     drops that header produces a file the user cannot open, so the header
 *     has to be read and handed back to the caller.
 *
 * Note on expo-file-system: SDK 54 ships a new File API, and the legacy
 * functions re-exported from the package root are deprecated shims that THROW
 * at runtime. They must be imported from 'expo-file-system/legacy'.
 */
export async function downloadFile(path, { method = 'GET', body = null, filename } = {}) {
  const FileSystem = require('expo-file-system/legacy');

  const token = await getAccessToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    // The failure body is JSON even though the success body is binary.
    let message = `Export failed (${response.status}).`;
    try {
      const problem = await response.json();
      if (problem?.message) message = problem.message;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }

  const documentPassword = response.headers.get('X-Document-Password') || null;
  const disposition = response.headers.get('Content-Disposition') || '';
  const suggested = /filename=([^;]+)/i.exec(disposition)?.[1]?.trim().replace(/"/g, '');
  const name = filename || suggested || `export-${Date.now()}.xlsx`;

  const blob = await response.blob();
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the downloaded file.'));
    reader.onloadend = () => {
      // readAsDataURL yields "data:<mime>;base64,<payload>".
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });

  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64
  });

  return { uri, name, documentPassword, size: blob.size };
}

export default client;

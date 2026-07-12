/**
 * apiClient.js
 * Every API module (auth.js, profile.js, resource.js ...) goes through here.
 *
 * Responsibilities:
 *  - Attach `Authorization: Bearer <token>` automatically when authed.
 *  - Normalize the backend's { status, message, data|errors } envelope.
 *  - Transparently refresh the access token on a 401 and retry ONCE
 *    (with a single in-flight refresh shared by concurrent requests).
 *  - Apply a request timeout and turn network failures into a typed error.
 *  - Force logout + redirect to /login.html if the refresh itself fails.
 */
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/config.js';
import { session } from '../state/session.js';

export class ApiError extends Error {
  constructor(message, { status = 0, errors = [], kind = 'api' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.kind = kind; // 'api' | 'network' | 'timeout' | 'auth'
  }
}

let refreshInFlight = null;

async function performRefresh() {
  const refreshToken = session.getRefreshToken();
  if (!refreshToken) throw new ApiError('No refresh token', { kind: 'auth' });

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const json = await safeJson(res);

  if (!res.ok || !json?.data?.access_token) {
    throw new ApiError(json?.message || 'Session expired', { status: res.status, kind: 'auth' });
  }

  session.setTokens(json.data);
  return json.data.access_token;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function withTimeout(promiseFactory, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return promiseFactory(controller.signal).finally(() => clearTimeout(timer));
}

function forceLogout(redirect = true) {
  session.clear();
  if (redirect && !location.pathname.endsWith('/login.html')) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `login.html?next=${next}&expired=1`;
  }
}

/**
 * @param {string} path            e.g. '/auth/login'
 * @param {object} options
 * @param {'GET'|'POST'|'PUT'|'DELETE'} [options.method]
 * @param {object|FormData|null} [options.body]
 * @param {boolean} [options.auth]        attach bearer token
 * @param {boolean} [options.allowRetry]  internal — prevents infinite retry loops
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body = null, auth = false, allowRetry = true } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = {};
  if (!isFormData && body !== null) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = session.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await withTimeout(
      (signal) =>
        fetch(`${API_BASE_URL}${path}`, {
          method,
          headers,
          body: body === null ? null : isFormData ? body : JSON.stringify(body),
          signal,
        }),
      REQUEST_TIMEOUT_MS
    );
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out', { kind: 'timeout' });
    }
    throw new ApiError('Network error — check your connection', { kind: 'network' });
  }

  const json = await safeJson(res);

  // Access token expired/invalid — try exactly one silent refresh + retry.
  if (res.status === 401 && auth && allowRetry) {
    try {
      refreshInFlight = refreshInFlight || performRefresh();
      await refreshInFlight;
      refreshInFlight = null;
      return apiRequest(path, { ...options, allowRetry: false });
    } catch {
      refreshInFlight = null;
      forceLogout();
      throw new ApiError('Your session has expired. Please log in again.', { status: 401, kind: 'auth' });
    }
  }

  if (res.status === 429) {
    throw new ApiError(json?.message || 'Too many requests — please slow down.', { status: 429, kind: 'api' });
  }

  if (!res.ok) {
    throw new ApiError(json?.message || `Request failed (${res.status})`, {
      status: res.status,
      errors: json?.errors || [],
      kind: 'api',
    });
  }

  return json?.data ?? json;
}

export const api = {
  get: (path, opts = {}) => apiRequest(path, { ...opts, method: 'GET' }),
  post: (path, body, opts = {}) => apiRequest(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts = {}) => apiRequest(path, { ...opts, method: 'PUT', body }),
  del: (path, opts = {}) => apiRequest(path, { ...opts, method: 'DELETE' }),
};

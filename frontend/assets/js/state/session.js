/**
 * session.js
 * Single source of truth for "who is logged in" — read by the API client
 * (to attach the Authorization header / trigger refresh) and by every
 * page (to guard routes and render the right nav).
 */
import { storage } from '../utils/storage.js';
import { STORAGE_KEYS } from '../config/config.js';

export const session = {
  getAccessToken() {
    return storage.get(STORAGE_KEYS.ACCESS_TOKEN, null);
  },
  getRefreshToken() {
    return storage.get(STORAGE_KEYS.REFRESH_TOKEN, null);
  },
  getUser() {
    return storage.get(STORAGE_KEYS.USER, null);
  },
  isAuthenticated() {
    return Boolean(this.getAccessToken());
  },

  setTokens({ access_token, refresh_token }) {
    if (access_token) storage.set(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    if (refresh_token) storage.set(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);
  },

  setUser(user) {
    storage.set(STORAGE_KEYS.USER, user);
  },

  clear() {
    storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    storage.remove(STORAGE_KEYS.USER);
  },

  hasRole(role) {
    const user = this.getUser();
    return Boolean(user && user.role === role);
  },
};

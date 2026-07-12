/**
 * config.js
 * Central configuration for the FLTH frontend.
 * Change API_BASE_URL to match where the PHP backend is served from.
 */

// The PHP backend (see test.http / README.md in the backend repo) is served
// from /public, with all routes under /api/v1.
export const API_BASE_URL = 'http://localhost/flth-backend/public/api/v1';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'flth_access_token',
  REFRESH_TOKEN: 'flth_refresh_token',
  USER: 'flth_user',
  LANG: 'flth_lang',
  THEME: 'flth_theme',
};

export const SUPPORTED_LANGS = ['ar', 'en'];
export const DEFAULT_LANG = 'ar';
export const DEFAULT_THEME = 'system'; // 'light' | 'dark' | 'system'

export const ROLES = {
  ADMIN: 'admin',
  COMPANY: 'company',
  JOB_SEEKER: 'job_seeker',
};

// Request timeout (ms) before we treat a call as a network failure.
export const REQUEST_TIMEOUT_MS = 15000;

// Upload limits mirrored from the backend's FileUpload helper defaults.
export const UPLOAD_LIMITS = {
  MAX_MB: 10,
  IMAGE_EXT: ['jpg', 'jpeg', 'png', 'webp'],
  PDF_EXT: ['pdf'],
};

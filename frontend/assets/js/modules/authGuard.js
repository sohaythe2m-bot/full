/**
 * authGuard.js
 * Call requireAuth() at the top of protected pages, or redirectIfAuthed()
 * at the top of guest-only pages (login/register/etc).
 */
import { session } from '../state/session.js';
import { ROLES } from '../config/config.js';

export function requireAuth({ role = null } = {}) {
  if (!session.isAuthenticated()) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `login.html?next=${next}`;
    return false;
  }
  if (role && !session.hasRole(role)) {
    location.href = 'index.html';
    return false;
  }
  return true;
}

export function requireJobSeeker() {
  return requireAuth({ role: ROLES.JOB_SEEKER });
}

export function redirectIfAuthed(target = 'dashboard.html') {
  if (session.isAuthenticated()) {
    location.href = target;
    return true;
  }
  return false;
}

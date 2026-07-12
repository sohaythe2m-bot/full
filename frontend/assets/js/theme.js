/**
 * theme.js
 * Handles light / dark / system theme, persisted in localStorage.
 * When 'system' is chosen we keep listening to the OS preference so the
 * UI updates live if the user changes it while the tab is open.
 */
import { storage } from '../utils/storage.js';
import { STORAGE_KEYS, DEFAULT_THEME } from '../config/config.js';

const media = window.matchMedia('(prefers-color-scheme: dark)');

function resolveEffective(pref) {
  return pref === 'system' ? (media.matches ? 'dark' : 'light') : pref;
}

function apply(pref) {
  document.documentElement.setAttribute('data-theme', resolveEffective(pref));
  document.documentElement.setAttribute('data-theme-pref', pref);
}

export function getThemePref() {
  return storage.get(STORAGE_KEYS.THEME, DEFAULT_THEME);
}

export function setTheme(pref) {
  storage.set(STORAGE_KEYS.THEME, pref);
  apply(pref);
}

export function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(getThemePref()) + 1) % order.length];
  setTheme(next);
  return next;
}

export function initTheme() {
  apply(getThemePref());
  media.addEventListener('change', () => {
    if (getThemePref() === 'system') apply('system');
  });
}
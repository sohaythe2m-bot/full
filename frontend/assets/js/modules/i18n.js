/**
 * i18n.js
 * Minimal, dependency-free i18n:
 *  - Loads /translations/{lang}.json
 *  - Applies translations to any element with data-i18n / data-i18n-placeholder /
 *    data-i18n-aria-label attributes
 *  - Flips <html lang> + <html dir> for full RTL/LTR support
 *  - Persists the choice in localStorage and exposes t() for JS-side strings
 */
import { storage } from '../utils/storage.js';
import { STORAGE_KEYS, DEFAULT_LANG, SUPPORTED_LANGS } from '../config/config.js';

let dict = {};
let currentLang = DEFAULT_LANG;
const listeners = new Set();

function resolveKey(key) {
  return key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), dict);
}

/** Translate a key, with optional {placeholders}. Falls back to the key itself. */
export function t(key, vars = {}) {
  let value = resolveKey(key);
  if (value === undefined) return key.endsWith('Placeholder') ? '' : key;
  Object.entries(vars).forEach(([k, v]) => {
    value = value.replace(new RegExp(`{${k}}`, 'g'), v);
  });
  return value;
}

export function getLang() {
  return currentLang;
}

export function isRtl(lang = currentLang) {
  return lang === 'ar';
}

async function fetchDict(lang) {
  const res = await fetch(`assets/translations/${lang}.json`);
  if (!res.ok) throw new Error(`Missing translation file for "${lang}"`);
  return res.json();
}

function applyDirection(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
  document.documentElement.classList.toggle('lang-ar', lang === 'ar');
  document.documentElement.classList.toggle('lang-en', lang === 'en');
}

/** Walk the DOM and fill in every translatable element. */
export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = t(node.getAttribute('data-i18n'));
    if (node.hasAttribute('data-i18n-html')) node.innerHTML = value;
    else node.textContent = value;
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.setAttribute('placeholder', t(node.getAttribute('data-i18n-placeholder')));
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria-label')));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((node) => {
    node.setAttribute('title', t(node.getAttribute('data-i18n-title')));
  });
  const titleKey = document.body?.getAttribute('data-i18n-doctitle');
  if (titleKey) document.title = t(titleKey);
}

export async function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
  dict = await fetchDict(lang);
  currentLang = lang;
  storage.set(STORAGE_KEYS.LANG, lang);
  applyDirection(lang);
  applyTranslations();
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Call once per page, before rendering anything language-dependent. */
export async function initI18n() {
  const saved = storage.get(STORAGE_KEYS.LANG, null);
  const lang = SUPPORTED_LANGS.includes(saved) ? saved : DEFAULT_LANG;
  await setLang(lang);
}

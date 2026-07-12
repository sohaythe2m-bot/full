/**
 * sanitize.js
 * Small helpers to keep user-generated / API-returned strings safe
 * whenever they are injected into innerHTML.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a value for safe use inside innerHTML. */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

/** Strip anything that looks like a tag — used for plain-text-only fields. */
export function stripTags(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/<\/?[^>]+(>|$)/g, '');
}

/** Build a text node safely (always the safest option when possible). */
export function textNode(value) {
  return document.createTextNode(value === null || value === undefined ? '' : String(value));
}
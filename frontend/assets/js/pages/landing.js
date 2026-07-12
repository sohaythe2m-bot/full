/**
 * pages/landing.js
 */
import { qs } from '../utils/dom.js';

export function runLandingPage() {
  // The Jobs module isn't implemented on the backend yet (see routes/api.php),
  // so rather than pretend to search, this honestly routes people to sign up —
  // where a real search will live once that endpoint exists.
  qs('#heroSearchForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    location.href = 'register.html';
  });
}

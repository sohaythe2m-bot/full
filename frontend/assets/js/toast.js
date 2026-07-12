/**
 * toast.js
 * Self-contained toast notification system. Injects its own container
 * on first use, so any page just needs: import { toast } from '...';
 */
import { escapeHtml } from '../utils/sanitize.js';

const ICONS = {
  success: '<path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  error: '<path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  warning: '<path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  info: '<path d="M12 16v-4m0-4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};

function ensureContainer() {
  let container = document.getElementById('toast-stack');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-stack';
    container.className = 'toast-stack';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message, type = 'info', duration = 4200) {
  const container = ensureContainer();
  const node = document.createElement('div');
  node.className = `toast toast--${type}`;
  node.innerHTML = `
    <svg class="toast__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${ICONS[type] || ICONS.info}</svg>
    <span class="toast__msg">${escapeHtml(message)}</span>
    <button type="button" class="toast__close" aria-label="Close">&times;</button>
  `;
  container.appendChild(node);

  requestAnimationFrame(() => node.classList.add('toast--in'));

  const remove = () => {
    node.classList.remove('toast--in');
    node.classList.add('toast--out');
    setTimeout(() => node.remove(), 220);
  };

  const timer = setTimeout(remove, duration);
  node.querySelector('.toast__close').addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });
}

toast.success = (msg, d) => toast(msg, 'success', d);
toast.error = (msg, d) => toast(msg, 'error', d);
toast.warning = (msg, d) => toast(msg, 'warning', d);
toast.info = (msg, d) => toast(msg, 'info', d);
/**
 * dashSidebar.js
 * Renders the dashboard's left sidebar nav, shared by dashboard.html
 * and profile.html so the active-link state and profile blurb are
 * generated in exactly one place.
 */
import { session } from '../state/session.js';
import { t } from '../modules/i18n.js';
import { escapeHtml } from '../utils/sanitize.js';

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'F';
}

const ICONS = {
  overview: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" stroke-width="1.8"/></svg>',
  profile: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c1.6-3.6 4.6-5.5 7.5-5.5s5.9 1.9 7.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  skills: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  education: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 8.5 12 4l10 4.5-10 4.5-10-4.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6 10.7v4.6c0 1.7 2.7 3.2 6 3.2s6-1.5 6-3.2v-4.6" stroke="currentColor" stroke-width="1.7"/></svg>',
  experience: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="7.5" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" stroke="currentColor" stroke-width="1.7"/></svg>',
  certificates: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="9" r="6" stroke="currentColor" stroke-width="1.7"/><path d="M9 14.5 7.5 21l4.5-2.4 4.5 2.4-1.5-6.5" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  projects: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 20h8M12 18v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1L15 3.5h-6l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.75 1.7 1l.4 2.5h6l.4-2.5c.6-.25 1.2-.6 1.7-1l2.3.9 2-3.4-2-1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
};

const LINKS = [
  { href: 'dashboard.html', key: 'sidebar.overview', icon: 'overview', match: 'dashboard.html' },
  { href: 'profile.html', key: 'sidebar.profile', icon: 'profile', match: 'profile.html' },
  { href: 'profile.html#skills', key: 'sidebar.skills', icon: 'skills', match: null },
  { href: 'profile.html#education', key: 'sidebar.education', icon: 'education', match: null },
  { href: 'profile.html#experience', key: 'sidebar.experience', icon: 'experience', match: null },
  { href: 'profile.html#certificates', key: 'sidebar.certificates', icon: 'certificates', match: null },
  { href: 'profile.html#projects', key: 'sidebar.projects', icon: 'projects', match: null },
];

export function renderDashSidebar(activePage) {
  const mount = document.getElementById('dash-sidebar');
  if (!mount) return;
  const user = session.getUser();
  const name = escapeHtml(user?.full_name || user?.email || '');

  mount.innerHTML = `
    <div class="side-profile">
      <span class="avatar">${escapeHtml(initials(user?.full_name))}</span>
      <div>
        <div class="name">${name}</div>
        <div class="role">${escapeHtml(user?.role || '')}</div>
      </div>
    </div>
    <span class="side-group-label" data-i18n="sidebar.jobseekerGroup">${t('sidebar.jobseekerGroup')}</span>
    ${LINKS.map((l) => `
      <a href="${l.href}" class="side-link ${l.match === activePage ? 'active' : ''}">
        ${ICONS[l.icon]}<span data-i18n="${l.key}">${t(l.key)}</span>
      </a>
    `).join('')}
  `;
}

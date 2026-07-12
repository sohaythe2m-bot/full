/**
 * navbar.js
 * Renders the site header once per page into <div id="app-header"></div>,
 * so markup + auth-aware behavior isn't duplicated across every HTML file.
 */
import { session } from '../state/session.js';
import { t, getLang, setLang, onLangChange } from '../modules/i18n.js';
import { getThemePref, setTheme } from '../modules/theme.js';
import { logout } from '../api/auth.js';
import { toast } from './toast.js';
import { escapeHtml } from '../utils/sanitize.js';

const NAV_LINKS = [
  { href: 'index.html#jobs', key: 'nav.jobs' },
  { href: 'about.html', key: 'nav.about' },
  { href: 'pricing.html', key: 'nav.pricing' },
  { href: 'faq.html', key: 'nav.faq' },
  { href: 'contact.html', key: 'nav.contact' },
];

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'F';
}

function renderGuestActions() {
  return `
    <a href="login.html" class="btn btn--ghost btn--sm" data-i18n="nav.login">${t('nav.login')}</a>
    <a href="register.html" class="btn btn--primary btn--sm" data-i18n="nav.register">${t('nav.register')}</a>
  `;
}

function renderUserActions(user) {
  const name = escapeHtml(user?.full_name || user?.email || '');
  return `
    <div class="user-menu">
      <button type="button" class="user-menu-trigger" id="userMenuTrigger" aria-haspopup="true" aria-expanded="false">
        <span class="avatar">${escapeHtml(initials(user?.full_name))}</span>
        <span>${name.split(' ')[0] || name}</span>
      </button>
      <div class="user-menu-dropdown" id="userMenuDropdown" role="menu">
        <a href="dashboard.html" role="menuitem"><span>📊</span><span data-i18n="nav.dashboard">${t('nav.dashboard')}</span></a>
        <a href="profile.html" role="menuitem"><span>👤</span><span data-i18n="nav.profile">${t('nav.profile')}</span></a>
        <button type="button" id="navLogoutBtn" class="danger" role="menuitem"><span>🚪</span><span data-i18n="nav.logout">${t('nav.logout')}</span></button>
      </div>
    </div>
  `;
}

function markup() {
  const authed = session.isAuthenticated();
  const user = session.getUser();
  const lang = getLang();

  return `
    <header class="site-header">
      <div class="container">
        <a href="index.html" class="brand">
          <span>${t('common.brandFrom')}</span><span class="dot">·</span><span>${t('common.brandTo')}</span>
        </a>

        <nav class="main-nav" aria-label="Primary">
          ${NAV_LINKS.map((l) => `<a href="${l.href}" data-i18n="${l.key}">${t(l.key)}</a>`).join('')}
        </nav>

        <div class="header-actions">
          <div class="lang-switch" role="group" aria-label="${t('lang.toggle')}">
            <button type="button" data-lang="ar" class="${lang === 'ar' ? 'active' : ''}">AR</button>
            <button type="button" data-lang="en" class="${lang === 'en' ? 'active' : ''}">EN</button>
          </div>
          <button type="button" class="icon-toggle" id="themeToggleBtn" data-i18n-aria-label="theme.toggle" aria-label="${t('theme.toggle')}">
            <svg id="themeIconSun" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <svg id="themeIconMoon" width="18" height="18" viewBox="0 0 24 24" fill="none" style="display:none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
          </button>
          <div class="hidden-sm-up" style="display:contents;">
            <div class="desktop-actions" style="display:flex;align-items:center;gap:10px;">
              ${authed ? renderUserActions(user) : renderGuestActions()}
            </div>
          </div>
          <button type="button" class="icon-toggle mobile-toggle" id="mobileMenuBtn" data-i18n-aria-label="nav.menu" aria-label="${t('nav.menu')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </header>

    <div class="mobile-drawer" id="mobileDrawer">
      <div class="drawer-overlay" id="drawerOverlay"></div>
      <div class="drawer-panel">
        ${NAV_LINKS.map((l) => `<a href="${l.href}">${t(l.key)}</a>`).join('')}
        <hr class="divider" />
        ${authed
          ? `<a href="dashboard.html">${t('nav.dashboard')}</a><a href="profile.html">${t('nav.profile')}</a><button type="button" id="drawerLogoutBtn">${t('nav.logout')}</button>`
          : `<a href="login.html">${t('nav.login')}</a><a href="register.html">${t('nav.register')}</a>`}
      </div>
    </div>
  `;
}

function updateThemeIcons() {
  const pref = getThemePref();
  const effective = document.documentElement.getAttribute('data-theme');
  const sun = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  if (!sun || !moon) return;
  const isDark = effective === 'dark';
  sun.style.display = isDark ? 'none' : 'block';
  moon.style.display = isDark ? 'block' : 'none';
}

async function handleLogout() {
  try {
    await logout();
    toast.success(t('toast.logoutSuccess'));
  } catch {
    // Even if the API call fails, the local session is already cleared.
  } finally {
    setTimeout(() => { location.href = 'index.html'; }, 500);
  }
}

function wireEvents(mount) {
  mount.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  const themeBtn = document.getElementById('themeToggleBtn');
  themeBtn?.addEventListener('click', () => {
    const order = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(getThemePref()) + 1) % order.length];
    setTheme(next);
    updateThemeIcons();
  });

  const trigger = document.getElementById('userMenuTrigger');
  const dropdown = document.getElementById('userMenuDropdown');
  if (trigger && dropdown) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }

  document.getElementById('navLogoutBtn')?.addEventListener('click', handleLogout);
  document.getElementById('drawerLogoutBtn')?.addEventListener('click', handleLogout);

  const menuBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('drawerOverlay');
  menuBtn?.addEventListener('click', () => drawer.classList.add('open'));
  overlay?.addEventListener('click', () => drawer.classList.remove('open'));

  updateThemeIcons();
}

export function renderNavbar() {
  const mount = document.getElementById('app-header');
  if (!mount) return;
  mount.innerHTML = markup();
  wireEvents(mount);
}

// Registered once: re-render the whole header whenever the language changes,
// so nav labels, aria-labels and the active lang pill stay in sync.
let langListenerAttached = false;
export function attachNavbarLangSync() {
  if (langListenerAttached) return;
  langListenerAttached = true;
  onLangChange(() => renderNavbar());
}

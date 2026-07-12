/**
 * app-shell.js
 * Runs on every page before page-specific logic: applies the saved theme
 * immediately (no flash), loads translations, and mounts the shared
 * header/footer. Each page's own <script type="module"> should:
 *
 *   import { initShell } from './assets/js/app-shell.js';
 *   await initShell();
 *   // ...page-specific code
 */
import { initTheme } from './modules/theme.js';
import { initI18n, applyTranslations } from './modules/i18n.js';
import { renderNavbar, attachNavbarLangSync } from './components/navbar.js';
import { renderFooter, attachFooterLangSync } from './components/footer.js';
import { renderChatWidget } from './components/ai-widget.js';

export async function initShell() {
  initTheme();
  await initI18n();
  renderNavbar();
  renderFooter();
  attachNavbarLangSync();
  attachFooterLangSync();
  applyTranslations();
  renderChatWidget();
}

/**
 * footer.js
 * Renders the site footer once per page into <div id="app-footer"></div>.
 */
import { t, onLangChange } from '../modules/i18n.js';

function markup() {
  const year = new Date().getFullYear();
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <a href="index.html" class="brand" style="margin-bottom:14px;">
              <span>${t('common.brandFrom')}</span><span class="dot">·</span><span>${t('common.brandTo')}</span>
            </a>
            <p>${t('footer.tagline')}</p>
          </div>
          <div class="footer-col">
            <h4>${t('footer.product')}</h4>
            <a href="index.html#jobs">${t('nav.jobs')}</a>
            <a href="pricing.html">${t('nav.pricing')}</a>
            <a href="faq.html">${t('nav.faq')}</a>
          </div>
          <div class="footer-col">
            <h4>${t('footer.company')}</h4>
            <a href="about.html">${t('nav.about')}</a>
            <a href="contact.html">${t('nav.contact')}</a>
          </div>
          <div class="footer-col">
            <h4>${t('footer.legal')}</h4>
            <a href="privacy.html">${t('footer.privacy')}</a>
            <a href="terms.html">${t('footer.terms')}</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>${t('footer.rights', { year })}</span>
          <span>${t('footer.madeWith')}</span>
        </div>
      </div>
    </footer>
  `;
}

export function renderFooter() {
  const mount = document.getElementById('app-footer');
  if (!mount) return;
  mount.innerHTML = markup();
}

let langListenerAttached = false;
export function attachFooterLangSync() {
  if (langListenerAttached) return;
  langListenerAttached = true;
  onLangChange(() => renderFooter());
}

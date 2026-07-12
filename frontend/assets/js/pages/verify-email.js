/**
 * pages/verify-email.js
 */
import { verifyEmail, resendVerification } from '../api/auth.js';
import { t } from '../modules/i18n.js';
import { validateForm, rules } from '../utils/validators.js';
import { handleApiError, paintFieldErrors, clearFieldErrors } from '../utils/apiErrorHandler.js';
import { setLoading } from '../utils/buttonState.js';
import { qs } from '../utils/dom.js';

function renderState(iconSvg, title, desc, variant) {
  qs('#verifyState').innerHTML = `
    <div class="alert alert--${variant}" style="display:inline-flex;border-radius:50%;padding:16px;margin-bottom:14px;">
      ${iconSvg}
    </div>
    <h1>${title}</h1>
    <p>${desc}</p>
  `;
}

const ICONS = {
  success: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  danger: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
};

export async function runVerifyEmailPage() {
  const params = new URLSearchParams(location.search);
  const token = params.get('token');

  if (token) {
    try {
      await verifyEmail(token);
      renderState(ICONS.success, t('auth.verifyTitle').replace('…', ''), t('auth.verifySuccess'), 'success');
      qs('#verifyState').insertAdjacentHTML('beforeend', `<a href="login.html" class="btn btn--primary" style="margin-top:10px;">${t('auth.logIn')}</a>`);
      qs('#resendCard').style.display = 'none';
    } catch {
      renderState(ICONS.danger, t('auth.verifyFailed'), '', 'danger');
    }
  } else {
    renderState(ICONS.danger, t('auth.verifyMissingToken'), '', 'warning');
  }

  const form = qs('#resendForm');
  const resendBtn = qs('#resendBtn');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(['email']);
    const email = qs('#email').value.trim();
    const errors = validateForm({ email }, { email: [rules.required, rules.email] });
    if (Object.keys(errors).length) {
      paintFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v)])));
      return;
    }
    setLoading(resendBtn, true, t('auth.resendSubmitting'));
    try {
      await resendVerification(email);
      form.innerHTML = `<div class="alert alert--success">${t('toast.resendSent')}</div>`;
    } catch (err) {
      const { fieldErrors } = handleApiError(err);
      paintFieldErrors(fieldErrors);
    } finally {
      setLoading(resendBtn, false, '', t('auth.resendSubmit'));
    }
  });
}

/**
 * pages/forgot-password.js
 */
import { forgotPassword } from '../api/auth.js';
import { redirectIfAuthed } from '../modules/authGuard.js';
import { t } from '../modules/i18n.js';
import { validateForm, rules } from '../utils/validators.js';
import { handleApiError, paintFieldErrors, clearFieldErrors } from '../utils/apiErrorHandler.js';
import { setLoading } from '../utils/buttonState.js';
import { qs } from '../utils/dom.js';

export function runForgotPasswordPage() {
  if (redirectIfAuthed()) return;

  const form = qs('#forgotForm');
  const submitBtn = qs('#submitBtn');
  const successBox = qs('#successBox');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(['email']);

    const email = qs('#email').value.trim();
    const errors = validateForm({ email }, { email: [rules.required, rules.email] });
    if (Object.keys(errors).length) {
      paintFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v)])));
      return;
    }

    setLoading(submitBtn, true, t('auth.forgotSubmitting'));
    try {
      await forgotPassword(email);
      form.style.display = 'none';
      successBox.innerHTML = `<div class="alert alert--success anim-fade-up">${t('toast.forgotSent')}</div>`;
    } catch (err) {
      const { fieldErrors } = handleApiError(err);
      paintFieldErrors(fieldErrors);
    } finally {
      setLoading(submitBtn, false, '', t('auth.forgotSubmit'));
    }
  });
}

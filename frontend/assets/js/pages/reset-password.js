/**
 * pages/reset-password.js
 */
import { resetPassword } from '../api/auth.js';
import { redirectIfAuthed } from '../modules/authGuard.js';
import { t } from '../modules/i18n.js';
import { validateForm, rules, passwordStrength } from '../utils/validators.js';
import { handleApiError, paintFieldErrors, clearFieldErrors } from '../utils/apiErrorHandler.js';
import { setLoading } from '../utils/buttonState.js';
import { qs } from '../utils/dom.js';

export function runResetPasswordPage() {
  if (redirectIfAuthed()) return;

  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const form = qs('#resetForm');
  const submitBtn = qs('#submitBtn');
  const tokenAlert = qs('#tokenAlert');
  const passwordInput = qs('#password');
  const strengthBar = qs('#strengthBar');
  const strengthLabel = qs('#strengthLabel');

  if (!token) {
    tokenAlert.innerHTML = `<div class="alert alert--danger" style="margin-bottom:18px;">${t('auth.resetMissingToken')}</div>`;
    form.querySelectorAll('input, button').forEach((el) => (el.disabled = true));
    return;
  }

  passwordInput.addEventListener('input', () => {
    const { score, label } = passwordStrength(passwordInput.value);
    strengthBar.dataset.score = String(score);
    strengthLabel.textContent = passwordInput.value ? t(label) : '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(['password', 'password_confirmation']);

    const data = {
      token,
      password: qs('#password').value,
      password_confirmation: qs('#password_confirmation').value,
    };
    const errors = validateForm(data, {
      password: [rules.required, (v) => rules.minLength(v, 8)],
      password_confirmation: [rules.required, (v) => rules.matches(v, data.password)],
    });
    if (Object.keys(errors).length) {
      paintFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v)])));
      return;
    }

    setLoading(submitBtn, true, t('auth.resetSubmitting'));
    try {
      await resetPassword(data);
      form.style.display = 'none';
      qs('#successBox').innerHTML = `
        <div class="alert alert--success anim-fade-up" style="margin-bottom:16px;">${t('toast.resetSuccess')}</div>
        <a href="login.html" class="btn btn--primary btn--block" data-i18n="auth.backToLogin">${t('auth.backToLogin')}</a>
      `;
    } catch (err) {
      const { fieldErrors } = handleApiError(err);
      paintFieldErrors(fieldErrors);
    } finally {
      setLoading(submitBtn, false, '', t('auth.resetSubmit'));
    }
  });
}

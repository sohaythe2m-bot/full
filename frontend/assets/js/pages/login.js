/**
 * pages/login.js
 */
import { login } from '../api/auth.js';
import { redirectIfAuthed } from '../modules/authGuard.js';
import { t } from '../modules/i18n.js';
import { toast } from '../components/toast.js';
import { validateForm, rules } from '../utils/validators.js';
import { handleApiError, paintFieldErrors, clearFieldErrors } from '../utils/apiErrorHandler.js';
import { setLoading } from '../utils/buttonState.js';
import { qs } from '../utils/dom.js';

export function runLoginPage() {
  if (redirectIfAuthed()) return;

  const params = new URLSearchParams(location.search);
  const alertBox = qs('#sessionAlert');
  if (params.get('expired') === '1' && alertBox) {
    alertBox.innerHTML = `<div class="alert alert--warning" style="margin-bottom:18px;">${t('auth.sessionExpired')}</div>`;
  }

  const form = qs('#loginForm');
  const submitBtn = qs('#submitBtn');

  qs('#togglePassword')?.addEventListener('click', () => {
    const input = qs('#password');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(['email', 'password']);

    const data = {
      email: qs('#email').value.trim(),
      password: qs('#password').value,
    };

    const errors = validateForm(data, {
      email: [rules.required, rules.email],
      password: [rules.required],
    });
    if (Object.keys(errors).length) {
      paintFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v)])));
      return;
    }

    setLoading(submitBtn, true, t('auth.loginSubmitting'));
    try {
      const result = await login(data);
      toast.success(t('toast.loginSuccess', { name: result.user?.full_name || result.user?.email || '' }));
      const next = params.get('next');
      setTimeout(() => { location.href = next && next.startsWith('/') === false ? decodeURIComponent(next) : 'dashboard.html'; }, 400);
    } catch (err) {
      const { fieldErrors } = handleApiError(err);
      paintFieldErrors(fieldErrors);
    } finally {
      setLoading(submitBtn, false, '', t('auth.loginSubmit'));
    }
  });
}

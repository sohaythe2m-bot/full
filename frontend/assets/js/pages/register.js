/**
 * pages/register.js
 */
import { register } from '../api/auth.js';
import { redirectIfAuthed } from '../modules/authGuard.js';
import { t } from '../modules/i18n.js';
import { toast } from '../components/toast.js';
import { validateForm, rules, passwordStrength } from '../utils/validators.js';
import { handleApiError, paintFieldErrors, clearFieldErrors } from '../utils/apiErrorHandler.js';
import { setLoading } from '../utils/buttonState.js';
import { qs } from '../utils/dom.js';

const FIELDS = ['full_name', 'email', 'password', 'password_confirmation'];

export function runRegisterPage() {
  if (redirectIfAuthed()) return;

  const form = qs('#registerForm');
  const submitBtn = qs('#submitBtn');
  const passwordInput = qs('#password');
  const strengthBar = qs('#strengthBar');
  const strengthLabel = qs('#strengthLabel');

  passwordInput.addEventListener('input', () => {
    const { score, label } = passwordStrength(passwordInput.value);
    strengthBar.dataset.score = String(score);
    strengthLabel.textContent = passwordInput.value ? t(label) : '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(FIELDS);

    const data = {
      full_name: qs('#full_name').value.trim(),
      email: qs('#email').value.trim(),
      password: qs('#password').value,
      password_confirmation: qs('#password_confirmation').value,
      role: qs('#role').value,
    };

    const errors = validateForm(data, {
      full_name: [rules.required, (v) => rules.minLength(v, 2), (v) => rules.maxLength(v, 150)],
      email: [rules.required, rules.email],
      password: [rules.required, (v) => rules.minLength(v, 8)],
      password_confirmation: [rules.required, (v) => rules.matches(v, data.password)],
    });
    if (Object.keys(errors).length) {
      paintFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v)])));
      return;
    }

    setLoading(submitBtn, true, t('auth.registerSubmitting'));
    try {
      await register(data);
      toast.success(t('toast.registerSuccess'), 6000);
      setTimeout(() => { location.href = `login.html?email=${encodeURIComponent(data.email)}`; }, 900);
    } catch (err) {
      const { fieldErrors } = handleApiError(err);
      paintFieldErrors(fieldErrors);
    } finally {
      setLoading(submitBtn, false, '', t('auth.registerSubmit'));
    }
  });
}

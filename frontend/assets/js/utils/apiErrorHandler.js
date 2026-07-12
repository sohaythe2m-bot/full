/**
 * apiErrorHandler.js
 * Central place that decides how an ApiError becomes user feedback:
 * - network/timeout -> toast with a friendly message
 * - 422 validation  -> per-field error text (returned to caller)
 * - 401/403/404/429/500 -> toast with the right copy
 */
import { toast } from '../components/toast.js';
import { t } from '../modules/i18n.js';

/**
 * @param {Error} error
 * @returns {{fieldErrors: Record<string,string>}} field errors (empty if none)
 */
export function handleApiError(error) {
  const kind = error?.kind;
  const status = error?.status;

  if (kind === 'network') {
    toast.error(t('toast.networkError'));
    return { fieldErrors: {} };
  }
  if (kind === 'timeout') {
    toast.error(t('toast.timeoutError'));
    return { fieldErrors: {} };
  }
  if (kind === 'auth') {
    // Only a *refresh failure* is tagged kind:'auth' by apiClient — a plain
    // 401 from e.g. bad login credentials keeps kind:'api' and its own message.
    toast.error(t('toast.sessionExpired'));
    return { fieldErrors: {} };
  }
  if (status === 429) {
    toast.error(t('toast.tooManyRequests'));
    return { fieldErrors: {} };
  }
  if (status === 422 && error.errors && !Array.isArray(error.errors)) {
    // Backend shape: { field: ["msg1", "msg2"] }
    const fieldErrors = {};
    Object.entries(error.errors).forEach(([field, messages]) => {
      fieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages);
    });
    return { fieldErrors };
  }

  toast.error(error?.message || t('toast.genericError'));
  return { fieldErrors: {} };
}

/** Paint field-level errors produced by handleApiError() onto <div class="field-error"> nodes. */
export function paintFieldErrors(fieldErrors, prefix = 'err_') {
  Object.entries(fieldErrors).forEach(([field, message]) => {
    const node = document.getElementById(prefix + field);
    const input = document.getElementById(field);
    if (node) node.textContent = message;
    if (input) input.classList.add('is-invalid');
  });
}

export function clearFieldErrors(fields, prefix = 'err_') {
  fields.forEach((field) => {
    const node = document.getElementById(prefix + field);
    const input = document.getElementById(field);
    if (node) node.textContent = '';
    if (input) input.classList.remove('is-invalid');
  });
}

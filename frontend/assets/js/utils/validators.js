/**
 * validators.js
 * Client-side validation mirroring the backend's App\Core\Validator rules,
 * so users get instant feedback before a round trip to the API.
 * Every function returns either `null` (valid) or an i18n KEY (string)
 * that the caller resolves via t(key) — keeping this module language-agnostic.
 */

export const rules = {
  required(value) {
    if (value === null || value === undefined || String(value).trim() === '') {
      return 'validation.required';
    }
    return null;
  },

  email(value) {
    if (!value) return null;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(value) ? null : 'validation.email';
  },

  minLength(value, min) {
    if (!value) return null;
    return String(value).trim().length >= min ? null : 'validation.minLength';
  },

  maxLength(value, max) {
    if (!value) return null;
    return String(value).trim().length <= max ? null : 'validation.maxLength';
  },

  url(value) {
    if (!value) return null;
    try {
      // eslint-disable-next-line no-new
      new URL(value);
      return null;
    } catch {
      return 'validation.url';
    }
  },

  phone(value) {
    if (!value) return null;
    const re = /^[+]?[\d\s()-]{7,20}$/;
    return re.test(value) ? null : 'validation.phone';
  },

  matches(value, other) {
    return value === other ? null : 'validation.matches';
  },

  date(value) {
    if (!value) return null;
    return Number.isNaN(Date.parse(value)) ? 'validation.date' : null;
  },
};

/**
 * Password strength scorer: 0 (very weak) .. 4 (very strong).
 * Backend only enforces `min:8`, this is purely to guide the user.
 */
export function passwordStrength(password) {
  let score = 0;
  if (!password) return { score: 0, label: 'passwordStrength.empty' };

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 4);
  const labels = [
    'passwordStrength.weak',
    'passwordStrength.weak',
    'passwordStrength.fair',
    'passwordStrength.good',
    'passwordStrength.strong',
  ];
  return { score: clamped, label: labels[clamped] };
}

/**
 * Run a field through a list of validators; returns the first error key or null.
 * @param {*} value
 * @param {Array<(v:any)=>string|null>} validatorFns
 */
export function validateField(value, validatorFns) {
  for (const fn of validatorFns) {
    const error = fn(value);
    if (error) return error;
  }
  return null;
}

/**
 * Validate a whole form object against a schema of { field: [validatorFns] }.
 * Returns { field: errorKey } for invalid fields only.
 */
export function validateForm(data, schema) {
  const errors = {};
  for (const [field, validatorFns] of Object.entries(schema)) {
    const error = validateField(data[field], validatorFns);
    if (error) errors[field] = error;
  }
  return errors;
}

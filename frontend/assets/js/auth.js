/**
 * auth.js
 * Maps 1:1 to AuthController routes in routes/api.php.
 */
import { api } from './apiClient.js';
import { session } from '../state/session.js';

export async function register({ full_name, email, password, password_confirmation, role }) {
  return api.post('/auth/register', { full_name, email, password, password_confirmation, role });
}

export async function login({ email, password }) {
  const data = await api.post('/auth/login', { email, password });
  session.setTokens(data);
  session.setUser(data.user);
  return data;
}

export async function logout() {
  const refresh_token = session.getRefreshToken();
  try {
    await api.post('/auth/logout', refresh_token ? { refresh_token } : {}, { auth: true });
  } finally {
    session.clear();
  }
}

export async function forgotPassword(email) {
  return api.post('/auth/forgot-password', { email });
}

export async function resetPassword({ token, password, password_confirmation }) {
  return api.post('/auth/reset-password', { token, password, password_confirmation });
}

export async function verifyEmail(token) {
  return api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function resendVerification(email) {
  return api.post('/auth/resend-verification', { email });
}
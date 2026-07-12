/**
 * profile.js
 * Maps 1:1 to ProfileController routes (job-seeker profile + uploads).
 */
import { api } from './apiClient.js';
import { API_BASE_URL } from '../config/config.js';
import { session } from '../state/session.js';

export async function getMe() {
  return api.get('/profile/me', { auth: true });
}

export async function updateProfile(payload) {
  return api.put('/profile/me', payload, { auth: true });
}

export function uploadAvatar(file, onProgress) {
  const form = new FormData();
  form.append('avatar', file);
  return uploadWithProgress('/profile/avatar', form, onProgress);
}

export function uploadResume(file, onProgress) {
  const form = new FormData();
  form.append('resume', file);
  return uploadWithProgress('/profile/resume', form, onProgress);
}

/**
 * XHR is used here (instead of fetch) purely so we can report real
 * upload progress for the drag & drop UI's progress bar.
 */
function uploadWithProgress(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${path}`);
    const token = session.getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    });

    xhr.onload = () => {
      let json = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON response */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(json?.data ?? json);
      } else if (xhr.status === 401) {
        reject(Object.assign(new Error('Your session has expired. Please log in again.'), { status: 401 }));
      } else {
        reject(Object.assign(new Error(json?.message || `Upload failed (${xhr.status})`), {
          status: xhr.status,
          errors: json?.errors || [],
        }));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
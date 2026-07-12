/**
 * dropzone.js
 * A single reusable drag & drop upload widget used for both the avatar
 * image and the resume PDF. Validates extension + size client-side
 * (the backend re-validates real file content regardless).
 */
import { t } from '../modules/i18n.js';
import { toast } from './toast.js';
import { escapeHtml } from '../utils/sanitize.js';
import { UPLOAD_LIMITS } from '../config/config.js';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 2v6h5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const UPLOAD_ICON = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0-4 4m4-4 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

/**
 * @param {HTMLElement} container
 * @param {object} opts
 * @param {string[]} opts.accept        allowed extensions, e.g. ['jpg','jpeg','png','webp']
 * @param {string} opts.hintKey         i18n key for the hint line (gets {max} substituted)
 * @param {string} opts.buttonKey       i18n key for the "upload" button label
 * @param {(file: File, onProgress: (pct:number)=>void) => Promise<any>} opts.uploadFn
 * @param {(result:any) => void} [opts.onSuccess]
 * @param {string} [opts.existingUrl]   pre-fill preview if a file already exists
 */
export function mountDropzone(container, opts) {
  const { accept, hintKey, buttonKey, uploadFn, onSuccess, existingUrl } = opts;
  let selectedFile = null;

  container.innerHTML = `
    <div class="dropzone" tabindex="0" role="button" aria-label="${escapeHtml(t(buttonKey))}">
      ${UPLOAD_ICON}
      <div class="dz-title">${escapeHtml(t('common.browse'))} ${escapeHtml(t('common.or'))} ${escapeHtml(t('profile.dropHere'))}</div>
      <div class="dz-hint">${escapeHtml(t(hintKey, { max: UPLOAD_LIMITS.MAX_MB }))}</div>
      <input type="file" accept="${accept.map((e) => '.' + e).join(',')}" />
    </div>
    <div id="dzPreview"></div>
    <button type="button" class="btn btn--primary btn--sm" id="dzUploadBtn" style="margin-top:12px;display:none;">
      <span id="dzUploadLabel">${escapeHtml(t(buttonKey))}</span>
    </button>
  `;

  const dz = container.querySelector('.dropzone');
  const input = container.querySelector('input[type="file"]');
  const preview = container.querySelector('#dzPreview');
  const uploadBtn = container.querySelector('#dzUploadBtn');

  function renderPreview(file, url) {
    const name = file ? file.name : url?.split('/').pop();
    const size = file ? formatBytes(file.size) : '';
    preview.innerHTML = `
      <div class="upload-preview anim-fade-up">
        <span class="file-icon">${FILE_ICON}</span>
        <div class="file-meta">
          <div class="file-name">${escapeHtml(name || '')}</div>
          ${size ? `<div class="file-size">${size}</div>` : ''}
          <div class="progress-track" id="dzProgressTrack" style="display:none;"><div class="progress-bar" id="dzProgressBar" style="width:0%"></div></div>
        </div>
        ${url ? `<a href="${url}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm">${escapeHtml(t('profile.downloadResume'))}</a>` : ''}
      </div>
    `;
  }

  if (existingUrl) renderPreview(null, existingUrl);

  function validate(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!accept.includes(ext)) {
      toast.error(t('toast.fileTypeInvalid'));
      return false;
    }
    if (file.size > UPLOAD_LIMITS.MAX_MB * 1024 * 1024) {
      toast.error(t('toast.fileTooLarge', { max: UPLOAD_LIMITS.MAX_MB }));
      return false;
    }
    return true;
  }

  function handleFiles(files) {
    const file = files?.[0];
    if (!file || !validate(file)) return;
    selectedFile = file;
    renderPreview(file);
    uploadBtn.style.display = 'inline-flex';
  }

  dz.addEventListener('click', () => input.click());
  dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  input.addEventListener('change', () => handleFiles(input.files));

  ['dragenter', 'dragover'].forEach((evt) => dz.addEventListener(evt, (e) => { e.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((evt) => dz.addEventListener(evt, (e) => { e.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));

  uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    uploadBtn.disabled = true;
    const track = container.querySelector('#dzProgressTrack');
    const bar = container.querySelector('#dzProgressBar');
    track.style.display = 'block';
    try {
      const result = await uploadFn(selectedFile, (pct) => { bar.style.width = `${pct}%`; });
      bar.style.width = '100%';
      onSuccess?.(result);
      uploadBtn.style.display = 'none';
    } catch (err) {
      toast.error(err?.message || t('toast.genericError'));
    } finally {
      uploadBtn.disabled = false;
    }
  });
}

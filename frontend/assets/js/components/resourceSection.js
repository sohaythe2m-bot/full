/**
 * resourceSection.js
 * Builds a full create/list/edit/delete UI for one of the backend's
 * "owned resource" endpoints (skills, education, experience,
 * certificates, projects) from a small field-metadata config —
 * so we don't hand-write five nearly identical UIs.
 *
 * config = {
 *   key: 'skills',
 *   api: skillsApi,
 *   i18nPrefix: 'resource.skills',
 *   fields: [
 *     { name: 'name', type: 'text', required: true },
 *     { name: 'proficiency', type: 'select', options: ['beginner','intermediate','advanced','expert'] },
 *     ...
 *   ]
 * }
 */
import { t } from '../modules/i18n.js';
import { toast } from './toast.js';
import { escapeHtml } from '../utils/sanitize.js';
import { validateField, rules } from '../utils/validators.js';
import { handleApiError } from '../utils/apiErrorHandler.js';
import { setLoading } from '../utils/buttonState.js';
import { qs, qsa } from '../utils/dom.js';

function fieldLabel(prefix, field) {
  return t(`${prefix}.${toCamelKey(field.name)}`);
}
function toCamelKey(name) {
  return name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function fieldInputHtml(prefix, field, idBase) {
  const id = `${idBase}_${field.name}`;
  const label = fieldLabel(prefix, field);
  if (field.type === 'select') {
    const options = field.options
      .map((opt) => `<option value="${opt}">${escapeHtml(t(`${prefix}.${opt}`))}</option>`)
      .join('');
    return `<select class="select" id="${id}" name="${field.name}"><option value="">—</option>${options}</select>`;
  }
  if (field.type === 'textarea') {
    return `<textarea class="textarea" id="${id}" name="${field.name}" data-i18n-placeholder="${prefix}.${toCamelKey(field.name)}Placeholder"></textarea>`;
  }
  if (field.type === 'checkbox') {
    return `<input type="checkbox" id="${id}" name="${field.name}">`;
  }
  const inputType = field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : 'text';
  return `<input class="input" type="${inputType}" id="${id}" name="${field.name}" data-i18n-placeholder="${prefix}.${toCamelKey(field.name)}Placeholder" dir="${inputType === 'url' || inputType === 'date' ? 'ltr' : ''}">`;
}

function fieldValidators(field) {
  const list = [];
  if (field.required) list.push(rules.required);
  if (field.type === 'url') list.push(rules.url);
  if (field.type === 'date') list.push(rules.date);
  return list;
}

export function mountResourceSection(container, config) {
  const { key, api, i18nPrefix, fields } = config;
  const idBase = `res_${key}`;
  let editingId = null;
  let cachedRows = [];

  container.innerHTML = `
    <div class="card anim-fade-up" id="${key}">
      <div class="card-head">
        <div>
          <h3>${escapeHtml(t(`${i18nPrefix}.label`))}</h3>
          <p class="desc">${escapeHtml(t(`${i18nPrefix}.desc`))}</p>
        </div>
        <span class="method-tag post" id="${idBase}_modeTag">POST</span>
      </div>

      <div class="grid-2" id="${idBase}_fields">
        ${fields.map((f) => `
          <div class="field ${f.type === 'checkbox' ? 'checkbox-row' : ''}" style="${f.type === 'textarea' ? 'grid-column:1/-1;' : ''}">
            ${f.type === 'checkbox'
              ? `${fieldInputHtml(i18nPrefix, f, idBase)}<label for="${idBase}_${f.name}">${escapeHtml(fieldLabel(i18nPrefix, f))}</label>`
              : `<label for="${idBase}_${f.name}">${escapeHtml(fieldLabel(i18nPrefix, f))}${f.required ? ' *' : ''}</label>${fieldInputHtml(i18nPrefix, f, idBase)}`}
            <div class="field-error" id="${idBase}_err_${f.name}"></div>
          </div>
        `).join('')}
      </div>

      <div class="flex gap-8 flex-wrap" style="margin-top:6px;">
        <button type="button" class="btn btn--primary" id="${idBase}_submit">
          <span id="${idBase}_submitLabel">${escapeHtml(t('common.create'))}</span>
        </button>
        <button type="button" class="btn btn--ghost" id="${idBase}_clear">${escapeHtml(t('profile.newEntryClear'))}</button>
        <span class="text-mute" style="align-self:center;font-size:.82rem;" id="${idBase}_editingHint">${escapeHtml(t('profile.noEditingRecord'))}</span>
      </div>

      <hr class="divider">

      <div class="card-head" style="margin-bottom:10px;">
        <h4 style="margin:0;">${escapeHtml(t('profile.myRecords'))}</h4>
        <button type="button" class="btn btn--outline btn--sm" id="${idBase}_refresh">${escapeHtml(t('profile.refreshList'))}</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            ${fields.filter((f) => f.type !== 'textarea').map((f) => `<th>${escapeHtml(fieldLabel(i18nPrefix, f))}</th>`).join('')}
            <th></th>
          </tr></thead>
          <tbody id="${idBase}_tbody"><tr><td class="table-empty" colspan="99">${escapeHtml(t('common.loading'))}</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  const submitBtn = qs(`#${idBase}_submit`);
  const clearBtn = qs(`#${idBase}_clear`);
  const refreshBtn = qs(`#${idBase}_refresh`);
  const modeTag = qs(`#${idBase}_modeTag`);
  const editingHint = qs(`#${idBase}_editingHint`);
  const tbody = qs(`#${idBase}_tbody`);

  function setEditing(id) {
    editingId = id;
    modeTag.textContent = id ? 'PUT' : 'POST';
    modeTag.className = `method-tag ${id ? 'put' : 'post'}`;
    qs(`#${idBase}_submitLabel`).textContent = id ? t('common.update') : t('common.create');
    editingHint.textContent = id ? t('profile.editingRecord', { id }) : t('profile.noEditingRecord');
  }

  function clearForm() {
    fields.forEach((f) => {
      const el = qs(`#${idBase}_${f.name}`);
      if (!el) return;
      if (f.type === 'checkbox') el.checked = false;
      else el.value = '';
      el.classList.remove('is-invalid');
    });
    fields.forEach((f) => { const e = qs(`#${idBase}_err_${f.name}`); if (e) e.textContent = ''; });
    setEditing(null);
  }

  function readForm() {
    const body = {};
    fields.forEach((f) => {
      const el = qs(`#${idBase}_${f.name}`);
      if (!el) return;
      if (f.type === 'checkbox') body[f.name] = el.checked ? 1 : 0;
      else if (el.value !== '') body[f.name] = el.value;
    });
    return body;
  }

  function fillForm(record) {
    fields.forEach((f) => {
      const el = qs(`#${idBase}_${f.name}`);
      if (!el) return;
      if (f.type === 'checkbox') el.checked = Boolean(Number(record[f.name]));
      else el.value = record[f.name] ?? '';
    });
    setEditing(record.id);
    container.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validateAndShow() {
    let valid = true;
    fields.forEach((f) => {
      const el = qs(`#${idBase}_${f.name}`);
      const errEl = qs(`#${idBase}_err_${f.name}`);
      if (!el || !errEl) return;
      const value = f.type === 'checkbox' ? (el.checked ? '1' : '') : el.value;
      const error = validateField(value, fieldValidators(f));
      errEl.textContent = error ? t(error) : '';
      el.classList.toggle('is-invalid', Boolean(error));
      if (error) valid = false;
    });
    return valid;
  }

  function displayValue(field, raw) {
    if (raw === null || raw === undefined || raw === '') return '';
    if (field.type === 'checkbox') return Number(raw) ? '✓' : '';
    if (field.type === 'select') return escapeHtml(t(`${i18nPrefix}.${raw}`));
    return escapeHtml(String(raw));
  }

  async function refreshList() {
    tbody.innerHTML = `<tr><td colspan="99"><div class="skeleton" style="height:18px;"></div></td></tr>`;
    try {
      cachedRows = await api.list();
      if (!cachedRows.length) {
        tbody.innerHTML = `<tr><td colspan="99" class="table-empty">${escapeHtml(t('profile.resourceEmpty'))}</td></tr>`;
        return;
      }
      const visibleFields = fields.filter((f) => f.type !== 'textarea');
      tbody.innerHTML = cachedRows.map((row) => `
        <tr>
          ${visibleFields.map((f) => `<td>${displayValue(f, row[f.name])}</td>`).join('')}
          <td class="row-actions">
            <button type="button" class="btn btn--ghost btn--sm" data-act="edit" data-id="${row.id}">${escapeHtml(t('common.edit'))}</button>
            <button type="button" class="btn btn--danger btn--sm" data-act="del" data-id="${row.id}">${escapeHtml(t('common.delete'))}</button>
          </td>
        </tr>
      `).join('');

      qsa('button[data-act="edit"]', tbody).forEach((btn) => {
        btn.addEventListener('click', () => {
          const record = cachedRows.find((r) => String(r.id) === btn.dataset.id);
          if (record) fillForm(record);
        });
      });
      qsa('button[data-act="del"]', tbody).forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm(t('profile.confirmDelete'))) return;
          btn.disabled = true;
          try {
            await api.remove(btn.dataset.id);
            toast.success(t('toast.recordDeleted'));
            if (editingId === Number(btn.dataset.id)) clearForm();
            refreshList();
          } catch (err) {
            handleApiError(err);
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      handleApiError(err);
      tbody.innerHTML = `<tr><td colspan="99" class="table-empty">${escapeHtml(t('errorStates.generic'))}</td></tr>`;
    }
  }

  submitBtn.addEventListener('click', async () => {
    if (!validateAndShow()) return;
    const body = readForm();
    setLoading(submitBtn, true, editingId ? t('common.updating') : t('common.creating'));
    try {
      if (editingId) {
        await api.update(editingId, body);
        toast.success(t('toast.recordUpdated'));
      } else {
        await api.create(body);
        toast.success(t('toast.recordCreated'));
      }
      clearForm();
      refreshList();
    } catch (err) {
      const { fieldErrors } = handleApiError(err);
      Object.entries(fieldErrors).forEach(([field, msg]) => {
        const errEl = qs(`#${idBase}_err_${field}`);
        if (errEl) errEl.textContent = msg;
      });
    } finally {
      setLoading(submitBtn, false, '', editingId ? t('common.update') : t('common.create'));
    }
  });

  clearBtn.addEventListener('click', clearForm);
  refreshBtn.addEventListener('click', refreshList);

  refreshList();
  return { refresh: refreshList };
}

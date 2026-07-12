(function () {
  "use strict";

  /* ==================================================================
     الحالة العامة + التخزين المحلي
  ================================================================== */
  const state = {
    baseUrl: localStorage.getItem('flth_base_url') || 'http://localhost/flth-backend/public',
    access: localStorage.getItem('flth_access') || '',
    refresh: localStorage.getItem('flth_refresh') || '',
    user: JSON.parse(localStorage.getItem('flth_user') || 'null'),
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  document.getElementById('baseUrlInput').value = state.baseUrl;

  function persistSession() {
    localStorage.setItem('flth_base_url', state.baseUrl);
    localStorage.setItem('flth_access', state.access || '');
    localStorage.setItem('flth_refresh', state.refresh || '');
    localStorage.setItem('flth_user', JSON.stringify(state.user || null));
    renderSession();
  }

  function renderSession() {
    const setv = (id, val, isEmpty) => {
      const el = document.getElementById(id);
      el.textContent = val;
      el.classList.toggle('empty', !!isEmpty);
    };
    setv('sess_user', state.user ? (state.user.full_name || state.user.email) : 'لا يوجد', !state.user);
    setv('sess_role', state.user ? state.user.role : '—', !state.user);
    setv('sess_access', state.access ? (state.access.slice(0, 18) + '…') : 'لا يوجد', !state.access);
    setv('sess_refresh', state.refresh ? (state.refresh.slice(0, 18) + '…') : 'لا يوجد', !state.refresh);
  }
  renderSession();

  /* ==================================================================
     التنقل بين الأقسام
  ================================================================== */
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      $$('.panel-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.target).classList.add('active');
    });
  });

  document.getElementById('saveBaseUrlBtn').addEventListener('click', () => {
    state.baseUrl = document.getElementById('baseUrlInput').value.trim().replace(/\/$/, '');
    persistSession();
  });

  document.getElementById('btnClearSession').addEventListener('click', () => {
    state.access = ''; state.refresh = ''; state.user = null;
    persistSession();
  });

  /* ==================================================================
     سجل الطلبات (اللوحة اليمنى)
  ================================================================== */
  const logListEl = document.getElementById('logList');
  document.getElementById('btnClearLog').addEventListener('click', () => { logListEl.innerHTML = ''; });

  function statusClass(status) {
    if (status === 'NETWORK ERROR') return 'neterr';
    if (typeof status !== 'number') return '';
    if (status >= 200 && status < 300) return 's2';
    if (status >= 400 && status < 500) return 's4';
    if (status >= 500) return 's5';
    return '';
  }

  function logEntry({ method, path, status, duration, response }) {
    const wrap = document.createElement('div');
    wrap.className = 'log-entry';
    const t = new Date().toLocaleTimeString();
    wrap.innerHTML = `
      <div class="line1">
        <span class="method">${method}</span>
        <span class="path">${path}</span>
        <span class="status ${statusClass(status)}">${status}</span>
      </div>
      <div class="meta">${t} · ${duration.toFixed(0)}ms</div>
      <details><summary>عرض الاستجابة</summary><pre></pre></details>
    `;
    wrap.querySelector('pre').textContent = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
    logListEl.prepend(wrap);
  }

  /* ==================================================================
     فحص الاتصال
  ================================================================== */
  document.getElementById('pingBtn').addEventListener('click', async () => {
    const pill = document.getElementById('connPill');
    pill.textContent = 'جارٍ الفحص…'; pill.className = 'status-pill';
    try {
      const r = await fetch(state.baseUrl + '/api/v1/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
      });
      pill.textContent = 'متصل · ' + r.status;
      pill.className = 'status-pill online';
    } catch (e) {
      pill.textContent = 'غير متصل';
      pill.className = 'status-pill offline';
    }
  });

  /* ==================================================================
     غلاف عام لطلبات الـ API
  ================================================================== */
  async function apiFetch(method, path, { body = null, isForm = false, auth = false } = {}) {
    const url = state.baseUrl + path;
    const headers = {};
    let fetchBody;
    if (isForm) {
      fetchBody = body;
    } else if (body !== null) {
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(body);
    }
    if (auth && state.access) headers['Authorization'] = 'Bearer ' + state.access;

    const started = performance.now();
    let res, text, json = null;
    try {
      res = await fetch(url, { method, headers, body: fetchBody });
      text = await res.text();
      try { json = JSON.parse(text); } catch (e) { /* ليست JSON */ }
    } catch (networkErr) {
      logEntry({ method, path, status: 'NETWORK ERROR', duration: performance.now() - started, response: String(networkErr) });
      return { ok: false, status: 'NETWORK ERROR', json: { status: 'error', message: String(networkErr), errors: [] } };
    }
    const duration = performance.now() - started;
    logEntry({ method, path, status: res.status, duration, response: json ?? text });
    return { ok: res.ok, status: res.status, json: json ?? { status: 'error', message: 'استجابة غير صالحة (ليست JSON)', raw: text } };
  }

  function paint(outEl, result) {
    const j = result.json || {};
    outEl.classList.remove('ok', 'err');
    outEl.classList.add(result.ok ? 'ok' : 'err');
    const badgeClass = result.ok ? 'ok' : 'err';
    outEl.innerHTML = `<span class="badge ${badgeClass}">${result.status}</span> ${escapeHtml(j.message || '')}\n\n` +
      escapeHtml(JSON.stringify(j.data ?? j.errors ?? j, null, 2));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  function val(id) { return document.getElementById(id).value; }

  /* ==================================================================
     معالجات المصادقة (AUTH)
  ================================================================== */
  document.getElementById('btnRandomEmail').addEventListener('click', () => {
    document.getElementById('reg_email').value = 'tester+' + Date.now() + '@example.com';
  });

  document.getElementById('btnRegister').addEventListener('click', async () => {
    const body = {
      full_name: val('reg_full_name'), email: val('reg_email'),
      password: val('reg_password'), password_confirmation: val('reg_password_confirmation'),
      role: val('reg_role'),
    };
    const r = await apiFetch('POST', '/api/v1/auth/register', { body });
    paint(document.getElementById('out_register'), r);
    if (r.ok) document.getElementById('login_email').value = body.email;
  });

  document.getElementById('btnLogin').addEventListener('click', async () => {
    const body = { email: val('login_email'), password: val('login_password') };
    const r = await apiFetch('POST', '/api/v1/auth/login', { body });
    paint(document.getElementById('out_login'), r);
    if (r.ok && r.json.data) {
      state.access = r.json.data.access_token;
      state.refresh = r.json.data.refresh_token;
      state.user = r.json.data.user;
      persistSession();
      document.getElementById('refresh_token_input').value = state.refresh;
      document.getElementById('logout_refresh_token').value = state.refresh;
    }
  });

  document.getElementById('btnLogout').addEventListener('click', async () => {
    const rt = val('logout_refresh_token');
    const r = await apiFetch('POST', '/api/v1/auth/logout', { body: rt ? { refresh_token: rt } : {}, auth: true });
    paint(document.getElementById('out_logout'), r);
    if (r.ok) { state.access = ''; state.refresh = ''; state.user = null; persistSession(); }
  });

  document.getElementById('btnRefresh').addEventListener('click', async () => {
    const r = await apiFetch('POST', '/api/v1/auth/refresh', { body: { refresh_token: val('refresh_token_input') } });
    paint(document.getElementById('out_refresh'), r);
    if (r.ok && r.json.data) {
      state.access = r.json.data.access_token;
      state.refresh = r.json.data.refresh_token;
      persistSession();
      document.getElementById('refresh_token_input').value = state.refresh;
    }
  });

  document.getElementById('btnForgot').addEventListener('click', async () => {
    const r = await apiFetch('POST', '/api/v1/auth/forgot-password', { body: { email: val('forgot_email') } });
    paint(document.getElementById('out_forgot'), r);
  });

  document.getElementById('btnReset').addEventListener('click', async () => {
    const body = { token: val('reset_token'), password: val('reset_password'), password_confirmation: val('reset_password_confirmation') };
    const r = await apiFetch('POST', '/api/v1/auth/reset-password', { body });
    paint(document.getElementById('out_reset'), r);
  });

  document.getElementById('btnVerify').addEventListener('click', async () => {
    const r = await apiFetch('GET', '/api/v1/auth/verify-email?token=' + encodeURIComponent(val('verify_token')));
    paint(document.getElementById('out_verify'), r);
  });

  document.getElementById('btnResend').addEventListener('click', async () => {
    const r = await apiFetch('POST', '/api/v1/auth/resend-verification', { body: { email: val('resend_email') } });
    paint(document.getElementById('out_resend'), r);
  });

  /* ==================================================================
     معالجات الملف الشخصي (PROFILE)
  ================================================================== */
  function fillProfileForm(user, profile) {
    if (user) {
      document.getElementById('p_full_name').value = user.full_name || '';
      document.getElementById('p_phone').value = user.phone || '';
    }
    if (profile) {
      document.getElementById('p_headline').value = profile.headline || '';
      document.getElementById('p_bio').value = profile.bio || '';
      document.getElementById('p_location').value = profile.location || '';
      document.getElementById('p_github_url').value = profile.github_url || '';
      document.getElementById('p_linkedin_url').value = profile.linkedin_url || '';
      document.getElementById('p_portfolio_url').value = profile.portfolio_url || '';
      document.getElementById('p_languages').value = profile.languages || '';
      document.getElementById('p_expected_salary_min').value = profile.expected_salary_min || '';
      document.getElementById('p_expected_salary_max').value = profile.expected_salary_max || '';
      document.getElementById('p_preferred_job_type').value = profile.preferred_job_type || '';
      document.getElementById('p_open_to_work').checked = !!Number(profile.open_to_work);
    }
  }

  document.getElementById('btnProfileMe').addEventListener('click', async () => {
    const r = await apiFetch('GET', '/api/v1/profile/me', { auth: true });
    paint(document.getElementById('out_profile_me'), r);
    if (r.ok && r.json.data) fillProfileForm(r.json.data.user, r.json.data.profile);
  });

  document.getElementById('btnProfileUpdate').addEventListener('click', async () => {
    const body = {
      full_name: val('p_full_name'), phone: val('p_phone'), headline: val('p_headline'),
      bio: val('p_bio'), location: val('p_location'), github_url: val('p_github_url'),
      linkedin_url: val('p_linkedin_url'), portfolio_url: val('p_portfolio_url'),
      languages: val('p_languages'), open_to_work: document.getElementById('p_open_to_work').checked ? 1 : 0,
      expected_salary_min: val('p_expected_salary_min') || null,
      expected_salary_max: val('p_expected_salary_max') || null,
      preferred_job_type: val('p_preferred_job_type') || null,
    };
    const r = await apiFetch('PUT', '/api/v1/profile/me', { body, auth: true });
    paint(document.getElementById('out_profile_update'), r);
  });

  document.getElementById('btnAvatar').addEventListener('click', async () => {
    const f = document.getElementById('avatar_file').files[0];
    if (!f) { alert('اختر ملف صورة أولاً'); return; }
    const fd = new FormData(); fd.append('avatar', f);
    const r = await apiFetch('POST', '/api/v1/profile/avatar', { body: fd, isForm: true, auth: true });
    paint(document.getElementById('out_avatar'), r);
  });

  document.getElementById('btnResume').addEventListener('click', async () => {
    const f = document.getElementById('resume_file').files[0];
    if (!f) { alert('اختر ملف PDF أولاً'); return; }
    const fd = new FormData(); fd.append('resume', f);
    const r = await apiFetch('POST', '/api/v1/profile/resume', { body: fd, isForm: true, auth: true });
    paint(document.getElementById('out_resume'), r);
  });

  /* ==================================================================
     نظام موحّد لموارد المستخدم (مهارات / تعليم / خبرات / شهادات / مشاريع)
  ================================================================== */
  const RESOURCES = {
    skills: {
      label: 'المهارات', path: '/api/v1/skills', method: 'get',
      fields: [
        { name: 'name', label: 'الاسم', type: 'text', required: true },
        { name: 'proficiency', label: 'مستوى الإتقان', type: 'select', options: [
          ['beginner', 'مبتدئ'], ['intermediate', 'متوسط'], ['advanced', 'متقدم'], ['expert', 'خبير'],
        ] },
      ],
    },
    education: {
      label: 'التعليم', path: '/api/v1/education', method: 'get',
      fields: [
        { name: 'institution', label: 'المؤسسة التعليمية', type: 'text', required: true },
        { name: 'degree', label: 'الدرجة العلمية', type: 'text' },
        { name: 'field_of_study', label: 'مجال الدراسة', type: 'text' },
        { name: 'start_date', label: 'تاريخ البدء', type: 'date' },
        { name: 'end_date', label: 'تاريخ الانتهاء', type: 'date' },
        { name: 'is_current', label: 'أدرس حاليًا', type: 'checkbox' },
        { name: 'description', label: 'الوصف', type: 'textarea' },
      ],
    },
    experience: {
      label: 'الخبرات', path: '/api/v1/experience', method: 'get',
      fields: [
        { name: 'company_name', label: 'اسم الشركة', type: 'text', required: true },
        { name: 'job_title', label: 'المسمى الوظيفي', type: 'text', required: true },
        { name: 'employment_type', label: 'نوع التوظيف', type: 'select', options: [
          ['full_time', 'دوام كامل'], ['part_time', 'دوام جزئي'], ['contract', 'عقد'],
          ['internship', 'تدريب'], ['freelance', 'عمل حر'],
        ] },
        { name: 'start_date', label: 'تاريخ البدء', type: 'date' },
        { name: 'end_date', label: 'تاريخ الانتهاء', type: 'date' },
        { name: 'is_current', label: 'أعمل هنا حاليًا', type: 'checkbox' },
        { name: 'description', label: 'الوصف', type: 'textarea' },
      ],
    },
    certificates: {
      label: 'الشهادات', path: '/api/v1/certificates', method: 'get',
      fields: [
        { name: 'title', label: 'عنوان الشهادة', type: 'text', required: true },
        { name: 'issuer', label: 'الجهة المانحة', type: 'text' },
        { name: 'issue_date', label: 'تاريخ الإصدار', type: 'date' },
        { name: 'expiry_date', label: 'تاريخ الانتهاء', type: 'date' },
        { name: 'credential_url', label: 'رابط الشهادة', type: 'url' },
      ],
    },
    projects: {
      label: 'المشاريع', path: '/api/v1/projects', method: 'get',
      fields: [
        { name: 'title', label: 'عنوان المشروع', type: 'text', required: true },
        { name: 'description', label: 'الوصف', type: 'textarea' },
        { name: 'project_url', label: 'رابط المشروع', type: 'url' },
        { name: 'repo_url', label: 'رابط المستودع', type: 'url' },
        { name: 'start_date', label: 'تاريخ البدء', type: 'date' },
        { name: 'end_date', label: 'تاريخ الانتهاء', type: 'date' },
      ],
    },
  };

  function fieldInputHtml(f, idPrefix) {
    const id = idPrefix + '_' + f.name;
    if (f.type === 'select') {
      return `<select id="${id}"><option value="">—</option>${f.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
    }
    if (f.type === 'textarea') return `<textarea id="${id}"></textarea>`;
    if (f.type === 'checkbox') return `<input type="checkbox" id="${id}">`;
    return `<input type="${f.type}" id="${id}" ${f.type === 'url' || f.type === 'date' ? 'dir="ltr"' : ''}>`;
  }

  function buildResourceSection(key, cfg) {
    const section = document.getElementById('sec-' + key);
    const idp = 'form_' + key;
    const fieldsHtml = cfg.fields.map(f => {
      if (f.type === 'checkbox') {
        return `<div class="field checkbox">${fieldInputHtml(f, idp)}<label for="${idp}_${f.name}">${f.label}</label></div>`;
      }
      return `<div class="field"><label>${f.label}${f.required ? ' *' : ''}</label>${fieldInputHtml(f, idp)}</div>`;
    }).join('');

    section.innerHTML = `
      <div class="section-head">
        <h2 class="section-title">${cfg.label}</h2>
        <p class="section-desc">${cfg.path} — مرتبطة بحساب الباحث عن عمل الحالي (تتطلب توكن دخول).</p>
      </div>
      <article class="card">
        <h3><span class="method-tag post" id="${idp}_methodTag">POST</span> إنشاء / تعديل سجل
          <span class="hint">جارٍ تعديل السجل رقم: <span id="${idp}_editingId">لا يوجد</span></span>
        </h3>
        <div class="grid-2">${fieldsHtml}</div>
        <div class="actions-row">
          <button class="btn primary" id="${idp}_submit">إنشاء</button>
          <button class="btn small" id="${idp}_clear">سجل جديد / تفريغ النموذج</button>
        </div>
        <div class="out" id="${idp}_out">— لم يتم إرسال أي طلب بعد —</div>
      </article>
      <article class="card">
        <h3><span class="method-tag get">GET</span> سجلاتي</h3>
        <div class="actions-row" style="margin-bottom:12px;"><button class="btn" id="${idp}_refresh">تحديث القائمة</button></div>
        <table>
          <thead><tr>
            <th>#</th>${cfg.fields.map(f => `<th>${f.label}</th>`).join('')}<th>الإجراءات</th>
          </tr></thead>
          <tbody id="${idp}_tbody"><tr class="empty-row"><td colspan="${cfg.fields.length + 2}">لا توجد بيانات محمّلة — اضغط "تحديث القائمة"</td></tr></tbody>
        </table>
      </article>
    `;

    let editingId = null;

    function setEditing(id) {
      editingId = id;
      document.getElementById(idp + '_editingId').textContent = id || 'لا يوجد';
      const tag = document.getElementById(idp + '_methodTag');
      tag.textContent = id ? 'PUT' : 'POST';
      tag.className = 'method-tag ' + (id ? 'put' : 'post');
      document.getElementById(idp + '_submit').textContent = id ? 'حفظ التعديلات' : 'إنشاء';
    }

    function clearForm() {
      cfg.fields.forEach(f => {
        const el = document.getElementById(idp + '_' + f.name);
        if (f.type === 'checkbox') el.checked = false; else el.value = '';
      });
      setEditing(null);
    }

    function readForm() {
      const body = {};
      cfg.fields.forEach(f => {
        const el = document.getElementById(idp + '_' + f.name);
        if (f.type === 'checkbox') body[f.name] = el.checked ? 1 : 0;
        else if (el.value !== '') body[f.name] = el.value;
      });
      return body;
    }

    function fillForm(record) {
      cfg.fields.forEach(f => {
        const el = document.getElementById(idp + '_' + f.name);
        if (f.type === 'checkbox') el.checked = !!Number(record[f.name]);
        else el.value = record[f.name] ?? '';
      });
      setEditing(record.id);
    }

    function displayValue(f, raw) {
      if (raw === null || raw === undefined || raw === '') return '';
      if (f.type === 'checkbox') return Number(raw) ? '✓' : '';
      if (f.type === 'select') {
        const found = f.options.find(([v]) => v === raw);
        return found ? found[1] : raw;
      }
      return raw;
    }

    async function refreshList() {
      const r = await apiFetch('GET', cfg.path, { auth: true });
      const tbody = document.getElementById(idp + '_tbody');
      if (!r.ok) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="${cfg.fields.length + 2}">فشل الطلب — راجع السجل</td></tr>`;
        return;
      }
      const rows = (r.json.data || []);
      if (!rows.length) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="${cfg.fields.length + 2}">لا توجد سجلات بعد</td></tr>`;
        return;
      }
      tbody.innerHTML = rows.map(row => `
        <tr>
          <td>${row.id}</td>
          ${cfg.fields.map(f => `<td>${escapeHtml(displayValue(f, row[f.name]))}</td>`).join('')}
          <td class="actions-cell">
            <button class="btn small" data-act="edit" data-id="${row.id}">تعديل</button>
            <button class="btn small danger" data-act="del" data-id="${row.id}">حذف</button>
          </td>
        </tr>
      `).join('');

      $$('button[data-act="edit"]', tbody).forEach(b => {
        b.addEventListener('click', () => {
          const record = rows.find(x => String(x.id) === b.dataset.id);
          fillForm(record);
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      $$('button[data-act="del"]', tbody).forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm('هل تريد حذف السجل رقم ' + b.dataset.id + '؟')) return;
          const r2 = await apiFetch('DELETE', cfg.path + '/' + b.dataset.id, { auth: true });
          paint(document.getElementById(idp + '_out'), r2);
          if (r2.ok) refreshList();
        });
      });
    }

    document.getElementById(idp + '_refresh').addEventListener('click', refreshList);
    document.getElementById(idp + '_clear').addEventListener('click', clearForm);
    document.getElementById(idp + '_submit').addEventListener('click', async () => {
      const body = readForm();
      const r = editingId
        ? await apiFetch('PUT', cfg.path + '/' + editingId, { body, auth: true })
        : await apiFetch('POST', cfg.path, { body, auth: true });
      paint(document.getElementById(idp + '_out'), r);
      if (r.ok) { clearForm(); refreshList(); }
    });
  }

  Object.entries(RESOURCES).forEach(([key, cfg]) => buildResourceSection(key, cfg));

  /* ==================================================================
     الفحص الشامل (DIAGNOSTICS)
  ================================================================== */
  const diagStepsEl = document.getElementById('diagSteps');
  const diagSummaryEl = document.getElementById('diagSummary');

  function makeStepRow(label) {
    const row = document.createElement('div');
    row.className = 'diag-step pending';
    row.innerHTML = `<span class="icon">○</span><span class="label">${label}</span><span class="time"></span>`;
    diagStepsEl.appendChild(row);
    return row;
  }
  function setStep(row, status, ms) {
    row.className = 'diag-step ' + status;
    row.querySelector('.icon').textContent = status === 'running' ? '◐' : status === 'pass' ? '✓' : status === 'fail' ? '✕' : '○';
    row.querySelector('.time').textContent = ms != null ? ms.toFixed(0) + 'ms' : '';
  }

  document.getElementById('btnRunDiag').addEventListener('click', async () => {
    diagStepsEl.innerHTML = ''; diagSummaryEl.innerHTML = '';
    const email = 'diag+' + Date.now() + '@example.com';
    const password = 'DiagPass123';
    let pass = 0, fail = 0;
    let access = '', refresh = '', skillId = null;

    async function apiFetchWithToken(method, path, token, body = null) {
      const url = state.baseUrl + path;
      const headers = { 'Authorization': 'Bearer ' + token };
      let fetchBody;
      if (body !== null) { headers['Content-Type'] = 'application/json'; fetchBody = JSON.stringify(body); }
      const started = performance.now();
      try {
        const res = await fetch(url, { method, headers, body: fetchBody });
        const text = await res.text();
        let json; try { json = JSON.parse(text); } catch (e) { json = { status: 'error', message: 'استجابة غير صالحة' }; }
        logEntry({ method, path, status: res.status, duration: performance.now() - started, response: json });
        return { ok: res.ok, status: res.status, json };
      } catch (e) {
        logEntry({ method, path, status: 'NETWORK ERROR', duration: performance.now() - started, response: String(e) });
        return { ok: false, status: 'NETWORK ERROR', json: { message: String(e) } };
      }
    }

    const steps = [
      ['إنشاء حساب باحث عن عمل مؤقت', async () => {
        const r = await apiFetch('POST', '/api/v1/auth/register', { body: { full_name: 'حساب الفحص التلقائي', email, password, password_confirmation: password, role: 'job_seeker' } });
        if (!r.ok) throw new Error(r.json.message || 'فشل إنشاء الحساب');
      }],
      ['تسجيل الدخول بالحساب الجديد', async () => {
        const r = await apiFetch('POST', '/api/v1/auth/login', { body: { email, password } });
        if (!r.ok) throw new Error(r.json.message || 'فشل تسجيل الدخول');
        access = r.json.data.access_token; refresh = r.json.data.refresh_token;
      }],
      ['جلب الملف الشخصي المُنشأ تلقائيًا (GET /profile/me)', async () => {
        const r = await apiFetchWithToken('GET', '/api/v1/profile/me', access);
        if (!r.ok) throw new Error(r.json.message || 'فشل جلب الملف الشخصي');
      }],
      ['تحديث العنوان الوظيفي (PUT /profile/me)', async () => {
        const r = await apiFetchWithToken('PUT', '/api/v1/profile/me', access, { headline: 'عنوان تجريبي من الفحص' });
        if (!r.ok) throw new Error(r.json.message || 'فشل تحديث الملف الشخصي');
      }],
      ['إنشاء مهارة جديدة (POST /skills)', async () => {
        const r = await apiFetchWithToken('POST', '/api/v1/skills', access, { name: 'مهارة تجريبية', proficiency: 'intermediate' });
        if (!r.ok) throw new Error(r.json.message || 'فشل إنشاء المهارة');
        skillId = r.json.data.id;
      }],
      ['التأكد من ظهورها في القائمة (GET /skills)', async () => {
        const r = await apiFetchWithToken('GET', '/api/v1/skills', access);
        if (!r.ok) throw new Error(r.json.message || 'فشل جلب المهارات');
        const found = (r.json.data || []).some(s => s.id === skillId);
        if (!found) throw new Error('المهارة التي تم إنشاؤها غير موجودة في القائمة');
      }],
      ['تعديل المهارة (PUT /skills/{id})', async () => {
        const r = await apiFetchWithToken('PUT', '/api/v1/skills/' + skillId, access, { name: 'مهارة تجريبية (معدّلة)', proficiency: 'advanced' });
        if (!r.ok) throw new Error(r.json.message || 'فشل تعديل المهارة');
      }],
      ['حذف المهارة (DELETE /skills/{id})', async () => {
        const r = await apiFetchWithToken('DELETE', '/api/v1/skills/' + skillId, access);
        if (!r.ok) throw new Error(r.json.message || 'فشل حذف المهارة');
      }],
      ['تدوير التوكنات (POST /auth/refresh)', async () => {
        const r = await apiFetch('POST', '/api/v1/auth/refresh', { body: { refresh_token: refresh } });
        if (!r.ok) throw new Error(r.json.message || 'فشل تجديد التوكن');
        access = r.json.data.access_token; refresh = r.json.data.refresh_token;
      }],
      ['تسجيل الخروج (POST /auth/logout)', async () => {
        const r = await apiFetchWithToken('POST', '/api/v1/auth/logout', access, { refresh_token: refresh });
        if (!r.ok) throw new Error(r.json.message || 'فشل تسجيل الخروج');
      }],
    ];

    for (const [label, fn] of steps) {
      const row = makeStepRow(label);
      setStep(row, 'running');
      const t0 = performance.now();
      try {
        await fn();
        setStep(row, 'pass', performance.now() - t0);
        pass++;
      } catch (err) {
        setStep(row, 'fail', performance.now() - t0);
        row.querySelector('.label').textContent += '  ←  ' + err.message;
        fail++;
        break; // التوقف عند أول فشل لأن الخطوات التالية تعتمد على الحالة السابقة
      }
    }

    diagSummaryEl.innerHTML = `<div class="diag-summary ${fail === 0 ? 'ok' : 'err'}">${pass}/${steps.length} خطوة ناجحة${fail ? ' — توقف الفحص عند أول فشل' : ' — الخادم يستجيب بشكل صحيح من البداية للنهاية'}</div>`;
  });

})();
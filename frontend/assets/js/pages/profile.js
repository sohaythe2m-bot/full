/**
 * pages/profile.js
 */
import { requireJobSeeker } from '../modules/authGuard.js';
import { renderDashSidebar } from '../components/dashSidebar.js';
import { getMe, updateProfile, uploadAvatar, uploadResume } from '../api/profile.js';
import { skillsApi, educationApi, experienceApi, certificatesApi, projectsApi } from '../api/resource.js';
import { mountDropzone } from '../components/dropzone.js';
import { mountResourceSection } from '../components/resourceSection.js';
import { session } from '../state/session.js';
import { t } from '../modules/i18n.js';
import { toast } from '../components/toast.js';
import { validateForm, rules } from '../utils/validators.js';
import { handleApiError, paintFieldErrors, clearFieldErrors } from '../utils/apiErrorHandler.js';
import { setLoading } from '../utils/buttonState.js';
import { escapeHtml } from '../utils/sanitize.js';
import { UPLOAD_LIMITS } from '../config/config.js';
import { qs } from '../utils/dom.js';

const DETAIL_FIELDS = [
  'full_name', 'phone', 'headline', 'location', 'github_url', 'linkedin_url',
  'portfolio_url', 'languages', 'expected_salary_min', 'expected_salary_max',
  'preferred_job_type', 'open_to_work', 'bio',
];

const RESOURCE_CONFIGS = [
  {
    key: 'skills', api: skillsApi, i18nPrefix: 'resource.skills', mount: '#skillsMount',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'proficiency', type: 'select', options: ['beginner', 'intermediate', 'advanced', 'expert'] },
    ],
  },
  {
    key: 'education', api: educationApi, i18nPrefix: 'resource.education', mount: '#educationMount',
    fields: [
      { name: 'institution', type: 'text', required: true },
      { name: 'degree', type: 'text' },
      { name: 'field_of_study', type: 'text' },
      { name: 'start_date', type: 'date' },
      { name: 'end_date', type: 'date' },
      { name: 'is_current', type: 'checkbox' },
      { name: 'description', type: 'textarea' },
    ],
  },
  {
    key: 'experience', api: experienceApi, i18nPrefix: 'resource.experience', mount: '#experienceMount',
    fields: [
      { name: 'company_name', type: 'text', required: true },
      { name: 'job_title', type: 'text', required: true },
      { name: 'employment_type', type: 'select', options: ['full_time', 'part_time', 'contract', 'internship', 'freelance'] },
      { name: 'start_date', type: 'date' },
      { name: 'end_date', type: 'date' },
      { name: 'is_current', type: 'checkbox' },
      { name: 'description', type: 'textarea' },
    ],
  },
  {
    key: 'certificates', api: certificatesApi, i18nPrefix: 'resource.certificates', mount: '#certificatesMount',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'issuer', type: 'text' },
      { name: 'issue_date', type: 'date' },
      { name: 'expiry_date', type: 'date' },
      { name: 'credential_url', type: 'url' },
    ],
  },
  {
    key: 'projects', api: projectsApi, i18nPrefix: 'resource.projects', mount: '#projectsMount',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'textarea' },
      { name: 'project_url', type: 'url' },
      { name: 'repo_url', type: 'url' },
      { name: 'start_date', type: 'date' },
      { name: 'end_date', type: 'date' },
    ],
  },
];

function fillDetailsForm(user, profile) {
  qs('#full_name').value = user?.full_name || '';
  qs('#phone').value = user?.phone || '';
  qs('#headline').value = profile?.headline || '';
  qs('#location').value = profile?.location || '';
  qs('#github_url').value = profile?.github_url || '';
  qs('#linkedin_url').value = profile?.linkedin_url || '';
  qs('#portfolio_url').value = profile?.portfolio_url || '';
  qs('#languages').value = profile?.languages || '';
  qs('#salary_min').value = profile?.expected_salary_min ?? '';
  qs('#salary_max').value = profile?.expected_salary_max ?? '';
  qs('#preferred_job_type').value = profile?.preferred_job_type || '';
  qs('#open_to_work').checked = Boolean(Number(profile?.open_to_work ?? 1));
  qs('#bio').value = profile?.bio || '';
}

function updateAvatarBadge(user) {
  const badge = qs('#currentAvatar');
  if (user?.avatar_url) {
    badge.innerHTML = `<img src="${user.avatar_url}" alt="">`;
  } else {
    const initials = (user?.full_name || user?.email || 'F').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
    badge.textContent = initials || 'F';
  }
}

export async function runProfilePage() {
  if (!requireJobSeeker()) return;
  renderDashSidebar('profile.html');

  let me;
  try {
    me = await getMe();
    session.setUser(me.user);
  } catch (err) {
    handleApiError(err);
    return;
  }

  // ---- Avatar ----
  updateAvatarBadge(me.user);
  mountDropzone(qs('#avatarDropzone'), {
    accept: UPLOAD_LIMITS.IMAGE_EXT,
    hintKey: 'profile.avatarHint',
    buttonKey: 'profile.uploadAvatar',
    uploadFn: uploadAvatar,
    onSuccess: (result) => {
      const user = session.getUser();
      user.avatar_url = result.avatar_url;
      session.setUser(user);
      updateAvatarBadge(user);
      toast.success(t('toast.avatarUpdated'));
    },
  });

  // ---- Resume ----
  mountDropzone(qs('#resumeDropzone'), {
    accept: UPLOAD_LIMITS.PDF_EXT,
    hintKey: 'profile.resumeHint',
    buttonKey: 'profile.uploadResume',
    existingUrl: me.profile?.resume_url || null,
    uploadFn: uploadResume,
    onSuccess: () => toast.success(t('toast.resumeUpdated')),
  });

  // ---- Details form ----
  fillDetailsForm(me.user, me.profile);
  const detailsForm = qs('#detailsForm');
  const detailsBtn = qs('#detailsSubmitBtn');

  detailsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(DETAIL_FIELDS.filter((f) => f !== 'open_to_work'));

    const data = {
      full_name: qs('#full_name').value.trim(),
      phone: qs('#phone').value.trim(),
      headline: qs('#headline').value.trim(),
      location: qs('#location').value.trim(),
      github_url: qs('#github_url').value.trim(),
      linkedin_url: qs('#linkedin_url').value.trim(),
      portfolio_url: qs('#portfolio_url').value.trim(),
      languages: qs('#languages').value.trim(),
      open_to_work: qs('#open_to_work').checked ? 1 : 0,
      expected_salary_min: qs('#salary_min').value || null,
      expected_salary_max: qs('#salary_max').value || null,
      preferred_job_type: qs('#preferred_job_type').value || null,
      bio: qs('#bio').value.trim(),
    };

    const errors = validateForm(data, {
      full_name: [(v) => rules.maxLength(v, 150)],
      headline: [(v) => rules.maxLength(v, 200)],
      github_url: [rules.url],
      linkedin_url: [rules.url],
      portfolio_url: [rules.url],
      expected_salary_min: [(v) => (v ? null : null)],
    });
    if (Object.keys(errors).length) {
      paintFieldErrors(Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v)])));
      return;
    }

    setLoading(detailsBtn, true, t('common.saving'));
    try {
      const updated = await updateProfile(data);
      session.setUser(updated.user);
      toast.success(t('toast.profileUpdated'));
    } catch (err) {
      const { fieldErrors } = handleApiError(err);
      paintFieldErrors(fieldErrors);
    } finally {
      setLoading(detailsBtn, false, '', t('common.save'));
    }
  });

  // ---- Resource sections ----
  RESOURCE_CONFIGS.forEach((config) => {
    const mountEl = qs(config.mount);
    if (mountEl) mountResourceSection(mountEl, config);
  });

  // ---- Deep-link scroll (e.g. profile.html#skills from the sidebar/dashboard) ----
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

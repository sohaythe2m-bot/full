/**
 * pages/dashboard.js
 */
import { requireJobSeeker } from '../modules/authGuard.js';
import { renderDashSidebar } from '../components/dashSidebar.js';
import { session } from '../state/session.js';
import { getMe } from '../api/profile.js';
import { skillsApi, educationApi, experienceApi, certificatesApi, projectsApi } from '../api/resource.js';
import { resendVerification } from '../api/auth.js';
import { t } from '../modules/i18n.js';
import { toast } from '../components/toast.js';
import { escapeHtml } from '../utils/sanitize.js';
import { handleApiError } from '../utils/apiErrorHandler.js';
import { qs } from '../utils/dom.js';

const RESOURCE_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';

function computeCompleteness(user, profile, counts) {
  let score = 0;
  const weights = {
    headline: 12, bio: 10, location: 6, resume_url: 18, avatar_url: 10,
    skills: 12, education: 10, experience: 14, projects: 8,
  };
  if (profile?.headline) score += weights.headline;
  if (profile?.bio) score += weights.bio;
  if (profile?.location) score += weights.location;
  if (profile?.resume_url) score += weights.resume_url;
  if (user?.avatar_url) score += weights.avatar_url;
  if (counts.skills > 0) score += weights.skills;
  if (counts.education > 0) score += weights.education;
  if (counts.experience > 0) score += weights.experience;
  if (counts.projects > 0) score += weights.projects;
  return Math.min(100, score);
}

function statCard(icon, value, labelKey) {
  return `
    <div class="stat-card anim-fade-up">
      <span class="stat-icon">${icon}</span>
      <span class="stat-value">${value}</span>
      <span class="stat-label">${t(labelKey)}</span>
    </div>
  `;
}

export async function runDashboardPage() {
  if (!requireJobSeeker()) return;
  renderDashSidebar('dashboard.html');

  const user = session.getUser();
  qs('#welcomeTitle').textContent = t('dashboard.welcome', { name: (user?.full_name || user?.email || '').split(' ')[0] });

  // Skeletons while we load.
  qs('#statGrid').innerHTML = Array.from({ length: 5 }).map(() => '<div class="skeleton" style="height:120px;border-radius:var(--radius-lg);"></div>').join('');
  qs('#sectionsBody').innerHTML = `<tr><td><div class="skeleton" style="height:20px;width:100%"></div></td></tr>`;

  try {
    const [me, skills, education, experience, certificates, projects] = await Promise.all([
      getMe(),
      skillsApi.list(),
      educationApi.list(),
      experienceApi.list(),
      certificatesApi.list(),
      projectsApi.list(),
    ]);

    session.setUser(me.user);

    const counts = {
      skills: skills.length,
      education: education.length,
      experience: experience.length,
      certificates: certificates.length,
      projects: projects.length,
    };

    // ---- Completeness ring ----
    const pct = computeCompleteness(me.user, me.profile, counts);
    const circumference = 264;
    qs('#ringProgress').style.strokeDashoffset = String(circumference - (circumference * pct) / 100);
    qs('#ringValue').textContent = `${pct}%`;

    // ---- Verified badge ----
    const verified = Number(me.user.is_verified) === 1;
    qs('#verifyBadgeWrap').innerHTML = verified
      ? `<span class="badge badge--success">${t('dashboard.verifiedBadge')}</span>`
      : `<button type="button" class="badge badge--warning" id="resendBtn" style="border:none;cursor:pointer;">${t('dashboard.unverifiedBadge')} · ${t('dashboard.resendVerify')}</button>`;

    qs('#resendBtn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await resendVerification(me.user.email);
        toast.success(t('toast.resendSent'));
      } catch (err) {
        handleApiError(err);
      } finally {
        btn.disabled = false;
      }
    });

    // ---- Quick actions ----
    const actions = [
      { key: 'dashboard.actionResume', href: 'profile.html#resume', show: !me.profile?.resume_url },
      { key: 'dashboard.actionAvatar', href: 'profile.html#avatar', show: !me.user.avatar_url },
      { key: 'dashboard.actionSkills', href: 'profile.html#skills', show: counts.skills === 0 },
      { key: 'dashboard.actionExperience', href: 'profile.html#experience', show: counts.experience === 0 },
    ].filter((a) => a.show);
    qs('#quickActions').innerHTML = (actions.length ? actions : [{ key: 'dashboard.actionSkills', href: 'profile.html#skills' }])
      .map((a) => `<a href="${a.href}" class="btn btn--outline btn--sm">${t(a.key)}</a>`)
      .join('');

    // ---- Stat cards ----
    qs('#statGrid').innerHTML = [
      statCard(RESOURCE_ICON, counts.skills, 'dashboard.statSkills'),
      statCard(RESOURCE_ICON, counts.experience, 'dashboard.statExperience'),
      statCard(RESOURCE_ICON, counts.education, 'dashboard.statEducation'),
      statCard(RESOURCE_ICON, counts.certificates, 'dashboard.statCertificates'),
      statCard(RESOURCE_ICON, counts.projects, 'dashboard.statProjects'),
    ].join('');

    // ---- Sections table ----
    const rows = [
      ['sidebar.skills', counts.skills, 'profile.html#skills'],
      ['sidebar.education', counts.education, 'profile.html#education'],
      ['sidebar.experience', counts.experience, 'profile.html#experience'],
      ['sidebar.certificates', counts.certificates, 'profile.html#certificates'],
      ['sidebar.projects', counts.projects, 'profile.html#projects'],
    ];
    qs('#sectionsBody').innerHTML = rows.map(([labelKey, count, href]) => `
      <tr>
        <td style="font-weight:700;">${escapeHtml(t(labelKey))}</td>
        <td>${count === 0 ? `<span class="badge badge--warning">${escapeHtml(t('profile.resourceEmpty'))}</span>` : `<span class="badge badge--success">${count}</span>`}</td>
        <td style="text-align:end;"><a href="${href}" class="btn btn--ghost btn--sm">${escapeHtml(t('common.edit'))} →</a></td>
      </tr>
    `).join('');
  } catch (err) {
    handleApiError(err);
    qs('#sectionsBody').innerHTML = `<tr><td class="table-empty">${t('errorStates.generic')}</td></tr>`;
  }
}

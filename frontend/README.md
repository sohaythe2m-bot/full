# FLTH Frontend (Phase 1)

Pure HTML5 / CSS3 / vanilla ES modules — no build step, no frameworks.
Connects to the PHP backend in your `flth-backend` repo.

## What's included (matches what the backend actually implements today)

- **Design system**: `assets/css/variables.css`, `base.css`, `components.css`,
  `layout.css`, `animations.css` — light/dark/system theme, RTL/LTR, Fraunces +
  Manrope (Cairo for Arabic).
- **i18n**: full Arabic + English translations (`assets/translations/*.json`),
  instant switching, persisted in `localStorage`.
- **API layer** (`assets/js/api/`): `apiClient.js` (JWT header injection,
  automatic refresh-and-retry on 401, timeout handling, error normalization),
  `auth.js`, `profile.js`, `resource.js` (generic client for skills /
  education / experience / certificates / projects).
- **Pages**: landing, about, pricing, FAQ, contact, privacy, terms, 404,
  login, register, forgot/reset password, verify email, candidate dashboard,
  full profile editor (personal details + avatar/resume upload with
  drag-and-drop + progress bar + all 5 resource CRUD sections).

## Not included yet — on purpose

The backend's `routes/api.php` only implements Auth + the job-seeker Profile
module. Company, Jobs, Applications, Messaging, Social, Notifications, AI,
and Admin all exist only as **database tables** (`database/schema.sql`) with
no controllers or routes. Building UI for those now would mean shipping
buttons that 404. Once you add those routes, the same patterns used here
(`api/resource.js`'s factory, `resourceSection.js`'s generic CRUD builder)
extend directly — most new resources won't need new components at all.

## Running it

1. Get the PHP backend running (see its own README) — by default at
   `http://localhost/flth-backend/public`.
2. Open `assets/js/config/config.js` and confirm `API_BASE_URL` matches your
   backend's address (default assumes XAMPP: `http://localhost/flth-backend/public/api/v1`).
3. Serve this `frontend/` folder with any static file server (it uses ES
   modules, so it must be served over `http://`, not opened via `file://`).
   Examples:
   - VS Code "Live Server" extension
   - `npx serve .`
   - `python3 -m http.server 8080`
4. Visit `index.html` (e.g. `http://localhost:8080/index.html`).

## Notes

- The landing page's hero "search" is intentionally wired to the register
  page rather than faking a live job search, since the Jobs module isn't on
  the backend yet.
- The contact form opens the user's email client (`mailto:`) rather than
  submitting to an API, since there's no contact endpoint yet.
- Privacy/Terms pages contain clearly-labeled sample legal text — replace
  with counsel-reviewed copy before shipping.

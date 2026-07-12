# FLTH Backend — From Learning To Hiring

Pure PHP 8.3 (no framework), PDO, JWT, MVC, RESTful API for the FLTH AI recruitment platform.

**Status: Foundation + Auth + Job Seeker modules complete and working.** Remaining modules (Company, Jobs, Applications, Messaging, Social, Notifications, AI, Admin) plug into this same architecture — see "Roadmap" below.

---

## 1. What's included in this pass

- Full project skeleton (`/app`, `/routes`, `/public`, `/database`, `/storage`, `/uploads`)
- Core framework: `Router`, `Request`, `Response`, `Database` (PDO singleton), `Model` (base CRUD + pagination + soft deletes), `Controller`, `Validator`
- `Jwt` helper (access + refresh tokens, HS256, via `firebase/php-jwt`)
- Middleware: `CorsMiddleware`, `AuthMiddleware`, `RateLimitMiddleware`, `RoleMiddleware` (+ `AdminOnly`, `CompanyOnly`, `JobSeekerOnly`)
- **Full Auth module**, fully working: register, login, logout, refresh token (rotated + revocable), forgot password, reset password, email verification, resend verification
- **Complete database schema** — all 29 tables from the spec (users, companies, jobs, applications, messages, conversations, notifications, skills, education, experience, certificates, projects, courses, roadmaps, resume_analysis, ai_recommendations, interviews, saved_jobs, posts, comments, likes, followers, reports, settings, admins, roles, permissions, logs), with soft deletes, timestamps, indexes, and foreign keys
- Standardized JSON envelope, global error handler, CORS, rate limiting

## 2. Project structure

```
/app
  /Controllers      AuthController.php ...
  /Models           User.php ...
  /Services         (AI provider services go here)
  /Middleware       AuthMiddleware, RoleMiddleware, CorsMiddleware, RateLimitMiddleware
  /Helpers          Jwt.php, Mailer.php
  /Config           app.php
  /Core             Router, Request, Response, Database, Model, Controller, Validator
/routes
  api.php           all route definitions
/database
  schema.sql        full MySQL schema
/storage
  /logs, /ratelimit
/uploads
  /resumes, /images, /logos, /certificates, /covers
/public
  index.php         front controller
  .htaccess         Apache rewrite + security headers
.env.example
composer.json
```

## 3. Installation (XAMPP)

1. Copy the `flth-backend` folder into `C:\xampp\htdocs\` (or `/opt/lampp/htdocs/` on Linux).
2. Install dependencies:
   ```
   cd flth-backend
   composer install
   ```
3. Copy `.env.example` to `.env` and fill in your DB credentials and a strong `JWT_SECRET`.
4. Create the database and import the schema:
   ```
   mysql -u root -p -e "CREATE DATABASE flth_db"
   mysql -u root -p flth_db < database/schema.sql
   ```
5. Point your Apache vhost (or use XAMPP's default) document root to `flth-backend/public`.
   - Ensure `mod_rewrite` and `mod_headers` are enabled in Apache.
6. Visit `http://localhost/flth-backend/public/api/v1/auth/register` (POST) to confirm it's live.

## 4. Standard response envelope

Success:
```json
{ "status": "success", "message": "...", "data": {} }
```
Error:
```json
{ "status": "error", "message": "...", "errors": [] }
```

## 5. Auth API reference

Base path: `/api/v1/auth`

| Method | Route | Auth | Body |
|---|---|---|---|
| POST | `/register` | none | `full_name, email, password, password_confirmation, role (company\|job_seeker)` |
| POST | `/login` | none | `email, password` |
| POST | `/logout` | Bearer | `refresh_token` (optional — revokes all if omitted) |
| POST | `/refresh` | none | `refresh_token` |
| POST | `/forgot-password` | none | `email` |
| POST | `/reset-password` | none | `token, password, password_confirmation` |
| GET | `/verify-email?token=...` | none | — |
| POST | `/resend-verification` | none | `email` |

**Register — request**
```json
POST /api/v1/auth/register
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123",
  "password_confirmation": "SecurePass123",
  "role": "job_seeker"
}
```
**Register — success (201)**
```json
{
  "status": "success",
  "message": "Registration successful. Please check your email to verify your account.",
  "data": { "user": { "id": 1, "full_name": "Jane Doe", "email": "jane@example.com", "role": "job_seeker", "is_verified": 0, ... } }
}
```
**Register — validation error (422)**
```json
{ "status": "error", "message": "Validation failed", "errors": { "email": ["This email is already registered"] } }
```

**Login — request**
```json
POST /api/v1/auth/login
{ "email": "jane@example.com", "password": "SecurePass123" }
```
**Login — success (200)**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": { "id": 1, "full_name": "Jane Doe", "role": "job_seeker" },
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "Bearer"
  }
}
```
**Login — error (401)**
```json
{ "status": "error", "message": "Invalid email or password", "errors": [] }
```

All subsequent protected requests use:
```
Authorization: Bearer <access_token>
```

## 6. Job Seeker API reference

All routes below require `Authorization: Bearer <access_token>` from a user registered with `role: job_seeker`.

**Profile** — base path `/api/v1/profile`

| Method | Route | Body / Form-Data |
|---|---|---|
| GET | `/me` | — returns `{ user, profile }`, auto-creates an empty profile on first call |
| PUT | `/me` | `full_name, phone, headline, bio, location, github_url, linkedin_url, portfolio_url, languages, open_to_work, expected_salary_min, expected_salary_max, preferred_job_type` |
| POST | `/avatar` | multipart form field `avatar` (jpg/jpeg/png/webp, ≤ `MAX_UPLOAD_MB`) |
| POST | `/resume` | multipart form field `resume` (pdf only, ≤ `MAX_UPLOAD_MB`) |

Uploads are validated by real file content (not just extension), stored under `/uploads` with randomized filenames, and return a public URL.

**Skills, Education, Experience, Certificates, Projects** — each follows the identical REST pattern:

| Method | Route | Notes |
|---|---|---|
| GET | `/api/v1/{resource}` | List the authenticated user's own records |
| POST | `/api/v1/{resource}` | Create; `user_id` is set from the token, not the body |
| PUT | `/api/v1/{resource}/{id}` | Update — 403 if the record belongs to another user |
| DELETE | `/api/v1/{resource}/{id}` | Soft delete — 403 if the record belongs to another user |

Where `{resource}` is one of: `skills`, `education`, `experience`, `certificates`, `projects`.

**Skill fields:** `name` (required), `proficiency` (`beginner|intermediate|advanced|expert`)
**Education fields:** `institution` (required), `degree`, `field_of_study`, `start_date`, `end_date`, `is_current`, `description`
**Experience fields:** `company_name`, `job_title` (required), `employment_type`, `start_date`, `end_date`, `is_current`, `description`
**Certificate fields:** `title` (required), `issuer`, `issue_date`, `expiry_date`, `credential_url`
**Project fields:** `title` (required), `description`, `project_url`, `repo_url`, `start_date`, `end_date`

Example:
```json
POST /api/v1/skills
{ "name": "PHP", "proficiency": "advanced" }
```
```json
{ "status": "success", "message": "Created successfully", "data": { "id": 1, "user_id": 3, "name": "PHP", "proficiency": "advanced", ... } }
```

## 7. Adding a new module (pattern to follow)

1. Add table(s) to `database/schema.sql` if not already present (all 29 are already there).
2. Create a Model in `app/Models/` extending `App\Core\Model`, set `$table` and `$fillable`.
3. Create a Controller in `app/Controllers/` extending `App\Core\Controller`, using `$this->validate()`, `Response::success()/error()`.
4. Register routes in `routes/api.php` inside the existing `/api/v1` group, attaching `AuthMiddleware::class` and, if role-restricted, `AdminOnly::class` / `CompanyOnly::class` / `JobSeekerOnly::class`.

Example (Job Seeker profile):
```php
$router->get('/profile/me', [ProfileController::class, 'me'], [AuthMiddleware::class]);
$router->put('/profile/me', [ProfileController::class, 'update'], [AuthMiddleware::class]);
```

## 8. Roadmap — modules to build next (same architecture, incrementally)

1. **Company module**: profile CRUD, logo/cover upload, job CRUD, applicant pipeline, analytics
2. **Jobs module**: search/filter, featured/recommended/recent/popular, apply/save
3. **Applications module**: status tracking, interview scheduling, offers
4. **Messaging**: conversations, messages, attachments, seen/unread, WebSocket-ready event hooks
5. **Social**: posts, comments/replies, likes, follows, activity feed
6. **Notifications**: unified notification service consumed by all modules above
7. **AI service layer**: `AiProviderInterface` with `OpenAiService`, `GeminiService`, `ClaudeService`, `OllamaService` implementations — resume analysis, ATS scoring, roadmap generation, job matching, mock interviews
8. **Admin panel**: user/company/job/application management, reports, analytics, logs, roles & permissions enforcement

Each will ship as real, complete, working code — no pseudocode — following the exact pattern established by the Auth module above.

## 9. Security notes already in place

- Bcrypt password hashing, PDO prepared statements everywhere (no raw SQL interpolation)
- JWT access + refresh tokens; refresh tokens are hashed at rest and revocable/rotated on use
- Rate limiting middleware (file-backed; swap for Redis at scale)
- CORS configured via `.env`
- Global exception handler that never leaks stack traces outside `APP_DEBUG=true`
- Soft deletes on all data tables

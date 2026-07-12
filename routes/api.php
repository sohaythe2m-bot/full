<?php

declare(strict_types=1);

use App\Core\Router;
use App\Controllers\AuthController;
use App\Controllers\ProfileController;
use App\Controllers\SkillController;
use App\Controllers\EducationController;
use App\Controllers\ExperienceController;
use App\Controllers\CertificateController;
use App\Controllers\ProjectController;
use App\Middleware\AuthMiddleware;
use App\Middleware\JobSeekerOnly;
use App\Middleware\RateLimitMiddleware;

/** @var Router $router */

error_log("🔥 API ROUTES LOADED");

/**
 * =========================================================
 * IMPORTANT:
 * index.php already groups /api/v1
 * so DO NOT repeat it here
 * =========================================================
 */
$router->group('', [RateLimitMiddleware::class], function (Router $router) {

    // -------------------------------------------------------
    // AUTH (PUBLIC)
    // -------------------------------------------------------
    $router->post('/auth/register', [AuthController::class, 'register']);
    $router->post('/auth/login', [AuthController::class, 'login']);
    $router->post('/auth/refresh', [AuthController::class, 'refresh']);
    $router->post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    $router->post('/auth/reset-password', [AuthController::class, 'resetPassword']);
    $router->get('/auth/verify-email', [AuthController::class, 'verifyEmail']);
    $router->post('/auth/resend-verification', [AuthController::class, 'resendVerification']);

    // -------------------------------------------------------
    // AUTH (PROTECTED)
    // -------------------------------------------------------
    $router->post('/auth/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]);

    // -------------------------------------------------------
    // JOB SEEKER (PROTECTED)
    // -------------------------------------------------------
    $jobSeekerMw = [AuthMiddleware::class, JobSeekerOnly::class];

    $router->get('/profile/me', [ProfileController::class, 'me'], $jobSeekerMw);
    $router->put('/profile/me', [ProfileController::class, 'update'], $jobSeekerMw);
    $router->post('/profile/avatar', [ProfileController::class, 'uploadAvatar'], $jobSeekerMw);
    $router->post('/profile/resume', [ProfileController::class, 'uploadResume'], $jobSeekerMw);

    // Skills
    $router->get('/skills', [SkillController::class, 'index'], $jobSeekerMw);
    $router->post('/skills', [SkillController::class, 'store'], $jobSeekerMw);
    $router->put('/skills/{id}', [SkillController::class, 'update'], $jobSeekerMw);
    $router->delete('/skills/{id}', [SkillController::class, 'destroy'], $jobSeekerMw);

    // Education
    $router->get('/education', [EducationController::class, 'index'], $jobSeekerMw);
    $router->post('/education', [EducationController::class, 'store'], $jobSeekerMw);
    $router->put('/education/{id}', [EducationController::class, 'update'], $jobSeekerMw);
    $router->delete('/education/{id}', [EducationController::class, 'destroy'], $jobSeekerMw);

    // Experience
    $router->get('/experience', [ExperienceController::class, 'index'], $jobSeekerMw);
    $router->post('/experience', [ExperienceController::class, 'store'], $jobSeekerMw);
    $router->put('/experience/{id}', [ExperienceController::class, 'update'], $jobSeekerMw);
    $router->delete('/experience/{id}', [ExperienceController::class, 'destroy'], $jobSeekerMw);

    // Certificates
    $router->get('/certificates', [CertificateController::class, 'index'], $jobSeekerMw);
    $router->post('/certificates', [CertificateController::class, 'store'], $jobSeekerMw);
    $router->put('/certificates/{id}', [CertificateController::class, 'update'], $jobSeekerMw);
    $router->delete('/certificates/{id}', [CertificateController::class, 'destroy'], $jobSeekerMw);

    // Projects
    $router->get('/projects', [ProjectController::class, 'index'], $jobSeekerMw);
    $router->post('/projects', [ProjectController::class, 'store'], $jobSeekerMw);
    $router->put('/projects/{id}', [ProjectController::class, 'update'], $jobSeekerMw);
    $router->delete('/projects/{id}', [ProjectController::class, 'destroy'], $jobSeekerMw);

});
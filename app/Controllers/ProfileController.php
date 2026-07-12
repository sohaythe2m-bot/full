<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Helpers\FileUpload;
use App\Models\JobSeekerProfile;
use App\Models\User;

/**
 * ProfileController
 *
 * Job seeker profile: view/update the profile record, upload avatar
 * (stored on the users table) and resume (stored on the profile).
 *
 * Routes (see routes/api.php), all under /api/v1/profile, all require
 * AuthMiddleware + JobSeekerOnly:
 *   GET   /me
 *   PUT   /me
 *   POST  /avatar
 *   POST  /resume
 */
final class ProfileController extends Controller
{
    private JobSeekerProfile $profileModel;
    private User $userModel;

    public function __construct()
    {
        $this->profileModel = new JobSeekerProfile();
        $this->userModel = new User();
    }

    public function me(Request $request): void
    {
        $userId = $request->user['id'];

        $user = $this->userModel->find($userId);
        $profile = $this->profileModel->findByUserId($userId);

        if (!$profile) {
            // Auto-provision an empty profile row on first access.
            $newId = $this->profileModel->create(['user_id' => $userId]);
            $profile = $this->profileModel->find($newId);
        }

        unset($user['password_hash'], $user['verification_token'], $user['reset_token'], $user['reset_token_expires_at']);

        Response::success([
            'user'    => $user,
            'profile' => $profile,
        ], 'Fetched successfully');
    }

    public function update(Request $request): void
    {
        $userId = $request->user['id'];

        $userData = $request->only(['full_name', 'phone']);
        $profileData = $request->only([
            'headline', 'bio', 'location', 'github_url', 'linkedin_url',
            'portfolio_url', 'languages', 'open_to_work',
            'expected_salary_min', 'expected_salary_max', 'preferred_job_type',
        ]);

        $errors = $this->validate($userData + $profileData, [
            'full_name'           => 'max:150',
            'phone'               => 'max:30',
            'headline'            => 'max:200',
            'github_url'          => 'url',
            'linkedin_url'        => 'url',
            'portfolio_url'       => 'url',
            'expected_salary_min' => 'numeric',
            'expected_salary_max' => 'numeric',
            'preferred_job_type'  => 'in:full_time,part_time,contract,internship,remote',
        ]);

        if (!empty($errors)) {
            Response::validationError($errors);
        }

        if (!empty($userData)) {
            $this->userModel->update($userId, $userData);
        }

        $profile = $this->profileModel->findByUserId($userId);
        if (!$profile) {
            $profileData['user_id'] = $userId;
            $this->profileModel->create($profileData);
        } elseif (!empty($profileData)) {
            $this->profileModel->update($profile['id'], $profileData);
        }

        Response::success([
            'user'    => $this->userModel->find($userId),
            'profile' => $this->profileModel->findByUserId($userId),
        ], 'Profile updated successfully');
    }

    public function uploadAvatar(Request $request): void
    {
        if (!$request->hasFile('avatar')) {
            Response::validationError(['avatar' => ['An image file is required']]);
        }

        $result = FileUpload::storeImage($request->file('avatar'), 'images');

        if (!$result['ok']) {
            Response::error($result['error'], [], 422);
        }

        $this->userModel->update($request->user['id'], ['avatar_url' => $result['url']]);

        Response::success(['avatar_url' => $result['url']], 'Avatar uploaded successfully');
    }

    public function uploadResume(Request $request): void
    {
        if (!$request->hasFile('resume')) {
            Response::validationError(['resume' => ['A PDF file is required']]);
        }

        $result = FileUpload::storePdf($request->file('resume'), 'resumes');

        if (!$result['ok']) {
            Response::error($result['error'], [], 422);
        }

        $userId = $request->user['id'];
        $profile = $this->profileModel->findByUserId($userId);

        if (!$profile) {
            $this->profileModel->create(['user_id' => $userId, 'resume_url' => $result['url']]);
        } else {
            $this->profileModel->update($profile['id'], ['resume_url' => $result['url']]);
        }

        Response::success(['resume_url' => $result['url']], 'Resume uploaded successfully');
    }
}

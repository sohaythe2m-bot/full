<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Helpers\Jwt;
use App\Helpers\Mailer;
use App\Models\User;

/**
 * AuthController
 *
 * Handles: register, login, logout, refresh token, forgot password,
 * reset password, and email verification.
 *
 * Routes (see routes/api.php):
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/logout                 (auth)
 *   POST /api/v1/auth/refresh
 *   POST /api/v1/auth/forgot-password
 *   POST /api/v1/auth/reset-password
 *   GET  /api/v1/auth/verify-email
 *   POST /api/v1/auth/resend-verification
 */
final class AuthController extends Controller
{
    private User $userModel;

    public function __construct()
    {
        $this->userModel = new User();
    }

    /**
     * POST /api/v1/auth/register
     * Body: { full_name, email, password, password_confirmation, role }
     */
    public function register(Request $request): void
    {
        $data = $request->only(['full_name', 'email', 'password', 'password_confirmation', 'role']);

        $errors = $this->validate($data, [
            'full_name' => 'required|min:2|max:150',
            'email'     => 'required|email|max:150',
            'password'  => 'required|min:8|confirmed',
            'role'      => 'required|in:company,job_seeker',
        ]);

        if (!empty($errors)) {
            Response::validationError($errors);
        }

        if ($this->userModel->emailExists($data['email'])) {
            Response::validationError(['email' => ['This email is already registered']]);
        }

        $verificationToken = bin2hex(random_bytes(32));

        $userId = $this->userModel->create([
            'full_name'           => trim($data['full_name']),
            'email'               => strtolower(trim($data['email'])),
            'password_hash'       => password_hash($data['password'], PASSWORD_BCRYPT),
            'role'                => $data['role'],
            'is_active'           => 1,
            'is_verified'         => 0,
            'verification_token'  => $verificationToken,
        ]);

        Mailer::sendVerificationEmail($data['email'], $data['full_name'], $verificationToken);

        $user = $this->userModel->find($userId);

        Response::success([
            'user' => $this->sanitizeUser($user),
        ], 'Registration successful. Please check your email to verify your account.', 201);
    }

    /**
     * POST /api/v1/auth/login
     * Body: { email, password }
     */
    public function login(Request $request): void
    {
        $data = $request->only(['email', 'password']);

        $errors = $this->validate($data, [
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if (!empty($errors)) {
            Response::validationError($errors);
        }

        $user = $this->userModel->findByEmail(strtolower(trim($data['email'])));

        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            Response::unauthorized('Invalid email or password');
        }

        if ((int) $user['is_active'] === 0) {
            Response::forbidden('This account has been deactivated');
        }

        [$accessToken, $refreshToken] = $this->issueTokens($user);

        Response::success([
            'user'          => $this->sanitizeUser($user),
            'access_token'  => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type'    => 'Bearer',
        ], 'Login successful');
    }

    /**
     * POST /api/v1/auth/logout
     * Requires: AuthMiddleware. Body: { refresh_token }
     */
    public function logout(Request $request): void
    {
        $refreshToken = $request->input('refresh_token');

        if ($refreshToken) {
            $this->userModel->revokeRefreshToken(hash('sha256', $refreshToken));
        } else {
            // No refresh token provided: revoke all of the user's tokens as a safe default.
            $this->userModel->revokeAllRefreshTokens($request->user['id']);
        }

        Response::success([], 'Logged out successfully');
    }

    /**
     * POST /api/v1/auth/refresh
     * Body: { refresh_token }
     */
    public function refresh(Request $request): void
    {
        $refreshToken = $request->input('refresh_token');

        if (!$refreshToken) {
            Response::validationError(['refresh_token' => ['refresh_token is required']]);
        }

        $result = Jwt::verify($refreshToken);

        if (!$result['valid'] || ($result['payload']['type'] ?? null) !== 'refresh') {
            Response::unauthorized('Invalid or expired refresh token');
        }

        $tokenHash = hash('sha256', $refreshToken);
        $stored = $this->userModel->findValidRefreshToken($tokenHash);

        if (!$stored) {
            Response::unauthorized('Refresh token has been revoked or is unknown');
        }

        $user = $this->userModel->find((int) $result['payload']['sub']);

        if (!$user || (int) $user['is_active'] === 0) {
            Response::unauthorized('Account is no longer active');
        }

        // Rotate: revoke old refresh token, issue a new pair.
        $this->userModel->revokeRefreshToken($tokenHash);
        [$accessToken, $newRefreshToken] = $this->issueTokens($user);

        Response::success([
            'access_token'  => $accessToken,
            'refresh_token' => $newRefreshToken,
            'token_type'    => 'Bearer',
        ], 'Token refreshed successfully');
    }

    /**
     * POST /api/v1/auth/forgot-password
     * Body: { email }
     */
    public function forgotPassword(Request $request): void
    {
        $email = $request->input('email');

        $errors = $this->validate(['email' => $email], ['email' => 'required|email']);
        if (!empty($errors)) {
            Response::validationError($errors);
        }

        $user = $this->userModel->findByEmail(strtolower(trim($email)));

        // Always return success to avoid leaking whether an email is registered.
        if ($user) {
            $resetToken = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', time() + 3600);

            $this->userModel->update($user['id'], [
                'reset_token'            => $resetToken,
                'reset_token_expires_at' => $expiresAt,
            ]);

            Mailer::sendPasswordResetEmail($user['email'], $user['full_name'], $resetToken);
        }

        Response::success([], 'If that email is registered, a password reset link has been sent.');
    }

    /**
     * POST /api/v1/auth/reset-password
     * Body: { token, password, password_confirmation }
     */
    public function resetPassword(Request $request): void
    {
        $data = $request->only(['token', 'password', 'password_confirmation']);

        $errors = $this->validate($data, [
            'token'    => 'required',
            'password' => 'required|min:8|confirmed',
        ]);

        if (!empty($errors)) {
            Response::validationError($errors);
        }

        $user = $this->userModel->findByResetToken($data['token']);

        if (!$user) {
            Response::error('This password reset link is invalid or has expired', [], 400);
        }

        $this->userModel->update($user['id'], [
            'password_hash'          => password_hash($data['password'], PASSWORD_BCRYPT),
            'reset_token'            => null,
            'reset_token_expires_at' => null,
        ]);

        // Invalidate all existing sessions for security.
        $this->userModel->revokeAllRefreshTokens((int) $user['id']);

        Response::success([], 'Password has been reset successfully. Please log in again.');
    }

    /**
     * GET /api/v1/auth/verify-email?token=...
     */
    public function verifyEmail(Request $request): void
    {
        $token = $request->input('token');

        if (!$token) {
            Response::error('Verification token is required', [], 400);
        }

        $user = $this->userModel->findByVerificationToken($token);

        if (!$user) {
            Response::error('Invalid or already-used verification token', [], 400);
        }

        $this->userModel->update($user['id'], [
            'is_verified'        => 1,
            'verification_token' => null,
        ]);

        Response::success([], 'Email verified successfully. You can now log in.');
    }

    /**
     * POST /api/v1/auth/resend-verification
     * Body: { email }
     */
    public function resendVerification(Request $request): void
    {
        $email = $request->input('email');

        $errors = $this->validate(['email' => $email], ['email' => 'required|email']);
        if (!empty($errors)) {
            Response::validationError($errors);
        }

        $user = $this->userModel->findByEmail(strtolower(trim($email)));

        if ($user && (int) $user['is_verified'] === 0) {
            $token = bin2hex(random_bytes(32));
            $this->userModel->update($user['id'], ['verification_token' => $token]);
            Mailer::sendVerificationEmail($user['email'], $user['full_name'], $token);
        }

        Response::success([], 'If that email exists and is unverified, a new verification email has been sent.');
    }

    /**
     * @return array{0: string, 1: string} [accessToken, refreshToken]
     */
    private function issueTokens(array $user): array
    {
        $claims = [
            'sub'   => (int) $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ];

        $accessToken = Jwt::generateAccessToken($claims);
        $refreshToken = Jwt::generateRefreshToken($claims);

        $ttl = (int) ($_ENV['JWT_REFRESH_TTL'] ?? 1209600);
        $expiresAt = date('Y-m-d H:i:s', time() + $ttl);

        $this->userModel->storeRefreshToken((int) $user['id'], hash('sha256', $refreshToken), $expiresAt);

        return [$accessToken, $refreshToken];
    }

    private function sanitizeUser(array $user): array
    {
        unset($user['password_hash'], $user['verification_token'], $user['reset_token'], $user['reset_token_expires_at'], $user['deleted_at']);
        return $user;
    }
}

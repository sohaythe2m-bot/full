<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * User
 *
 * Represents all platform users (admin, company, job_seeker share this
 * table; role-specific profile data lives in Companies / JobSeekerProfiles).
 */
final class User extends Model
{
    protected string $table = 'users';

    protected array $fillable = [
        'full_name',
        'email',
        'password_hash',
        'role',
        'is_active',
        'is_verified',
        'verification_token',
        'reset_token',
        'reset_token_expires_at',
        'avatar_url',
        'phone',
    ];

    public function findByEmail(string $email): ?array
    {
        return $this->findBy('email', $email);
    }

    public function findByVerificationToken(string $token): ?array
    {
        return $this->findBy('verification_token', $token);
    }

    public function findByResetToken(string $token): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM {$this->table}
             WHERE reset_token = :token
               AND reset_token_expires_at > NOW()
               AND deleted_at IS NULL"
        );
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function emailExists(string $email): bool
    {
        return $this->findByEmail($email) !== null;
    }

    public function storeRefreshToken(int $userId, string $tokenHash, string $expiresAt): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
             VALUES (:user_id, :token_hash, :expires_at, NOW())"
        );
        $stmt->execute([
            'user_id'    => $userId,
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function findValidRefreshToken(string $tokenHash): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM refresh_tokens
             WHERE token_hash = :hash AND revoked_at IS NULL AND expires_at > NOW()"
        );
        $stmt->execute(['hash' => $tokenHash]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public function revokeRefreshToken(string $tokenHash): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = :hash"
        );
        return $stmt->execute(['hash' => $tokenHash]);
    }

    public function revokeAllRefreshTokens(int $userId): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = :user_id AND revoked_at IS NULL"
        );
        return $stmt->execute(['user_id' => $userId]);
    }
}

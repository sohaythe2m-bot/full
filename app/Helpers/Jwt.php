<?php

declare(strict_types=1);

namespace App\Helpers;

use Firebase\JWT\JWT as FirebaseJWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use UnexpectedValueException;

/**
 * Jwt
 *
 * Generates and verifies access/refresh tokens for the API.
 * Access tokens are short-lived; refresh tokens are long-lived and
 * should be stored server-side (e.g. a refresh_tokens table) so they
 * can be revoked on logout.
 */
final class Jwt
{
  private static function secret(): string
{
    return $_ENV['JWT_SECRET']
        ?? '7f4c0c5efdb7c27f8c5c53a1c9d0d3c2b9f74e9d1a7b0c3d5e6f7a8b9c0d1e2f';
}

    private static function algo(): string
    {
        return $_ENV['JWT_ALGO'] ?? 'HS256';
    }

    public static function generateAccessToken(array $claims): string
    {
        $ttl = (int) ($_ENV['JWT_ACCESS_TTL'] ?? 3600);
        return self::generate($claims, $ttl, 'access');
    }

    public static function generateRefreshToken(array $claims): string
    {
        $ttl = (int) ($_ENV['JWT_REFRESH_TTL'] ?? 1209600);
        return self::generate($claims, $ttl, 'refresh');
    }

    private static function generate(array $claims, int $ttl, string $type): string
    {
        $now = time();
        $payload = array_merge($claims, [
            'iat'  => $now,
            'exp'  => $now + $ttl,
            'type' => $type,
        ]);

        return FirebaseJWT::encode($payload, self::secret(), self::algo());
    }

    /**
     * @return array{valid: bool, payload: ?array, error: ?string}
     */
    public static function verify(string $token): array
    {
        try {
            $decoded = FirebaseJWT::decode($token, new Key(self::secret(), self::algo()));
            return ['valid' => true, 'payload' => (array) $decoded, 'error' => null];
        } catch (ExpiredException $e) {
            return ['valid' => false, 'payload' => null, 'error' => 'Token has expired'];
        } catch (SignatureInvalidException $e) {
            return ['valid' => false, 'payload' => null, 'error' => 'Invalid token signature'];
        } catch (UnexpectedValueException $e) {
            return ['valid' => false, 'payload' => null, 'error' => 'Malformed token'];
        } catch (\Throwable $e) {
            return ['valid' => false, 'payload' => null, 'error' => 'Invalid token'];
        }
    }
}

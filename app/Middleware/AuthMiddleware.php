<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Helpers\Jwt;
use App\Models\User;

/**
 * AuthMiddleware
 *
 * Verifies the Bearer JWT on protected routes and attaches the
 * authenticated user's claims to $request->user for downstream use.
 */
final class AuthMiddleware
{
    public function handle(Request $request): void
    {
        $token = $request->bearerToken();

        if (!$token) {
            Response::unauthorized('Missing or malformed Authorization header');
        }

        $result = Jwt::verify($token);

        if (!$result['valid']) {
            Response::unauthorized($result['error'] ?? 'Invalid token');
        }

        $payload = $result['payload'];

        if (($payload['type'] ?? null) !== 'access') {
            Response::unauthorized('Access token required');
        }

        // Confirm the user still exists and is not deactivated/deleted.
        $userModel = new User();
        $user = $userModel->find((int) $payload['sub']);

        if (!$user) {
            Response::unauthorized('User account no longer exists');
        }

        if ((int) ($user['is_active'] ?? 1) === 0) {
            Response::forbidden('Account is deactivated');
        }

        $request->user = [
            'id'    => (int) $user['id'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ];
    }
}

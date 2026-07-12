<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;

/**
 * CorsMiddleware
 *
 * Applied globally in public/index.php before routing so that
 * preflight OPTIONS requests and every response include CORS headers.
 */
final class CorsMiddleware
{
    public function handle(Request $request): void
    {
        $allowed = $_ENV['CORS_ALLOWED_ORIGINS'] ?? '*';
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';

        if ($allowed === '*') {
            header('Access-Control-Allow-Origin: *');
        } else {
            $allowedList = array_map('trim', explode(',', $allowed));
            if (in_array($origin, $allowedList, true)) {
                header("Access-Control-Allow-Origin: {$origin}");
                header('Vary: Origin');
            }
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Allow-Credentials: true');
    }
}

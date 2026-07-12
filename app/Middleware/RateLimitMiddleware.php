<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;

/**
 * RateLimitMiddleware
 *
 * Simple sliding-window rate limiter backed by flat files under
 * /storage. Adequate for a single-server XAMPP deployment; swap for
 * Redis in a multi-server/microservices setup.
 */
final class RateLimitMiddleware
{
    public function handle(Request $request): void
    {
        $max = (int) ($_ENV['RATE_LIMIT_MAX_REQUESTS'] ?? 60);
        $window = (int) ($_ENV['RATE_LIMIT_WINDOW_SECONDS'] ?? 60);

        $key = 'rl_' . md5($request->ip());
        $dir = dirname(__DIR__, 2) . '/storage/ratelimit';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $file = $dir . '/' . $key . '.json';

        $now = time();
        $data = ['count' => 0, 'window_start' => $now];

        if (is_file($file)) {
            $contents = json_decode((string) file_get_contents($file), true);
            if (is_array($contents)) {
                $data = $contents;
            }
        }

        if ($now - $data['window_start'] >= $window) {
            $data = ['count' => 0, 'window_start' => $now];
        }

        $data['count']++;

        file_put_contents($file, json_encode($data));

        if ($data['count'] > $max) {
            Response::tooManyRequests('Rate limit exceeded. Please try again shortly.');
        }
    }
}

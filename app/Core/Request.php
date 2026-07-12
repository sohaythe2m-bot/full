<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Request
 *
 * Wraps the incoming HTTP request: parsed JSON body, query params,
 * files, headers, and the authenticated user (set by AuthMiddleware).
 *
 * IMPORTANT: php://input can only be read once per HTTP request under
 * most SAPIs (Apache/mod_php, PHP-FPM). Because index.php constructs a
 * throwaway Request for CorsMiddleware and the Router constructs another
 * one when dispatching, the raw body must be cached statically the first
 * time it's read — otherwise the second Request ends up with an empty
 * body and every POST/PUT endpoint that relies on JSON input (register,
 * login, profile update, etc.) fails validation even with a correct
 * request body.
 */
final class Request
{
    private array $body;
    private array $query;
    private array $files;
    /** @var array<string,mixed>|null Set by AuthMiddleware after JWT verification */
    public ?array $user = null;

    /** @var string|null Cached raw php://input contents, shared across all instances in this request lifecycle */
    private static ?string $rawInputCache = null;

    public function __construct()
    {
        $this->query = $_GET ?? [];
        $this->files = $_FILES ?? [];

        $raw = self::rawInput();
        $decoded = [];

        if ($raw !== '') {
            $decoded = json_decode($raw, true) ?? [];
        }

        // Merge form-encoded POST (for multipart/form-data with file uploads)
        $this->body = array_merge($_POST ?? [], is_array($decoded) ? $decoded : []);
    }

    private static function rawInput(): string
    {
        if (self::$rawInputCache === null) {
            self::$rawInputCache = file_get_contents('php://input') ?: '';
        }
        return self::$rawInputCache;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $this->query[$key] ?? $default;
    }

    public function all(): array
    {
        return array_merge($this->query, $this->body);
    }

    public function only(array $keys): array
    {
        return array_intersect_key($this->all(), array_flip($keys));
    }

    public function file(string $key): ?array
    {
        return $this->files[$key] ?? null;
    }

    public function hasFile(string $key): bool
    {
        return isset($this->files[$key]) && $this->files[$key]['error'] === UPLOAD_ERR_OK;
    }

    public function method(): string
    {
        return $_SERVER['REQUEST_METHOD'] ?? 'GET';
    }

    public function header(string $name): ?string
    {
        $normalized = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (isset($_SERVER[$normalized])) {
            return $_SERVER[$normalized];
        }
        // Common case: Authorization header sometimes exposed differently under Apache.
        if (strtolower($name) === 'authorization') {
            if (function_exists('apache_request_headers')) {
                $headers = apache_request_headers();
                foreach ($headers as $k => $v) {
                    if (strtolower($k) === 'authorization') {
                        return $v;
                    }
                }
            }
            return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
        }
        return null;
    }

    public function bearerToken(): ?string
    {
        $header = $this->header('Authorization');
        if ($header && preg_match('/Bearer\s+(.*)$/i', $header, $matches)) {
            return trim($matches[1]);
        }
        return null;
    }

    public function ip(): string
    {
        return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
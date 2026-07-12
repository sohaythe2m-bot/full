<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Response
 *
 * Enforces the mandatory API response envelope for every endpoint:
 *   success: { status, message, data }
 *   error:   { status, message, errors }
 */
final class Response
{
    public static function success(mixed $data = [], string $message = 'Operation completed successfully', int $code = 200): never
    {
        self::send($code, [
            'status'  => 'success',
            'message' => $message,
            'data'    => $data,
        ]);
    }

    public static function error(string $message = 'An error occurred', array $errors = [], int $code = 400): never
    {
        self::send($code, [
            'status'  => 'error',
            'message' => $message,
            'errors'  => $errors,
        ]);
    }

    public static function unauthorized(string $message = 'Unauthorized'): never
    {
        self::error($message, [], 401);
    }

    public static function forbidden(string $message = 'Forbidden'): never
    {
        self::error($message, [], 403);
    }

    public static function notFound(string $message = 'Resource not found'): never
    {
        self::error($message, [], 404);
    }

    public static function validationError(array $errors, string $message = 'Validation failed'): never
    {
        self::error($message, $errors, 422);
    }

    public static function serverError(string $message = 'Internal server error'): never
    {
        self::error($message, [], 500);
    }

    public static function tooManyRequests(string $message = 'Too many requests'): never
    {
        self::error($message, [], 429);
    }

    private static function send(int $code, array $payload): never
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

<?php
/**
 * ================================================================
 *  Core Helper Functions
 * ================================================================
 *  Small, single-purpose, reusable functions used across the app.
 *  Keeping these separate from business logic (AIService) keeps
 *  the codebase testable and easy to reason about.
 * ================================================================
 */

declare(strict_types=1);

/**
 * Send a standardized JSON response and terminate execution.
 *
 * @param array $payload   Data to encode.
 * @param int   $statusCode HTTP status code.
 */
function jsonResponse(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Sanitize raw user input for safe storage/echoing.
 * Strips tags and trims whitespace. Encoding for HTML output
 * happens separately at render time (defense in depth).
 *
 * @param string $input
 * @return string
 */
function sanitizeInput(string $input): string
{
    $input = trim($input);
    $input = strip_tags($input);
    // Normalize excessive whitespace/newlines
    $input = preg_replace('/\s+/', ' ', $input) ?? $input;

    return $input;
}

/**
 * Validate an incoming chat message.
 *
 * @param string $message
 * @param int    $maxLength
 * @return array{valid: bool, error: string|null}
 */
function validateMessage(string $message, int $maxLength = 2000): array
{
    if ($message === '') {
        return ['valid' => false, 'error' => 'Message cannot be empty.'];
    }

    if (mb_strlen($message) > $maxLength) {
        return [
            'valid' => false,
            'error' => "Message is too long. Limit is {$maxLength} characters.",
        ];
    }

    return ['valid' => true, 'error' => null];
}

/**
 * Log an error to the application error log with context.
 *
 * @param string $message
 * @param array  $context
 */
function logAppError(string $message, array $context = []): void
{
    $entry = sprintf(
        '[%s] %s %s%s',
        date('Y-m-d H:i:s'),
        $message,
        !empty($context) ? json_encode($context) : '',
        PHP_EOL
    );

    $logFile = BASE_PATH . '/storage/error.log';
    error_log($entry, 3, $logFile);
}

/**
 * Generate a simple unique message ID (for front-end DOM tracking).
 *
 * @return string
 */
function generateMessageId(): string
{
    return 'msg_' . bin2hex(random_bytes(6));
}

/**
 * Ensure the request method matches an expected verb, otherwise
 * short-circuit with a 405 JSON error.
 *
 * @param string $expected
 */
function requireMethod(string $expected): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $expected) {
        jsonResponse([
            'success' => false,
            'error'   => "Method not allowed. Expected {$expected}.",
        ], 405);
    }
}

/**
 * Read and decode a JSON request body safely.
 *
 * @return array
 */
function readJsonBody(): array
{
    $raw = file_get_contents('php://input');

    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);

    return is_array($decoded) ? $decoded : [];
}

/**
 * Save a base64-encoded PNG/JPEG (returned by the AI image-edit provider)
 * to disk and return its web-relative path, so we never store big binary
 * blobs inside the `messages` TEXT column.
 *
 * @param string $base64 Raw base64 payload (no "data:" prefix).
 * @param string $mime   e.g. "image/png".
 * @return string Relative path such as "uploads/generated/xxxx.png".
 */
function saveGeneratedImage(string $base64, string $mime): string
{
    $dir = BASE_PATH . '/uploads/generated';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $ext = str_contains($mime, 'jpeg') || str_contains($mime, 'jpg') ? 'jpg' : 'png';
    $name = bin2hex(random_bytes(12)) . '.' . $ext;

    file_put_contents($dir . '/' . $name, base64_decode($base64));

    return 'uploads/generated/' . $name;
}

/**
 * ================================================================
 *  Auth / CSRF helpers
 * ================================================================
 */

/** Returns (and lazily creates) the CSRF token for this session. */
function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/** Renders a hidden input carrying the current CSRF token. */
function csrfField(): string
{
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(csrfToken()) . '">';
}

/** Verifies a submitted CSRF token, halting the request on mismatch. */
function verifyCsrf(?string $token): void
{
    if (!$token || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(419);
        die('Your session has expired. Please refresh the page and try again.');
    }
}

/** Stores a one-time flash message to render after a redirect. */
function flash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

/** Reads and clears the current flash message, if any. */
function getFlash(): ?array
{
    if (empty($_SESSION['flash'])) {
        return null;
    }
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}

/** Builds the branded HTML body for a password-reset email. */
function renderResetPasswordEmail(string $name, string $resetLink): string
{
    $safeName = htmlspecialchars($name);
    $appName  = htmlspecialchars(APP_NAME);

    return <<<HTML
    <div style="font-family: 'Poppins', Arial, sans-serif; background:#0F172A; padding:32px; color:#F1F5F9;">
        <div style="max-width:480px; margin:0 auto; background:#1E293B; border-radius:16px; padding:32px; border:1px solid rgba(148,163,184,0.15);">
            <h2 style="margin:0 0 16px; color:#F1F5F9;">Reset your password</h2>
            <p style="color:#94A3B8; line-height:1.6;">Hi {$safeName},</p>
            <p style="color:#94A3B8; line-height:1.6;">
                We received a request to reset the password for your {$appName} account.
                Click the button below to choose a new password. This link expires in 60 minutes.
            </p>
            <p style="text-align:center; margin:32px 0;">
                <a href="{$resetLink}" style="background:linear-gradient(135deg,#4F46E5,#38BDF8); color:#fff; text-decoration:none; padding:12px 28px; border-radius:999px; font-weight:600; display:inline-block;">
                    Reset Password
                </a>
            </p>
            <p style="color:#94A3B8; line-height:1.6; font-size:13px;">
                If you didn't request this, you can safely ignore this email — your password will remain unchanged.
            </p>
            <p style="color:#64748B; font-size:12px; margin-top:24px;">{$appName}</p>
        </div>
    </div>
    HTML;
}

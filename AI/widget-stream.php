<?php

/**
 * ================================================================
 *  widget-stream.php — Guest Chat Endpoint for the Floating Widget
 * ================================================================
 *  Used by the floating AI chat bubble embedded on the main FLTH
 *  marketing site (frontend/). Unlike stream.php, this endpoint:
 *
 *    - Does NOT require a logged-in FLTH-AI account (guest mode).
 *    - Does NOT persist anything to the chat database — history is
 *      kept client-side (sessionStorage) and sent with every request.
 *    - Is rate-limited per IP to keep it from being abused as a
 *      free, anonymous relay to the underlying AI provider.
 *
 *  Same SSE event contract as stream.php:
 *    event: chunk   data: {"text": "..."}   (repeated)
 *    event: done    data: {"provider": "...", "demo": bool, "timestamp": "..."}
 *    event: error   data: {"error": "..."}
 * ================================================================
 */

declare(strict_types=1);


// Deliberately NOT requiring bootstrap.php: bootstrap.php eagerly opens a
// database connection (via `new Auth($config)`), but this guest endpoint
// never touches the database. Loading only what's actually needed keeps
// the widget working even if the chat DB is briefly unreachable.
$config = require __DIR__ . '/config.php';
require __DIR__ . '/functions.php';
require __DIR__ . '/AIService.php';
require __DIR__ . '/WidgetRateLimiter.php';

// ---------------------------------------------------------------
// 1. CORS — guest endpoint, no cookies/credentials involved, so a
//    reflected-origin allow header is safe. Restrict to POST/OPTIONS.
// ---------------------------------------------------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

requireMethod('POST');

// ---------------------------------------------------------------
// 2. Per-IP rate limiting (file-backed, no DB dependency).
// ---------------------------------------------------------------
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$clientIp = trim(explode(',', $clientIp)[0]);

$limiter = new WidgetRateLimiter(BASE_PATH . '/storage/widget-ratelimit');

if (!$limiter->allow($clientIp, 20, 300)) { // 20 messages / 5 minutes / IP
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error'   => 'Too many messages. Please wait a moment before trying again.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------------------------------------------------------------
// 3. SSE headers — identical setup to stream.php.
// ---------------------------------------------------------------
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');
header('Connection: keep-alive');

if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}
ini_set('zlib.output_compression', '0');
ini_set('output_buffering', 'off');
ini_set('implicit_flush', '1');

while (ob_get_level() > 0) {
    ob_end_flush();
}
ob_implicit_flush(true);
set_time_limit(0);

function sseSend(string $event, array $data): void
{
    echo "event: {$event}\n";
    echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";

    if (ob_get_level() > 0) {
        @ob_flush();
    }
    @flush();
}

try {
    $body = readJsonBody();

    $rawMessage = $body['message'] ?? '';
    $history    = $body['history'] ?? [];

    if (!is_string($rawMessage)) {
        sseSend('error', ['error' => 'Invalid message format.']);
        exit;
    }

    if (!is_array($history)) {
        $history = [];
    }

    $message = sanitizeInput($rawMessage);
    $maxLen  = $config['ai']['max_message_length'] ?? 2000;

    $validation = validateMessage($message, $maxLen);

    if (!$validation['valid']) {
        sseSend('error', ['error' => $validation['error']]);
        exit;
    }

    // Cap history sent by the client defensively — mirrors stream.php.
    $cleanHistory = [];
    foreach (array_slice($history, -10) as $turn) {
        if (!isset($turn['role'], $turn['content']) || !is_string($turn['content'])) {
            continue;
        }
        $cleanHistory[] = [
            'role'    => $turn['role'] === 'user' ? 'user' : 'assistant',
            'content' => sanitizeInput((string) $turn['content']),
        ];
    }

    $aiService = new AIService($config);

    try {
        $result = $aiService->streamResponse($message, $cleanHistory, function (string $delta) {
            sseSend('chunk', ['text' => $delta]);
        });
    } catch (Throwable $aiError) {
        logAppError('Widget streaming failed: ' . $aiError->getMessage());
        sseSend('error', ['error' => 'AI provider temporarily unavailable.']);
        exit;
    }

    sseSend('done', [
        'provider'  => $result['provider'],
        'demo'      => $result['demo'],
        'timestamp' => date(DATE_ATOM),
    ]);
} catch (Throwable $error) {
    logAppError('Widget stream request failed: ' . $error->getMessage());

    $isDev = ($config['app']['env'] ?? 'production') !== 'production';

    sseSend('error', [
        'error' => $isDev ? $error->getMessage() : 'AI provider temporarily unavailable.',
    ]);
}

exit;

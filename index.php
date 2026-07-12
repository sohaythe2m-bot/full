<?php

declare(strict_types=1);

use App\Core\Router;
use App\Middleware\CorsMiddleware;

require_once __DIR__ . '/vendor/autoload.php';

/**
 * =========================================================
 * HARD DEBUG MODE
 * =========================================================
 */
ini_set('display_errors', '1');
error_reporting(E_ALL);

function debug_boot(string $msg): void {
    error_log("[BOOT] " . $msg);
}

debug_boot("STEP 1 - index loaded");

// ---------------------------------------------------------
// Load config
// ---------------------------------------------------------
$config = require __DIR__ . '/config/env.php';
$_ENV = array_merge($_ENV ?? [], $config);

// ---------------------------------------------------------
// Error handler (JSON SAFE)
// ---------------------------------------------------------
$debug = (bool)($_ENV['APP_DEBUG'] ?? true);

set_exception_handler(function (Throwable $e) use ($debug) {

    if (ob_get_length()) ob_clean();

    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'file'    => $debug ? $e->getFile() : null,
        'line'    => $debug ? $e->getLine() : null,
        'trace'   => $debug ? explode("\n", $e->getTraceAsString()) : [],
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

    exit;
});

register_shutdown_function(function () {

    $error = error_get_last();

    if ($error) {

        if (ob_get_length()) ob_clean();

        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode([
            'status'  => 'fatal_error',
            'message' => $error['message'],
            'file'    => $error['file'],
            'line'    => $error['line'],
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        exit;
    }
});

debug_boot("STEP 2 - error handlers loaded");

// ---------------------------------------------------------
// CORS
// ---------------------------------------------------------
(new CorsMiddleware())->handle(new \App\Core\Request());

debug_boot("STEP 3 - CORS done");

// ---------------------------------------------------------
// Router
// ---------------------------------------------------------
$router = new Router();

debug_boot("STEP 4 - router created");

// ---------------------------------------------------------
// Load routes (IMPORTANT)
// ---------------------------------------------------------
$routesFile = __DIR__ . '/routes/api.php';

if (!file_exists($routesFile)) {
    throw new Exception("routes/api.php not found");
}

require $routesFile;

debug_boot("STEP 5 - routes loaded");

// ---------------------------------------------------------
// Request URI parsing (FIXED ORDER)
// ---------------------------------------------------------
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH) ?? '/';
$path = '/' . trim($path, '/');

debug_boot("STEP 6 - request: " . $path);

// ---------------------------------------------------------
// DISPATCH (ONLY ONCE)
// ---------------------------------------------------------
$router->dispatch($_SERVER['REQUEST_METHOD'], $path);

debug_boot("STEP 7 - dispatched");
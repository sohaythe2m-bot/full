<?php

declare(strict_types=1);

error_reporting(E_ALL);

ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/storage/error.log');

/*
|--------------------------------------------------------------------------
| Load .env
|--------------------------------------------------------------------------
*/

if (file_exists(__DIR__ . '/.env')) {

    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {

        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        [$name, $value] = array_pad(explode('=', $line, 2), 2, '');

        $name  = trim($name);
        $value = trim($value);

        // Remove surrounding quotes
        $value = trim($value, "\"'");

        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;

        putenv("$name=$value");
    }
} else {

    error_log('.env file not found: ' . __DIR__ . '/.env');
}

define(
    'APP_NAME',
    $_ENV['APP_NAME'] ?? (getenv('APP_NAME') ?: 'FLTH AI Assistant')
);

define('APP_VERSION', '1.1.0');

define(
    'APP_ENV',
    $_ENV['APP_ENV'] ?? (getenv('APP_ENV') ?: 'production')
);

define('BASE_PATH', __DIR__);

/*
|--------------------------------------------------------------------------
| Debug (احذفهم بعد التأكد أن كل شيء يعمل)
|--------------------------------------------------------------------------
*/

error_log('AI_PROVIDER = ' . ($_ENV['AI_PROVIDER'] ?? 'NOT FOUND'));
error_log('OLLAMA_KEY = ' . (!empty($_ENV['OLLAMA_API_KEY']) ? 'FOUND' : 'NOT FOUND'));
error_log('OLLAMA_MODEL = ' . ($_ENV['OLLAMA_MODEL'] ?? 'NOT FOUND'));
error_log('OLLAMA_ENDPOINT = ' . ($_ENV['OLLAMA_ENDPOINT'] ?? 'NOT FOUND'));

return [

    /*
    |--------------------------------------------------------------------------
    | Application
    |--------------------------------------------------------------------------
    */

    'app' => [

        'name'    => APP_NAME,
        'version' => APP_VERSION,
        'env'     => APP_ENV,
        'url'     => $_ENV['APP_URL'] ?? getenv('APP_URL'),

    ],

    /*
    |--------------------------------------------------------------------------
    | Database
    |--------------------------------------------------------------------------
    */

    'db' => [

        'host' => $_ENV['DB_HOST'] ?? getenv('DB_HOST'),
        'port' => $_ENV['DB_PORT'] ?? getenv('DB_PORT'),
        'name' => $_ENV['DB_NAME'] ?? getenv('DB_NAME'),
        'user' => $_ENV['DB_USER'] ?? getenv('DB_USER'),
        'pass' => $_ENV['DB_PASS'] ?? getenv('DB_PASS'),

    ],

    /*
    |--------------------------------------------------------------------------
    | Mail
    |--------------------------------------------------------------------------
    */

    'mail' => [

        'mailer' => 'smtp',

        'host' => 'smtp.gmail.com',
        'port' => 587,

        // يفضل نقل هذه القيم إلى ملف .env
        'username' => 'haythemmohamed478@gmail.com',
        'password' => 'ryqi luea zjuw moni',

        'encryption' => 'tls',

        'from_address' => 'haythemmohamed478@gmail.com',
        'from_name'    => 'FLTH AI Assistant',

    ],

    /*
    |--------------------------------------------------------------------------
    | AI
    |--------------------------------------------------------------------------
    */

    'ai' => [

        'active_provider' => strtolower(
            $_ENV['AI_PROVIDER'] ?? (getenv('AI_PROVIDER') ?: 'ollama')
        ),

        'provider_priority' => [
            'ollama',
            'gemini',
            'openai',
            'claude',
        ],

        'providers' => [

            'ollama' => [

                'api_key' => $_ENV['OLLAMA_API_KEY']
                    ?? getenv('OLLAMA_API_KEY')
                    ?? '',

                'endpoint' => $_ENV['OLLAMA_ENDPOINT']
                    ?? getenv('OLLAMA_ENDPOINT')
                    ?? 'https://your-ollama-server.com/api/chat',

                'model' => $_ENV['OLLAMA_MODEL']
                    ?? getenv('OLLAMA_MODEL')
                    ?? 'minimax-m3:cloud',

            ],

            // 'gemini' => [
            //
            //     'api_key' => $_ENV['GEMINI_API_KEY']
            //         ?? getenv('GEMINI_API_KEY')
            //         ?? '',
            //
            //     'endpoint' => $_ENV['GEMINI_ENDPOINT']
            //         ?? getenv('GEMINI_ENDPOINT')
            //         ?? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
            //
            //     'model' => $_ENV['GEMINI_MODEL']
            //         ?? getenv('GEMINI_MODEL')
            //         ?? 'gemini-1.5-flash',
            //
            // ],

            // 'openai' => [
            //
            //     'api_key' => $_ENV['OPENAI_API_KEY']
            //         ?? getenv('OPENAI_API_KEY')
            //         ?? '',
            //
            //     'endpoint' => $_ENV['OPENAI_ENDPOINT']
            //         ?? getenv('OPENAI_ENDPOINT')
            //         ?? 'https://api.openai.com/v1/chat/completions',
            //
            //     'model' => $_ENV['OPENAI_MODEL']
            //         ?? getenv('OPENAI_MODEL')
            //         ?? 'gpt-4o-mini',
            //
            //     'image_model' => $_ENV['OPENAI_IMAGE_MODEL']
            //         ?? getenv('OPENAI_IMAGE_MODEL')
            //         ?? 'gpt-image-1',
            //
            //     'images_edit_endpoint' => $_ENV['OPENAI_IMAGES_EDIT_ENDPOINT']
            //         ?? getenv('OPENAI_IMAGES_EDIT_ENDPOINT')
            //         ?? 'https://api.openai.com/v1/images/edits',
            //
            // ],

            // 'claude' => [
            //
            //     'api_key' => $_ENV['CLAUDE_API_KEY']
            //         ?? getenv('CLAUDE_API_KEY')
            //         ?? '',
            //
            //     'endpoint' => $_ENV['CLAUDE_ENDPOINT']
            //         ?? getenv('CLAUDE_ENDPOINT')
            //         ?? 'https://api.anthropic.com/v1/messages',
            //
            //     'model' => $_ENV['CLAUDE_MODEL']
            //         ?? getenv('CLAUDE_MODEL')
            //         ?? 'claude-3-haiku-20240307',
            //
            // ],

        ],

        'max_message_length' => 2000,
        'request_timeout'    => 40,

    ],

];
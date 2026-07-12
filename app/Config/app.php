<?php

declare(strict_types=1);

return [
    'app' => [
        'name'  => $_ENV['APP_NAME'] ?? 'FLTH',
        'env'   => $_ENV['APP_ENV'] ?? 'local',
        'debug' => filter_var($_ENV['APP_DEBUG'] ?? 'false', FILTER_VALIDATE_BOOLEAN),
        'url'   => $_ENV['APP_URL'] ?? 'http://localhost',
    ],
    'upload' => [
        'max_size_bytes' => (int) ($_ENV['MAX_UPLOAD_MB'] ?? 10) * 1024 * 1024,
        'allowed_image_ext'    => ['jpg', 'jpeg', 'png', 'webp'],
        'allowed_document_ext' => ['pdf'],
    ],
];

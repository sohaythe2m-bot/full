<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * FileUpload
 *
 * Validates and stores uploaded files (extension, MIME sniffing, size),
 * writes them under /uploads/{subfolder} with a random filename (never
 * trusts the client-provided filename), and returns a public URL.
 */
final class FileUpload
{
    private const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
    private const IMAGE_EXT  = ['jpg', 'jpeg', 'png', 'webp'];
    private const PDF_MIME   = ['application/pdf'];
    private const PDF_EXT    = ['pdf'];

    /**
     * @return array{ok: bool, url: ?string, error: ?string}
     */
    public static function storeImage(array $file, string $subfolder): array
    {
        return self::store($file, $subfolder, self::IMAGE_EXT, self::IMAGE_MIME);
    }

    /**
     * @return array{ok: bool, url: ?string, error: ?string}
     */
    public static function storePdf(array $file, string $subfolder): array
    {
        return self::store($file, $subfolder, self::PDF_EXT, self::PDF_MIME);
    }

    private static function store(array $file, string $subfolder, array $allowedExt, array $allowedMime): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return ['ok' => false, 'url' => null, 'error' => 'Upload failed (code ' . ($file['error'] ?? 'unknown') . ')'];
        }

        $maxBytes = (int) ($_ENV['MAX_UPLOAD_MB'] ?? 10) * 1024 * 1024;
        if (($file['size'] ?? 0) > $maxBytes) {
            return ['ok' => false, 'url' => null, 'error' => 'File exceeds the maximum allowed size'];
        }

        $originalExt = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
        if (!in_array($originalExt, $allowedExt, true)) {
            return ['ok' => false, 'url' => null, 'error' => 'File type not allowed'];
        }

        // Verify actual content type, not just the client-supplied one.
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $realMime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($realMime, $allowedMime, true)) {
            return ['ok' => false, 'url' => null, 'error' => 'File content does not match an allowed type'];
        }

        // Reject files with double extensions / embedded PHP tags disguised as images or PDFs.
        if (!self::passesContentSafetyCheck($file['tmp_name'])) {
            return ['ok' => false, 'url' => null, 'error' => 'File failed content safety validation'];
        }

        $uploadsRoot = dirname(__DIR__, 2) . '/uploads/' . trim($subfolder, '/');
        if (!is_dir($uploadsRoot)) {
            mkdir($uploadsRoot, 0775, true);
        }

        $filename = bin2hex(random_bytes(16)) . '.' . $originalExt;
        $destination = $uploadsRoot . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            return ['ok' => false, 'url' => null, 'error' => 'Failed to save uploaded file'];
        }

        $baseUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
        // APP_URL points at /public, uploads live one level up alongside /public.
        $publicUrl = preg_replace('#/public$#', '', $baseUrl) . '/uploads/' . trim($subfolder, '/') . '/' . $filename;

        return ['ok' => true, 'url' => $publicUrl, 'error' => null];
    }

    private static function passesContentSafetyCheck(string $tmpPath): bool
    {
        $contents = file_get_contents($tmpPath, false, null, 0, 4096);
        if ($contents === false) {
            return false;
        }
        // Reject anything containing a PHP opening tag in the first bytes of the file.
        return !str_contains($contents, '<?php') && !str_contains($contents, '<?=');
    }
}

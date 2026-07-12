<?php

declare(strict_types=1);

/**
 * ================================================================
 *  WidgetRateLimiter — simple file-backed per-IP rate limiting
 * ================================================================
 *  No database dependency on purpose: the widget endpoint must keep
 *  working even if the chat DB is briefly unavailable. One small
 *  JSON file per IP, storing a rolling list of request timestamps.
 * ================================================================
 */
final class WidgetRateLimiter
{
    private string $dir;

    public function __construct(string $dir)
    {
        $this->dir = $dir;

        if (!is_dir($this->dir)) {
            @mkdir($this->dir, 0755, true);
        }
    }

    /**
     * @param string $key        Identifier to rate-limit on (e.g. IP address).
     * @param int    $maxHits    Max allowed requests within the window.
     * @param int    $windowSecs Rolling window length, in seconds.
     */
    public function allow(string $key, int $maxHits, int $windowSecs): bool
    {
        $safeKey = preg_replace('/[^a-zA-Z0-9_.:-]/', '_', $key) ?: 'unknown';
        $file = $this->dir . '/' . $safeKey . '.json';

        $handle = @fopen($file, 'c+');
        if ($handle === false) {
            // If we can't open the lock file, fail open rather than
            // breaking the widget for everyone due to a permissions issue.
            return true;
        }

        flock($handle, LOCK_EX);

        $raw = stream_get_contents($handle);
        $timestamps = [];
        if ($raw !== false && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $timestamps = $decoded;
            }
        }

        $now = time();
        $timestamps = array_values(array_filter(
            $timestamps,
            static fn ($ts) => is_int($ts) && ($now - $ts) < $windowSecs
        ));

        $allowed = count($timestamps) < $maxHits;

        if ($allowed) {
            $timestamps[] = $now;
        }

        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($timestamps));
        fflush($handle);
        flock($handle, LOCK_UN);
        fclose($handle);

        return $allowed;
    }
}

<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Mailer
 *
 * Minimal mail helper. Uses PHP's mail() by default; swap the send()
 * body for PHPMailer/SMTP in production (credentials already provided
 * via .env MAIL_* vars).
 */
final class Mailer
{
    public static function sendVerificationEmail(string $toEmail, string $toName, string $token): bool
    {
        $verifyUrl = rtrim($_ENV['APP_URL'] ?? '', '/') . '/api/v1/auth/verify-email?token=' . urlencode($token);
        $subject = 'Verify your FLTH account';
        $body = "Hi {$toName},\n\nPlease verify your email by visiting:\n{$verifyUrl}\n\nIf you didn't create this account, ignore this email.";

        return self::send($toEmail, $subject, $body);
    }

    public static function sendPasswordResetEmail(string $toEmail, string $toName, string $token): bool
    {
        $resetUrl = rtrim($_ENV['APP_URL'] ?? '', '/') . '/reset-password?token=' . urlencode($token);
        $subject = 'Reset your FLTH password';
        $body = "Hi {$toName},\n\nReset your password using the link below (valid for 1 hour):\n{$resetUrl}\n\nIf you didn't request this, ignore this email.";

        return self::send($toEmail, $subject, $body);
    }

    private static function send(string $to, string $subject, string $body): bool
    {
        $from = $_ENV['MAIL_FROM'] ?? 'noreply@flth.com';
        $fromName = $_ENV['MAIL_FROM_NAME'] ?? 'FLTH';

        $headers = "From: {$fromName} <{$from}>\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

        // In local/dev, log instead of failing silently when no MTA is configured.
        if (($_ENV['APP_ENV'] ?? 'local') === 'local') {
            error_log("[MAIL] To: {$to} | Subject: {$subject}\n{$body}");
            return true;
        }

        return @mail($to, $subject, $body, $headers);
    }
}

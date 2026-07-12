<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Validator
 *
 * Minimal rule-based validator. Usage:
 *   $errors = Validator::make($data, [
 *       'email' => 'required|email',
 *       'password' => 'required|min:8',
 *   ]);
 *   if (!empty($errors)) { Response::validationError($errors); }
 *
 * Returns an associative array of field => [messages]. Empty array = valid.
 */
final class Validator
{
    public static function make(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $ruleString) {
            $rulesArray = explode('|', $ruleString);
            $value = $data[$field] ?? null;

            foreach ($rulesArray as $rule) {
                $params = [];
                if (str_contains($rule, ':')) {
                    [$rule, $paramStr] = explode(':', $rule, 2);
                    $params = explode(',', $paramStr);
                }

                $error = self::applyRule($field, $value, $rule, $params, $data);
                if ($error !== null) {
                    $errors[$field][] = $error;
                }
            }
        }

        return $errors;
    }

    private static function applyRule(string $field, mixed $value, string $rule, array $params, array $data): ?string
    {
        switch ($rule) {
            case 'required':
                if ($value === null || $value === '') {
                    return "{$field} is required";
                }
                break;

            case 'email':
                if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    return "{$field} must be a valid email address";
                }
                break;

            case 'min':
                if ($value !== null && is_string($value) && mb_strlen($value) < (int) $params[0]) {
                    return "{$field} must be at least {$params[0]} characters";
                }
                if ($value !== null && is_numeric($value) && (float) $value < (float) $params[0]) {
                    return "{$field} must be at least {$params[0]}";
                }
                break;

            case 'max':
                if ($value !== null && is_string($value) && mb_strlen($value) > (int) $params[0]) {
                    return "{$field} must not exceed {$params[0]} characters";
                }
                break;

            case 'numeric':
                if ($value !== null && $value !== '' && !is_numeric($value)) {
                    return "{$field} must be numeric";
                }
                break;

            case 'integer':
                if ($value !== null && $value !== '' && filter_var($value, FILTER_VALIDATE_INT) === false) {
                    return "{$field} must be an integer";
                }
                break;

            case 'boolean':
                if ($value !== null && !in_array($value, [true, false, 0, 1, '0', '1'], true)) {
                    return "{$field} must be a boolean";
                }
                break;

            case 'in':
                if ($value !== null && $value !== '' && !in_array((string) $value, $params, true)) {
                    return "{$field} must be one of: " . implode(', ', $params);
                }
                break;

            case 'confirmed':
                $confirmField = $field . '_confirmation';
                if (($data[$confirmField] ?? null) !== $value) {
                    return "{$field} confirmation does not match";
                }
                break;

            case 'date':
                if ($value !== null && $value !== '' && strtotime((string) $value) === false) {
                    return "{$field} must be a valid date";
                }
                break;

            case 'url':
                if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_URL)) {
                    return "{$field} must be a valid URL";
                }
                break;

            case 'array':
                if ($value !== null && !is_array($value)) {
                    return "{$field} must be an array";
                }
                break;
        }

        return null;
    }
}

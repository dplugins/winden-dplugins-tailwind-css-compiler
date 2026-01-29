<?php

namespace Winden\App\Helpers;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Cache Validator for Winden plugin
 *
 * Handles validation and auto-fixing of corrupted PostCSS cache
 * from plugin migration. Centralizes logic used in SaveContent.php
 * and GetContent.php.
 */
class CacheValidator
{
    /**
     * Check if cache contains old PostCSS errors from plugin migration
     *
     * @param array|null $cache The cache data to validate
     * @return bool True if cache has old PostCSS errors that should be auto-fixed
     */
    public static function hasOldPostCSSErrors(?array $cache): bool
    {
        if (!$cache || !isset($cache['errors'])) {
            return false;
        }

        $errors = is_string($cache['errors'])
            ? json_decode($cache['errors'], true)
            : $cache['errors'];

        if (!is_array($errors)) {
            return false;
        }

        foreach ($errors as $error) {
            if (self::isOldPostCSSError($error)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a single error is an old PostCSS error (not SCSS)
     *
     * @param array $error Error array with 'message' key
     * @return bool True if this is an old PostCSS error to auto-fix
     */
    public static function isOldPostCSSError(array $error): bool
    {
        $message = $error['message'] ?? '';

        // Only auto-fix OLD PostCSS errors from plugin migration
        $isOldPostCSSError = (
            stripos($message, 'postcss') !== false ||
            stripos($message, 'Missed semicolon') !== false ||
            (stripos($message, 'Unexpected }') !== false && stripos($message, 'scss') === false)
        );

        // Skip SCSS compilation errors - these are legitimate and should be shown
        $isSCSSError = (
            stripos($message, 'SCSS compilation failed') !== false ||
            stripos($message, 'expected selector') !== false ||
            stripos($message, 'Dart Sass') !== false
        );

        return $isOldPostCSSError && !$isSCSSError;
    }

    /**
     * Clear corrupted cache and output file
     *
     * @param string|null $logMessage Optional message to log (only if WP_DEBUG)
     * @return void
     */
    public static function clearCorruptedCache(?string $logMessage = null): void
    {
        if ($logMessage && defined('WP_DEBUG') && WP_DEBUG) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug-only logging
            error_log('[Winden Auto-Fix] ' . $logMessage);
        }

        // Clear corrupted cache option
        delete_option('winden_dplugins_cache');

        // Delete output.css file if it exists
        $upload_dir = wp_upload_dir();
        $output_file = $upload_dir['basedir'] . '/winden/output.css';
        if (file_exists($output_file)) {
            wp_delete_file($output_file);
        }
    }

    /**
     * Validate and auto-fix cache if needed
     *
     * Combines hasOldPostCSSErrors check with clearCorruptedCache action.
     *
     * @param array|null $cache The cache data to validate
     * @param string $context Context for logging (e.g., 'save', 'fetch')
     * @return bool True if cache was cleared, false if cache is valid
     */
    public static function validateAndFix(?array $cache, string $context = 'unknown'): bool
    {
        if (!self::hasOldPostCSSErrors($cache)) {
            return false;
        }

        // Get error message for logging
        $errors = is_string($cache['errors'])
            ? json_decode($cache['errors'], true)
            : $cache['errors'];

        $message = '';
        if (is_array($errors) && !empty($errors[0]['message'])) {
            $message = $errors[0]['message'];
        }

        self::clearCorruptedCache(
            "Clearing OLD corrupted cache during {$context}: {$message}"
        );

        return true;
    }
}

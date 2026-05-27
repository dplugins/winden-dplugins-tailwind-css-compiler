<?php

namespace Winden\App\Helpers;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Data Converter Helper for Winden plugin
 *
 * Provides safe data conversion utilities including unserialization
 * with error handling. Centralizes the pattern used in ClassCrawler.php
 * and AutoCompile.php.
 */
class DataConverter
{
    /**
     * Safely unserialize data to an array
     *
     * Handles various input types:
     * - Already an array: returns as-is
     * - Serialized string: unserializes and returns
     * - Plain string: returns as single-element array
     * - Object: casts to array
     * - Other: returns empty array
     *
     * @param mixed $data Data to convert to array
     * @param bool $logErrors Whether to log errors to error_log (only if WP_DEBUG)
     * @return array Always returns an array
     */
    public static function safeUnserialize($data, bool $logErrors = true): array
    {
        // Already an array
        if (is_array($data)) {
            return $data;
        }

        // Empty/null value
        if (empty($data)) {
            return [];
        }

        // String - might be serialized
        if (is_string($data)) {
            // Check if it looks like serialized data
            if (self::isSerialized($data)) {
                try {
                    // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_unserialize -- Required for WP options that may be serialized
                    $unserialized = @unserialize($data, ['allowed_classes' => false]);
                    if (is_array($unserialized)) {
                        return $unserialized;
                    }
                } catch (\Throwable $e) {
                    if ($logErrors && defined('WP_DEBUG') && WP_DEBUG) {
                        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Debug-only logging
                        error_log('[winden:data] Unserialize failed: ' . $e->getMessage());
                    }
                }
            }

            // Plain string - return as single element array
            return [$data];
        }

        // Object - cast to array
        if (is_object($data)) {
            return (array) $data;
        }

        // Unknown type - return empty array
        return [];
    }

    /**
     * Check if a string looks like serialized PHP data
     *
     * @param string $data String to check
     * @return bool True if the string appears to be serialized
     */
    public static function isSerialized(string $data): bool
    {
        // Quick checks for common serialized patterns
        if ($data === 'b:0;' || $data === 'b:1;') {
            return true;
        }

        if (strlen($data) < 4) {
            return false;
        }

        // Check for serialized array/object/string patterns
        if (preg_match('/^(a|O|s|i|d|b|N):/', $data)) {
            return true;
        }

        return false;
    }

    /**
     * Normalize classes array
     *
     * Ensures the array contains only unique, non-empty strings.
     *
     * @param array $classes Array of class names
     * @return array Cleaned array of unique string class names
     */
    public static function normalizeClasses(array $classes): array
    {
        // Filter to only non-empty strings
        $classes = array_filter($classes, function ($class) {
            return is_string($class) && !empty(trim($class));
        });

        // Remove duplicates and re-index
        return array_values(array_unique($classes));
    }

    /**
     * Get option as array with safe unserialization
     *
     * Combines get_option with safeUnserialize for a common pattern.
     *
     * @param string $optionName WordPress option name
     * @param array $default Default value if option doesn't exist
     * @return array Option value as array
     */
    public static function getOptionAsArray(string $optionName, array $default = []): array
    {
        $value = get_option($optionName, $default);
        return self::safeUnserialize($value);
    }
}

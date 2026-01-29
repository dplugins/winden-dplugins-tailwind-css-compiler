<?php

namespace Winden\App\Helpers;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * File Writer Helper for Winden plugin
 *
 * Centralizes file writing operations with WordPress filter support
 * and path validation to prevent directory traversal attacks.
 */
class FileWriter
{
    /**
     * Write content to a file with optional filtered copy location
     *
     * Always writes to the default path in uploads directory.
     * If a filter returns a different path, also copies to that location
     * (after validating it's within allowed directories).
     *
     * @param string $filterName WordPress filter name for the path
     * @param string $defaultPath Default file path (must be in uploads dir)
     * @param string $content Content to write
     * @return bool True if write to default path succeeded
     */
    public static function writeWithFilter(string $filterName, string $defaultPath, string $content): bool
    {
        // Ensure directory exists
        \wp_mkdir_p(dirname($defaultPath));

        // Always write to default location
        $result = file_put_contents($defaultPath, $content);

        // Get filtered path
        $filteredPath = \apply_filters($filterName, $defaultPath);

        // Copy to filtered location if different and allowed
        if ($filteredPath !== $defaultPath && self::isPathAllowed($filteredPath)) {
            if (wp_is_writable(dirname($filteredPath)) || !file_exists(dirname($filteredPath))) {
                \wp_mkdir_p(dirname($filteredPath));
                file_put_contents($filteredPath, $content);
            }
        }

        return $result !== false;
    }

    /**
     * Write multiple files with their respective filters
     *
     * @param array $files Array of [filterName, defaultPath, content]
     * @return bool True if all writes to default paths succeeded
     */
    public static function writeMultipleWithFilters(array $files): bool
    {
        $allSuccess = true;

        foreach ($files as $file) {
            list($filterName, $defaultPath, $content) = $file;
            if (!self::writeWithFilter($filterName, $defaultPath, $content)) {
                $allSuccess = false;
            }
        }

        return $allSuccess;
    }

    /**
     * Validate that a file path is within allowed directories
     *
     * Prevents path traversal attacks via filtered file paths.
     * Allowed directories: theme folder, uploads folder.
     *
     * @param string $path The path to validate
     * @return bool True if path is allowed, false otherwise
     */
    public static function isPathAllowed(string $path): bool
    {
        // Resolve the real path (handles ../ and symlinks)
        $realPath = realpath(dirname($path));
        if ($realPath === false) {
            // Directory doesn't exist yet, check the parent
            $parentDir = dirname(dirname($path));
            $realPath = realpath($parentDir);
            if ($realPath === false) {
                return false;
            }
        }

        // Allowed directories: theme folder and uploads folder
        $allowedDirs = [
            realpath(get_theme_file_path()),
            realpath(get_stylesheet_directory()),
            realpath(get_template_directory()),
            realpath(wp_upload_dir()['basedir']),
        ];

        // Filter out false values (directories that don't exist)
        $allowedDirs = array_filter($allowedDirs);

        // Check if path starts with any allowed directory
        foreach ($allowedDirs as $allowedDir) {
            if (strpos($realPath, $allowedDir) === 0) {
                return true;
            }
        }

        // Log blocked path attempts for security monitoring
        if (defined('WP_DEBUG') && WP_DEBUG) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Security logging
            error_log('[Winden Security] Blocked file path outside allowed directories: ' . $path);
        }

        return false;
    }

    /**
     * Get the Winden uploads directory path
     *
     * @return string Path to wp-content/uploads/winden/
     */
    public static function getWindenDir(): string
    {
        $uploadDir = wp_upload_dir();
        return $uploadDir['basedir'] . '/winden';
    }

    /**
     * Ensure Winden uploads directory exists
     *
     * @return string Path to the created/existing directory
     */
    public static function ensureWindenDir(): string
    {
        $windenDir = self::getWindenDir();
        \wp_mkdir_p($windenDir);
        return $windenDir;
    }
}

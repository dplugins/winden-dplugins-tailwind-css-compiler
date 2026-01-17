<?php

namespace Winden\App\Helpers;

/**
 * WordPress Loader Helper
 *
 * Provides methods to dynamically locate and load WordPress installation
 * regardless of plugin installation location (standard, mu-plugins, symlinks, etc.)
 */
class WordPressLoader
{
    /**
     * Get the path to WordPress root directory
     *
     * Searches up the directory tree from a given starting point
     * to locate the WordPress installation.
     *
     * @param string $start_path Starting path for search (defaults to current file directory)
     * @param int $max_depth Maximum directory levels to search up (default: 10)
     * @return string|false Path to WordPress root, or false if not found
     */
    public static function getWordPressRoot($start_path = null, $max_depth = 10)
    {
        $search_path = $start_path ?: __DIR__;
        $depth = 0;

        while ($depth < $max_depth) {
            // Check if wp-load.php exists in current directory
            if (file_exists($search_path . '/wp-load.php')) {
                return $search_path;
            }

            // Get parent directory
            $parent = dirname($search_path);

            // Check if we've reached filesystem root
            if ($parent === $search_path) {
                return false;
            }

            $search_path = $parent;
            $depth++;
        }

        return false;
    }

    /**
     * Load WordPress
     *
     * Dynamically locates and loads wp-load.php
     *
     * @param string $start_path Starting path for search (defaults to current file directory)
     * @param int $max_depth Maximum directory levels to search up (default: 10)
     * @return bool True if WordPress loaded successfully, false otherwise
     * @throws \RuntimeException If WordPress cannot be found
     */
    public static function loadWordPress($start_path = null, $max_depth = 10)
    {
        // Check if WordPress is already loaded
        if (function_exists('wp_get_current_user')) {
            return true;
        }

        $wp_root = self::getWordPressRoot($start_path, $max_depth);

        if ($wp_root === false) {
            throw new \RuntimeException('Could not locate WordPress installation (wp-load.php not found)');
        }

        require_once $wp_root . '/wp-load.php';

        return true;
    }

    /**
     * Get WordPress directory paths
     *
     * Returns commonly used WordPress directory paths
     *
     * @return array Array of directory paths
     */
    public static function getWordPressPaths()
    {
        if (!function_exists('wp_get_current_user')) {
            throw new \RuntimeException('WordPress is not loaded. Call loadWordPress() first.');
        }

        return [
            'root' => ABSPATH,
            'wp_content' => WP_CONTENT_DIR,
            'plugins' => WP_PLUGIN_DIR,
            'uploads' => wp_upload_dir()['basedir'],
            'themes' => get_theme_root(),
        ];
    }

    /**
     * Get plugin root directory
     *
     * Returns the root directory of the current plugin
     *
     * @param string $file_path Path to any file within the plugin (default: this file)
     * @return string Plugin root directory path
     */
    public static function getPluginRoot($file_path = null)
    {
        $file = $file_path ?: __FILE__;

        // Search for the plugin root by looking for composer.json or main plugin file
        $search_path = dirname($file);
        $max_depth = 10;
        $depth = 0;

        while ($depth < $max_depth) {
            // Check for winden.php (main plugin file)
            if (file_exists($search_path . '/winden.php')) {
                return $search_path;
            }

            // Check for composer.json with our package name (supports both old and new package names)
            $composer_file = $search_path . '/composer.json';
            if (file_exists($composer_file)) {
                $composer = json_decode(file_get_contents($composer_file), true);
                if (isset($composer['name'])) {
                    // Check for new package name (WordPress.org version)
                    if (strpos($composer['name'], 'winden') !== false) {
                        return $search_path;
                    }
                }
            }

            $parent = dirname($search_path);
            if ($parent === $search_path) {
                break;
            }

            $search_path = $parent;
            $depth++;
        }

        // Fallback: assume we're in App/Helpers/ and go up 2 levels
        return dirname(dirname(__DIR__));
    }

    /**
     * Check if running in WordPress context
     *
     * @return bool True if WordPress functions are available
     */
    public static function isWordPressLoaded()
    {
        return function_exists('wp_get_current_user') && defined('ABSPATH');
    }

    /**
     * Get relative path from WordPress root
     *
     * Converts an absolute path to a path relative to WordPress root
     *
     * @param string $absolute_path Absolute file path
     * @return string Relative path from WordPress root
     */
    public static function getRelativePathFromRoot($absolute_path)
    {
        if (!self::isWordPressLoaded()) {
            throw new \RuntimeException('WordPress is not loaded');
        }

        $wp_root = rtrim(ABSPATH, '/');
        $absolute_path = rtrim($absolute_path, '/');

        if (strpos($absolute_path, $wp_root) === 0) {
            return substr($absolute_path, strlen($wp_root) + 1);
        }

        return $absolute_path;
    }
}

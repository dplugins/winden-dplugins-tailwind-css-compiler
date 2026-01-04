<?php

namespace Winden\App\Helpers;

// Note: We don't use 'use' for pro classes here because the pro folder may not exist
// Pro classes are loaded dynamically only after checking if pro folder exists

/**
 * License Manager Helper
 *
 * Centralized license checking for pro features.
 * Gracefully handles missing pro folder (WordPress.org free version).
 */
class LicenseManager
{
    /**
     * Cached license status
     */
    private static $cachedStatus = null;

    /**
     * Check if pro folder exists
     *
     * @return bool
     */
    public static function proFolderExists(): bool
    {
        return file_exists(WINDTACS_PLUGIN_DIR . 'pro/App/License/License.php');
    }

    /**
     * Check if pro features are active
     *
     * @return bool
     */
    public static function isProActive(): bool
    {
        if (self::$cachedStatus !== null) {
            return self::$cachedStatus;
        }

        // Check if pro folder exists first
        if (!self::proFolderExists()) {
            self::$cachedStatus = false;
            return false;
        }

        try {
            // Use fully qualified class name to avoid 'use' statement issues
            $license = \Winden\Pro\License\LicenseRepository::get();
            self::$cachedStatus = $license && $license->isActivated();
            return self::$cachedStatus;
        } catch (\Exception $e) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Intentional production logging for license validation errors
            error_log('[Winden License] License check failed: ' . $e->getMessage());
            self::$cachedStatus = false;
            return false;
        }
    }

    /**
     * Get list of pro features
     *
     * @return array
     */
    public static function getProFeatures(): array
    {
        return [
            'bricks' => 'Bricks Builder',
            'oxygen' => 'Oxygen Classic',
            'oxygen6' => 'Oxygen 6',
            'elementor' => 'Elementor',
            'file_scanner' => 'File Scanner'
        ];
    }

    /**
     * Clear cached license status
     *
     * @return void
     */
    public static function clearCache()
    {
        self::$cachedStatus = null;
    }
}

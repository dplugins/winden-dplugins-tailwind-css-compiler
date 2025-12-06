<?php

namespace Winden\App\Helpers;

/**
 * Migration Handler
 *
 * Handles plugin migrations and cache cleanup for users upgrading from older versions
 */
class Migration
{
    /**
     * Version option key
     */
    const VERSION_OPTION = 'winden_version';

    /**
     * Current plugin version (must match winden.php Plugin Version header)
     */
    const CURRENT_VERSION = '2.9.0';

    /**
     * Initialize migration checks
     */
    public function __construct()
    {
        // Run migration check on admin_init
        add_action('admin_init', [$this, 'checkMigration']);
    }

    /**
     * Check if migration is needed and run it
     */
    public function checkMigration()
    {
        $stored_version = get_option(self::VERSION_OPTION, '0.0.0');

        // error_log('[Winden Migration] Checking migration: stored=' . $stored_version . ', current=' . self::CURRENT_VERSION);

        // If version is different, run migration
        if (version_compare($stored_version, self::CURRENT_VERSION, '<')) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[Winden Migration] Migration needed: ' . $stored_version . ' < ' . self::CURRENT_VERSION);
            }
            $this->runMigration($stored_version);
            update_option(self::VERSION_OPTION, self::CURRENT_VERSION);
        } else {
            // error_log('[Winden Migration] No migration needed: ' . $stored_version . ' >= ' . self::CURRENT_VERSION);
        }
    }

    /**
     * Run migration based on version
     *
     * @param string $from_version The version being upgraded from
     */
    private function runMigration($from_version)
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[Winden Migration] Upgrading from version ' . $from_version . ' to ' . self::CURRENT_VERSION);
        }

        // Migration 1: Clear cache for versions below 2.9.0
        if (version_compare($from_version, '2.9.0', '<')) {
            $this->migrateTo290();
        }

        // Add more migration methods as needed for future versions
        // if (version_compare($from_version, '3.0.0', '<')) {
        //     $this->migrateTo300();
        // }
    }

    /**
     * Migration to version 2.9.0
     *
     * Clears old cache that may have syntax errors from previous versions
     */
    private function migrateTo290()
    {
        $debug = defined('WP_DEBUG') && WP_DEBUG;

        if ($debug) {
            error_log('[Winden Migration] Running migration to 2.9.0');
        }

        // Clear old cache
        $cache_deleted = delete_option('winden_cache');
        if ($cache_deleted && $debug) {
            error_log('[Winden Migration] ✅ Old cache cleared');
        }

        // Delete output.css file if it exists
        $upload_dir = wp_upload_dir();
        $output_css = $upload_dir['basedir'] . '/winden/output.css';
        if (file_exists($output_css)) {
            wp_delete_file($output_css);
            if ($debug) {
                error_log('[Winden Migration] ✅ output.css file deleted');
            }
        }

        // Validate and fix configuration if needed
        $config = get_option('winden_editor', []);

        // Check if config is in old format (array with 'name' keys)
        if (is_array($config) && !empty($config) && isset($config[0]['name'])) {
            if ($debug) {
                error_log('[Winden Migration] Detected old configuration format, converting...');
            }
            $this->convertOldConfig($config);
        }

        // Ensure wizzard config exists
        if (!isset($config['wizzard'])) {
            if ($debug) {
                error_log('[Winden Migration] Adding default Wizzard configuration');
            }
            $this->ensureWizzardConfig();
        } else if (isset($config['wizzard']['configCode'])) {
            // Clear old JavaScript-format configCode from Wizzard state
            // It will be regenerated as @theme CSS on next load
            if ($debug) {
                error_log('[Winden Migration] Clearing old configCode from Wizzard state');
            }
            unset($config['wizzard']['configCode']);
            update_option('winden_editor', $config);
        }

        if ($debug) {
            error_log('[Winden Migration] ✅ Migration to 2.9.0 completed');
        }
    }

    /**
     * Convert old configuration format to new format
     *
     * @param array $old_config Old configuration array
     */
    private function convertOldConfig($old_config)
    {
        $new_config = [
            'javascript' => '',
            'scss' => '',
            'wizzard' => $this->getDefaultWizzardConfig()
        ];

        // Extract CSS content
        $cssKey = array_search("input.css", array_column($old_config, 'name'));
        if ($cssKey !== false && isset($old_config[$cssKey]['content'])) {
            $new_config['scss'] = $old_config[$cssKey]['content'];
        }

        // Extract JavaScript config
        $configKey = array_search("tailwind.config.js", array_column($old_config, 'name'));
        if ($configKey !== false && isset($old_config[$configKey]['content'])) {
            $new_config['javascript'] = $old_config[$configKey]['content'];
        }

        // If no SCSS content, use default
        if (empty($new_config['scss'])) {
            $new_config['scss'] = '@layer theme, base, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);';
        }

        update_option('winden_editor', $new_config);
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[Winden Migration] ✅ Configuration converted to new format');
        }
    }

    /**
     * Ensure Wizzard configuration exists
     */
    private function ensureWizzardConfig()
    {
        $config = get_option('winden_editor', []);

        if (!isset($config['wizzard'])) {
            $config['wizzard'] = $this->getDefaultWizzardConfig();
            update_option('winden_editor', $config);
        }
    }

    /**
     * Get default Wizzard configuration
     *
     * @return array Default Wizzard configuration
     */
    private function getDefaultWizzardConfig()
    {
        return [
            'activeTab' => 5,
            'configCode' => '',
            'stateName' => '',
            'breakpoints' => [],
            'breakpointsActive' => false,
            'extendBreakpoints' => true,
            'desktopFirst' => false,
            'fontFamily' => [],
            'fontFamilyActive' => false,
            'extendFontFamily' => true,
            'colorEntries' => [],
            'colorsActive' => false,
            'extendColors' => true,
            'includeUtilityColors' => false,
            'spacesActive' => false,
            'includeUtilitySizes' => false,
            'spacing' => [
                'extend' => true,
                'disableFluid' => false,
                'useRem' => false,
                'remSize' => 16,
                'minBaseSize' => 16,
                'minScaleRatio' => 1.2,
                'minScreenSize' => 320,
                'maxBaseSize' => 19,
                'maxScaleRatio' => 1.5,
                'maxScreenSize' => 1200,
                'steps' => ['xs', 'sm', 'base', 'md', 'lg', 'giga', 'mega'],
                'baseStep' => 'base',
                'decimalPlaces' => 2,
            ],
            'borderRadiusActive' => false,
            'borderRadius' => [
                'extend' => true,
                'disableFluid' => false,
                'useRem' => false,
                'remSize' => 16,
                'minBaseSize' => 16,
                'minScaleRatio' => 1.2,
                'minScreenSize' => 320,
                'maxBaseSize' => 19,
                'maxScaleRatio' => 1.5,
                'maxScreenSize' => 1200,
                'steps' => ['xs', 'sm', 'base', 'md', 'lg', 'giga', 'mega'],
                'baseStep' => 'base',
                'decimalPlaces' => 2,
            ],
            'fontSizesActive' => false,
            'fontSize' => [
                'extend' => true,
                'disableFluid' => false,
                'useRem' => false,
                'remSize' => 16,
                'minBaseSize' => 16,
                'minScaleRatio' => 1.2,
                'minScreenSize' => 320,
                'maxBaseSize' => 19,
                'maxScaleRatio' => 1.5,
                'maxScreenSize' => 1200,
                'steps' => ['xs', 'sm', 'base', 'md', 'lg', 'giga', 'mega'],
                'baseStep' => 'base',
                'decimalPlaces' => 2,
            ],
            'extendColorsFSE' => false,
            'extendFontSizesFSE' => false,
            'extendSpacingFSE' => false,
            'extendFontFamilyFSE' => false,
            'extendScreensFSE' => false,
            'extendColorsBricks' => false,
            'extendFontSizesBricks' => false,
            'extendSpacingBricks' => false,
            'extendFontFamilyBricks' => false,
            'extendScreensBricks' => false,
            'extendColorsOxygen' => false,
            'extendFontSizesOxygen' => false,
            'extendSpacingOxygen' => false,
            'extendFontFamilyOxygen' => false,
            'extendScreensOxygen' => false,
            'extendFontHero' => false,
            'extendBorderRadiusFSE' => false,
            'extendBorderRadiusBricks' => false,
            'extendBorderRadiusOxygen' => false,
        ];
    }
}

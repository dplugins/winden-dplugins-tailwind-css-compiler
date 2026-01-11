<?php namespace Winden\App\Helpers;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

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
    const VERSION_OPTION = 'winden_dplugins_version';

    /**
     * Current plugin version (must match winden.php Plugin Version header)
     */
    const CURRENT_VERSION = '2.9.5';

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

        // If version is different, run migration
        if (version_compare($stored_version, self::CURRENT_VERSION, '<')) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Debug-only logging (only runs when WP_DEBUG is enabled)
                error_log('[Winden Migration] Migration needed: ' . $stored_version . ' < ' . self::CURRENT_VERSION);
            }
            $this->runMigration($stored_version);
            update_option(self::VERSION_OPTION, self::CURRENT_VERSION);
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
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Debug-only logging (only runs when WP_DEBUG is enabled)
            error_log('[Winden Migration] Upgrading from version ' . $from_version . ' to ' . self::CURRENT_VERSION);
        }

        // Migrate database option keys for WordPress.org compliance
        if (version_compare($from_version, '2.9.5', '<')) {
            // wp_die('here');
            $this->migrateOptionKeys();
        }
    }

    /**
     * Migrate database option keys for WordPress.org compliance
     *
     * Migrates old option keys (winden_*) to new keys (winden_dplugins_*)
     */
    private function migrateOptionKeys()
    {
        $debug = defined('WP_DEBUG') && WP_DEBUG;

        if ($debug) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Debug-only logging (only runs when WP_DEBUG is enabled)
            error_log('[Winden Migration] Running option key migration for WordPress.org compliance');
        }

        // Map old option keys to new ones
        $options_to_migrate = [
            'winden_editor'                        => 'winden_dplugins_editor',
            'winden_cache'                         => 'winden_dplugins_cache',
            'winden_wizzard_state'                 => 'winden_dplugins_wizzard_state',
            'winden_options'                       => 'winden_dplugins_options',
            'winden_clear_cache_flag'              => 'winden_dplugins_clear_cache_flag',
            'winden_version'                       => 'winden_dplugins_version',
            'winden_breakpoint_indicator_enabled'  => 'winden_dplugins_breakpoint_indicator_enabled',
        ];

        foreach ($options_to_migrate as $old_key => $new_key) {
            // Only migrate if old key exists and new key doesn't
            $old_value = get_option($old_key);
            if ($old_value !== false && get_option($new_key) === false) {
                update_option($new_key, $old_value);
                delete_option($old_key);
                if ($debug) {
                    // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Debug-only logging (only runs when WP_DEBUG is enabled)
                    error_log('[Winden Migration] ✅ Migrated option key: ' . $old_key . ' → ' . $new_key);
                }
            }
        }

        if ($debug) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Debug-only logging (only runs when WP_DEBUG is enabled)
            error_log('[Winden Migration] ✅ Option key migration completed');
        }
    }
}

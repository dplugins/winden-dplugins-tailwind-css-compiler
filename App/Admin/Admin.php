<?php namespace Winden\App\Admin;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Winden\App\Admin\Settings\SettingsPage;
use Winden\App\Admin\Settings\SettingsSaveGet;
use Winden\App\Admin\Settings\SettingsPageBodyClass;
use Winden\App\Admin\GetContent;
use Winden\App\Admin\SaveContent;
use Winden\App\Admin\TopBar;
use Winden\App\Admin\MigrationNotice;

use Winden\App\Assets\DequeueStyles;
use Winden\App\Helpers\Builders;
use Winden\App\Helpers\BuildersIntegration;
use Winden\App\Helpers\LicenseManager;
use Winden\App\Frontend\BreakpointIndicator;

new SettingsPage();
new GetContent();
new SaveContent();
new SettingsSaveGet();
new DequeueStyles();
new SettingsPageBodyClass();
new TopBar();
new MigrationNotice();
new BreakpointIndicator();

// Pro features - Load Pro entry point only if pro folder exists
// This ensures the plugin works when /pro/ folder is removed (WordPress.org free version)
// WordPress.org handles updates automatically for the free version
if (LicenseManager::proFolderExists()) {
    require_once WINDTACS_PLUGIN_DIR . 'pro/App/App.php';
    new \Winden\Pro\App();
}

class Admin
{
    public function __construct()
    {
        // Use wp_enqueue_scripts for proper script registration
        add_action('admin_enqueue_scripts', [$this, 'enqueue_inline_scripts']);

        // On the Winden settings page only, dequeue scripts from other plugins
        // / WP core packages we don't need. Each registered handle is a 304
        // round-trip on reload even when cached; on busy sites this stacks to
        // hundreds of requests and seconds of validation time. Priority 9999
        // runs after every other plugin has had its turn to enqueue.
        add_action('admin_enqueue_scripts', [$this, 'dequeue_unneeded_scripts'], 9999);
    }

    /**
     * Strip noise on the Winden settings page (`toplevel_page_winden`).
     *
     * Allowlist approach: keep WP core essentials (jQuery, admin bar, common),
     * keep React + wp-element (Winden's hard deps), keep anything Winden owns
     * (handles starting with `winden`). Dequeue everything else.
     *
     * Reversible: comment out the add_action above and the noise comes back.
     */
    public function dequeue_unneeded_scripts($hook)
    {
        if ($hook !== 'toplevel_page_winden') {
            return;
        }

        global $wp_scripts;
        if (!isset($wp_scripts) || empty($wp_scripts->queue)) {
            return;
        }

        $keep = [
            // jQuery family — admin UI bits (notices, screen options) still need it
            'jquery', 'jquery-core', 'jquery-migrate', 'jquery-ui-core',
            // WordPress core admin essentials
            'common', 'admin-bar', 'wp-pointer', 'utils',
            // React + Winden's declared deps from index.asset.php
            'react', 'react-dom', 'wp-element',
            // wp-element's transitive deps (WordPress hands these out anyway)
            'wp-polyfill', 'wp-hooks', 'wp-i18n', 'wp-dom-ready', 'wp-escape-html',
        ];

        foreach ((array) $wp_scripts->queue as $handle) {
            if (in_array($handle, $keep, true)) {
                continue;
            }
            if (strpos($handle, 'winden') === 0) {
                continue; // any winden-*
            }
            wp_dequeue_script($handle);
        }
    }

    /**
     * Enqueue inline scripts using WordPress API
     * WordPress.org requirement: Use wp_add_inline_script instead of echo
     */
    public function enqueue_inline_scripts()
    {
        // Register a dummy script handle to attach inline scripts to
        // This follows WordPress best practices for inline script output
        wp_register_script('winden-globals', false, [], \WINDTACS_VERSION, true);
        wp_enqueue_script('winden-globals');

        // Build the inline script content
        $inline_script = $this->get_themes_data_script() . "\n" . $this->get_plugin_url_script();

        wp_add_inline_script('winden-globals', $inline_script);
    }

    /**
     * Get theme/builder integration data as JavaScript
     * @return string JavaScript code setting window globals
     */
    private function get_themes_data_script()
    {
        $bricksData = wp_json_encode(Builders::isBricksThemeActivated() ? BuildersIntegration::bricks() : []);
        $oxygenData = wp_json_encode(Builders::isOxygenPluginActivated() ? BuildersIntegration::oxygen() : []);
        $fseData = wp_json_encode(BuildersIntegration::fse());
        $fontHeroData = wp_json_encode(Builders::isFontHeroPluginActivated() ? BuildersIntegration::fontHero() : []);

        // Using wp_json_encode ensures proper escaping for JavaScript context
        return sprintf(
            'window.bricksThemeData = %s; window.oxygenThemeData = %s; window.fseThemeData = %s; window.fontHeroData = %s;',
            $bricksData,
            $oxygenData,
            $fseData,
            $fontHeroData
        );
    }

    /**
     * Get plugin URLs and configuration as JavaScript
     * @return string JavaScript code setting window globals
     */
    private function get_plugin_url_script()
    {
        return sprintf(
            'window.pluginUrl = %s; window.uploadUrl = %s; window.websiteUrl = %s; window.ajaxUrl = %s; window.nonce = %s; window.inIframe = %s; window.apiVersion2 = %s; window.WINDEN_DEBUG = %s;',
            wp_json_encode(WINDTACS_PLUGIN_URL),
            wp_json_encode(WINDTACS_UPLOADS_URL['baseurl']),
            wp_json_encode(WINDTACS_WEBSITE_URL),
            wp_json_encode(admin_url('admin-ajax.php')),
            wp_json_encode(wp_create_nonce('winden_nonce')),
            wp_json_encode(Builders::isBricksEditorFrame() || Builders::isOxygenEditorFrame() || Builders::isElementorEditorPage()),
            wp_json_encode(Builders::has_api_version_2_block()),
            wp_json_encode(defined('WP_DEBUG') && WP_DEBUG)
        );
    }
}

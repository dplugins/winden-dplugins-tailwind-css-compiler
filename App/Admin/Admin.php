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
        // Combine into a single action to avoid duplicate logging
        add_action('admin_footer', [$this, 'render_footer_scripts']);
    }

    function render_footer_scripts()
    {
        $this->themesOrPluginsData();
        $this->pluginUrl();
    }

    function themesOrPluginsData()
    {
        $bricksData = wp_json_encode(Builders::isBricksThemeActivated() ? BuildersIntegration::bricks() : []);
        $oxygenData = wp_json_encode(Builders::isOxygenPluginActivated() ? BuildersIntegration::oxygen() : []);
        $fseData = wp_json_encode(BuildersIntegration::fse());
        $fontHeroData = wp_json_encode(Builders::isFontHeroPluginActivated() ? BuildersIntegration::fontHero() : []);

        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON data is safely encoded
        echo "<script type='text/javascript'>
            window.bricksThemeData = '" . esc_js($bricksData) . "';
            window.oxygenThemeData = '" . esc_js($oxygenData) . "';
            window.fseThemeData = '" . esc_js($fseData) . "';
            window.fontHeroData = '" . esc_js($fontHeroData) . "';
        </script>";
    }

    function pluginUrl()
    {
        $websiteUrl = WINDTACS_WEBSITE_URL;
        $url = WINDTACS_PLUGIN_URL;
        $uploadUrl = WINDTACS_UPLOADS_URL['baseurl'];
        $ajaxUrl = admin_url('admin-ajax.php');
        $nonce = wp_create_nonce('winden_nonce');
        $inIframe = wp_json_encode(Builders::isBricksEditorFrame() || Builders::isOxygenEditorFrame() || Builders::isElementorEditorPage());
        $apiVersion2 = wp_json_encode(Builders::has_api_version_2_block());

        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- URLs and nonces are safely escaped
        echo "<script type='text/javascript'>
            window.pluginUrl = '" . esc_js($url) . "';
            window.uploadUrl = '" . esc_js($uploadUrl) . "';
            window.websiteUrl = '" . esc_js($websiteUrl) . "';
            window.ajaxUrl = '" . esc_js($ajaxUrl) . "';
            window.nonce = '" . esc_js($nonce) . "';
            window.inIframe = " . esc_js($inIframe) . ";
            window.apiVersion2 = " . esc_js($apiVersion2) . ";
        </script>";
    }
}

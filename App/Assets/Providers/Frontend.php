<?php

namespace Winden\App\Assets\Providers;

use Winden\App\Helpers\SettingsOptions;
use Winden\App\Assets\Providers\ProvidersHelpers;
use Winden\App\Assets\DequeueStyles;
use Winden\App\Helpers\Builders;

class Frontend extends BaseProvider
{
    protected function setupHooks()
    {
        add_filter('script_loader_tag', [$this, 'modify_script_loader_tag'], 10, 3);
        add_action('init', [$this, 'load_condition']);
        add_action('wp_footer', [$this, 'frontend_consts']);
    }

    public function load_condition()
    {
        $settings = SettingsOptions::getWindenOptions();

        // ------------------------------------------------------------------------
        // Load Tailwind CSS Conditions vs CDN
        // ------------------------------------------------------------------------

        $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

        // Always load compiled CSS (output.css)
        // Check if Oxygen is active to use the appropriate hook
        if (class_exists('Oxygen_VSB_Dynamic_Shortcodes')) {
            add_action('wp_head', [$this, 'enqueue_compiled_css_oxygen'], 9999999);
        } else {
            add_action('wp_enqueue_scripts', [$this, 'enqueue_compiled_css'], 9999999);
        }

        // Load compiler and dev tools only if dev mode is NOT disabled
        if (!$dev_mode_disabled) {
            add_action('wp_enqueue_scripts', [$this, 'load_tailwind_cdn'], 10000000);

            // Load broadcast listener for real-time updates from admin
            add_action('wp_enqueue_scripts', [$this, 'enqueue_broadcast_listener'], 10000001);
        }

        new DequeueStyles();
    }

    public function frontend_consts()
    {
        ProvidersHelpers::frontend_consts();
    }

    protected function getAutocompleteFolder()
    {
        return 'gutenberg';
    }

    // Enqueue broadcast listener for real-time updates
    public function enqueue_broadcast_listener()
    {
        wp_enqueue_script(
            'winden-broadcast-listener',
            WINDEN_ASSETS_DIR . 'broadcast-listener.js',
            [], // No dependencies
            filemtime(WINDEN_PLUGIN_DIR . 'assets/broadcast-listener.js'),
            true // Load in footer
        );
    }

    // Add new method for Oxygen-specific CSS loading
    public function enqueue_compiled_css_oxygen()
    {
        $settings = SettingsOptions::getWindenOptions();
        $inline_css = $settings['inline_compiled_css'] ?? false;

        $upload_dir = wp_upload_dir();
        $css_file_path = $upload_dir['basedir'] . '/winden/output.css';
        $css_file_url = $upload_dir['baseurl'] . '/winden/output.css';

        if (!file_exists($css_file_path)) {
            return;
        }

        if ($inline_css) {
            // Inline the CSS
            $css_content = file_get_contents($css_file_path);
            if ($css_content !== false) {
                ?>
                <style id='winden-compiled-css' type='text/css'>
                    <?php
                    // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS content from trusted file
                    echo $css_content;
                    ?>
                </style>
                <?php
            }
        } else {
            // Load as external file (default behavior)
            ?>
            <link rel='stylesheet' id='winden-compiled-css' href='<?php echo esc_url($css_file_url); ?>?ver=<?php echo esc_attr(filemtime($css_file_path)); ?>' type='text/css' media='all' />
            <?php
        }
    }
}

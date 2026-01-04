<?php namespace Winden\App\Assets\Providers;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

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
            WINDTACS_ASSETS_DIR . 'broadcast-listener.js',
            [], // No dependencies
            filemtime(WINDTACS_PLUGIN_DIR . 'assets/broadcast-listener.js'),
            true // Load in footer
        );
    }

    // Add new method for Oxygen-specific CSS loading
    public function enqueue_compiled_css_oxygen()
    {
        // Use the same WordPress enqueuing pattern as standard frontend
        // wp_head hook in Oxygen requires proper enqueuing, not direct output
        ProvidersHelpers::load_compiled_css(false); // Don't reorder queue in Oxygen
    }
}

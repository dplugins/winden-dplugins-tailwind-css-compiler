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
        add_action('wp_footer', [$this, 'frontend_consts']);

        // Register CSS loading hooks directly to avoid init timing issues
        // This runs during after_setup_theme, which is before wp_enqueue_scripts
        $this->registerCSSHooks();
    }

    /**
     * Register CSS loading hooks directly
     * Separated from load_condition to avoid init hook timing issues
     */
    private function registerCSSHooks()
    {
        $settings = SettingsOptions::getWindenOptions();
        $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

        // Load compiler and dev tools only if dev mode is NOT disabled
        // IMPORTANT: Compiler must load BEFORE CSS to prevent Flash of Unstyled Content (FOUC)
        if (!$dev_mode_disabled) {
            add_action('wp_enqueue_scripts', [$this, 'load_tailwind_cdn'], 9999998);

            // Load broadcast listener for real-time updates + CSS cache busting
            add_action('wp_enqueue_scripts', [$this, 'enqueue_broadcast_listener'], 9999999);
        }

        // Always load compiled CSS (output.css) - loads AFTER compiler
        // Check if Oxygen is active to use the appropriate hook
        if (class_exists('Oxygen_VSB_Dynamic_Shortcodes')) {
            add_action('wp_head', [$this, 'enqueue_compiled_css_oxygen'], 10000000);
        } else {
            add_action('wp_enqueue_scripts', [$this, 'enqueue_compiled_css'], 10000000);
        }

        // Initialize DequeueStyles
        new DequeueStyles();
    }

    /**
     * Legacy method - kept for BaseProvider interface compatibility
     * CSS loading is now handled directly in setupHooks() via registerCSSHooks()
     */
    public function load_condition()
    {
        // No longer used - CSS hooks are registered directly in setupHooks()
        // This method is kept to satisfy the abstract method requirement in BaseProvider
    }

    public function frontend_consts()
    {
        ProvidersHelpers::frontend_consts();
    }

    protected function getAutocompleteFolder()
    {
        return 'gutenberg';
    }

    // Enqueue broadcast listener for real-time updates + CSS cache busting
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

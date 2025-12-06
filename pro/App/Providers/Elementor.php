<?php

namespace Winden\Pro\Providers;

use Winden\App\Helpers\SettingsOptions;
use Winden\App\Assets\Providers\ProvidersHelpers;
use Winden\App\Assets\Providers\BaseProvider;

class Elementor extends BaseProvider
{
    protected function setupHooks()
    {
        add_filter('script_loader_tag', [$this, 'modify_script_loader_tag'], 10, 3);
        add_action('init', [$this, 'load_condition']);
    }

    public function load_condition()
    {
        $settings = SettingsOptions::getWindenOptions();

        // ------------------------------------------------------------------------
        // Load plain classes
        // ------------------------------------------------------------------------
        if ($settings['autocomplete_elementor'] ?? false) {
            add_action('elementor/editor/footer', [$this, 'plain_classes_autocomplete'], 99999999);
        }

        // ------------------------------------------------------------------------
        // Load Tailwind CSS - Elementor only runs in editor context
        // ------------------------------------------------------------------------

        $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

        // Always load compiled CSS (output.css) in Elementor editor
        add_action('elementor/editor/footer', [$this, 'enqueue_compiled_css'], 9999);

        // Load compiler and dev tools only if dev mode is NOT disabled
        if (!$dev_mode_disabled) {
            add_action('elementor/editor/footer', [$this, 'load_tailwind_cdn'], 10000);

            // Load broadcast listener for real-time updates from admin
            add_action('elementor/editor/footer', [$this, 'enqueue_broadcast_listener'], 10000001);
        }
    }

    // ------------------------------------------------------------------------
    // Load Tailwind CDN Scripts
    // ------------------------------------------------------------------------
    public function load_tailwind_cdn()
    {
        parent::load_tailwind_cdn();
        self::frontend_consts();
    }

    // ------------------------------------------------------------------------
    // Get Winden Plain Classes Autocomplete
    // ------------------------------------------------------------------------

    public function plain_classes_autocomplete()
    {
        ProvidersHelpers::plain_classes_autocomplete($this->getAutocompleteFolder());
    }

    public function frontend_consts()
    {
        ProvidersHelpers::frontend_consts();
    }

    protected function getAutocompleteFolder()
    {
        return 'elementor';
    }

    // ------------------------------------------------------------------------
    // Enqueue broadcast listener for real-time updates
    // ------------------------------------------------------------------------
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
}

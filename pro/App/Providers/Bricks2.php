<?php

namespace Winden\Pro\Providers;

use Winden\App\Helpers\SettingsOptions;
use Winden\App\Assets\Providers\ProvidersHelpers;
use Winden\App\Assets\Providers\BaseProvider;
use Winden\App\Helpers\Builders;

class Bricks2 extends BaseProvider
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
        // Load plain classes (in main builder window, not iframe)
        // Autocomplete script runs in main builder and controls the iframe
        // ------------------------------------------------------------------------
        if ($settings['autocomplete_bricks'] ?? false) {
            if (!Builders::isBricksEditorFrame()) {
                add_action('wp_enqueue_scripts', [$this, 'plain_classes_autocomplete'], 99999999);
            }
        }

        // ------------------------------------------------------------------------
        // Load Tailwind CSS Conditions vs CDN (only in iframe)
        // This prevents the compiled CSS from breaking the main builder UI
        // ------------------------------------------------------------------------
        if (Builders::isBricksEditorFrame()) {
            $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

            // Always load compiled CSS (output.css) in iframe only
            add_action('wp_enqueue_scripts', [$this, 'enqueue_compiled_css'], 9999);

            // Load compiler and dev tools only if dev mode is NOT disabled
            if (!$dev_mode_disabled) {
                add_action('wp_enqueue_scripts', [$this, 'load_tailwind_cdn'], 10000);

                // Load broadcast listener for real-time updates from admin
                add_action('wp_enqueue_scripts', [$this, 'enqueue_broadcast_listener'], 10000001);
            }
        }
    }

    // ------------------------------------------------------------------------
    // Modify Script Loader Tag to add type="inline-module"
    // ------------------------------------------------------------------------

    public function modify_script_loader_tag($tag, $handle, $src)
    {
        return ProvidersHelpers::modify_script_loader_tag($tag, $handle, $src);
    }

    // ------------------------------------------------------------------------
    // Load Tailwind CDN Scripts
    // ------------------------------------------------------------------------
    public function load_tailwind_cdn()
    {
        parent::load_tailwind_cdn();

        // ------------------------------------------------------------------------
        // Get Winden Autocomplete Values
        // This runs in iframe and sets window.parent.winden_autocomplete
        // which the main builder's autocomplete component uses
        // ------------------------------------------------------------------------
        ProvidersHelpers::cdn_scripts_autocomplete();

        $this->dequeue_bricks_styles();
    }

    // ------------------------------------------------------------------------
    // Get Winden Cached CSS
    // ------------------------------------------------------------------------

    public function enqueue_compiled_css()
    {
        parent::enqueue_compiled_css();

        $this->dequeue_bricks_styles();
    }

    // ------------------------------------------------------------------------
    // Get Winden Plain Classes Autocomplete
    // ------------------------------------------------------------------------

    public function plain_classes_autocomplete()
    {
        ProvidersHelpers::plain_classes_autocomplete('bricks');
    }

    // ------------------------------------------------------------------------
    // Dequeue Bricks Styles
    // ------------------------------------------------------------------------
    public function dequeue_bricks_styles()
    {
        if (Builders::isBricksEditorFrame()) {
            $settings = get_option('winden_options', [
                'dequeue_styles_bricks' => false,
            ]);

            if ($settings['dequeue_styles_bricks'] ?? false) {
                wp_deregister_style('bricks-frontend');
                wp_deregister_style('bricks-default-content');
                wp_deregister_style('bricks-element-posts');
                wp_deregister_style('bricks-isotope');
                wp_deregister_style('bricks-element-post-author');
                wp_deregister_style('bricks-element-post-comments');
                wp_deregister_style('bricks-element-post-navigation');
                wp_deregister_style('bricks-element-post-sharing');
                wp_deregister_style('bricks-element-post-taxonomy');
                wp_deregister_style('bricks-element-related-posts');
                wp_deregister_style('bricks-404');
            }
        }
    }

    public function frontend_consts()
    {
        ProvidersHelpers::frontend_consts();
    }

    protected function getAutocompleteFolder()
    {
        return 'bricks';
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

<?php

namespace Winden\Pro\Providers;

use Winden\App\Helpers\SettingsOptions;
use Winden\App\Assets\Providers\ProvidersHelpers;
use Winden\App\Assets\Providers\BaseProvider;
use Winden\App\Helpers\Builders;

class Oxygen extends BaseProvider
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
        // Load plain classes
        // ------------------------------------------------------------------------
        if ($settings['autocomplete_oxygen'] ?? false) {
            add_action('ct_toolbar_component_header', [$this, 'plain_classes_autocomplete_html'], 10);
            add_action('wp_enqueue_scripts', [$this, 'plain_classes_autocomplete'], 99999999);
        }

        // ------------------------------------------------------------------------
        // Load Tailwind CSS Conditions vs CDN
        // ------------------------------------------------------------------------

        $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

        // Always load compiled CSS (output.css) when in Oxygen editor iframe only
        if (Builders::isOxygenEditorFrame()) {
            add_action('wp_head', [$this, 'enqueue_compiled_css'], 9999);
        }

        // Load compiler and dev tools only if dev mode is NOT disabled AND only in iframe
        // This prevents the browser compiler from breaking Oxygen's main builder UI
        if (!$dev_mode_disabled && Builders::isOxygenEditorFrame()) {
            add_action('wp_enqueue_scripts', [$this, 'load_tailwind_cdn'], 10000);

            // Load broadcast listener for real-time updates from admin
            add_action('wp_enqueue_scripts', [$this, 'enqueue_broadcast_listener'], 10000001);
        }

        if ($settings['dequeue_styles_oxygen'] ?? false) {
            self::dequeue_styles();
            self::enqueue_styles();
        } else if($settings['autocomplete_oxygen'] ?? false) {
            self::enqueue_styles();
        }
    }

    // ------------------------------------------------------------------------
    // Load Tailwind CDN Scripts
    // ------------------------------------------------------------------------
    public function load_tailwind_cdn()
    {
        ProvidersHelpers::framework_scripts('.oxygen-body');
    }

    // ------------------------------------------------------------------------
    // Get Winden Cached CSS
    // ------------------------------------------------------------------------

    public function enqueue_compiled_css()
    {
        ProvidersHelpers::load_compiled_css(Builders::isOxygenEditorFrame());
    }

    // ------------------------------------------------------------------------
    // Get Winden Plain Classes Autocomplete
    // ------------------------------------------------------------------------

    public function plain_classes_autocomplete_html()
    {
        static $executed = false;
        if ($executed) {
            return;
        }
        $executed = true;

        echo '<div class="oxygen-custom-toolbar-extension">
            <div>
                <label class="windauto-control-label oxygen-control-label">Plain Classes</label>
            </div>
            
            <div class="plain-classes-box" id="plain-classes-autocomplete" />
        </div>';
    }

    public function plain_classes_autocomplete()
    {
        ProvidersHelpers::plain_classes_autocomplete($this->getAutocompleteFolder());
    }

    // ------------------------------------------------------------------------
    // Dequeue styles
    // ------------------------------------------------------------------------

    public static function dequeue_styles()
    {
        $selectors = ['#ct-id-styles', '#ct-footer-css', '#ct-page-settings-styles', '#oxygen-global-settings-styles', '#ct-class-styles'];

        wp_enqueue_script(
            'dequeue-elements',
            'https://'
        );

        wp_add_inline_script('dequeue-elements', '
            document.addEventListener("DOMContentLoaded", function() {
                if(!window.angular) return;
                
                var dequeue_elements = ' . json_encode($selectors) . ';

                if(dequeue_elements?.length) {
                    var intervalId = setInterval(function() {
                        let tagsRemoved = false;

                        dequeue_elements.map(dequeue_element => {
                            if(document.querySelector(dequeue_element)) {
                                document.querySelector(dequeue_element).remove();
                                tagsRemoved = true;
                            }
                        })

                        if (!tagsRemoved) {
                            clearInterval(intervalId);
                        }
                    }, 500);
                }
            });
        ');
    }

    // ------------------------------------------------------------------------
    // Enqueue styles
    // ------------------------------------------------------------------------

    public static function enqueue_styles()
    {
        wp_enqueue_style(
            'enqueue-elements',
            'https://'
        );

        wp_add_inline_style('enqueue-elements', '#oxygen-sidebar > div.oxygen-sidebar-top { height: 100% !important; }');
    }

    protected function getAutocompleteFolder()
    {
        return 'oxygen';
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

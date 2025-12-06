<?php

namespace Winden\Pro\Providers;

use Winden\App\Helpers\SettingsOptions;
use Winden\App\Assets\Providers\ProvidersHelpers;
use Winden\App\Assets\Providers\BaseProvider;
use Winden\App\Helpers\Builders;

class Oxygen6 extends BaseProvider
{
    // Static flag to prevent duplicate asset loading (same logic as oxygen6-tailwind-loader.php)
    private static $assets_loaded = false;

    protected function setupHooks()
    {
        add_filter('script_loader_tag', [$this, 'modify_script_loader_tag'], 10, 3);
        add_action('init', [$this, 'load_condition']);
        add_action('wp_footer', [$this, 'frontend_consts']);
        add_action('unofficial_i_am_kevin_geary_master_of_all_things_css_and_html', array($this, 'inline_styles'));
    }

    public function load_condition()
    {
        $settings = SettingsOptions::getWindenOptions();
        
        // ------------------------------------------------------------------------
        // Load plain classes (same approach as Oxygen.php)
        // ------------------------------------------------------------------------	
        if ($settings['autocomplete_oxygen6'] ?? false) {
            // Use Oxygen6 specific hooks for the autocomplete interface (similar to Oxygen.php pattern)
            add_action('wp_enqueue_scripts', [$this, 'plain_classes_autocomplete'], 99999999);
        }
        
        // ------------------------------------------------------------------------
        // Load Tailwind CSS Conditions vs CDN
        // ------------------------------------------------------------------------

        $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

        // Always load compiled CSS (output.css) when in Oxygen6 editor
        if (Builders::isOxygen6Editor() || Builders::isOxygen6EditorFrame()) {
            add_action('wp_head', [$this, 'enqueue_compiled_css'], 9999);
        }

        // Load compiler and dev tools:
        // - Always load in editor context (for real-time compilation while editing)
        // - Only skip on frontend when dev mode is disabled
        $in_editor = Builders::isOxygen6Editor() || Builders::isOxygen6EditorFrame();

        if ($in_editor || !$dev_mode_disabled) {
            add_action('wp_enqueue_scripts', [$this, 'load_tailwind_cdn'], 10000);
            // Oxygen6 specific hooks for better integration
            add_action('breakdance_loaded', [$this, 'load_tailwind_cdn'], 999);
            add_action('unofficial_i_am_kevin_geary_master_of_all_things_css_and_html', [$this, 'load_tailwind_cdn']);
            add_action('oxygen_enqueue_frontend_scripts', [$this, 'load_tailwind_cdn'], 999999);
            add_action('wp_head', [$this, 'load_tailwind_cdn'], 999999);

            // Load broadcast listener for real-time updates from admin
            if ($in_editor) {
                add_action('wp_enqueue_scripts', [$this, 'enqueue_broadcast_listener'], 10000001);
            }
        }
    }

    // ------------------------------------------------------------------------
    // Load Tailwind CDN Scripts
    // ------------------------------------------------------------------------
    public function load_tailwind_cdn()
    {
        // Only load in Oxygen6 builder context
        if (!Builders::isOxygen6Editor()) {
            return;
        }

        // Prevent duplicate asset loading (same logic as oxygen6-tailwind-loader.php)
        if (self::$assets_loaded) {
            return;
        }

        // Mark assets as loaded
        self::$assets_loaded = true;

        // Use framework_scripts for Tailwind v4 (CSS-based @theme config)
        ProvidersHelpers::framework_scripts('.oxygen.canvas');

        // ------------------------------------------------------------------------
        // Get Winden Autocomplete Values
        // ------------------------------------------------------------------------
        ProvidersHelpers::cdn_scripts_autocomplete();

        // ------------------------------------------------------------------------
        // Add crawled classes to autocomplete
        // ------------------------------------------------------------------------
        $this->add_crawled_classes_to_autocomplete();

    }

    // ------------------------------------------------------------------------
    // Get Winden Cached CSS
    // ------------------------------------------------------------------------

    public function enqueue_compiled_css()
    {
        ProvidersHelpers::load_compiled_css(Builders::isOxygen6Editor() || Builders::isOxygen6EditorFrame());
    }

    // ------------------------------------------------------------------------
    // Get Winden Plain Classes Autocomplete (same approach as Oxygen.php)
    // ------------------------------------------------------------------------

    public function plain_classes_autocomplete()
    {
        // Add duplication prevention (keeping the logic that works)
        static $plain_classes_loaded = false;
        if ($plain_classes_loaded) {
            return;
        }
        $plain_classes_loaded = true;

        // Use standard Winden approach (same as Oxygen.php)
        ProvidersHelpers::plain_classes_autocomplete($this->getAutocompleteFolder());
        
        // Always load CSS in both contexts for Oxygen 6
        $asset_file_path = WINDEN_PLUGIN_DIR . 'build/plain-classes/oxygen6/index.asset.php';
        if (file_exists($asset_file_path)) {
            $asset_file = include $asset_file_path;
            
            // Also load CSS in main builder context if we're in iframe
            if (Builders::isOxygen6EditorFrame()) {
                add_action('wp_head', function() use ($asset_file) {
                    wp_enqueue_style(
                        'dp-pcoc-editor-style-main',
                        WINDEN_PLUGIN_URL . 'build/plain-classes/oxygen6/index.css',
                        [],
                        $asset_file['version']
                    );
                }, 9999);
            }
        }
    }

    // ------------------------------------------------------------------------
    // Enqueue styles
    // ------------------------------------------------------------------------

    public static function inline_styles() {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- URL is from trusted plugin constant
        echo '<link rel="stylesheet" type="text/css" href="' . esc_url(WINDEN_PLUGIN_URL . 'build/plain-classes/oxygen6/index.css') . '">';
    }

    protected function getAutocompleteFolder()
    {
        return 'oxygen6';
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

    /**
     * Add crawled classes to the autocomplete system
     */
    private function add_crawled_classes_to_autocomplete()
    {
        // Add JavaScript to fetch and merge crawled classes
        $script = "
        <script>
        (function() {
            // Function to fetch crawled classes and merge with autocomplete
            async function fetchAndMergeCrawledClasses() {
                try {
                    // Use window.ajaxurl which is set by framework_scripts()
                    const ajaxUrl = window.ajaxurl || '/wp-admin/admin-ajax.php';
                    const response = await fetch(ajaxUrl + '?action=get_crawled_classes', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'action=get_crawled_classes'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success && data.data.classes && Array.isArray(data.data.classes)) {
                        const crawledClasses = data.data.classes;
                        
                        // Merge crawled classes with existing autocomplete
                        if (window.winden_autocomplete && Array.isArray(window.winden_autocomplete)) {
                            // Merge and remove duplicates
                            window.winden_autocomplete = [...new Set([...window.winden_autocomplete, ...crawledClasses])];
                            console.log('Oxygen6: Merged', crawledClasses.length, 'crawled classes with autocomplete');
                        } else if (window.winden_autocomplete && typeof window.winden_autocomplete === 'object') {
                            // Convert object to array and merge
                            const existingClasses = Object.values(window.winden_autocomplete);
                            const mergedClasses = [...new Set([...existingClasses, ...crawledClasses])];
                            window.winden_autocomplete = mergedClasses;
                            console.log('Oxygen6: Merged', crawledClasses.length, 'crawled classes with autocomplete object');
                        } else {
                            // Set as array if no existing autocomplete
                            window.winden_autocomplete = crawledClasses;
                            console.log('Oxygen6: Set', crawledClasses.length, 'crawled classes as autocomplete');
                        }
                        
                        // Also update parent window if in iframe
                        if (window.parent && window.parent !== window) {
                            window.parent.winden_autocomplete = window.winden_autocomplete;
                        }
                    }
                } catch (error) {
                    console.warn('Oxygen6: Failed to fetch crawled classes:', error);
                }
            }
            
            // Wait for autocomplete to be available, then merge crawled classes
            const waitForAutocomplete = setInterval(() => {
                if (window.winden_autocomplete) {
                    clearInterval(waitForAutocomplete);
                    fetchAndMergeCrawledClasses();
                }
            }, 100);
            
            // Also try to fetch immediately in case autocomplete is already available
            setTimeout(() => {
                if (window.winden_autocomplete) {
                    fetchAndMergeCrawledClasses();
                }
            }, 500);
        })();
        </script>
        ";

        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Script is hardcoded, no user input
        echo $script;
    }
}

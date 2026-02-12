<?php namespace Winden\App\Assets\Providers;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Winden\App\Helpers\SettingsOptions;
use Winden\App\Assets\Providers\ProvidersHelpers;

class FSE extends BaseProvider
{
    protected function setupHooks()
    {
        add_filter('script_loader_tag', [$this, 'modify_script_loader_tag'], 10, 3);
        add_action('current_screen', [$this, 'load_condition']);
        add_action('wp_footer', [$this, 'frontend_consts']);
    }

    public function load_condition()
    {
        $settings = SettingsOptions::getWindenOptions();
        $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

        // Standard WordPress hook for block editor assets
        add_action('enqueue_block_editor_assets', [$this, 'enqueue_block_editor_assets']);

        // Hook for iframe injection (WordPress 5.8+)
        add_filter('block_editor_settings_all', [$this, 'inject_iframe_styles'], 10, 2);

        // Load autocomplete if enabled
        // Priority 999 ensures Winden loads AFTER other plugins' editors (like Monaco)
        $windenClassesEnabled = $settings['winden_classes_gutenberg'] ?? false;

        // Plain Classes - only if Winden Classes is NOT enabled
        if (($settings['autocomplete_gutenberg'] ?? false) && !$windenClassesEnabled) {
            add_action('enqueue_block_editor_assets', [$this, 'plain_classes_autocomplete'], 999);
        }

        // Winden Classes
        if ($windenClassesEnabled) {
            add_action('enqueue_block_editor_assets', [$this, 'enqueue_winden_classes_autocomplete'], 999);
        }
    }

    /**
     * Enqueue block editor assets for the PARENT page only
     *
     * IMPORTANT: This method loads scripts in the WordPress admin shell (parent page).
     * - Compiler: Loaded here for post-save compilation functionality
     * - Watcher: NOT loaded here - it's injected into iframe via inject_iframe_styles()
     *            Loading watcher in parent would style the WordPress admin UI with user's Tailwind CSS
     * - Broadcast listener: Loaded for real-time sync across tabs
     */
    public function enqueue_block_editor_assets()
    {
        $settings = SettingsOptions::getWindenOptions();
        $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

        // NOTE: CSS is NOT enqueued here - it's injected into iframe via inject_iframe_styles()
        // This prevents Winden styles from affecting the WordPress admin UI

        // If dev mode is enabled, load compiler and watcher scripts
        if (!$dev_mode_disabled) {
            // Load the compiler with inline config
            ProvidersHelpers::enqueueCompilerWithOptions();

            // NOTE: Watcher script is NOT loaded in parent page
            // It's injected into the iframe via inject_iframe_styles() to avoid styling the admin UI
            // The watcher applies live Tailwind styles, which should only affect the content iframe

            // Load broadcast listener for real-time updates
            ProvidersHelpers::enqueueBroadcastListener();

            // Add autocomplete generation
            $this->enqueue_autocomplete_generator();
        }
    }

    /**
     * Inject styles into iframe for WordPress 5.9+ block editor
     */
    public function inject_iframe_styles($editor_settings, $context)
    {
        $settings = SettingsOptions::getWindenOptions();
        $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

        // Get the uploads directory info
        $upload_dir = wp_upload_dir();
        $css_file_path = $upload_dir['basedir'] . '/winden/output.css';
        $css_file_url = $upload_dir['baseurl'] . '/winden/output.css';

        // Initialize __unstableResolvedAssets if not set
        if (!isset($editor_settings['__unstableResolvedAssets'])) {
            $editor_settings['__unstableResolvedAssets'] = array(
                'styles' => '',
                'scripts' => '',
            );
        }

        /**
         * Inject CSS into Gutenberg block editor iframe
         *
         * IMPORTANT: This uses __unstableResolvedAssets, which is the ONLY official way
         * to inject styles into the block editor iframe in WordPress 5.8+.
         * wp_enqueue_style() cannot be used here because it loads in the parent window,
         * not the isolated iframe where content is edited.
         *
         * Reference: https://github.com/WordPress/gutenberg/pull/23727
         * Reference: https://make.wordpress.org/core/2021/06/29/blocks-in-an-iframed-template-editor/
         */
        if (file_exists($css_file_path)) {
            $version = filemtime($css_file_path);
            $editor_settings['__unstableResolvedAssets']['styles'] .= sprintf(
                // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedStylesheet -- Official Gutenberg iframe API (see docs at line 126-132)
                '<link rel="stylesheet" id="winden-compiled-css-iframe" href="%s?ver=%s" media="all" />',
                esc_url($css_file_url),
                esc_attr($version)
            );
        }

        // If dev mode is enabled, inject compiler scripts into iframe
        if (!$dev_mode_disabled) {
            // Add global variables - all values escaped via wp_json_encode()
            $compiler_options = $this->get_compiler_options($settings);
            $globals_js = sprintf(
                'window.uploadUrl = %s; window.ajaxurl = %s; window.tailwind_compiler_options = %s;',
                wp_json_encode(WINDTACS_UPLOADS_URL['baseurl']),
                wp_json_encode(admin_url('admin-ajax.php')),
                wp_json_encode($compiler_options)
            );

            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Values escaped via wp_json_encode above
            $editor_settings['__unstableResolvedAssets']['scripts'] .= sprintf(
                '<script id="winden-globals-iframe">%s</script>',
                $globals_js
            );

            /**
             * Inject scripts into Gutenberg block editor iframe
             *
             * IMPORTANT: These scripts MUST run inside the iframe (not parent window)
             * to compile Tailwind CSS for the actual content being edited.
             * wp_enqueue_script() loads in parent window only.
             *
             * __unstableResolvedAssets is the official Gutenberg API for iframe injection.
             * Reference: https://github.com/WordPress/gutenberg/pull/23727
             */

            // Add compiler script
            $compiler_path = WINDTACS_PLUGIN_DIR . 'build/compiler/tailwindcss-compiler.js';
            if (file_exists($compiler_path)) {
                $compiler_url = WINDTACS_PLUGIN_URL . 'build/compiler/tailwindcss-compiler.js?ver=' . filemtime($compiler_path);
                $editor_settings['__unstableResolvedAssets']['scripts'] .= sprintf(
                    // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedScript -- Official Gutenberg iframe API (see docs at line 160-169)
                    '<script src="%s" id="winden-compiler-iframe"></script>',
                    esc_url($compiler_url)
                );
            }

            // Add watcher script
            $watcher_path = WINDTACS_PLUGIN_DIR . 'assets/tailwindcss-watcher.js';
            if (file_exists($watcher_path)) {
                $watcher_url = WINDTACS_ASSETS_DIR . 'tailwindcss-watcher.js?ver=' . filemtime($watcher_path);
                $editor_settings['__unstableResolvedAssets']['scripts'] .= sprintf(
                    // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedScript -- Official Gutenberg iframe API (see docs at line 160-169)
                    '<script src="%s" id="winden-watcher-iframe"></script>',
                    esc_url($watcher_url)
                );
            }

            // Add broadcast listener
            $broadcast_path = WINDTACS_PLUGIN_DIR . 'assets/broadcast-listener.js';
            if (file_exists($broadcast_path)) {
                $broadcast_url = WINDTACS_ASSETS_DIR . 'broadcast-listener.js?ver=' . filemtime($broadcast_path);
                $editor_settings['__unstableResolvedAssets']['scripts'] .= sprintf(
                    // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedScript -- Official Gutenberg iframe API (see docs at line 160-169)
                    '<script src="%s" id="winden-broadcast-iframe"></script>',
                    esc_url($broadcast_url)
                );
            }

            // Add autocomplete generation script
            // Note: get_autocomplete_js() returns static hardcoded JS (no user input)
            $autocomplete_js = $this->get_autocomplete_js() . "
                generateWindenAutocomplete();
                setTimeout(generateWindenAutocomplete, 1000);
                setTimeout(generateWindenAutocomplete, 3000);
            ";

            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static hardcoded JS function from get_autocomplete_js()
            $editor_settings['__unstableResolvedAssets']['scripts'] .= sprintf(
                '<script id="winden-autocomplete-iframe">%s</script>',
                $autocomplete_js
            );
        }

        return $editor_settings;
    }

    /**
     * Enqueue autocomplete generation script for non-iframe mode
     */
    private function enqueue_autocomplete_generator()
    {
        $autocomplete_js = $this->get_autocomplete_js() . "
        // Generate autocomplete on load and with delays for dynamic content
        if (typeof generateWindenAutocomplete === 'function') {
            generateWindenAutocomplete();
            setTimeout(generateWindenAutocomplete, 1000);
            setTimeout(generateWindenAutocomplete, 3000);
        }
        ";

        wp_add_inline_script('winden-compiler-module', $autocomplete_js);
    }

    protected function getAutocompleteFolder()
    {
        return 'gutenberg';
    }

    /**
     * Enqueue Winden Classes autocomplete for Gutenberg
     * Adds autocomplete to the native "Additional CSS class(es)" field
     */
    public function enqueue_winden_classes_autocomplete()
    {
        // Load the core autocomplete library
        ProvidersHelpers::enqueueWindenClassesCore();

        // Then load the Gutenberg integration (Free feature)
        $js_path = WINDTACS_PLUGIN_DIR . 'build/winden-classes/gutenberg/index.js';
        $css_path = WINDTACS_PLUGIN_DIR . 'build/winden-classes/gutenberg/index.css';
        $asset_file_path = WINDTACS_PLUGIN_DIR . 'build/winden-classes/gutenberg/index.asset.php';

        if (!file_exists($js_path)) {
            return;
        }

        // Load dependencies and version from asset file
        $asset = file_exists($asset_file_path) ? include($asset_file_path) : [];
        $version = $asset['version'] ?? filemtime($js_path);
        $dependencies = $asset['dependencies'] ?? [];

        // Add autocomplete library as dependency
        $dependencies[] = 'winden-tailwind-autocomplete';

        wp_enqueue_script(
            'winden-classes-gutenberg',
            WINDTACS_PLUGIN_URL . 'build/winden-classes/gutenberg/index.js',
            $dependencies,
            $version,
            true
        );

        // Load CSS if exists
        if (file_exists($css_path)) {
            wp_enqueue_style(
                'winden-classes-gutenberg',
                WINDTACS_PLUGIN_URL . 'build/winden-classes/gutenberg/index.css',
                [],
                filemtime($css_path)
            );
        }

        ProvidersHelpers::localizeWindenClassesData('winden-classes-gutenberg', 'windenGutenbergClasses', [
            'splitMode' => get_option('winden_split_mode', false),
        ]);
    }

    public function frontend_consts()
    {
        ProvidersHelpers::frontend_consts();
    }

    /**
     * Get compiler options from settings - uses shared helper
     */
    private function get_compiler_options($settings)
    {
        return ProvidersHelpers::get_compiler_options('');
    }

    /**
     * Generate autocomplete JavaScript function - uses shared helper
     */
    private function get_autocomplete_js()
    {
        return ProvidersHelpers::get_autocomplete_js();
    }
}
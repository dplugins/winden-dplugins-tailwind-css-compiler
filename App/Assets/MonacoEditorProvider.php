<?php namespace Winden\App\Assets;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class MonacoEditorProvider
{
    /**
     * Enqueue Monaco Editor assets for other plugins to use
     */
    public static function enqueueMonacoEditor()
    {
        // Get autocomplete data
        $autocomplete_data = self::getAutocompleteData();

        // Allow other plugins to filter the autocomplete classes
        $classes = apply_filters('winden_monaco_autocomplete_classes', $autocomplete_data['classes'] ?? []);
        $suggestions = apply_filters('winden_monaco_autocomplete_suggestions', $autocomplete_data['suggestions'] ?? []);

        // Always use v4
        $tailwind_version = 'v4';

        // Create a script handle to attach data to
        wp_enqueue_script(
            'winden-monaco-data',
            false,
            [],
            '1.0.0',
            true
        );

        // Expose Tailwind autocomplete data to JavaScript
        $inline_script = sprintf(
            'window.windenMonacoData = %s;',
            wp_json_encode([
                'classes' => array_values($classes),
                'suggestions' => array_values($suggestions),
                'tailwindVersion' => $tailwind_version,
                'pluginUrl' => WINDEN_PLUGIN_URL,
                'uploadsUrl' => wp_upload_dir()['baseurl'],
            ])
        );

        wp_add_inline_script('winden-monaco-data', $inline_script);
    }

    /**
     * Enqueue plain classes autocomplete for other plugins (HTML class attribute autocomplete)
     * This is the same autocomplete used in Bricks, Oxygen, etc.
     */
    public static function enqueuePlainClassesAutocomplete()
    {
        // Get autocomplete data
        $autocomplete_data = self::getAutocompleteData();

        // Allow other plugins to filter the autocomplete classes
        $classes = apply_filters('winden_plain_classes_autocomplete', $autocomplete_data['classes'] ?? []);
        $screens = apply_filters('winden_plain_classes_screens', $autocomplete_data['screens'] ?? []);

        // Always use v4
        $tailwind_version = 'v4';

        // Create a temporary script handle to attach data to
        wp_enqueue_script(
            'winden-plain-classes-data',
            false,
            [],
            '1.0.0',
            true
        );

        // Expose autocomplete data globally for other plugins
        $inline_script = sprintf(
            'window.winden_autocomplete = %s; window.winden_autocomplete_screens = %s;',
            wp_json_encode(array_values($classes)),
            wp_json_encode(array_values($screens))
        );

        wp_add_inline_script('winden-plain-classes-data', $inline_script);

        // Load the Tailwind compiler and autocomplete functionality
        self::loadTailwindCompiler();
    }

    /**
     * Load Tailwind compiler for generating autocomplete data
     */
    private static function loadTailwindCompiler()
    {
        $settings = \Winden\App\Helpers\SettingsOptions::getWindenOptions();

        // Always use v4
        wp_enqueue_script(
            'winden-cachejs',
            WINDEN_PLUGIN_URL . 'build/compiler/tailwindcss-compiler.js',
            [],
            null,
            true
        );

        // Build v4 @config directive
        $wizzard_state = '@config "' . wp_upload_dir()['baseurl'] . '/winden/tailwind.config.js"; ';

        $winden_editor = get_option('winden_editor');
        if (isset($winden_editor['wizzard']['configCode'])) {
            $wizzard_state .= $winden_editor['wizzard']['configCode'];
        }

        $compiler_options = [
            'tailwind_version' => 'v4',
            'css_preprocessor' => $settings['css_preprocessor'] ?? 'css',
            'important' => '',
            'custom_css' => $wizzard_state,
        ];

        wp_enqueue_script(
            'winden-compiler-options',
            false,
            ['winden-cachejs'],
            null,
            true
        );

        $inline_options = 'window.tailwind_compiler_options = ' . wp_json_encode($compiler_options) . ';';
        wp_add_inline_script('winden-compiler-options', $inline_options);

        // Note: SCSS compilation is handled by the bundled Dart Sass in build/scss-compiler/sass.dart.min.js
        // which is loaded automatically by the Tailwind compiler when needed

        // Load the Tailwind watcher (watches DOM changes and triggers compilation)
        wp_enqueue_script(
            'winden-tailwind-watcher',
            WINDEN_ASSETS_DIR . 'tailwindcss-watcher.js',
            ['winden-cachejs', 'winden-compiler-options'],
            filemtime(WINDEN_PLUGIN_DIR . 'assets/tailwindcss-watcher.js'),
            true
        );
    }

    /**
     * Get cached autocomplete data from Winden
     *
     * @return array Array with 'classes', 'suggestions', and 'screens' keys
     */
    public static function getAutocompleteData()
    {
        // Get cached classes from the cache status
        $cache_status = get_option('winden_cache_status');
        $classes = [];

        if ($cache_status && isset($cache_status['classes'])) {
            $classes = is_array($cache_status['classes']) ? $cache_status['classes'] : [];
        }

        // v4 suggestions only
        $suggestions = ['@apply', '@config', '@layer', '@screen', '@tailwind', '@theme', '@utility', '@variant'];

        // Get breakpoints/screens
        $screens = [];
        $winden_editor = get_option('winden_editor');
        if (isset($winden_editor['wizzard']['breakpoints'])) {
            $breakpoints = $winden_editor['wizzard']['breakpoints'];
            if (is_array($breakpoints)) {
                foreach ($breakpoints as $breakpoint) {
                    if (isset($breakpoint['name'])) {
                        $screens[] = $breakpoint['name'];
                    }
                }
            }
        }

        // Default Tailwind breakpoints if none are set
        if (empty($screens)) {
            $screens = ['sm', 'md', 'lg', 'xl', '2xl'];
        }

        return [
            'classes' => $classes,
            'suggestions' => $suggestions,
            'screens' => $screens
        ];
    }

    /**
     * Register WordPress hooks for Monaco editor integration
     * This allows other plugins to use Winden's Monaco + Tailwind autocomplete
     */
    public static function registerMonacoHooks()
    {
        // Action hook for other plugins to enqueue Monaco editor
        add_action('admin_enqueue_scripts', function () {
            // Monaco editor for code editing (CSS/SCSS)
            if (did_action('winden_request_monaco_editor')) {
                self::enqueueMonacoEditor();
            }

            // Plain classes autocomplete for HTML class attributes
            if (did_action('winden_request_plain_classes_autocomplete')) {
                self::enqueuePlainClassesAutocomplete();
            }
        }, 20);

        // Filter hooks for customizing Monaco autocomplete data
        add_filter('winden_monaco_autocomplete_classes', function ($classes) {
            return $classes;
        }, 10, 1);

        add_filter('winden_monaco_autocomplete_suggestions', function ($suggestions) {
            return $suggestions;
        }, 10, 1);

        // Filter hooks for customizing plain classes autocomplete data
        add_filter('winden_plain_classes_autocomplete', function ($classes) {
            return $classes;
        }, 10, 1);

        add_filter('winden_plain_classes_screens', function ($screens) {
            return $screens;
        }, 10, 1);
    }

    /**
     * Get Monaco editor configuration for loading
     *
     * @return array Configuration array with paths
     */
    public static function getMonacoConfig()
    {
        return [
            'paths' => [
                'vs' => WINDEN_PLUGIN_URL . 'node_modules/monaco-editor/min/vs'
            ]
        ];
    }
}

<?php namespace Winden\App\Assets\Providers;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Winden\App\Helpers\Builders;
use Winden\App\Helpers\SettingsOptions;

class ProvidersHelpers
{
    // ------------------------------------------------------------------------
    // Modify Script Loader Tag to add type="inline-module"
    // ------------------------------------------------------------------------

    public static function modify_script_loader_tag($tag, $handle, $src)
    {
        // Define a list of handles and their respective attributes
        $attributes_map = [
            // 'inline-module-js'    => 'setup="false"',
            'winden-config' => 'type="inline-module"',
            'tailwind-config' => 'type="module"',
            'winden-autocomplete' => 'type="module"',
        ];

        // Check if the handle exists in the attributes map
        if (isset($attributes_map[$handle])) {
            // Modify the script tag to include the desired attributes
            $tag = str_replace('<script ', '<script ' . $attributes_map[$handle] . ' ', $tag);
        }

        return $tag;
    }

    // ------------------------------------------------------------------------
    // Get Winden Editor Content (Wizzard, Style tab, Config tab)
    // Returns array with custom_css, style_css, config_content
    // ------------------------------------------------------------------------

    public static function get_editor_content()
    {
        $wizzard_state = '';
        $style_css = '';
        $config_content = '';

        try {
            $wizzard_state_opt = get_option('winden_dplugins_editor');
            if (isset($wizzard_state_opt['wizzard']) && isset($wizzard_state_opt['wizzard']['configCode'])) {
                $wizzard_state = $wizzard_state_opt['wizzard']['configCode'];
            }
            // Get Style tab content (scss/css with @utility, @layer, etc.)
            if (isset($wizzard_state_opt['scss'])) {
                $style_css = $wizzard_state_opt['scss'];
            }
            // Get Config tab content (JavaScript config for @config directive)
            if (isset($wizzard_state_opt['javascript'])) {
                $config_content = $wizzard_state_opt['javascript'];
            }
        } catch (\Throwable $th) {
            // Silent fail
        }

        return [
            'custom_css' => $wizzard_state,
            'style_css' => $style_css,
            'config_content' => $config_content,
        ];
    }

    // ------------------------------------------------------------------------
    // Get Compiler Options for Tailwind v4
    // Returns array ready for JSON encoding to window.tailwind_compiler_options
    // ------------------------------------------------------------------------

    public static function get_compiler_options($important = '')
    {
        $settings = SettingsOptions::getWindenOptions();
        $editor_content = self::get_editor_content();

        $compiler_options = [
            'tailwind_version' => 'v4',
            'css_preprocessor' => !empty($settings['css_preprocessor']) ? $settings['css_preprocessor'] : 'css',
            'important' => $important,
            'custom_css' => $editor_content['custom_css'],
            'style_css' => $editor_content['style_css'],
            'config_content' => $editor_content['config_content'],
        ];

        // Ensure we never have false values that would prevent Tailwind from working
        if (empty($compiler_options['css_preprocessor']) || $compiler_options['css_preprocessor'] === false) {
            $compiler_options['css_preprocessor'] = 'css';
        }

        return $compiler_options;
    }

    // ------------------------------------------------------------------------
    // Get Autocomplete JavaScript Function
    // Returns JS code that generates autocomplete classes from Tailwind compiler
    // ------------------------------------------------------------------------

    public static function get_autocomplete_js()
    {
        return "
        function generateWindenAutocomplete() {
            if (typeof window.tailwindifyClasses === 'function') {
                // Get all content from compiler options
                var customCss = window.tailwind_compiler_options?.custom_css || '';
                var styleCss = window.tailwind_compiler_options?.style_css || '';
                var configContent = window.tailwind_compiler_options?.config_content || '';

                // Build CSS: imports + Wizzard @theme + Style tab content
                var fullCss = '@layer theme, base, components, utilities;\\n';
                fullCss += '@import \"tailwindcss/theme.css\" layer(theme);\\n';
                fullCss += '@import \"tailwindcss/utilities.css\" layer(utilities);\\n';

                // Add Wizzard @theme config
                if (customCss) {
                    fullCss += customCss + '\\n';
                }

                // Add Style tab content (includes @utility definitions)
                if (styleCss) {
                    fullCss += styleCss + '\\n';
                }

                // Pass config content as second parameter for @config directive support
                window.tailwindifyClasses(fullCss, configContent).then(function(result) {
                    var allClasses = result.classes || [];

                    // Store for autocomplete (both current window and parent for iframe support)
                    window.winden_autocomplete = allClasses;
                    if (window.parent && window.parent !== window) {
                        window.parent.winden_autocomplete = allClasses;
                    }
                }).catch(function(error) {
                    console.error('[Winden] Error generating autocomplete:', error);
                });
            }
        }
        ";
    }

    // ------------------------------------------------------------------------
    // Get Winden CSS Content (legacy - for backward compatibility)
    // Latter on we will pass this inside javascript variable to be loaded after tailwindconfig
    // ------------------------------------------------------------------------

    public static function get_css_content()
    {
        $winden_editor = get_option('winden_dplugins_editor');
        $raw_css_content = isset($winden_editor['scss']) ? $winden_editor['scss'] : '';
        $compiled_css_content = isset($winden_editor['compiled_scss']) ? $winden_editor['compiled_scss'] : '';

        $css_content = '';
        if (!empty($compiled_css_content)) {
            $css_content .= $compiled_css_content;
        } else {
            $css_content .= $raw_css_content;
        }

        return $css_content;
    }

    public static function enqueue_autocomplete_scripts()
    {
        // Use consistent handle 'winden-compiler-module' to match AutoCompile.php
        $compiler_handle = 'winden-compiler-module';

        // Only enqueue if not already enqueued
        if (!wp_script_is($compiler_handle, 'enqueued')) {
            wp_enqueue_script(
                $compiler_handle,
                WINDTACS_PLUGIN_URL . 'build/compiler/tailwindcss-compiler.js',
                [],
                filemtime(WINDTACS_PLUGIN_DIR . 'build/compiler/tailwindcss-compiler.js'),
                true
            );
        }

        // Register script with empty string to allow inline content attachment
        // Using wp_register_script + wp_enqueue_script pattern for inline-only scripts
        wp_register_script('winden-autocomplete', '', [$compiler_handle], null, true);
        wp_enqueue_script('winden-autocomplete');

        // Use shared autocomplete JS function
        $autocomplete_js = self::get_autocomplete_js();
        $inline_winden_autocomplete = $autocomplete_js . '
            // Generate autocomplete on load
            generateWindenAutocomplete();
            setTimeout(generateWindenAutocomplete, 1000);
            setTimeout(generateWindenAutocomplete, 3000);
		';
        wp_add_inline_script('winden-autocomplete', $inline_winden_autocomplete);
    }

    // ------------------------------------------------------------------------
    // Get Winden Compiled CSS
    // -----------------------------------------------------------------------

    public static function reorder_styles_queue()
    {
        global $wp_styles;

        $winden_style_key = array_search('winden-compiled-css', $wp_styles->queue);
        if ($winden_style_key !== false) {
            unset($wp_styles->queue[$winden_style_key]);
            $wp_styles->queue[] = 'winden-compiled-css';
        }
    }

    public static function load_compiled_css($reorder = true)
    {
        $settings = SettingsOptions::getWindenOptions();
        $inline_css = $settings['inline_compiled_css'] ?? false;

        $upload_dir = wp_upload_dir();
        $css_file_path = $upload_dir['basedir'] . '/winden/output.css';
        $css_file_url = $upload_dir['baseurl'] . '/winden/output.css';

        if (file_exists($css_file_path)) {
            if ($inline_css) {
                // Inline the CSS instead of loading as external file
                $css_content = file_get_contents($css_file_path);
                if ($css_content !== false) {
                    wp_register_style('winden-compiled-css', false);
                    wp_enqueue_style('winden-compiled-css');
                    wp_add_inline_style('winden-compiled-css', $css_content);
                }
            } else {
                // Load as external file (default behavior)
                wp_enqueue_style('winden-compiled-css', $css_file_url, array(), filemtime($css_file_path));
            }

            if ($reorder) {
                self::reorder_styles_queue();
            }
        }
    }

    // ------------------------------------------------------------------------
    // Get Winden Plain Classes Autocomplete
    // Since only folder name is different we can reuse them
    // -----------------------------------------------------------------------

    public static function plain_classes_autocomplete($folder_name)
    {
        // Pro integrations (bricks, elementor, oxygen, oxygen6) are in pro/build/
        // Free integrations (gutenberg, winauto-component) are in build/
        $pro_integrations = ['bricks', 'elementor', 'oxygen', 'oxygen6'];

        if (in_array($folder_name, $pro_integrations)) {
            $build_dir = 'pro/build/plain-classes/';
        } else {
            $build_dir = 'build/plain-classes/';
        }

        $asset_file_path = WINDTACS_PLUGIN_DIR . $build_dir . $folder_name . '/index.asset.php';

        // Check if the asset file exists for JS
        if (file_exists($asset_file_path)) {
            $asset_file = include $asset_file_path;

            // Use unique handle for each integration to prevent conflicts
            $script_handle = 'winden-autocomplete-' . $folder_name;
            $style_handle = 'winden-autocomplete-' . $folder_name . '-style';

            // Enqueue the JS with dependencies and version
            wp_enqueue_script(
                $script_handle, // Unique handle for each integration
                WINDTACS_PLUGIN_URL . $build_dir . $folder_name . '/index.js', // JS file path
                $asset_file['dependencies'], // JS dependencies from asset file
                $asset_file['version'], // JS version from asset file
                true // In footer
            );

            // Add defer strategy to avoid blocking other plugins' scripts (WP 6.3+)
            wp_script_add_data($script_handle, 'strategy', 'defer');

            // Enqueue the CSS with version matching the JS version for cache-busting
            wp_enqueue_style(
                $style_handle, // Unique handle for CSS
                WINDTACS_PLUGIN_URL . $build_dir . $folder_name . '/index.css', // CSS file path
                [], // Dependencies, if any
                $asset_file['version'] // Version, matching the JS version
            );
        }
    }

    // ------------------------------------------------------------------------
    // Enqueue Tailwind Framework Scripts (compiler, watcher, etc.)
    // ------------------------------------------------------------------------

    public static function framework_scripts($important = '')
    {
        // Use consistent handle 'winden-compiler-module' to match AutoCompile.php
        // This ensures the compiler is loaded once regardless of which system loads it first
        $compiler_handle = 'winden-compiler-module';

        // Only enqueue if not already enqueued
        if (!wp_script_is($compiler_handle, 'enqueued')) {
            wp_enqueue_script(
                $compiler_handle,
                WINDTACS_PLUGIN_URL . 'build/compiler/tailwindcss-compiler.js',
                [],
                filemtime(WINDTACS_PLUGIN_DIR . 'build/compiler/tailwindcss-compiler.js'),
                true
            );
        }

        // Get compiler options using shared helper
        $compiler_options = self::get_compiler_options($important);

        // Register script with empty string to allow inline content attachment
        // Using wp_register_script + wp_enqueue_script pattern for inline-only scripts
        wp_register_script('tailwind-compiler-options', '', [$compiler_handle], null, true);
        wp_enqueue_script('tailwind-compiler-options');

        $inline_tw_compiler_options = 'window.tailwind_compiler_options = ' . wp_json_encode($compiler_options);
        wp_add_inline_script('tailwind-compiler-options', $inline_tw_compiler_options);

        // Add frontend constants inline so they're available before tailwindcss-watcher.js runs
        $inIframe = Builders::isBricksEditorFrame() || Builders::isOxygenEditorFrame() || Builders::isOxygen6EditorFrame() || Builders::isElementorEditorPage();
        $apiVersion2 = Builders::has_api_version_2_block();
        $uploadUrl = WINDTACS_UPLOADS_URL['baseurl'];
        $ajaxurl = admin_url('admin-ajax.php');

        // Use wp_json_encode for proper JavaScript escaping
        $inline_consts = sprintf(
            'window.uploadUrl = %s; window.inIframe = %s; window.apiVersion2 = %s; window.ajaxurl = %s;',
            wp_json_encode($uploadUrl),
            wp_json_encode($inIframe),
            wp_json_encode($apiVersion2),
            wp_json_encode($ajaxurl)
        );
        wp_add_inline_script('tailwind-compiler-options', $inline_consts);

        // Note: SCSS compilation is handled by the bundled Dart Sass in build/scss-compiler/sass.dart.min.js
        // which is loaded automatically by the Tailwind compiler when needed

        // Load the Tailwind watcher (watches DOM changes and triggers compilation)
        wp_enqueue_script(
            'tailwindcss-watcher',
            WINDTACS_ASSETS_DIR . 'tailwindcss-watcher.js',
            ['winden-compiler-module', 'tailwind-compiler-options'],
            filemtime(WINDTACS_PLUGIN_DIR . 'assets/tailwindcss-watcher.js'),
            true
        );
    }

    public static function frontend_consts()
    {
        $inIframe = wp_json_encode(Builders::isBricksEditorFrame() || Builders::isOxygenEditorFrame() || Builders::isOxygen6EditorFrame() || Builders::isElementorEditorPage());
        $uploadUrl = WINDTACS_UPLOADS_URL['baseurl'];
        $apiVersion2 = wp_json_encode(Builders::has_api_version_2_block());
        $ajaxurl = admin_url('admin-ajax.php');

        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Values are safely escaped
        echo "<script type='text/javascript'>
            window.uploadUrl = '" . esc_js($uploadUrl) . "';
            window.inIframe = " . esc_js($inIframe) . ";
            window.apiVersion2 = " . esc_js($apiVersion2) . ";
            window.ajaxurl = '" . esc_js($ajaxurl) . "';
        </script>";
    }

    public static function tw_version_four_important()
    {
        // Always v4 now - apply !important to compiled styles
        echo "
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                const styles = document.querySelector('#compiled-styles-tailwind');

                function applyImportant(element) {
                    if (element) {
                        let cssText = element.innerHTML;
                        cssText = cssText.replace(/;/g, ' !important;');
                        element.innerHTML = cssText;
                    }
                }

                // Apply initially
                applyImportant(styles);

                // Watch for changes
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' || mutation.type === 'characterData') {
                            applyImportant(styles);
                        }
                    });
                });

                if (styles) {
                    observer.observe(styles, {
                        childList: true,
                        characterData: true,
                        subtree: true
                    });
                }
            });
        </script>
        ";

        return 'v4';
    }

}

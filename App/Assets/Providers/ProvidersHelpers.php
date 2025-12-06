<?php

namespace Winden\App\Assets\Providers;

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
            'winden-config'       => 'type="inline-module"',
            'tailwind-config'     => 'type="module"',
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
    // Get Winden CSS Content
    // Latter on we will pass this inside javascript variable to be loaded after tailwindconfig
    // ------------------------------------------------------------------------

    public static function get_css_content()
    {
        $winden_editor = get_option('winden_editor');
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

    public static function cdn_scripts_autocomplete()
    {
        wp_enqueue_script(
            'cachejs',
            WINDEN_PLUGIN_URL . 'build/compiler/tailwindcss-compiler.js',
            [],
            null,
            true
        );

        wp_enqueue_script(
            'winden-autocomplete',
            'https://',
            [],
            null,
            true
        );

        // Tailwind v4: Autocomplete classes are fetched directly from the v4 compiler
        // The custom_css contains Wizzard @theme config - prepend @import "tailwindcss" for full utilities
        $inline_winden_autocomplete = '
            (async () => {
                try {
                    const customCss = window.tailwind_compiler_options?.custom_css || "";
                    const fullCss = \'@import "tailwindcss";\' + "\\n" + customCss;
                    const autocomplete = await window.tailwindifyClasses(fullCss);
                    window.winden_autocomplete = autocomplete.classes;
                    window.parent.winden_autocomplete = autocomplete.classes;
                } catch (e) {
                    console.error("[Winden] Error fetching Tailwind classes:", e);
                    window.winden_autocomplete = [];
                    window.parent.winden_autocomplete = [];
                }
            })();
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

        $asset_file_path = WINDEN_PLUGIN_DIR . $build_dir . $folder_name . '/index.asset.php';

        // Check if the asset file exists for JS
        if (file_exists($asset_file_path)) {
            $asset_file = include $asset_file_path;

            // Use unique handle for each integration to prevent conflicts
            $script_handle = 'winden-autocomplete-' . $folder_name;
            $style_handle = 'winden-autocomplete-' . $folder_name . '-style';

            // Enqueue the JS with dependencies and version
            wp_enqueue_script(
                $script_handle, // Unique handle for each integration
                WINDEN_PLUGIN_URL . $build_dir . $folder_name . '/index.js', // JS file path
                $asset_file['dependencies'], // JS dependencies from asset file
                $asset_file['version'], // JS version from asset file
                true // In footer
            );

            // Add defer strategy to avoid blocking other plugins' scripts (WP 6.3+)
            wp_script_add_data($script_handle, 'strategy', 'defer');

            // Enqueue the CSS with version matching the JS version for cache-busting
            wp_enqueue_style(
                $style_handle, // Unique handle for CSS
                WINDEN_PLUGIN_URL . $build_dir . $folder_name . '/index.css', // CSS file path
                [], // Dependencies, if any
                $asset_file['version'] // Version, matching the JS version
            );
        }
    }

    // ------------------------------------------------------------------------
    // Get Winden CDN Scripts
    // ------------------------------------------------------------------------

    public static function framework_scripts($important = '')
    {
        $settings = SettingsOptions::getWindenOptions();

        // Tailwind v4: Get Wizzard @theme config (CSS-based theming)
        // Note: @config directive is NOT supported in Tailwind v4 browser compiler
        // JS config (tailwind.config.js) is converted to @theme CSS in the compiler
        $wizzard_state = '';

        try {
            $wizzard_state_opt = get_option('winden_editor');
            if (isset($wizzard_state_opt['wizzard']) && isset($wizzard_state_opt['wizzard']['configCode'])) {
                $wizzard_state = $wizzard_state_opt['wizzard']['configCode'];
            }
        } catch (\Throwable $th) {
            //throw $th;
        }

        wp_enqueue_script(
            'cachejs',
            WINDEN_PLUGIN_URL . 'build/compiler/tailwindcss-compiler.js',
            [],
            null,
            true
        );

        $compiler_options = [
            'tailwind_version' => 'v4',
            'css_preprocessor' => !empty($settings['css_preprocessor']) ? $settings['css_preprocessor'] : 'css',
            'important' => $important,
            'custom_css' => $wizzard_state,
        ];

        // Ensure we never have false values that would prevent Tailwind from working
        if (empty($compiler_options['css_preprocessor']) || $compiler_options['css_preprocessor'] === false) {
            $compiler_options['css_preprocessor'] = 'css';
        }

        wp_enqueue_script(
            'tailwind-compiler-options',
            'https://',
            ['cachejs'],
            null,
            true
        );

        $inline_tw_compiler_options = 'window.tailwind_compiler_options = ' . json_encode($compiler_options);
        wp_add_inline_script('tailwind-compiler-options', $inline_tw_compiler_options);

        // Add frontend constants inline so they're available before tailwindcss-watcher.js runs
        $inIframe = json_encode(Builders::isBricksEditorFrame() || Builders::isOxygenEditorFrame() || Builders::isOxygen6EditorFrame() || Builders::isElementorEditorPage());
        $apiVersion2 = json_encode(Builders::has_api_version_2_block());
        $uploadUrl = WINDEN_UPLOADS_URL['baseurl'];
        $ajaxurl = admin_url('admin-ajax.php');

        $inline_consts = "window.uploadUrl = '$uploadUrl';
window.inIframe = '$inIframe';
window.apiVersion2 = '$apiVersion2';
window.ajaxurl = '$ajaxurl';";
        wp_add_inline_script('tailwind-compiler-options', $inline_consts);

        // Note: SCSS compilation is handled by the bundled Dart Sass in build/scss-compiler/sass.dart.min.js
        // which is loaded automatically by the Tailwind compiler when needed

        // Load the Tailwind watcher (watches DOM changes and triggers compilation)
        wp_enqueue_script(
            'tailwindcss-watcher',
            WINDEN_ASSETS_DIR . 'tailwindcss-watcher.js',
            ['cachejs', 'tailwind-compiler-options'],
            filemtime(WINDEN_PLUGIN_DIR . 'assets/tailwindcss-watcher.js'),
            true
        );
    }

    public static function frontend_consts()
    {
        $inIframe = json_encode(Builders::isBricksEditorFrame() || Builders::isOxygenEditorFrame() || Builders::isOxygen6EditorFrame() || Builders::isElementorEditorPage());
        $uploadUrl = WINDEN_UPLOADS_URL['baseurl'];
        $apiVersion2 = json_encode(Builders::has_api_version_2_block());
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

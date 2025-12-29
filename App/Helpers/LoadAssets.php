<?php

namespace Winden\App\Helpers;

use Winden\App\Helpers\Builders;

class LoadAssets
{
    private static $cdnScriptsLoaded = false;
    private static $inlineScriptsLoaded = false;
    private static $inlineCSSLoaded = false;

    // ------------------------------------------------------------------------
    // Modify Script Loader Tag to add type="inline-module"
    // ------------------------------------------------------------------------

    public static function modify_script_loader_tag($tag, $handle, $src)
    {
        // Define a list of handles and their respective attributes
        $attributes_map = [
            'inline-module-js' => 'setup="false"',
            'tailwindconfig' => 'type="inline-module"',
            'tailwindwizzard' => 'type="inline-module"',
        ];

        // Check if the handle exists in the attributes map
        if (isset($attributes_map[$handle])) {
            // Modify the script tag to include the desired attributes
            $tag = str_replace('<script ', '<script ' . $attributes_map[$handle] . ' ', $tag);
        }

        return $tag;
    }

    public static function loadCDNScripts(...$scripts)
    {
        if (self::$cdnScriptsLoaded && !Builders::has_api_version_2_block()) {
            return;
        }
        self::$cdnScriptsLoaded = true;

        if (in_array('inlinemodule', $scripts)) {
            wp_enqueue_script(
                'inline-module-js',
                WINDEN_ASSETS_DIR . 'inline-module.js'
            );
        }
        if (in_array('cachejs', $scripts)) {
            $compiler_path = WINDEN_PLUGIN_DIR . 'build/compiler/tailwindcss-compiler.js';
            $compiler_version = file_exists($compiler_path) ? filemtime($compiler_path) : WINDEN_VERSION;

            wp_enqueue_script(
                'cachejs',
                WINDEN_PLUGIN_URL . 'build/compiler/tailwindcss-compiler.js',
                array(),
                $compiler_version,
                true // Load in footer
            );
        }
    }

    public static function loadInlineScripts()
    {
        if (self::$inlineScriptsLoaded && !Builders::has_api_version_2_block()) {
            return;
        }
        self::$inlineScriptsLoaded = true;

        $winden_editor = get_option('winden_editor');
        $javascript_content = isset($winden_editor['javascript']) ? $winden_editor['javascript'] : '';
        $wizzard_content = isset($winden_editor['wizzard']['configCode']) ? $winden_editor['wizzard']['configCode'] : '';

        // Note: Content is already sanitized on save by Sanitization::sanitize_javascript/sanitize_css
        // These are intentionally raw for code editor functionality (admins only can save)
        wp_enqueue_script('tailwindconfig', false);
        wp_add_inline_script('tailwindconfig', $javascript_content);

        wp_enqueue_script('tailwindwizzard', false);
        wp_add_inline_script('tailwindwizzard', $wizzard_content);
    }

    public static function loadInlineCSS()
    {
        if (self::$inlineCSSLoaded && !Builders::has_api_version_2_block()) {
            return;
        }
        self::$inlineCSSLoaded = true;

        $winden_editor = get_option('winden_editor');
        $raw_css_content = isset($winden_editor['scss']) ? $winden_editor['scss'] : '';
        $compiled_css_content = isset($winden_editor['compiled_scss']) ? $winden_editor['compiled_scss'] : '';

        wp_enqueue_script(
            'winden-style',
            false
        );

        $css_content = '';
        if (!empty($compiled_css_content)) {
            $css_content .= $compiled_css_content;
        } else {
            $css_content .= $raw_css_content;
        }

        // Escape CSS content for use in JavaScript template literal
        // Replace backticks and ${} to prevent breaking out of template literal
        $escaped_css = str_replace(['`', '${', '</script'], ['\`', '\${', '<\/script'], $css_content);

        // Usage of wp_add_inline_script means we are outputting inside a script tag.
        // We construct the JS string here. The CSS content itself is potentially large and complex,
        // so manual escaping for the template literal context is appropriate, but we should be careful.
        $inline_script = 'var cssContent = `' . $escaped_css . '`;';
        wp_add_inline_script('winden-style', $inline_script);
    }

    // REMOVED: loadTailwindConfigScript() - Tailwind v3 specific, no longer needed in v4
    // Tailwind v4 uses @theme directive in CSS, not JavaScript config with resolveConfig()

    public static function reorder_styles_queue()
    {
        global $wp_styles;

        $winden_style_key = array_search('winden-compiled-css', $wp_styles->queue);
        if ($winden_style_key !== false) {
            unset($wp_styles->queue[$winden_style_key]);
            $wp_styles->queue[] = 'winden-compiled-css';
        }
    }

    public static function load_compiled_css()
    {
        $upload_dir = wp_upload_dir();
        $css_file_path = $upload_dir['basedir'] . '/winden/output.css';
        $css_file_url = $upload_dir['baseurl'] . '/winden/output.css';

        if (file_exists($css_file_path)) {
            wp_enqueue_style('winden-compiled-css', $css_file_url, array(), filemtime($css_file_path));

            self::reorder_styles_queue();
        }
    }
}

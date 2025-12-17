<?php

namespace Winden\App\Helpers;

class Builders
{
    // ------------------------------------------------------------------------
    // Frontend
    // ------------------------------------------------------------------------

    public static function isFrontend()
    {
        if (!is_admin() && !self::isBricksEditor() && !self::isOxygenEditor()) {
            return true;
        }

        return false;
    }

    // ------------------------------------------------------------------------
    // Elementor
    // ------------------------------------------------------------------------

    public static function isElementorEditorPage()
    {
        return (isset($_GET['post']) && isset($_GET['action']) && $_GET['action'] == 'elementor');
    }

    public static function isElementorPluginActivated()
    {
        return is_plugin_active('elementor/elementor.php');
    }

    // ------------------------------------------------------------------------
    // Gutenberg
    // ------------------------------------------------------------------------

    public static function isGutenbergEditorPage()
    {
        global $pagenow;

        return (isset($_GET['post']) && isset($_GET['action']) && $_GET['action'] == 'edit')
            || (isset($_GET['canvas']) && $_GET['canvas'] == 'edit')
            || $pagenow == 'site-editor.php'
            || $pagenow == 'post-new.php';  // NEW: Include post-new.php for new posts/pages
    }

    public static function isGutenbergEditor()
    {
        if (function_exists('get_current_screen')) {
            $screen = get_current_screen();

            if ($screen && method_exists($screen, 'is_block_editor')) {
                if ($screen && $screen->is_block_editor()) {
                    return true;
                }
            }
        }

        return false;
    }

    public static function isGutenbergEditorContext()
    {
        // Use WordPress's built-in block editor detection
        if (function_exists('get_current_screen')) {
            $screen = get_current_screen();
            if ($screen && method_exists($screen, 'is_block_editor') && $screen->is_block_editor()) {
                return true;
            }
        }

        // Fallback for API v2 blocks or edge cases
        if (self::has_api_version_2_block()) {
            global $pagenow;
            if (is_admin() && in_array($pagenow, ['post.php', 'post-new.php', 'site-editor.php'])) {
                return true;
            }
        }

        return false;
    }

    // ------------------------------------------------------------------------
    // Gutenberg API Version 2 is active
    // ------------------------------------------------------------------------

    public static function has_api_version_2_block()
    {
        $has_api_version_2 = false;

        $block_types = \WP_Block_Type_Registry::get_instance()->get_all_registered();
        foreach ($block_types as $block_type) {
            if (isset($block_type->api_version) && $block_type->api_version === 2) {
                $has_api_version_2 = true;
                break;
            }
        }

        return $has_api_version_2;
    }

    // ------------------------------------------------------------------------
    // Bricks
    // ------------------------------------------------------------------------

    public static function isBricksEditorPage()
    {
        // Use native Bricks function if available
        if (function_exists('bricks_is_builder')) {
            return bricks_is_builder();
        }

        // Fallback: Check for ?bricks parameter
        return isset($_GET['bricks']) && !empty($_GET['bricks']);
    }

    public static function isBricksEditor()
    {
        if (function_exists('bricks_is_builder')) {
            return bricks_is_builder();
        }

        return false;
    }

    public static function isBricksEditorFrame()
    {
        if (function_exists('bricks_is_builder_iframe')) {
            return bricks_is_builder_iframe();
        }

        return false;
    }

    public static function isBricksThemeActivated()
    {
        $theme = wp_get_theme();

        // Check if the parent theme or child theme is 'Bricks'
        if (isset($theme['Name']) && ($theme['Name'] == 'Bricks' || $theme->parent() && $theme->parent()->get('Name') == 'Bricks') || get_template() == 'bricks') {
            return true;
        }

        return false;
    }

    // ------------------------------------------------------------------------
    // Oxygen
    // ------------------------------------------------------------------------

    public static function isOxygenEditorPage()
    {
        return isset($_GET['ct_builder']) && $_GET['ct_builder'] == true;
    }

    public static function isOxygenEditor()
    {
        return defined('SHOW_CT_BUILDER');
    }

    public static function isOxygenEditorFrame()
    {
        return defined('OXYGEN_IFRAME');
    }

    public static function isOxygenPluginActivated()
    {
        return function_exists('ct_get_global_settings');
    }

    // ------------------------------------------------------------------------
    // Oxygen 6
    // ------------------------------------------------------------------------

    public static function isOxygen6EditorPage()
    {
        // Check if we're in Oxygen6 builder context
        $isOxygenBuilder = isset($_GET['oxygen']) && $_GET['oxygen'] === 'builder';
        $isBreakdanceIframe = isset($_GET['breakdance_iframe']) && $_GET['breakdance_iframe'];
        $isBrowseMode = isset($_GET['breakdance_browser']) && $_GET['breakdance_browser'];
        
        return $isOxygenBuilder || $isBreakdanceIframe || $isBrowseMode;
    }

    public static function isOxygen6Editor()
    {
        // Check if we're in Oxygen6 builder context
        $isOxygenBuilder = isset($_GET['oxygen']) && $_GET['oxygen'] === 'builder';
        $isBreakdanceIframe = isset($_GET['breakdance_iframe']) && $_GET['breakdance_iframe'];
        $isBrowseMode = isset($_GET['breakdance_browser']) && $_GET['breakdance_browser'];
        
        return $isOxygenBuilder || $isBreakdanceIframe || $isBrowseMode;
    }

    public static function isOxygen6EditorFrame()
    {
        // Check for iframe contexts in Oxygen6
        $isBreakdanceIframe = isset($_GET['breakdance_iframe']) && $_GET['breakdance_iframe'];
        $isBrowseMode = isset($_GET['breakdance_browser']) && $_GET['breakdance_browser'];
        
        return $isBreakdanceIframe || $isBrowseMode;
    }

    public static function isOxygen6PluginActivated()
    {
        // Oxygen6 is based on Breakdance, so check for Breakdance functions
        return function_exists('\Breakdance\Permissions\hasMinimumPermission') || 
               (defined('BREAKDANCE_MODE') && BREAKDANCE_MODE === 'oxygen');
    }

    // ------------------------------------------------------------------------
    // Font Hero
    // ------------------------------------------------------------------------

    public static function isFontHeroPluginActivated()
    {
        return class_exists('DP_FH_SL_Plugin_Updater') || defined('DPLUGINS_FH_ADMIN_SLUG');
    }

    // ------------------------------------------------------------------------
    // Fancoolo
    // ------------------------------------------------------------------------

    public static function isFancooloEditorPage()
    {
        // Check if we're on Fancoolo's admin page
        return isset($_GET['page']) && $_GET['page'] === 'fancoolo-app';
    }

    public static function isFancooloPluginActivated()
    {
        return is_plugin_active('fancoolo/fancoolo.php') || class_exists('FanCoolo\\App');
    }

    // ------------------------------------------------------------------------
    // Version
    // ------------------------------------------------------------------------

    public static function version()
    {
        $pluginMeta = file_get_contents(WINDEN_PLUGIN_DIR . 'winden.php');
        preg_match('/(Version:\s)(.*)/', $pluginMeta, $metadata);

        return apply_filters('winden/version', $metadata[2]);
    }

    // ------------------------------------------------------------------------
    // Base Name
    // ------------------------------------------------------------------------

    public static function baseName()
    {
        // return basename(WINDEN_PLUGIN_DIR);
        return 'winden';
    }

}

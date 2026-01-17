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
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        return (isset($_GET['post']) && isset($_GET['action']) && sanitize_text_field(wp_unslash($_GET['action'])) === 'elementor');
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

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $is_edit_action = isset($_GET['post']) && isset($_GET['action']) && sanitize_text_field(wp_unslash($_GET['action'])) === 'edit';
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $is_canvas_edit = isset($_GET['canvas']) && sanitize_text_field(wp_unslash($_GET['canvas'])) === 'edit';

        return $is_edit_action
            || $is_canvas_edit
            || $pagenow === 'site-editor.php'
            || $pagenow === 'post-new.php';  // NEW: Include post-new.php for new posts/pages
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
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
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

        // Fallback: Check URL parameters directly if Bricks function not available
        // Bricks iframe has ?bricks=run&brickspreview=true
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        if (isset($_GET['bricks']) && isset($_GET['brickspreview'])) {
            return true;
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
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        return isset($_GET['ct_builder']) && sanitize_text_field(wp_unslash($_GET['ct_builder']));
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
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $isOxygenBuilder = isset($_GET['oxygen']) && sanitize_text_field(wp_unslash($_GET['oxygen'])) === 'builder';
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $isBreakdanceIframe = isset($_GET['breakdance_iframe']) && sanitize_text_field(wp_unslash($_GET['breakdance_iframe']));
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $isBrowseMode = isset($_GET['breakdance_browser']) && sanitize_text_field(wp_unslash($_GET['breakdance_browser']));

        return $isOxygenBuilder || $isBreakdanceIframe || $isBrowseMode;
    }

    public static function isOxygen6Editor()
    {
        // Check if we're in Oxygen6 builder context
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $isOxygenBuilder = isset($_GET['oxygen']) && sanitize_text_field(wp_unslash($_GET['oxygen'])) === 'builder';
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $isBreakdanceIframe = isset($_GET['breakdance_iframe']) && sanitize_text_field(wp_unslash($_GET['breakdance_iframe']));
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $isBrowseMode = isset($_GET['breakdance_browser']) && sanitize_text_field(wp_unslash($_GET['breakdance_browser']));

        return $isOxygenBuilder || $isBreakdanceIframe || $isBrowseMode;
    }

    public static function isOxygen6EditorFrame()
    {
        // Check for iframe contexts in Oxygen6
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $isBreakdanceIframe = isset($_GET['breakdance_iframe']) && sanitize_text_field(wp_unslash($_GET['breakdance_iframe']));
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for editor detection
        $isBrowseMode = isset($_GET['breakdance_browser']) && sanitize_text_field(wp_unslash($_GET['breakdance_browser']));

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
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only check for admin page detection
        return isset($_GET['page']) && sanitize_text_field(wp_unslash($_GET['page'])) === 'fancoolo-app';
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
        $pluginMeta = file_get_contents(WINDTACS_PLUGIN_DIR . 'winden.php');
        preg_match('/(Version:\s)(.*)/', $pluginMeta, $metadata);

        return apply_filters('winden/version', $metadata[2]);
    }

    // ------------------------------------------------------------------------
    // Base Name
    // ------------------------------------------------------------------------

    public static function baseName()
    {
        // return basename(WINDTACS_PLUGIN_DIR);
        return 'winden';
    }

}

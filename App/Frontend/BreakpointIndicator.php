<?php namespace Winden\App\Frontend;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Breakpoint Indicator for logged-in users
 *
 * Displays current responsive breakpoint and screen width in bottom-right corner.
 * Only loads on frontend for logged-in users. JavaScript handles all breakpoint extraction.
 */
class BreakpointIndicator
{
    public function __construct()
    {
        add_action('init', [$this, 'init']);
    }

    public function init()
    {
        // Check if breakpoint indicator is enabled
        $is_enabled = get_option('winden_breakpoint_indicator_enabled', 'no') === 'yes';

        // Only load for logged-in users on frontend when enabled
        if ($is_enabled && is_user_logged_in() && !is_admin()) {
            add_action('wp_enqueue_scripts', [$this, 'enqueueAssets'], 10000002);
        }
    }

    public function enqueueAssets()
    {
        $js_file = WINDEN_PLUGIN_DIR . 'assets/breakpoint-indicator.js';
        $css_file = WINDEN_PLUGIN_DIR . 'assets/breakpoint-indicator.css';

        if (!file_exists($js_file) || !file_exists($css_file)) {
            return;
        }

        wp_enqueue_script(
            'winden-breakpoint-indicator',
            WINDEN_ASSETS_DIR . 'breakpoint-indicator.js',
            [],
            filemtime($js_file),
            true
        );

        wp_enqueue_style(
            'winden-breakpoint-indicator',
            WINDEN_ASSETS_DIR . 'breakpoint-indicator.css',
            [],
            filemtime($css_file)
        );
    }
}

<?php
namespace Winden\App\PageBuilder;

if (!defined('ABSPATH')) exit;

/**
 * Gutenberg Winden Classes Integration
 *
 * Adds autocomplete to the native "Additional CSS class(es)" field
 * in the block editor. Uses native block attributes for storage.
 */
class GutenbergWindenClasses
{
    /**
     * Get breakpoints from Wizzard state
     *
     * @return array Array of breakpoint names (e.g., ['sm', 'md', 'lg', 'xl', '2xl'])
     */
    private function getBreakpoints(): array
    {
        // Default Tailwind breakpoints
        $defaultBreakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];

        // Try to get Wizzard state
        $wizzard_state = get_option('winden_dplugins_wizzard_state');

        // Fallback to editor option
        if (!$wizzard_state) {
            $winden_editor = get_option('winden_dplugins_editor', []);
            $wizzard_state = $winden_editor['wizzard'] ?? null;
        }

        // Check if breakpoints are active and defined
        if (
            $wizzard_state &&
            !empty($wizzard_state['breakpointsActive']) &&
            !empty($wizzard_state['breakpoints']) &&
            is_array($wizzard_state['breakpoints'])
        ) {
            $customBreakpoints = [];
            foreach ($wizzard_state['breakpoints'] as $bp) {
                if (!empty($bp['name'])) {
                    $customBreakpoints[] = $bp['name'];
                }
            }

            // If "Extend" is checked, combine default + custom breakpoints
            if (!empty($wizzard_state['extendBreakpoints'])) {
                return array_merge($defaultBreakpoints, $customBreakpoints);
            }

            // Return only custom breakpoints if not extending
            if (!empty($customBreakpoints)) {
                return $customBreakpoints;
            }
        }

        return $defaultBreakpoints;
    }

    public function __construct()
    {
        // Enqueue autocomplete assets in block editor
        add_action('enqueue_block_editor_assets', [$this, 'enqueueAutocompleteAssets'], 99999);

        // Enqueue Winden classes JavaScript
        add_action('enqueue_block_editor_assets', [$this, 'enqueueWindenClassesJS'], 99999);
    }

    /**
     * Enqueue Tailwind Autocomplete assets in block editor
     */
    public function enqueueAutocompleteAssets()
    {
        // Load core autocomplete library
        $autocomplete_js = WINDTACS_PLUGIN_DIR . 'build/winden-classes/core/index.js';
        $autocomplete_css = WINDTACS_PLUGIN_DIR . 'build/winden-classes/core/index.css';

        if (file_exists($autocomplete_js)) {
            wp_enqueue_script(
                'winden-tailwind-autocomplete',
                WINDTACS_PLUGIN_URL . 'build/winden-classes/core/index.js',
                [],
                filemtime($autocomplete_js),
                true
            );
        }

        if (file_exists($autocomplete_css)) {
            wp_enqueue_style(
                'winden-tailwind-autocomplete',
                WINDTACS_PLUGIN_URL . 'build/winden-classes/core/index.css',
                [],
                filemtime($autocomplete_css)
            );
        }
    }

    /**
     * Enqueue JavaScript for Winden classes functionality
     */
    public function enqueueWindenClassesJS()
    {
        $js_path = WINDTACS_PLUGIN_DIR . 'build/winden-classes/gutenberg/index.js';
        if (!file_exists($js_path)) {
            return;
        }

        // Enqueue external JS file with autocomplete as dependency
        wp_enqueue_script(
            'winden-gutenberg-classes',
            WINDTACS_PLUGIN_URL . 'build/winden-classes/gutenberg/index.js',
            ['winden-tailwind-autocomplete', 'wp-data', 'wp-element'],
            filemtime($js_path),
            true
        );

        // Pass PHP data to JavaScript
        wp_localize_script('winden-gutenberg-classes', 'windenGutenbergClasses', [
            'nonce' => wp_create_nonce('winden_nonce'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'breakpoints' => $this->getBreakpoints(),
        ]);
    }
}

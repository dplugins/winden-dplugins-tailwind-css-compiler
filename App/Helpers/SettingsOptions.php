<?php

namespace Winden\App\Helpers;

class SettingsOptions
{
    /**
     * Static cache for options to avoid repeated database reads
     * This is cleared on each request, so always fresh per pageload
     */
    private static ?array $cached_options = null;

    public static function getWindenOptions()
    {
        // Return cached options if available (within same request)
        if (self::$cached_options !== null) {
            return self::$cached_options;
        }

        $defaults = [
            'css_preprocessor' => 'css',
            'autocomplete_gutenberg' => true,
            'autocomplete_bricks' => false,
            'autocomplete_oxygen' => false,
            'autocomplete_oxygen6' => false,
            'autocomplete_elementor' => false,
            'autocomplete_builderius' => false,
            'winden_classes_gutenberg' => false,
            'winden_classes_bricks' => false,
            'winden_classes_oxygen' => false,
            'winden_classes_oxygen6' => false,
            'winden_classes_elementor' => false,
            'autocomplete_mode' => 'plain-classes',
            'compiled_css' => false,
            'cdn_for_admin' => false,
            'register_wizzard_data_in_fse' => true,
        ];

        $saved_options = get_option('winden_dplugins_options', []);

        // Merge saved options with defaults (saved values take precedence)
        $options = array_merge($defaults, $saved_options);

        // Always force v4, even if old database value exists
        $options['tailwind_version'] = 'v4';

        // Cache for subsequent calls in this request
        self::$cached_options = $options;

        return $options;
    }

    /**
     * Clear the options cache (call after updating options)
     */
    public static function clearCache(): void
    {
        self::$cached_options = null;
    }

    /**
     * Get breakpoint names from Wizzard state
     *
     * Reads from 'winden_dplugins_editor' option (same source as MonacoEditorProvider
     * for Plain Classes). Handles extend vs replace logic.
     *
     * @return array Array of breakpoint names (e.g., ['sm', 'md', 'lg', 'xl', '2xl'] or ['mobile', 'tablet', 'desktop'])
     */
    public static function getBreakpoints(): array
    {
        $defaultBreakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];

        $winden_editor = get_option('winden_dplugins_editor');
        $wizzard_state = $winden_editor['wizzard'] ?? null;

        if ($wizzard_state && !empty($wizzard_state['breakpoints']) && is_array($wizzard_state['breakpoints'])) {
            $customBreakpoints = [];
            foreach ($wizzard_state['breakpoints'] as $bp) {
                if (!empty($bp['name'])) {
                    $customBreakpoints[] = $bp['name'];
                }
            }

            if (!empty($customBreakpoints)) {
                if (!empty($wizzard_state['extendBreakpoints'])) {
                    return array_merge($defaultBreakpoints, $customBreakpoints);
                }
                return $customBreakpoints;
            }
        }

        return $defaultBreakpoints;
    }
}

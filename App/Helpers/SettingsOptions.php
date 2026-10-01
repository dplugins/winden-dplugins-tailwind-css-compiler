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
            'autocomplete_mode' => 'winden-classes',
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
     * Builders that ship a Winden Classes panel. Builderius has a tag
     * integration only, so it ignores the mode and always uses tags.
     */
    public const WINDEN_CLASSES_BUILDERS = ['gutenberg', 'bricks', 'oxygen', 'oxygen6', 'elementor'];

    /**
     * Is the integration turned on for a builder ('gutenberg', 'bricks', ...)?
     * One switch per builder now — which input it renders is the mode's job.
     */
    public static function builderEnabled(string $builder): bool
    {
        return !empty(self::getWindenOptions()["autocomplete_{$builder}"]);
    }

    /**
     * The tag fallback: one switch for every builder at once, off by default.
     * Sites that want the old tag input turn it on themselves — no per-builder
     * pairing to keep in sync, and no class is lost either way.
     */
    public static function usesPlainClasses(): bool
    {
        return (self::getWindenOptions()['autocomplete_mode'] ?? 'winden-classes') === 'plain-classes';
    }

    /** Builder is on and rendering the Winden Classes textarea */
    public static function usesWindenClasses(string $builder): bool
    {
        return self::builderEnabled($builder)
            && !self::usesPlainClasses()
            && in_array($builder, self::WINDEN_CLASSES_BUILDERS, true);
    }

    /** Builder is on and rendering the tag input */
    public static function usesTagInput(string $builder): bool
    {
        return self::builderEnabled($builder) && !self::usesWindenClasses($builder);
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

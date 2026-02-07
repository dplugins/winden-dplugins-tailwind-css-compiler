<?php

namespace Winden\App\Helpers;

/**
 * Sanitization helper functions for Winden plugin
 *
 * Handles type-aware sanitization while preserving functionality
 * for code editor features (CSS/JS).
 */
class Sanitization
{
    /**
     * Sanitize CSS content
     *
     * Allows CSS for users with unfiltered_html capability,
     * otherwise uses wp_kses_post for safe CSS.
     *
     * @param string $css CSS content
     * @return string Sanitized CSS
     */
    public static function sanitize_css($css)
    {
        if (!is_string($css)) {
            return '';
        }

        // Admins/editors can save any CSS
        if (current_user_can('unfiltered_html')) {
            return $css;
        }

        // Others get safe CSS via wp_kses_post
        return wp_kses_post($css);
    }

    /**
     * Sanitize JavaScript content
     *
     * Only allows JavaScript for users with unfiltered_html capability.
     *
     * @param string $js JavaScript content
     * @return string Sanitized JavaScript or empty string
     */
    public static function sanitize_javascript($js)
    {
        if (!is_string($js)) {
            return '';
        }

        // Only admins/editors can save JavaScript
        if (current_user_can('unfiltered_html')) {
            return $js;
        }

        return '';
    }

    /**
     * Recursively sanitize array with type preservation
     *
     * @param array $array Array to sanitize
     * @param bool $preserve_key_case Whether to preserve original key casing (for Wizzard state)
     * @return array Sanitized array
     */
    public static function sanitize_array_recursive($array, $preserve_key_case = false)
    {
        if (!is_array($array)) {
            return [];
        }

        $sanitized = [];

        foreach ($array as $key => $value) {
            // CRITICAL FIX: For Wizzard state, preserve camelCase keys (configCode, activeTab, etc.)
            // WordPress sanitize_key() converts to lowercase which breaks JavaScript compatibility
            if ($preserve_key_case) {
                // Validate key is alphanumeric/underscore but keep original casing
                $sanitized_key = preg_replace('/[^a-zA-Z0-9_]/', '', $key);
            } else {
                // Use WordPress standard sanitization (lowercase)
                $sanitized_key = sanitize_key($key);
            }

            if (is_array($value)) {
                // Recursively preserve key case for nested arrays
                $sanitized[$sanitized_key] = self::sanitize_array_recursive($value, $preserve_key_case);
            } elseif (is_bool($value)) {
                $sanitized[$sanitized_key] = (bool) $value;
            } elseif (is_numeric($value)) {
                $sanitized[$sanitized_key] = $value;
            } elseif ($sanitized_key === 'configCode' || $sanitized_key === 'configcode') {
                // Wizzard CSS config (handle both cases during migration)
                $sanitized[$sanitized_key] = self::sanitize_css($value);
            } elseif (in_array($sanitized_key, ['hex', 'color'], true)) {
                // Hex color values
                $sanitized[$sanitized_key] = sanitize_hex_color($value);
            } else {
                $sanitized[$sanitized_key] = sanitize_text_field($value);
            }
        }

        return $sanitized;
    }

    /**
     * Sanitize Wizzard state data
     *
     * IMPORTANT: Preserves camelCase keys (configCode, activeTab, etc.) for JavaScript compatibility
     *
     * @param array $wizzard Wizzard state
     * @return array Sanitized wizzard data
     */
    public static function sanitize_wizzard_state($wizzard)
    {
        // CRITICAL: Pass true to preserve camelCase keys
        return self::sanitize_array_recursive($wizzard, true);
    }

    /**
     * Map of lowercase keys to their correct camelCase equivalents
     * Used to normalize data from old database format
     */
    private static $key_mapping = [
        'activetab' => 'activeTab',
        'configcode' => 'configCode',
        'statename' => 'stateName',
        'breakpointsactive' => 'breakpointsActive',
        'extendbreakpoints' => 'extendBreakpoints',
        'desktopfirst' => 'desktopFirst',
        'fontfamily' => 'fontFamily',
        'fontfamilyactive' => 'fontFamilyActive',
        'extendfontfamily' => 'extendFontFamily',
        'colorentries' => 'colorEntries',
        'colorsactive' => 'colorsActive',
        'extendcolors' => 'extendColors',
        'includeutilitycolors' => 'includeUtilityColors',
        'spacesactive' => 'spacesActive',
        'includeutilitysizes' => 'includeUtilitySizes',
        'borderradiusactive' => 'borderRadiusActive',
        'borderradius' => 'borderRadius',
        'fontsizesactive' => 'fontSizesActive',
        'fontsize' => 'fontSize',
        'extendcolorsfse' => 'extendColorsFSE',
        'extendfontsizesfse' => 'extendFontSizesFSE',
        'extendspacingfse' => 'extendSpacingFSE',
        'extendfontfamilyfse' => 'extendFontFamilyFSE',
        'extendscreensfse' => 'extendScreensFSE',
        'extendcolorsbricks' => 'extendColorsBricks',
        'extendfontsizesbricks' => 'extendFontSizesBricks',
        'extendspacingbricks' => 'extendSpacingBricks',
        'extendfontfamilybricks' => 'extendFontFamilyBricks',
        'extendscreensbricks' => 'extendScreensBricks',
        'extendcolorsoxygen' => 'extendColorsOxygen',
        'extendfontsizesoxygen' => 'extendFontSizesOxygen',
        'extendspacingoxygen' => 'extendSpacingOxygen',
        'extendfontfamilyoxygen' => 'extendFontFamilyOxygen',
        'extendscreensoxygen' => 'extendScreensOxygen',
        'extendfonthero' => 'extendFontHero',
        'extendborderradiusfse' => 'extendBorderRadiusFSE',
        'extendborderradiusbricks' => 'extendBorderRadiusBricks',
        'extendborderradiusoxygen' => 'extendBorderRadiusOxygen',
        'minlightness' => 'minLightness',
        'maxlightness' => 'maxLightness',
        'colorformat' => 'colorFormat',
        'enableshades' => 'enableShades',
        'reverseshades' => 'reverseShades',
        'islocked' => 'isLocked',
        'isenabled' => 'isEnabled',
        'isdefault' => 'isDefault',
        'disablefluid' => 'disableFluid',
        'userem' => 'useRem',
        'remsize' => 'remSize',
        'minbasesize' => 'minBaseSize',
        'minscaleratio' => 'minScaleRatio',
        'minscreensize' => 'minScreenSize',
        'maxbasesize' => 'maxBaseSize',
        'maxscaleratio' => 'maxScaleRatio',
        'maxscreensize' => 'maxScreenSize',
        'basestep' => 'baseStep',
        'decimalplaces' => 'decimalPlaces',
        'stepvalues' => 'stepValues',
        'minmaxvalues' => 'minMaxValues',
        'manualmode' => 'manualMode',
        'manualvalues' => 'manualValues',
        'originalgeneratedcolors' => 'originalGeneratedColors',
        'ismaincolorchange' => 'isMainColorChange',
    ];

    /**
     * Normalize Wizzard state keys from lowercase to camelCase
     *
     * Fixes data corrupted by WordPress sanitize_key() which converts to lowercase
     *
     * @param array $data Wizzard state data with potentially lowercase keys
     * @return array Data with normalized camelCase keys
     */
    public static function normalize_wizzard_keys($data)
    {
        if (!is_array($data)) {
            return $data;
        }

        $normalized = [];

        foreach ($data as $key => $value) {
            // Check if this key needs to be mapped to camelCase
            $lower_key = strtolower($key);
            $normalized_key = isset(self::$key_mapping[$lower_key]) ? self::$key_mapping[$lower_key] : $key;

            // Recursively normalize nested arrays
            if (is_array($value)) {
                $normalized[$normalized_key] = self::normalize_wizzard_keys($value);
            } else {
                $normalized[$normalized_key] = $value;
            }
        }

        return $normalized;
    }

    /**
     * Sanitize compiled CSS output
     *
     * @param string $css Compiled CSS
     * @return string Sanitized CSS
     */
    public static function sanitize_compiled_css($css)
    {
        return self::sanitize_css($css);
    }

    /**
     * Sanitize error messages
     *
     * @param mixed $errors Error data (string or array)
     * @return string Sanitized JSON string
     */
    public static function sanitize_errors($errors)
    {
        // Decode if JSON string
        if (is_string($errors)) {
            $decoded = json_decode($errors, true);
            if (is_array($decoded)) {
                $errors = $decoded;
            } else {
                return wp_json_encode([]);
            }
        }

        if (!is_array($errors)) {
            return wp_json_encode([]);
        }

        $sanitized = [];
        foreach ($errors as $error) {
            if (!is_array($error)) {
                continue;
            }

            $sanitized[] = [
                'title' => isset($error['title']) ? sanitize_text_field($error['title']) : '',
                'message' => isset($error['message']) ? sanitize_text_field($error['message']) : '',
                'line' => isset($error['line']) ? absint($error['line']) : 0,
                'column' => isset($error['column']) ? absint($error['column']) : 0,
            ];
        }

        return wp_json_encode($sanitized);
    }

    /**
     * Sanitize status value
     *
     * @param string $status Status value
     * @return string Sanitized status
     */
    public static function sanitize_status($status)
    {
        $allowed = ['completed', 'failed', 'pending'];
        return in_array($status, $allowed, true) ? $status : 'completed';
    }

    /**
     * Sanitize settings array
     *
     * @param array $settings Settings data
     * @return array Sanitized settings
     */
    public static function sanitize_settings($settings)
    {
        if (!is_array($settings)) {
            return [];
        }

        $sanitized = [];
        $boolean_keys = [
            'autocomplete_gutenberg',
            'autocomplete_bricks',
            'autocomplete_oxygen',
            'autocomplete_oxygen6',
            'autocomplete_elementor',
            'winden_classes_gutenberg',
            'winden_classes_bricks',
            'winden_classes_oxygen',
            'winden_classes_oxygen6',
            'winden_classes_elementor',
            'dequeue_styles_gutenberg',
            'dequeue_styles_bricks',
            'dequeue_styles_oxygen',
            'register_wizzard_data_in_fse',
            'register_wizzard_data_in_bricks',
            'compiled_css',
            'cdn_for_admin',
            'folded_sidebar',
            'enable_files_scan',
            'disable_dev_mode',
            'inline_compiled_css',
        ];

        foreach ($settings as $key => $value) {
            $key = sanitize_key($key);

            if (in_array($key, $boolean_keys, true)) {
                $sanitized[$key] = (bool) $value;
            } elseif ($key === 'scan_path') {
                // Array of paths - prevent path traversal
                if (!is_array($value)) {
                    $value = $value ? [$value] : [];
                }
                $sanitized[$key] = array_map(function ($path) {
                    $path = str_replace(['../', '..\\'], '', $path);
                    return sanitize_text_field(trim($path, '/\\'));
                }, $value);
            } elseif ($key === 'scan_file_formats') {
                // Array of file extensions
                if (!is_array($value)) {
                    $value = $value ? [$value] : [];
                }
                $sanitized[$key] = array_map('sanitize_text_field', $value);
            } elseif ($key === 'css_preprocessor') {
                // Whitelist: css or scss
                $sanitized[$key] = in_array($value, ['css', 'scss'], true) ? $value : 'css';
            } elseif ($key === 'autocomplete_mode') {
                // Whitelist: plain-classes or winden-classes
                $sanitized[$key] = in_array($value, ['plain-classes', 'winden-classes'], true) ? $value : 'plain-classes';
            } else {
                $sanitized[$key] = sanitize_text_field($value);
            }
        }

        return $sanitized;
    }
}

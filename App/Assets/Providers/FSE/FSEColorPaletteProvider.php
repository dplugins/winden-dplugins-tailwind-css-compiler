<?php

namespace Winden\App\Assets\Providers\FSE;

if (!defined('ABSPATH')) exit;

/**
 * FSE Color Palette Provider
 * Adds Wizzard colors to the FSE theme
 */
class FSEColorPaletteProvider
{
    /**
     * Add Wizzard color palette to the FSE theme
     */
    public function run()
    {
        $winden_editor = FSEHelpers::getWindenEditor();

        // Check if colors tab is active
        if (!($winden_editor['wizzard']['colorsActive'] ?? false)) {
            return;
        }

        $editorColors = $this->buildColorPalette($winden_editor);

        // Add theme support
        add_theme_support('editor-color-palette', $editorColors);

        // Add theme filter
        $this->addThemeFilter($editorColors, $winden_editor);
    }

    /**
     * Build the color palette array from Wizzard config
     *
     * @param array $winden_editor
     * @return array
     */
    private function buildColorPalette($winden_editor)
    {
        $theme_data = FSEHelpers::getThemeData();
        $existing_colors = [];
        $theme_colors = [];

        if (
            isset($theme_data['settings']['color']['palette']) &&
            is_array($theme_data['settings']['color']['palette'])
        ) {
            foreach ($theme_data['settings']['color']['palette'] as $color) {
                if (isset($color['name'])) {
                    $existing_colors[] = $color['name'];
                    $theme_colors[] = $color;
                }
            }
        }

        $colorEntries = $winden_editor['wizzard']['colorEntries'] ?? [];
        $includeUtilityColors = $winden_editor['wizzard']['includeUtilityColors'] ?? false;
        $includeTailwindColors = $winden_editor['wizzard']['includeTailwindColors'] ?? [];
        $extendColorsFSE = isset($winden_editor['wizzard']['extendColorsFSE']) &&
            $winden_editor['wizzard']['extendColorsFSE'] == 1;

        $editorColors = [];

        // Add utility colors if enabled
        if ($includeUtilityColors) {
            $editorColors = array_merge(
                $editorColors,
                $this->getUtilityColors($existing_colors)
            );
        }

        // Process custom color entries
        foreach ($colorEntries as $colorEntry) {
            $colors = $this->processColorEntry($colorEntry, $existing_colors, $extendColorsFSE);
            $editorColors = array_merge($editorColors, $colors);
        }

        // Process Tailwind default colors
        if (!empty($includeTailwindColors) && is_array($includeTailwindColors)) {
            foreach ($includeTailwindColors as $tailwindColorName) {
                $colors = $this->processTailwindColor($tailwindColorName, $existing_colors, $extendColorsFSE);
                $editorColors = array_merge($editorColors, $colors);
            }
        }

        return $editorColors;
    }

    /**
     * Get utility colors (white, black, transparent, etc.)
     *
     * @param array $existing_colors
     * @return array
     */
    private function getUtilityColors($existing_colors)
    {
        $colors = [];

        $utilityColors = [
            ['name' => __('White', 'winden-dplugins-tailwind-css-compiler'), 'slug' => 'white', 'color' => '#ffffff'],
            ['name' => __('Black', 'winden-dplugins-tailwind-css-compiler'), 'slug' => 'black', 'color' => '#000000'],
            ['name' => __('Transparent', 'winden-dplugins-tailwind-css-compiler'), 'slug' => 'transparent', 'color' => 'transparent'],
            ['name' => __('Current', 'winden-dplugins-tailwind-css-compiler'), 'slug' => 'current', 'color' => 'currentColor'],
            ['name' => __('Inherit', 'winden-dplugins-tailwind-css-compiler'), 'slug' => 'inherit', 'color' => 'inherit'],
        ];

        foreach ($utilityColors as $utility) {
            if (!in_array($utility['name'], $existing_colors)) {
                $colors[] = $utility;
            }
        }

        return $colors;
    }

    /**
     * Process a single color entry
     *
     * @param array $colorEntry
     * @param array $existing_colors
     * @param bool $extendColorsFSE
     * @return array
     */
    private function processColorEntry($colorEntry, $existing_colors, $extendColorsFSE)
    {
        $colors = [];
        $enableShades = $colorEntry['enableShades'] ?? true;

        if ($enableShades && isset($colorEntry['shades'])) {
            // Add all enabled shades
            foreach ($colorEntry['shades'] as $shade) {
                if (!empty($shade['isEnabled'])) {
                    $color = $this->buildShadeColor($colorEntry, $shade);

                    if (!in_array($color['name'], $existing_colors) || $extendColorsFSE) {
                        $colors[] = $color;
                    }
                }
            }
        } else {
            // Only add the main color
            $slug = strtolower(str_replace(' ', '-', $colorEntry['name']));
            $name = $colorEntry['name'];

            if (!in_array($name, $existing_colors) || $extendColorsFSE) {
                $colors[] = [
                    'name' => $name,
                    'slug' => $slug,
                    'color' => $colorEntry['hex'],
                ];
            }
        }

        return $colors;
    }

    /**
     * Build a color entry for a shade
     *
     * @param array $colorEntry
     * @param array $shade
     * @return array
     */
    private function buildShadeColor($colorEntry, $shade)
    {
        if (!empty($shade['isDefault'])) {
            return [
                'name' => $colorEntry['name'],
                'slug' => strtolower(str_replace(' ', '-', $colorEntry['name'])),
                'color' => $shade['hex'],
            ];
        }

        return [
            'name' => $colorEntry['name'] . ' ' . $shade['name'],
            'slug' => strtolower(str_replace(' ', '-', $colorEntry['name'] . '-' . $shade['name'])),
            'color' => $shade['hex'],
        ];
    }

    /**
     * Process a Tailwind default color (with all its shades)
     *
     * @param string $colorName Name of the Tailwind color (e.g., 'red', 'blue')
     * @param array $existing_colors
     * @param bool $extendColorsFSE
     * @return array
     */
    private function processTailwindColor($colorName, $existing_colors, $extendColorsFSE)
    {
        $colors = [];

        // Tailwind color shades (same as in TypeScript constants)
        // These are placeholder hex values - the actual OKLCH values are used in CSS
        // But for Gutenberg color picker, we need hex values
        $tailwindColors = $this->getTailwindColorShades($colorName);

        if (empty($tailwindColors)) {
            return $colors;
        }

        // Add each shade of the Tailwind color
        foreach ($tailwindColors as $shade => $hex) {
            $shadeName = $colorName . '-' . $shade;
            $fullName = ucfirst($colorName) . ' ' . $shade;

            if (!in_array($fullName, $existing_colors) || $extendColorsFSE) {
                $colors[] = [
                    'name' => $fullName,
                    'slug' => strtolower($shadeName),
                    'color' => $hex,
                ];
            }
        }

        return $colors;
    }

    /**
     * Get Tailwind color shades as HEX values
     * These are converted from OKLCH to HEX for Gutenberg color picker display
     *
     * @param string $colorName
     * @return array
     */
    private function getTailwindColorShades($colorName)
    {
        static $colorData = null;

        // Load color data from shared JSON file (single source of truth)
        if ($colorData === null) {
            $jsonPath = WINDTACS_PLUGIN_DIR . 'shared/tailwind-colors.json';

            if (file_exists($jsonPath)) {
                $jsonContent = file_get_contents($jsonPath);
                $colorData = json_decode($jsonContent, true);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    error_log('[Winden Error] Failed to parse tailwind-colors.json: ' . json_last_error_msg());
                    $colorData = [];
                }
            } else {
                error_log('[Winden Error] tailwind-colors.json not found at: ' . $jsonPath);
                $colorData = [];
            }
        }

        // Return HEX values for the specified color
        if (isset($colorData[$colorName])) {
            $hexMap = [];
            foreach ($colorData[$colorName] as $shade => $values) {
                $hexMap[$shade] = $values['hex'];
            }
            return $hexMap;
        }

        return [];
    }

    /**
     * Add theme filter for color palette
     *
     * @param array $editorColors
     * @param array $winden_editor
     */
    private function addThemeFilter($editorColors, $winden_editor)
    {
        $extendColorsFSE = isset($winden_editor['wizzard']['extendColorsFSE']) &&
            $winden_editor['wizzard']['extendColorsFSE'] == 1;

        $theme_data = FSEHelpers::getThemeData();
        $theme_colors = [];

        if (
            isset($theme_data['settings']['color']['palette']) &&
            is_array($theme_data['settings']['color']['palette'])
        ) {
            $theme_colors = $theme_data['settings']['color']['palette'];
        }

        add_filter('wp_theme_json_data_theme', function ($theme_json) use ($editorColors, $extendColorsFSE, $theme_colors) {
            $new_data = [
                'version' => 3,
                'settings' => [
                    'color' => [
                        'defaultPalette' => false,
                        'palette' => $extendColorsFSE ? array_merge($theme_colors, $editorColors) : $editorColors
                    ],
                ],
            ];
            return $theme_json->update_with($new_data);
        });
    }
}

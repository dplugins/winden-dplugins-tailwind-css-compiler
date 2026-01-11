<?php

namespace Winden\App\Assets\Providers\FSE;

if (!defined('ABSPATH')) exit;

/**
 * FSE Font Size Provider
 * Adds Wizzard font sizes to the FSE theme
 */
class FSEFontSizeProvider
{
    /**
     * Add Wizzard font sizes to the FSE theme
     */
    public function run()
    {
        $winden_editor = FSEHelpers::getWindenEditor();

        // Check if font sizes tab is active
        if (!($winden_editor['wizzard']['fontSizesActive'] ?? false)) {
            return;
        }

        $editorFontSizes = $this->buildFontSizes($winden_editor);

        // Add theme support
        add_theme_support('editor-font-sizes', $editorFontSizes);

        // Clear WordPress default font sizes
        add_filter('wp_theme_json_data_default', [$this, 'clearDefaultFontSizes']);

        // Add Wizzard font sizes at theme level
        $this->addThemeFilter($editorFontSizes, $winden_editor);
    }

    /**
     * Build the font sizes array from Wizzard config
     *
     * @param array $winden_editor
     * @return array
     */
    private function buildFontSizes($winden_editor)
    {
        $theme_data = FSEHelpers::getThemeData();
        $existing_font_sizes = [];

        if (
            isset($theme_data['settings']['typography']['fontSizes']) &&
            is_array($theme_data['settings']['typography']['fontSizes'])
        ) {
            foreach ($theme_data['settings']['typography']['fontSizes'] as $font) {
                if (isset($font['name'])) {
                    $existing_font_sizes[] = $font['name'];
                }
            }
        }

        $fontSizeSteps = $winden_editor['wizzard']['fontSize']['steps'] ?? [];
        $fontSizeStepValues = $winden_editor['wizzard']['fontSize']['stepValues'] ?? [];
        $disableFluid = isset($winden_editor['wizzard']['fontSize']['disableFluid']) &&
            $winden_editor['wizzard']['fontSize']['disableFluid'] == 1;
        $extendFontSizesFSE = isset($winden_editor['wizzard']['extendFontSizesFSE']) &&
            $winden_editor['wizzard']['extendFontSizesFSE'] == 1;
        $overrides = $winden_editor['wizzard']['fontSize']['overrides'] ?? [];

        // Manual mode
        $manualMode = $winden_editor['wizzard']['fontSize']['manualMode'] ?? false;
        $manualValues = $winden_editor['wizzard']['fontSize']['manualValues'] ?? [];
        $minScreenSize = $winden_editor['wizzard']['fontSize']['minScreenSize'] ?? 320;
        $maxScreenSize = $winden_editor['wizzard']['fontSize']['maxScreenSize'] ?? 1920;

        $editorFontSizes = [];

        foreach ($fontSizeSteps as $index => $step) {
            // Skip if disabled
            if (isset($overrides[$step]['enabled']) && !$overrides[$step]['enabled']) {
                continue;
            }

            // Skip if manual mode and step is not enabled
            if ($manualMode && isset($manualValues[$step]) && !($manualValues[$step]['enabled'] ?? true)) {
                continue;
            }

            $name = $step;

            // Only add if font size name doesn't exist or if extending
            if (!in_array($name, $existing_font_sizes) || $extendFontSizesFSE) {
                $fontSize = $this->buildFontSizeEntry(
                    $step,
                    $index,
                    $manualMode,
                    $disableFluid,
                    $fontSizeStepValues,
                    $manualValues,
                    $minScreenSize,
                    $maxScreenSize
                );

                if ($fontSize) {
                    $editorFontSizes[] = $fontSize;
                }
            }
        }

        return $editorFontSizes;
    }

    /**
     * Build a single font size entry
     *
     * @param string $step Step name
     * @param int $index Step index
     * @param bool $manualMode Whether manual mode is enabled
     * @param bool $disableFluid Whether fluid is disabled
     * @param array $fontSizeStepValues Pre-calculated step values
     * @param array $manualValues Manual values
     * @param int $minScreenSize Min screen size
     * @param int $maxScreenSize Max screen size
     * @return array|null
     */
    private function buildFontSizeEntry(
        $step,
        $index,
        $manualMode,
        $disableFluid,
        $fontSizeStepValues,
        $manualValues,
        $minScreenSize,
        $maxScreenSize
    ) {
        if ($manualMode) {
            return $this->buildManualFontSize($step, $disableFluid, $manualValues, $minScreenSize, $maxScreenSize);
        }

        // Wizard mode: use pre-calculated stepValues
        $value = $fontSizeStepValues[$index] ?? '';

        if (!empty($value)) {
            return [
                'fluid' => false,
                'name' => $step,
                'size' => $value,
                'slug' => FSEHelpers::numberToWordSlug($step)
            ];
        }

        return null;
    }

    /**
     * Build font size entry for manual mode
     *
     * @param string $step
     * @param bool $disableFluid
     * @param array $manualValues
     * @param int $minScreenSize
     * @param int $maxScreenSize
     * @return array|null
     */
    private function buildManualFontSize($step, $disableFluid, $manualValues, $minScreenSize, $maxScreenSize)
    {
        if ($disableFluid) {
            $value = $manualValues[$step]['value'] ?? '';
            if (!empty($value)) {
                return [
                    'fluid' => false,
                    'name' => $step,
                    'size' => FSEHelpers::ensureUnit($value),
                    'slug' => FSEHelpers::numberToWordSlug($step)
                ];
            }
        } else {
            $minValue = $manualValues[$step]['minValue'] ?? '';
            $maxValue = $manualValues[$step]['maxValue'] ?? '';

            if (!empty($minValue) && !empty($maxValue)) {
                return [
                    'fluid' => false,
                    'name' => $step,
                    'size' => FSEHelpers::calculateClamp(
                        floatval($minValue),
                        floatval($maxValue),
                        $minScreenSize,
                        $maxScreenSize
                    ),
                    'slug' => FSEHelpers::numberToWordSlug($step)
                ];
            } elseif (!empty($minValue)) {
                return [
                    'fluid' => false,
                    'name' => $step,
                    'size' => FSEHelpers::ensureUnit($minValue),
                    'slug' => FSEHelpers::numberToWordSlug($step)
                ];
            }
        }

        return null;
    }

    /**
     * Clear default font sizes from WordPress
     *
     * @param \WP_Theme_JSON_Data $theme_json
     * @return \WP_Theme_JSON_Data
     */
    public function clearDefaultFontSizes($theme_json)
    {
        $new_data = [
            'version' => 3,
            'settings' => [
                'typography' => [
                    'defaultFontSizes' => false,
                    'fontSizes' => []
                ],
            ],
        ];
        return $theme_json->update_with($new_data);
    }

    /**
     * Add theme filter for font sizes
     *
     * @param array $editorFontSizes
     * @param array $winden_editor
     */
    private function addThemeFilter($editorFontSizes, $winden_editor)
    {
        $extendFontSizesFSE = isset($winden_editor['wizzard']['extendFontSizesFSE']) &&
            $winden_editor['wizzard']['extendFontSizesFSE'] == 1;

        $theme_data = FSEHelpers::getThemeData();
        $theme_font_sizes = [];

        if (
            isset($theme_data['settings']['typography']['fontSizes']) &&
            is_array($theme_data['settings']['typography']['fontSizes'])
        ) {
            $theme_font_sizes = $theme_data['settings']['typography']['fontSizes'];
        }

        add_filter('wp_theme_json_data_theme', function ($theme_json) use ($editorFontSizes, $extendFontSizesFSE, $theme_font_sizes) {
            $new_data = [
                'version' => 3,
                'settings' => [
                    'typography' => [
                        'defaultFontSizes' => false,
                        'fluid' => false,
                        'fontSizes' => $extendFontSizesFSE ? array_merge($theme_font_sizes, $editorFontSizes) : $editorFontSizes
                    ],
                ],
            ];
            return $theme_json->update_with($new_data);
        });
    }
}

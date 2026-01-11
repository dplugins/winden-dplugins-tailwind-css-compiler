<?php

namespace Winden\App\Assets\Providers\FSE;

if (!defined('ABSPATH')) exit;

/**
 * FSE Spacing Provider
 * Adds Wizzard spacing to the FSE theme
 */
class FSESpacingProvider
{
    /**
     * Add Wizzard spacing to the FSE theme
     */
    public function run()
    {
        $winden_editor = FSEHelpers::getWindenEditor();

        // Check if spacing is active
        if (!($winden_editor['wizzard']['spacesActive'] ?? false)) {
            return;
        }

        $editorSpacingSizes = $this->buildSpacingSizes($winden_editor);

        // Add theme filter
        $this->addThemeFilter($editorSpacingSizes, $winden_editor);
    }

    /**
     * Build the spacing sizes array from Wizzard config
     *
     * @param array $winden_editor
     * @return array
     */
    private function buildSpacingSizes($winden_editor)
    {
        $theme_data = FSEHelpers::getThemeData();
        $existing_spacing = [];
        $theme_spacing = [];

        if (
            isset($theme_data['settings']['spacing']['spacingSizes']) &&
            is_array($theme_data['settings']['spacing']['spacingSizes'])
        ) {
            foreach ($theme_data['settings']['spacing']['spacingSizes'] as $spacing) {
                if (isset($spacing['name'])) {
                    $existing_spacing[] = $spacing['name'];
                    $theme_spacing[] = $spacing;
                }
            }
        }

        $sizeSteps = $winden_editor['wizzard']['spacing']['steps'] ?? [];
        $stepValues = $winden_editor['wizzard']['spacing']['stepValues'] ?? [];
        $overrides = $winden_editor['wizzard']['spacing']['overrides'] ?? [];
        $extendSpacingFSE = isset($winden_editor['wizzard']['extendSpacingFSE']) &&
            $winden_editor['wizzard']['extendSpacingFSE'] == 1;
        $includeUtilitySizes = isset($winden_editor['wizzard']['includeUtilitySizes']) &&
            $winden_editor['wizzard']['includeUtilitySizes'] == 1;

        // Manual mode
        $manualMode = $winden_editor['wizzard']['spacing']['manualMode'] ?? false;
        $manualValues = $winden_editor['wizzard']['spacing']['manualValues'] ?? [];
        $disableFluid = $winden_editor['wizzard']['spacing']['disableFluid'] ?? false;
        $minScreenSize = $winden_editor['wizzard']['spacing']['minScreenSize'] ?? 320;
        $maxScreenSize = $winden_editor['wizzard']['spacing']['maxScreenSize'] ?? 1920;

        $editorSpacingSizes = [];

        // Add utility sizes if enabled
        if ($includeUtilitySizes) {
            $editorSpacingSizes = array_merge(
                $editorSpacingSizes,
                $this->getUtilitySizes($existing_spacing, $extendSpacingFSE)
            );
        }

        // Process each spacing step
        foreach ($sizeSteps as $index => $step) {
            // Skip if disabled
            if (isset($overrides[$step]['enabled']) && !$overrides[$step]['enabled']) {
                continue;
            }

            // Skip if manual mode and step is not enabled
            if ($manualMode && isset($manualValues[$step]) && !($manualValues[$step]['enabled'] ?? true)) {
                continue;
            }

            $name = ucfirst($step);

            // Only add if spacing name doesn't exist or if extending
            if (!in_array($name, $existing_spacing) || $extendSpacingFSE) {
                $spacingEntry = $this->buildSpacingEntry(
                    $step,
                    $index,
                    $manualMode,
                    $disableFluid,
                    $stepValues,
                    $manualValues,
                    $minScreenSize,
                    $maxScreenSize
                );

                if ($spacingEntry) {
                    $editorSpacingSizes[] = $spacingEntry;
                }
            }
        }

        return $editorSpacingSizes;
    }

    /**
     * Get utility sizes (0, px, etc.)
     *
     * @param array $existing_spacing
     * @param bool $extendSpacingFSE
     * @return array
     */
    private function getUtilitySizes($existing_spacing, $extendSpacingFSE)
    {
        $sizes = [];
        $utilitySpaces = [
            '0' => '0',
            'px' => '1px',
        ];

        foreach ($utilitySpaces as $slug => $size) {
            $name = ucfirst($slug);
            if (!in_array($name, $existing_spacing) || $extendSpacingFSE) {
                $sizes[] = [
                    'name' => $name,
                    'slug' => $slug,
                    'size' => $size
                ];
            }
        }

        return $sizes;
    }

    /**
     * Build a single spacing entry
     *
     * @param string $step
     * @param int $index
     * @param bool $manualMode
     * @param bool $disableFluid
     * @param array $stepValues
     * @param array $manualValues
     * @param int $minScreenSize
     * @param int $maxScreenSize
     * @return array|null
     */
    private function buildSpacingEntry(
        $step,
        $index,
        $manualMode,
        $disableFluid,
        $stepValues,
        $manualValues,
        $minScreenSize,
        $maxScreenSize
    ) {
        $name = ucfirst($step);

        if ($manualMode) {
            return $this->buildManualSpacing($step, $name, $disableFluid, $manualValues, $minScreenSize, $maxScreenSize);
        }

        // Wizard mode: use pre-calculated stepValues
        $value = $stepValues[$index] ?? '';

        if (!empty($value)) {
            return [
                'name' => $name,
                'slug' => $step,
                'size' => $value
            ];
        }

        return null;
    }

    /**
     * Build spacing entry for manual mode
     *
     * @param string $step
     * @param string $name
     * @param bool $disableFluid
     * @param array $manualValues
     * @param int $minScreenSize
     * @param int $maxScreenSize
     * @return array|null
     */
    private function buildManualSpacing($step, $name, $disableFluid, $manualValues, $minScreenSize, $maxScreenSize)
    {
        if ($disableFluid) {
            $value = $manualValues[$step]['value'] ?? '';
            if (!empty($value)) {
                return [
                    'name' => $name,
                    'slug' => $step,
                    'size' => FSEHelpers::ensureUnit($value)
                ];
            }
        } else {
            $minValue = $manualValues[$step]['minValue'] ?? '';
            $maxValue = $manualValues[$step]['maxValue'] ?? '';

            if (!empty($minValue) && !empty($maxValue)) {
                return [
                    'name' => $name,
                    'slug' => $step,
                    'size' => FSEHelpers::calculateClamp(
                        floatval($minValue),
                        floatval($maxValue),
                        $minScreenSize,
                        $maxScreenSize
                    )
                ];
            } elseif (!empty($minValue)) {
                return [
                    'name' => $name,
                    'slug' => $step,
                    'size' => FSEHelpers::ensureUnit($minValue)
                ];
            }
        }

        return null;
    }

    /**
     * Add theme filter for spacing sizes
     *
     * @param array $editorSpacingSizes
     * @param array $winden_editor
     */
    private function addThemeFilter($editorSpacingSizes, $winden_editor)
    {
        $extendSpacingFSE = isset($winden_editor['wizzard']['extendSpacingFSE']) &&
            $winden_editor['wizzard']['extendSpacingFSE'] == 1;

        $theme_data = FSEHelpers::getThemeData();
        $theme_spacing = [];

        if (
            isset($theme_data['settings']['spacing']['spacingSizes']) &&
            is_array($theme_data['settings']['spacing']['spacingSizes'])
        ) {
            $theme_spacing = $theme_data['settings']['spacing']['spacingSizes'];
        }

        add_filter('wp_theme_json_data_theme', function ($theme_json) use ($editorSpacingSizes, $extendSpacingFSE, $theme_spacing) {
            $new_data = [
                'version' => 3,
                'settings' => [
                    'spacing' => [
                        'defaultSpacingSizes' => false,
                        'spacingSizes' => $extendSpacingFSE ? array_merge($theme_spacing, $editorSpacingSizes) : $editorSpacingSizes,
                        'units' => ['px', '%', 'em', 'rem', 'vh', 'vw']
                    ]
                ]
            ];
            return $theme_json->update_with($new_data);
        });
    }
}

<?php

namespace Winden\App\Assets\Providers;

use Winden\App\Helpers\SettingsOptions;
use Winden\App\Assets\Providers\ProvidersHelpers;

class FSEData
{
    public function __construct()
    {
        // Constructor is now minimal - all setup happens in run()
    }

    /**
     * Main execution method - called by the centralized system
     */
    public function run()
    {
        $settings = SettingsOptions::getWindenOptions();

        if ($settings['register_wizzard_data_in_fse'] ?? false) {
            // ------------------------------------------------------------------------
            // Add Wizzard Data to the FSE Theme
            // Since we're already inside after_setup_theme hook (from Providers),
            // call the methods directly instead of adding more hooks
            // ------------------------------------------------------------------------
            $this->add_wizzard_font_sizes();
            $this->add_wizzard_space();
            $this->add_wizzard_color_palette();
        }
    }

    // ------------------------------------------------------------------------
    // Add Wizzard Font Sizes to the FSE Theme
    // ------------------------------------------------------------------------
    public function add_wizzard_font_sizes()
    {
        // Retrieve the winden_editor option first to check if font sizes are active
        $winden_editor = get_option('winden_editor', []);
        
        // Check if font sizes tab is active
        if (!($winden_editor['wizzard']['fontSizesActive'] ?? false)) {
            return;
        }

        // Get existing theme.json data
        $theme_data = \WP_Theme_JSON_Resolver::get_merged_data()->get_data();
        $existing_font_sizes = [];
        $theme_font_sizes = [];

        // Get existing font size names and full data from theme.json
        if (
            isset($theme_data['settings']['typography']['fontSizes']) &&
            is_array($theme_data['settings']['typography']['fontSizes'])
        ) {
            foreach ($theme_data['settings']['typography']['fontSizes'] as $font) {
                if (isset($font['name'])) {
                    $existing_font_sizes[] = $font['name'];
                    $theme_font_sizes[] = $font;
                }
            }
        }

        $fontSizeSteps = $winden_editor['wizzard']['fontSize']['steps'] ?? [];
        $fontSizeStepValues = $winden_editor['wizzard']['fontSize']['stepValues'] ?? [];
        $fontSizeMinMaxValues = $winden_editor['wizzard']['fontSize']['minMaxValues'] ?? [];
        $disableFluid = isset($winden_editor['wizzard']['fontSize']['disableFluid']) &&
            $winden_editor['wizzard']['fontSize']['disableFluid'] == 1;
        $extendFontSizesFSE = isset($winden_editor['wizzard']['extendFontSizesFSE']) &&
            $winden_editor['wizzard']['extendFontSizesFSE'] == 1;
        $overrides = $winden_editor['wizzard']['fontSize']['overrides'] ?? [];

        // Get manual mode values if enabled
        $manualMode = $winden_editor['wizzard']['fontSize']['manualMode'] ?? false;
        $manualValues = $winden_editor['wizzard']['fontSize']['manualValues'] ?? [];

        // Screen sizes for clamp calculation
        $minScreenSize = $winden_editor['wizzard']['fontSize']['minScreenSize'] ?? 320;
        $maxScreenSize = $winden_editor['wizzard']['fontSize']['maxScreenSize'] ?? 1920;

        // Prepare the editor font sizes array
        $editorFontSizes = [];

        foreach ($fontSizeSteps as $index => $step) {
            // Skip if the step is disabled
            if (isset($overrides[$step]) && isset($overrides[$step]['enabled']) && !$overrides[$step]['enabled']) {
                continue;
            }

            // Skip if manual mode and step is not enabled
            if ($manualMode && isset($manualValues[$step]) && !($manualValues[$step]['enabled'] ?? true)) {
                continue;
            }

            $name = $step;

            // Only add if font size name doesn't exist in theme.json or if extendFontSizesFSE is true
            if (!in_array($name, $existing_font_sizes) || $extendFontSizesFSE) {
                // Determine the value based on mode
                if ($manualMode) {
                    // Manual mode: use manual values
                    if ($disableFluid) {
                        // Fixed mode: use single value
                        $value = $manualValues[$step]['value'] ?? '';
                        if (!empty($value)) {
                            $editorFontSizes[] = [
                                'fluid' => false,
                                'name'  => $name,
                                'size'  => $this->ensureUnit($value),
                                'slug'  => $this->numberToWordSlug($step)
                            ];
                        }
                    } else {
                        // Fluid mode: use calculated clamp
                        $minValue = $manualValues[$step]['minValue'] ?? '';
                        $maxValue = $manualValues[$step]['maxValue'] ?? '';

                        if (!empty($minValue) && !empty($maxValue)) {
                            $clampValue = $this->calculateClamp(
                                floatval($minValue),
                                floatval($maxValue),
                                $minScreenSize,
                                $maxScreenSize
                            );
                            $editorFontSizes[] = [
                                'fluid' => false,  // Set to false because we're providing the clamp directly
                                'name'  => $name,
                                'size'  => $clampValue,
                                'slug'  => $this->numberToWordSlug($step)
                            ];
                        } else if (!empty($minValue)) {
                            $editorFontSizes[] = [
                                'fluid' => false,
                                'name'  => $name,
                                'size'  => $this->ensureUnit($minValue),
                                'slug'  => $this->numberToWordSlug($step)
                            ];
                        }
                    }
                } else {
                    // Wizard mode: always use the pre-calculated stepValues from the frontend
                    // stepValues contain the authoritative clamp() values that match @theme output
                    // Overrides for min/max are already incorporated into stepValues by the frontend
                    $value = $fontSizeStepValues[$index] ?? '';

                    if (!empty($value)) {
                        $editorFontSizes[] = [
                            'fluid' => false,  // Set to false because we're providing the clamp directly
                            'name'  => $name,
                            'size'  => $value,
                            'slug'  => $this->numberToWordSlug($step)
                        ];
                    }
                }
            }
        }

        // Add theme support for editor font sizes
        add_theme_support('editor-font-sizes', $editorFontSizes);

        // Clear WordPress default font sizes (small, medium, large, x-large)
        // This filter runs on core defaults before theme data is merged
        add_filter('wp_theme_json_data_default', function ($theme_json) {
            $new_data = [
                'version'  => 3,
                'settings' => [
                    'typography' => [
                        'defaultFontSizes' => false,
                        'fontSizes' => [] // Clear all default font sizes
                    ],
                ],
            ];
            return $theme_json->update_with($new_data);
        });

        // Add Wizzard font sizes at theme level
        add_filter('wp_theme_json_data_theme', function ($theme_json) use ($editorFontSizes, $extendFontSizesFSE, $theme_font_sizes) {
            $new_data = [
                'version'  => 3,
                'settings' => [
                    'typography' => [
                        'defaultFontSizes' => false,
                        // Set fluid to false to prevent WordPress from recalculating clamp values
                        // We provide pre-calculated clamp() values from the Wizzard
                        'fluid' => false,
                        'fontSizes' => $extendFontSizesFSE ? array_merge($theme_font_sizes, $editorFontSizes) : $editorFontSizes
                    ],
                ],
            ];
            return $theme_json->update_with($new_data);
        });
    }

    /**
     * Convert numbers in a string to their English word equivalents (supports 0-20, 30, 40, ..., 90, 100)
     */
    private function numberToWordSlug($str) {
        $map = [
            '0' => 'zero', '1' => 'one', '2' => 'two', '3' => 'three', '4' => 'four', '5' => 'five',
            '6' => 'six', '7' => 'seven', '8' => 'eight', '9' => 'nine', '10' => 'ten', '11' => 'eleven',
            '12' => 'twelve', '13' => 'thirteen', '14' => 'fourteen', '15' => 'fifteen', '16' => 'sixteen',
            '17' => 'seventeen', '18' => 'eighteen', '19' => 'nineteen', '20' => 'twenty',
            '30' => 'thirty', '40' => 'forty', '50' => 'fifty', '60' => 'sixty', '70' => 'seventy',
            '80' => 'eighty', '90' => 'ninety', '100' => 'hundred'
        ];
        // Replace numbers with words
        return strtolower(preg_replace_callback('/\d+/', function($matches) use ($map) {
            $num = $matches[0];
            if (isset($map[$num])) {
                return $map[$num];
            }
            // For numbers not in the map, just return the number
            return $num;
        }, $str));
    }

    // ------------------------------------------------------------------------
    // Add Wizzard Space to the FSE Theme with Fluid Support
    // ------------------------------------------------------------------------
    public function add_wizzard_space()
    {
        // Get existing theme.json data
        $theme_data = \WP_Theme_JSON_Resolver::get_merged_data()->get_data();
        $existing_spacing = [];
        $theme_spacing = [];
        
        // Get existing spacing data from theme.json
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
        
        // Retrieve the winden_editor option
        $winden_editor = get_option('winden_editor', []);
        
        // Check if spacing is active
        if (!($winden_editor['wizzard']['spacesActive'] ?? false)) {
            return;
        }

        $sizeSteps = $winden_editor['wizzard']['spacing']['steps'] ?? [];
        $stepValues = $winden_editor['wizzard']['spacing']['stepValues'] ?? [];
        $overrides = $winden_editor['wizzard']['spacing']['overrides'] ?? [];
        $minMaxValues = $winden_editor['wizzard']['spacing']['minMaxValues'] ?? [];
        $extendSpacingFSE = isset($winden_editor['wizzard']['extendSpacingFSE']) &&
            $winden_editor['wizzard']['extendSpacingFSE'] == 1;
        $includeUtilitySizes = isset($winden_editor['wizzard']['includeUtilitySizes']) &&
            $winden_editor['wizzard']['includeUtilitySizes'] == 1;

        // Get manual mode values if enabled
        $manualMode = $winden_editor['wizzard']['spacing']['manualMode'] ?? false;
        $manualValues = $winden_editor['wizzard']['spacing']['manualValues'] ?? [];
        $disableFluid = $winden_editor['wizzard']['spacing']['disableFluid'] ?? false;

        // Screen sizes for clamp calculation
        $minScreenSize = $winden_editor['wizzard']['spacing']['minScreenSize'] ?? 320;
        $maxScreenSize = $winden_editor['wizzard']['spacing']['maxScreenSize'] ?? 1920;

        // Prepare the editor spacing sizes array
        $editorSpacingSizes = [];

        // Add utility sizes if enabled
        if ($includeUtilitySizes) {
            $utilitySpaces = [
                '0' => '0',
                'px' => '1px',
                // Note: 'auto', 'full', 'screen' etc. are CSS keywords that FSE might not handle well
                // We'll add the most common ones that work with FSE
            ];

            foreach ($utilitySpaces as $slug => $size) {
                $name = ucfirst($slug);
                if (!in_array($name, $existing_spacing) || $extendSpacingFSE) {
                    $editorSpacingSizes[] = [
                        'name' => $name,
                        'slug' => $slug,
                        'size' => $size
                    ];
                }
            }
        }

        // Process each spacing step
        foreach ($sizeSteps as $index => $step) {
            // Skip if the step is disabled
            if (isset($overrides[$step]) && isset($overrides[$step]['enabled']) && !$overrides[$step]['enabled']) {
                continue;
            }

            // Skip if manual mode and step is not enabled
            if ($manualMode && isset($manualValues[$step]) && !($manualValues[$step]['enabled'] ?? true)) {
                continue;
            }

            $name = ucfirst($step);

            // Only add if spacing name doesn't exist in theme.json or if extendSpacingFSE is true
            if (!in_array($name, $existing_spacing) || $extendSpacingFSE) {
                // Determine the value based on mode
                if ($manualMode) {
                    // Manual mode: use manual values
                    if ($disableFluid) {
                        // Fixed mode: use single value
                        $value = $manualValues[$step]['value'] ?? '';
                        if (!empty($value)) {
                            $editorSpacingSizes[] = [
                                'name' => $name,
                                'slug' => $step,
                                'size' => $this->ensureUnit($value)
                            ];
                        }
                    } else {
                        // Fluid mode: calculate clamp from minValue and maxValue
                        $minValue = $manualValues[$step]['minValue'] ?? '';
                        $maxValue = $manualValues[$step]['maxValue'] ?? '';

                        if (!empty($minValue) && !empty($maxValue)) {
                            $clampValue = $this->calculateClamp(
                                floatval($minValue),
                                floatval($maxValue),
                                $minScreenSize,
                                $maxScreenSize
                            );
                            $editorSpacingSizes[] = [
                                'name' => $name,
                                'slug' => $step,
                                'size' => $clampValue
                            ];
                        } else if (!empty($minValue)) {
                            $editorSpacingSizes[] = [
                                'name' => $name,
                                'slug' => $step,
                                'size' => $this->ensureUnit($minValue)
                            ];
                        }
                    }
                } else {
                    // Wizard mode: always use the pre-calculated stepValues from the frontend
                    // stepValues contain the authoritative clamp() values that match @theme output
                    // Overrides for min/max are already incorporated into stepValues by the frontend
                    $value = $stepValues[$index] ?? '';

                    if (!empty($value)) {
                        $editorSpacingSizes[] = [
                            'name' => $name,
                            'slug' => $step,
                            'size' => $value
                        ];
                    }
                }
            }
        }

        add_filter('wp_theme_json_data_theme', function($theme_json) use ($editorSpacingSizes, $extendSpacingFSE, $theme_spacing) {
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

    /**
     * Calculate fluid clamp value using the same formula as the frontend
     *
     * This matches the calculation in clampCalculations.ts
     *
     * @param float $minSize Minimum size in pixels
     * @param float $maxSize Maximum size in pixels
     * @param int $minScreen Minimum screen size
     * @param int $maxScreen Maximum screen size
     * @return string CSS clamp() function
     */
    private function calculateClamp($minSize, $maxSize, $minScreen, $maxScreen) {
        // Calculate slope and intersection (matches frontend formula)
        $slope = ($maxSize - $minSize) / ($maxScreen - $minScreen);
        $intersection = -$minScreen * $slope + $minSize;

        // Convert to vi units (multiply by 100)
        $slopeVi = $slope * 100;

        // Round to 2 decimal places for consistency
        $minRounded = round($minSize, 2);
        $maxRounded = round($maxSize, 2);
        $intersectionRounded = round($intersection, 2);
        $slopeRounded = round($slopeVi, 2);

        // Format the clamp value: clamp(min, intersection + slope, max)
        // Using vi (viewport inline) units to match Tailwind v4's fluid typography
        return sprintf(
            'clamp(%spx, %spx + %svi, %spx)',
            $minRounded,
            $intersectionRounded,
            $slopeRounded,
            $maxRounded
        );
    }

    /**
     * Ensure a value has a unit (px, rem, etc.)
     *
     * @param string|int|float $value Value to check
     * @return string Value with unit
     */
    private function ensureUnit($value) {
        if (empty($value)) {
            return '';
        }

        // If it's already a clamp, calc, or has units, return as-is
        if (preg_match('/(clamp|calc|px|rem|em|%|vw|vh|vi)/', $value)) {
            return $value;
        }

        // If it's a number, add px
        if (is_numeric($value)) {
            return $value . 'px';
        }

        return $value;
    }

    /**
     * Format spacing value to ensure proper units
     *
     * @deprecated This method is kept for backward compatibility but should not be used for new code
     */
    private function formatSpacingValue($value) {
        // If it's a clamp value
        if (strpos($value, 'clamp') !== false) {
            // Extract the numbers and units
            preg_match_all('/clamp\(([^,]+),([^,]+),([^)]+)\)/', $value, $matches);
            if (isset($matches[1][0], $matches[2][0], $matches[3][0])) {
                $min = trim($matches[1][0]);
                $preferred = trim($matches[2][0]);
                $max = trim($matches[3][0]);

                // Add px to numbers that don't have units
                $min = is_numeric($min) ? $min . 'px' : $min;
                $max = is_numeric($max) ? $max . 'px' : $max;

                return "clamp($min, $preferred, $max)";
            }
        }

        // For simple values, add px if it's a number
        return is_numeric($value) ? $value . 'px' : $value;
    }

    // ------------------------------------------------------------------------
    // Add Wizzard Color Palette to the FSE Theme
    // ------------------------------------------------------------------------
    public function add_wizzard_color_palette()
    {
        // Retrieve the winden_editor option, default to an empty array if not available
        $winden_editor = get_option('winden_editor', []);

        // Check if colors tab is active
        if (!($winden_editor['wizzard']['colorsActive'] ?? false)) {
            return;
        }

        // Extract color entries
        $colorEntries = $winden_editor['wizzard']['colorEntries'] ?? [];
        $includeUtilityColors = $winden_editor['wizzard']['includeUtilityColors'] ?? false;
        $extendColorsFSE = isset($winden_editor['wizzard']['extendColorsFSE']) &&
            $winden_editor['wizzard']['extendColorsFSE'] == 1;

        // Get existing theme.json colors
        $theme_data = \WP_Theme_JSON_Resolver::get_merged_data()->get_data();
        $existing_colors = [];
        $theme_colors = [];

        // Get existing color names and full color data from theme.json
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

        // Prepare the editor color palette array
        $editorColors = [];

        // Add utility colors if enabled and not already in theme.json
        if ($includeUtilityColors) {
            $white_name = __('White', 'winden');
            $black_name = __('Black', 'winden');
            $transparent_name = __('Transparent', 'winden');
            $inherit_name = __('Inherit', 'winden');
            $current_name = __('Current', 'winden');

            if (!in_array($white_name, $existing_colors)) {
                $editorColors[] = [
                    'name'  => $white_name,
                    'slug'  => 'white',
                    'color' => '#ffffff',
                ];
            }

            if (!in_array($black_name, $existing_colors)) {
                $editorColors[] = [
                    'name'  => $black_name,
                    'slug'  => 'black',
                    'color' => '#000000',
                ];
            }

            if (!in_array($transparent_name, $existing_colors)) {
                $editorColors[] = [
                    'name'  => $transparent_name,
                    'slug'  => 'transparent',
                    'color' => 'transparent',
                ];
            }

            if (!in_array($current_name, $existing_colors)) {
                $editorColors[] = [
                    'name'  => $current_name,
                    'slug'  => 'current',
                    'color' => 'currentColor',
                ];
            }

            // Note: 'inherit' is not typically useful in the color palette UI
            // as it inherits from parent element, but we'll include it for completeness
            if (!in_array($inherit_name, $existing_colors)) {
                $editorColors[] = [
                    'name'  => $inherit_name,
                    'slug'  => 'inherit',
                    'color' => 'inherit',
                ];
            }
        }

        foreach ($colorEntries as $colorEntry) {
            // Check if shades are enabled for this color
            $enableShades = isset($colorEntry['enableShades']) ? $colorEntry['enableShades'] : true;
            
            if ($enableShades) {
                // If shades are enabled, add all enabled shades
                foreach ($colorEntry['shades'] as $shade) {
                    if (!empty($shade['isEnabled'])) {
                        if (!empty($shade['isDefault'])) {
                            $slug = strtolower(str_replace(' ', '-', $colorEntry['name']));
                            $name = $colorEntry['name'];
                        } else {
                            $slug = strtolower(str_replace(' ', '-', $colorEntry['name'] . '-' . $shade['name']));
                            $name = $colorEntry['name'] . ' ' . $shade['name'];
                        }

                        // Only add if color name doesn't exist in theme.json or if extendColorsFSE is true
                        if (!in_array($name, $existing_colors) || $extendColorsFSE) {
                            $editorColors[] = [
                                'name'  => $name,
                                'slug'  => $slug,
                                'color' => $shade['hex'],
                            ];
                        }
                    }
                }
            } else {
                // If shades are disabled, only add the main color
                $slug = strtolower(str_replace(' ', '-', $colorEntry['name']));
                $name = $colorEntry['name'];

                // Only add if color name doesn't exist in theme.json or if extendColorsFSE is true
                if (!in_array($name, $existing_colors) || $extendColorsFSE) {
                    $editorColors[] = [
                        'name'  => $name,
                        'slug'  => $slug,
                        'color' => $colorEntry['hex'],
                    ];
                }
            }
        }

        // Add theme support for the editor color palette
        add_theme_support('editor-color-palette', $editorColors);
        add_filter('wp_theme_json_data_theme', function ($theme_json) use ($editorColors, $extendColorsFSE, $theme_colors) {
            $new_data = [
                'version'  => 3,
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

    /**
     * Display complete theme.json data
     */
    public function display_theme_json_debug()
    {
        add_action('admin_footer', function () {
            if (!is_admin()) {
                return;
            }

                    // Get all theme.json data
        $font_sizes_data = $this->get_font_sizes_theme_json();
        $spacing_data = $this->get_spacing_theme_json();
        $colors_data = $this->get_colors_theme_json();

            // Combine all data
            $complete_theme_json = [
                'version' => 3,
                'settings' => array_merge_recursive(
                    $font_sizes_data['settings'] ?? [],
                    $spacing_data['settings'] ?? [],
                    $colors_data['settings'] ?? []
                )
            ];

            // Output debug panel
            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Debug panel HTML is safely constructed
            echo $this->render_debug_panel($complete_theme_json);
        });
    }

    /**
     * Get font sizes theme.json data
     */
    private function get_font_sizes_theme_json()
    {
        $winden_editor = get_option('winden_editor', []);

        // Check if font sizes tab is active
        if (!($winden_editor['wizzard']['fontSizesActive'] ?? false)) {
            return ['settings' => []];
        }

        // Extract fontSize data
        $fontSizeSteps = $winden_editor['wizzard']['fontSize']['steps'] ?? [];
        $fontSizeMinMaxValues = $winden_editor['wizzard']['fontSize']['minMaxValues'] ?? [];
        $disableFluid = isset($winden_editor['wizzard']['fontSize']['disableFluid']) &&
            $winden_editor['wizzard']['fontSize']['disableFluid'] == 1;

        $editorFontSizes = [];
        foreach ($fontSizeSteps as $index => $step) {
            $min = isset($fontSizeMinMaxValues[$index]['min']) ? $fontSizeMinMaxValues[$index]['min'] : 0;
            $max = isset($fontSizeMinMaxValues[$index]['max']) ? $fontSizeMinMaxValues[$index]['max'] : $min;

            if ($disableFluid) {
                $editorFontSizes[] = [
                    'fluid' => false,
                    'name'  => $step,
                    'size'  => $min,
                    'slug'  => $this->numberToWordSlug($step)
                ];
            } else {
                $editorFontSizes[] = [
                    'fluid' => [
                        'min' => $min,
                        'max' => $max,
                    ],
                    'name'  => $step,
                    'size'  => $max,
                    'slug'  => $this->numberToWordSlug($step)
                ];
            }
        }

        return [
            'settings' => [
                'typography' => [
                    'defaultFontSizes' => false,
                    // Set fluid to false - we provide pre-calculated clamp values
                    'fluid' => false,
                    'fontSizes' => $editorFontSizes
                ]
            ]
        ];
    }

    /**
     * Get spacing theme.json data
     */
    private function get_spacing_theme_json()
    {
        $winden_editor = get_option('winden_editor', []);

        // Check if spacing tab is active
        if (!($winden_editor['wizzard']['spacesActive'] ?? false)) {
            return ['settings' => []];
        }

        $sizeSteps = $winden_editor['wizzard']['spacing']['steps'] ?? [];
        $sizeMinMaxValues = $winden_editor['wizzard']['spacing']['minMaxValues'] ?? [];
        $disableFluid = isset($winden_editor['wizzard']['spacing']['disableFluid']) &&
            $winden_editor['wizzard']['spacing']['disableFluid'] == 1;
        $overrides = $winden_editor['wizzard']['spacing']['overrides'] ?? [];

        $editorSizes = [];
        foreach ($sizeSteps as $index => $step) {
            $min = isset($sizeMinMaxValues[$index]['min']) ? $sizeMinMaxValues[$index]['min'] : 0;
            $max = isset($sizeMinMaxValues[$index]['max']) ? $sizeMinMaxValues[$index]['max'] : $min;
            $slug = $this->numberToWordSlug($step);
            $name = $this->numberToWordSlug($step);

            // Check if this step has an override
            if (isset($overrides[$step]) && !empty($overrides[$step]['value'])) {
                // Use the override value
                $editorSizes[] = [
                    'fluid' => false,
                    'name'  => $name,
                    'size'  => $overrides[$step]['value'],
                    'slug'  => $slug
                ];
            } else if ($disableFluid) {
                $editorSizes[] = [
                    'fluid' => false,
                    'name'  => $name,
                    'size'  => $min,
                    'slug'  => $slug
                ];
            } else {
                $editorSizes[] = [
                    'fluid' => [
                        'min' => $min,
                        'max' => $max,
                    ],
                    'name'  => $name,
                    'size'  => $max,
                    'slug'  => $slug
                ];
            }
        }

        return [
            'settings' => [
                'spacing' => [
                    'defaultSpacingSizes' => false,
                    'spacingSizes' => $editorSizes,
                    'units' => [
                        '%',
                        'px',
                        'em',
                        'rem',
                        'vh',
                        'vw'
                    ]
                ]
            ]
        ];
    }

    /**
     * Get colors theme.json data
     */
    private function get_colors_theme_json()
    {
        $winden_editor = get_option('winden_editor', []);

        // Check if colors tab is active
        if (!($winden_editor['wizzard']['colorsActive'] ?? false)) {
            return ['settings' => []];
        }

        $colorEntries = $winden_editor['wizzard']['colorEntries'] ?? [];
        $includeUtilityColors = $winden_editor['wizzard']['includeUtilityColors'] ?? false;

        $editorColors = [];

        if ($includeUtilityColors) {
            $editorColors[] = [
                'name'  => 'White',
                'slug'  => 'white',
                'color' => '#ffffff',
            ];
            $editorColors[] = [
                'name'  => 'Black',
                'slug'  => 'black',
                'color' => '#000000',
            ];
        }

        foreach ($colorEntries as $colorEntry) {
            // Check if shades are enabled for this color
            $enableShades = isset($colorEntry['enableShades']) ? $colorEntry['enableShades'] : true;
            
            if ($enableShades) {
                // If shades are enabled, add all enabled shades
                foreach ($colorEntry['shades'] as $shade) {
                    if (!empty($shade['isEnabled'])) {
                        if (!empty($shade['isDefault'])) {
                            $slug = strtolower(str_replace(' ', '-', $colorEntry['name']));
                            $name = $colorEntry['name'];
                        } else {
                            $slug = strtolower(str_replace(' ', '-', $colorEntry['name'] . '-' . $shade['name']));
                            $name = $colorEntry['name'] . ' ' . $shade['name'];
                        }

                        $editorColors[] = [
                            'name'  => $name,
                            'slug'  => $slug,
                            'color' => $shade['hex'],
                        ];
                    }
                }
            } else {
                // If shades are disabled, only add the main color
                $slug = strtolower(str_replace(' ', '-', $colorEntry['name']));
                $name = $colorEntry['name'];
                
                $editorColors[] = [
                    'name'  => $name,
                    'slug'  => $slug,
                    'color' => $colorEntry['hex'],
                ];
            }
        }

        return [
            'settings' => [
                'color' => [
                    'palette' => $editorColors
                ]
            ]
        ];
    }

    /**
     * Render debug panel
     */
    private function render_debug_panel($theme_json)
    {
        ob_start();
?>
        <!-- Collapsed State Button (Shown by default) -->
        <div id="winden-debug-collapsed" style="position: fixed; bottom: 30px; right: 30px; z-index: 99999;">
            <button onclick="expandPanel()" style="padding: 8px 16px; cursor: pointer;">Show Theme JSON</button>
        </div>

        <!-- Expanded Panel (Hidden by default) -->
        <div id="winden-debug-panel" style="position: fixed; bottom: 30px; right: 30px; background: white; padding: 20px; border: 2px solid #000; max-height: 80vh; overflow: auto; z-index: 99999; width: 600px; display: none;">
            <!-- Header with Collapse Button -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <button onclick="switchTab('typography')" style="padding: 8px 16px; margin-right: 5px; cursor: pointer;">Typography</button>
                    <button onclick="switchTab('spacing')" style="padding: 8px 16px; margin-right: 5px; cursor: pointer;">Spacing</button>
                    <button onclick="switchTab('colors')" style="padding: 8px 16px; cursor: pointer;">Colors</button>
                </div>
                <button onclick="collapsePanel()" style="padding: 4px 8px; cursor: pointer;">Collapse</button>
            </div>

            <!-- Typography Tab -->
            <div id="tab-typography" class="theme-json-tab">
                <h3>Typography</h3>
                <pre style="background: #f5f5f5; padding: 10px; max-height: 500px; overflow: auto;">
<?php
        $typography = [
            'writingMode' => true,
            'defaultFontSizes' => false,
            'fluid' => false,
            'fontSizes' => $theme_json['settings']['typography']['fontSizes'] ?? []
        ];
        echo '"typography": ' . json_encode($typography, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
                </pre>
            </div>

            <!-- Spacing Tab -->
            <div id="tab-spacing" class="theme-json-tab" style="display: none;">
                <h3>Spacing Sizes</h3>
                <pre style="background: #f5f5f5; padding: 10px; max-height: 500px; overflow: auto;">
<?php
        $spacing = [
            'defaultSpacingSizes' => false,
            'spacingSizes' => $theme_json['settings']['spacing']['spacingSizes'] ?? [],
            'units' => [
                '%',
                'px',
                'em',
                'rem',
                'vh',
                'vw'
            ]
        ];
        echo '"spacing": ' . json_encode($spacing, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
                </pre>
            </div>

            <!-- Colors Tab -->
            <div id="tab-colors" class="theme-json-tab" style="display: none;">
                <h3>Colors</h3>
                <pre style="background: #f5f5f5; padding: 10px; max-height: 500px; overflow: auto;">
<?php
        $colors = [
            'defaultDuotone' => false,
            'defaultGradients' => false,
            'defaultPalette' => false,
            'palette' => $theme_json['settings']['color']['palette'] ?? []
        ];
        echo '"color": ' . json_encode($colors, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
                </pre>
            </div>

            <!-- Copy Button -->
            <button onclick="copyCurrentTab()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">
                Copy Current Tab
            </button>

            <style>
                .theme-json-tab {
                    margin-bottom: 15px;
                }

                pre {
                    margin: 0;
                    white-space: pre-wrap;
                }

                button:hover {
                    background: #f0f0f0;
                }

                .theme-json-tab h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                }
            </style>

            <script>
                function switchTab(tabName) {
                    document.querySelectorAll('.theme-json-tab').forEach(tab => {
                        tab.style.display = 'none';
                    });
                    document.getElementById('tab-' + tabName).style.display = 'block';
                    document.querySelectorAll('button').forEach(btn => {
                        btn.style.background = '';
                    });
                    event.target.style.background = '#f0f0f0';
                }

                function copyCurrentTab() {
                    const visibleTab = Array.from(document.querySelectorAll('.theme-json-tab'))
                        .find(tab => tab.style.display !== 'none');

                    if (visibleTab) {
                        const jsonText = visibleTab.querySelector('pre').textContent;
                        navigator.clipboard.writeText(jsonText.trim())
                            .then(() => alert("Values copied to clipboard!"))
                            .catch(err => console.error("Failed to copy: ", err));
                    }
                }

                function collapsePanel() {
                    document.getElementById('winden-debug-panel').style.display = 'none';
                    document.getElementById('winden-debug-collapsed').style.display = 'block';
                }

                function expandPanel() {
                    document.getElementById('winden-debug-panel').style.display = 'block';
                    document.getElementById('winden-debug-collapsed').style.display = 'none';
                    // Initialize first tab when expanding
                    document.querySelector('#winden-debug-panel button').click();
                }
            </script>
        </div>
<?php
        return ob_get_clean();
    }
}

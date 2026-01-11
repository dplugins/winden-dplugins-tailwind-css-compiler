<?php

namespace Winden\App\Assets\Providers;

if (!defined('ABSPATH')) exit;

use Winden\App\Helpers\SettingsOptions;
use Winden\App\Assets\Providers\FSE\FSEFontSizeProvider;
use Winden\App\Assets\Providers\FSE\FSESpacingProvider;
use Winden\App\Assets\Providers\FSE\FSEColorPaletteProvider;

/**
 * FSE Data Provider
 * Orchestrates the registration of Wizzard data (fonts, spacing, colors) in FSE themes
 *
 * This class has been refactored - the actual implementation is split into:
 * - FSE\FSEHelpers - Shared utility functions
 * - FSE\FSEFontSizeProvider - Font size registration
 * - FSE\FSESpacingProvider - Spacing registration
 * - FSE\FSEColorPaletteProvider - Color palette registration
 */
class FSEData
{
    /** @var FSEFontSizeProvider */
    private $fontSizeProvider;

    /** @var FSESpacingProvider */
    private $spacingProvider;

    /** @var FSEColorPaletteProvider */
    private $colorPaletteProvider;

    public function __construct()
    {
        $this->fontSizeProvider = new FSEFontSizeProvider();
        $this->spacingProvider = new FSESpacingProvider();
        $this->colorPaletteProvider = new FSEColorPaletteProvider();
    }

    /**
     * Main execution method - called by the centralized system
     */
    public function run()
    {
        $settings = SettingsOptions::getWindenOptions();

        if ($settings['register_wizzard_data_in_fse'] ?? false) {
            $this->fontSizeProvider->run();
            $this->spacingProvider->run();
            $this->colorPaletteProvider->run();
        }
    }

    /**
     * Add Wizzard font sizes to the FSE theme
     * @deprecated Use FSEFontSizeProvider directly
     */
    public function add_wizzard_font_sizes()
    {
        $this->fontSizeProvider->run();
    }

    /**
     * Add Wizzard spacing to the FSE theme
     * @deprecated Use FSESpacingProvider directly
     */
    public function add_wizzard_space()
    {
        $this->spacingProvider->run();
    }

    /**
     * Add Wizzard color palette to the FSE theme
     * @deprecated Use FSEColorPaletteProvider directly
     */
    public function add_wizzard_color_palette()
    {
        $this->colorPaletteProvider->run();
    }
}

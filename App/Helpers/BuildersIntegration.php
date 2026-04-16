<?php

namespace Winden\App\Helpers;

class BuildersIntegration
{
    public static function fse($dataKey = null)
    {
        // ------------------------------------------------------------------------
        // FSE Theme Data / Theme.json
        // ------------------------------------------------------------------------

        $themedata = [];

        $theme_json_path = get_theme_file_path('theme.json');

        if (file_exists($theme_json_path)) {
            $theme_json_content = file_get_contents($theme_json_path);
            $theme_json_data_array = json_decode($theme_json_content, true);

            // Initialize empty arrays to avoid errors if keys don't exist
            $themeColors = [];
            $themeColorGroups = [];
            $themeFontFamilies = [];
            $themeFontSizes = [];
            $themeSpacingSizes = [];

            // Check and safely access the palette colors
            if (isset($theme_json_data_array['settings']['color']['palette']) && is_array($theme_json_data_array['settings']['color']['palette'])) {
                $themeColorGroups = [];
                foreach ($theme_json_data_array['settings']['color']['palette'] as $item) {
                    $group = explode('-', $item['slug'])[0]; // Get the first part of the slug
                    if (!isset($themeColorGroups[$group])) {
                        $themeColorGroups[$group] = [];
                    }
                    $themeColorGroups[$group][] = $item;
                }
                $themeColors = array_reduce($theme_json_data_array['settings']['color']['palette'], function ($acc, $color) {
                    $slug = $color['slug'];
                    $acc[$slug] = $color['color'];
                    return $acc;
                }, []);
            }

            // Check and safely access the typography font families
            if (isset($theme_json_data_array['settings']['typography']['fontFamilies']) && is_array($theme_json_data_array['settings']['typography']['fontFamilies'])) {
                $themeFontFamilies = array_reduce($theme_json_data_array['settings']['typography']['fontFamilies'], function ($acc, $fontFamily) {
                    $acc[$fontFamily['slug']] = addslashes(str_replace("'", '"', $fontFamily['fontFamily']));
                    return $acc;
                }, []);
            }

            // Check and safely access the typography font sizes
            if (isset($theme_json_data_array['settings']['typography']['fontSizes']) && is_array($theme_json_data_array['settings']['typography']['fontSizes'])) {
                $themeFontSizes = array_reduce($theme_json_data_array['settings']['typography']['fontSizes'], function ($acc, $fontSize) {
                    $acc[$fontSize['slug']] = $fontSize['size'];
                    return $acc;
                }, []);
            }

            // Check and safely access the spacing sizes
            if (isset($theme_json_data_array['settings']['spacing']['spacingSizes']) && is_array($theme_json_data_array['settings']['spacing']['spacingSizes'])) {
                $themeSpacingSizes = array_reduce($theme_json_data_array['settings']['spacing']['spacingSizes'], function ($acc, $spacingSize) {
                    $acc[$spacingSize['slug']] = $spacingSize['size'];
                    return $acc;
                }, []);
            }

            $themedata['colors'] = $themeColors;
            $themedata['colorGroups'] = $themeColorGroups;
            $themedata['fontFamilies'] = $themeFontFamilies;
            $themedata['fontSizes'] = $themeFontSizes;
            $themedata['spacing'] = $themeSpacingSizes;

            if ($dataKey !== null && strlen($dataKey)) {
                if (isset($themedata[$dataKey])) {
                    return $themedata[$dataKey];
                }
                return null;
            }
        }

        return $themedata;
    }

    // ------------------------------------------------------------------------
    // Bricks
    // ------------------------------------------------------------------------

    private static function getBricksThemeFontFamilies()
    {
        $themeFontFamilies = [];

        // Get all posts of custom post type 'bricks_fonts'
        $args = array(
            'post_type' => 'bricks_fonts',
            'posts_per_page' => -1,
            'post_status' => 'publish'
        );
        $fonts_query = new \WP_Query($args);

        if ($fonts_query->have_posts()) {
            foreach ($fonts_query->posts as $font_post) {
                $themeFontFamilies[$font_post->post_name] = get_the_title($font_post);
            }
        }

        return $themeFontFamilies;
    }

    private static function getBricksThemeColors()
    {
        $colors = [
            ['hex' => '#f5f5f5'],
            ['hex' => '#e0e0e0'],
            ['hex' => '#9e9e9e'],
            ['hex' => '#616161'],
            ['hex' => '#424242'],
            ['hex' => '#212121'],
            ['hex' => '#ffeb3b'],
            ['hex' => '#ffc107'],
            ['hex' => '#ff9800'],
            ['hex' => '#ff5722'],
            ['hex' => '#f44336'],
            ['hex' => '#9c27b0'],
            ['hex' => '#2196f3'],
            ['hex' => '#03a9f4'],
            ['hex' => '#81D4FA'],
            ['hex' => '#4caf50'],
            ['hex' => '#8bc34a'],
            ['hex' => '#cddc39'],
        ];

        $colors = apply_filters('bricks/builder/color_palette', $colors); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- Bricks Builder filter

        $themeColors = [];
        foreach ($colors as $key => $color) {
            $themeColors[(string)($key + 1)] = $color['hex'];
        }

        return $themeColors;
    }

    public static function bricks($dataKey = null)
    {
        $themedata = [];

        $settings = get_option('bricks_global_settings');

        $themeColors = [];
        $bricks_color_palette = get_option('bricks_color_palette');
        if (!empty($bricks_color_palette)) {
            foreach ($bricks_color_palette as $palette) {
                $colorGroup = [];
                foreach ($palette['colors'] as $index => $color) {
                    if(isset($color['hex'])) {
                        $colorGroup[(string)($index + 1)] = $color['hex'];
                    }
                }
                $groupName = $palette['name'] === 'Default' ? 'brickscp' : $palette['name'];
                $themeColors[$groupName] = $colorGroup;
            }
        }

        if (count($themeColors) < 1) {
            $themeColors['brickscp'] = self::getBricksThemeColors();
        }

        $themeFontFamilies = self::getBricksThemeFontFamilies();

        $themeScreens = [];
        $bricks_breakpoints = get_option('bricks_breakpoints');
        // Ensure $bricks_breakpoints is an array before proceeding
        if (!isset($settings['customBreakpoints']) || $settings['customBreakpoints'] != 1 || !is_array($bricks_breakpoints)) {
            // Use default breakpoints if custom breakpoints are not enabled or if $bricks_breakpoints is not an array
            $themeScreens['tablet_portrait'] = array('max' => '991px');
            $themeScreens['mobile_landscape'] = array('max' => '767px');
            $themeScreens['mobile_portrait'] = array('max' => '478px');
        } else {
            // Determine if the breakpoints should use max-width or min-width
            $is_max = false;
            $is_min = false;

            // Safeguard: Ensure $bricks_breakpoints is an array
            if (is_array($bricks_breakpoints)) {
                // Determine whether to use max-width or min-width by checking if the base breakpoint is the largest or smallest
                foreach ($bricks_breakpoints as $breakpoint) {
                    if (isset($breakpoint['base']) && $breakpoint['base']) {
                        if ($breakpoint['width'] == max(array_column($bricks_breakpoints, 'width'))) {
                            $is_max = true;
                        } elseif ($breakpoint['width'] == min(array_column($bricks_breakpoints, 'width'))) {
                            $is_min = true;
                        }
                    }
                }

                if ($is_max) {
                    foreach ($bricks_breakpoints as $breakpoint) {
                        $themeScreens[$breakpoint['key']] = array('max' => $breakpoint['width'] . 'px');
                    }
                } elseif ($is_min) {
                    foreach ($bricks_breakpoints as $breakpoint) {
                        $themeScreens[$breakpoint['key']] = array('min' => $breakpoint['width'] . 'px');
                    }
                }
            } else {
                // Handle the case where $bricks_breakpoints is not an array, possibly log an error or set a fallback

            }
        }

        $themedata['colors'] = $themeColors;
        $themedata['fontFamilies'] = $themeFontFamilies;
        $themedata['screens'] = $themeScreens;

        if ($dataKey !== null && strlen($dataKey)) {
            if (isset($themedata[$dataKey])) {
                return $themedata[$dataKey];
            }
            return null;
        }

        return $themedata;
    }

    // ------------------------------------------------------------------------
    // Oxygen
    // ------------------------------------------------------------------------

    public static function oxygen($dataKey = null)
    {
        $themedata = [];

        $settings = ct_get_global_settings();

        $themeColors = [];
        $oxygen_vsb_global_colors = get_option('oxygen_vsb_global_colors');
        if (!empty($oxygen_vsb_global_colors) && isset($oxygen_vsb_global_colors['colors'])) {
            foreach ($oxygen_vsb_global_colors['sets'] as $set) {
                $groupName = ($set['name'] === 'Global Colors') ? 'oxy-colors' : $set['name'];
                $themeColors[$groupName] = [];
                foreach ($oxygen_vsb_global_colors['colors'] as $color) {
                    if ($color['set'] == $set['id']) {
                        $name = strtolower(str_replace(' ', '-', $color['name']));
                        $themeColors[$groupName][$name] = $color['value'];
                    }
                }
            }
        }

        $themeFontFamilies = [];
        $fonts = isset($settings['fonts']) ? $settings['fonts'] : array();
        foreach ($fonts as $key => $value) {
            $themeFontFamilies[strtolower($key)] = $value;
        }

        $themeFontSizes = [];
        $headings = isset($settings['headings']) ? $settings['headings'] : array();
        foreach ($headings as $key => $value) {
            if (isset($value['font-size']) && $value['font-size'] && isset($value['font-size-unit']) && $value['font-size-unit']) {
                $themeFontSizes[strtolower($key)] = $value['font-size'] . $value['font-size-unit'];
            }
        }
        if (isset($settings['body_text'])) {
            if (isset($settings['body_text']['font-size']) && $settings['body_text']['font-size'] && isset($settings['body_text']['font-size-unit']) && $settings['body_text']['font-size-unit']) {
                $themeFontSizes['body_text'] = $settings['body_text']['font-size'] . $settings['body_text']['font-size-unit'];
            }
        }

        $themeScreens = [];
        $breakpoints = isset($settings['breakpoints']) ? $settings['breakpoints'] : array();
        foreach ($breakpoints as $key => $value) {
            $themeScreens[$key] = array('max' => $value . 'px');
        }

        $themedata['colors'] = $themeColors;
        $themedata['fontFamilies'] = $themeFontFamilies;
        $themedata['fontSizes'] = $themeFontSizes;
        $themedata['screens'] = $themeScreens;

        if ($dataKey !== null && strlen($dataKey)) {
            if (isset($themedata[$dataKey])) {
                return $themedata[$dataKey];
            }
            return null;
        }

        return $themedata;
    }

    // ------------------------------------------------------------------------
    // Font Hero
    // ------------------------------------------------------------------------

    public static function fontHero()
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'dp_fh_fonts';

        // Check if the table exists
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Checking table existence
        $table_exists = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table_name));
        if ($table_exists !== $table_name) {
            return [];
        }

        $fonts = [];
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- Simple read query for font names
        $font_names = $wpdb->get_col($wpdb->prepare('SELECT font_name FROM %i', $table_name));

        if (!empty($font_names)) {
            foreach ($font_names as $font_name) {
                $fonts[strtolower(str_replace(' ', '_', $font_name))] = $font_name;
            }
        }

        return $fonts;
    }
}

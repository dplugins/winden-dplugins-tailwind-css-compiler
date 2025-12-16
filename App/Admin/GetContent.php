<?php

namespace Winden\App\Admin;

class GetContent
{
    public function __construct()
    {
        // Logged-in user endpoints
        add_action('wp_ajax_get_winden_content', [$this, 'get_winden_content_callback']);
        add_action('wp_ajax_get_winden_cache', [$this, 'get_winden_cache']);
        add_action('wp_ajax_get_winden_wizzard_state', [$this, 'get_winden_wizzard_state']);
        add_action('wp_ajax_get_crawled_classes', [$this, 'get_crawled_classes']);

        // Public endpoints (logged-out users)
        add_action('wp_ajax_nopriv_get_winden_content', [$this, 'get_winden_content_callback']);
        add_action('wp_ajax_nopriv_get_winden_cache', [$this, 'get_winden_cache']);
        add_action('wp_ajax_nopriv_get_winden_wizzard_state', [$this, 'get_winden_wizzard_state']);
    }

    public function get_winden_content_callback()
    {
        $config = get_option('winden_editor');

        // Check if data is available and is an array in old format
        if (is_array($config) && !empty($config)) {
            $toRemoveKeys = [];

            $cssKey = array_search("input.css", array_column($config, 'name'));
            if($cssKey >= 0 && isset($config[$cssKey]['content'])) {
                $config['scss'] = $config[$cssKey]['content'];
                array_push($toRemoveKeys, $cssKey);
            }

            $configKey = array_search("tailwind.config.js", array_column($config, 'name'));
            if($configKey >= 0 && isset($config[$configKey]['content'])) {
                $config['javascript'] = $config[$configKey]['content'];
                array_push($toRemoveKeys, $configKey);
            }

            if(count($toRemoveKeys) > 0) {
                $config['wizzard'] = [
                    // General settings
                    'activeTab' => 5,
                    'configCode' => '',
                    'stateName' => '',

                    // Breakpoints configuration
                    'breakpoints' => [],
                    'breakpointsActive' => false,
                    'extendBreakpoints' => true,
                    'desktopFirst' => false,

                    // Font family configuration
                    'fontFamily' => [],
                    'fontFamilyActive' => false,
                    'extendFontFamily' => true,

                    // Colors configuration
                    'colorEntries' => [],
                    'colorsActive' => false,
                    'extendColors' => true,
                    'includeUtilityColors' => false,

                    // Spacing configuration
                    'spacesActive' => false,
                    'includeUtilitySizes' => false,
                    'spacing' => [
                        'extend' => true,
                        'disableFluid' => false,
                        'useRem' => false,
                        'remSize' => 16,
                        'minBaseSize' => 16,
                        'minScaleRatio' => 1.2,
                        'minScreenSize' => 320,
                        'maxBaseSize' => 19,
                        'maxScaleRatio' => 1.5,
                        'maxScreenSize' => 1200,
                        'steps' => ['xs', 'sm', 'base', 'md', 'lg', 'giga', 'mega'],
                        'baseStep' => 'base',
                        'decimalPlaces' => 2,
                    ],

                    // Border Radius configuration
                    'borderRadiusActive' => false,
                    'borderRadius' => [
                        'extend' => true,
                        'disableFluid' => false,
                        'useRem' => false,
                        'remSize' => 16,
                        'minBaseSize' => 16,
                        'minScaleRatio' => 1.2,
                        'minScreenSize' => 320,
                        'maxBaseSize' => 19,
                        'maxScaleRatio' => 1.5,
                        'maxScreenSize' => 1200,
                        'steps' => ['xs', 'sm', 'base', 'md', 'lg', 'giga', 'mega'],
                        'baseStep' => 'base',
                        'decimalPlaces' => 2,
                    ],

                    // Font size configuration
                    'fontSizesActive' => false,
                    'fontSize' => [
                        'extend' => true,
                        'disableFluid' => false,
                        'useRem' => false,
                        'remSize' => 16,
                        'minBaseSize' => 16,
                        'minScaleRatio' => 1.2,
                        'minScreenSize' => 320,
                        'maxBaseSize' => 19,
                        'maxScaleRatio' => 1.5,
                        'maxScreenSize' => 1200,
                        'steps' => ['xs', 'sm', 'base', 'md', 'lg', 'giga', 'mega'],
                        'baseStep' => 'base',
                        'decimalPlaces' => 2,
                    ],

                    // Integration extensions
                    // FSE integrations
                    'extendColorsFSE' => false,
                    'extendFontSizesFSE' => false,
                    'extendSpacingFSE' => false,
                    'extendFontFamilyFSE' => false,
                    'extendScreensFSE' => false,

                    // Bricks integrations
                    'extendColorsBricks' => false,
                    'extendFontSizesBricks' => false,
                    'extendSpacingBricks' => false,
                    'extendFontFamilyBricks' => false,
                    'extendScreensBricks' => false,

                    // Oxygen integrations
                    'extendColorsOxygen' => false,
                    'extendFontSizesOxygen' => false,
                    'extendSpacingOxygen' => false,
                    'extendFontFamilyOxygen' => false,
                    'extendScreensOxygen' => false,

                    // Other extensions
                    'extendFontHero' => false,
                    
                    // Border Radius integrations
                    'extendBorderRadiusFSE' => false,
                    'extendBorderRadiusBricks' => false,
                    'extendBorderRadiusOxygen' => false,
                ];
            }

            foreach ($toRemoveKeys as $key) {
                if(isset($config[$key])) {
                    unset($config[$key]);
                }
            }
        }

        if ($config) {
            // Unserialize the data
            $configArray = maybe_unserialize($config);
            $this->handle_json_response([
                'javascript' => base64_encode($configArray['javascript']),
                'scss' => base64_encode($configArray['scss']), // Include SCSS in the response
                'wizzard' => ($configArray['wizzard'])
            ], 'Content fetched successfully', 'Invalid JSON structure in the configuration');
        } else {
            wp_send_json_error(['message' => 'No content found in the configuration']);
        }

        wp_die(); // Always call wp_die() after handling an AJAX request
    }

    private function handle_json_response($data, $successMessage, $errorMessage)
    {
        if (json_last_error() === JSON_ERROR_NONE) {
            wp_send_json_success($data);
        } else {
            wp_send_json_error(['message' => $errorMessage]);
        }
    }

    public function get_content()
    {
        // Create an instance of ClassCrawler
        $crawler = new \Winden\App\Caching\ClassCrawler();
        $classes = $crawler->classes(); // Get the classes

        // Return the classes as a JSON response
        wp_send_json_success(['classes' => $classes]);
    }

    public function get_winden_cache()
    {
        $cache = get_option('winden_cache');

        // AUTO-FIX: If cache contains OLD PostCSS syntax errors from plugin migration, clear it
        // Do NOT clear legitimate SCSS compilation errors (those should be shown to user)
        if ($cache && isset($cache['errors'])) {
            $errors = is_string($cache['errors']) ? json_decode($cache['errors'], true) : $cache['errors'];

            if (is_array($errors)) {
                foreach ($errors as $error) {
                    $message = isset($error['message']) ? $error['message'] : '';

                    // Only auto-fix OLD PostCSS errors from plugin migration
                    // Check for PostCSS-specific error messages that indicate corrupted cache
                    // Do NOT auto-fix SCSS compilation errors (expected selector, etc.)
                    $is_old_postcss_error = (
                        stripos($message, 'postcss') !== false ||
                        (stripos($message, 'Missed semicolon') !== false) ||
                        (stripos($message, 'Unexpected }') !== false && stripos($message, 'scss') === false)
                    );

                    // Skip SCSS compilation errors - these are legitimate and should be shown
                    $is_scss_error = (
                        stripos($message, 'SCSS compilation failed') !== false ||
                        stripos($message, 'expected selector') !== false ||
                        stripos($message, 'Dart Sass') !== false
                    );

                    if ($is_old_postcss_error && !$is_scss_error) {
                        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Intentional production logging for cache corruption auto-fix
                        error_log('[Winden Auto-Fix] Detected OLD corrupted cache on fetch, clearing: ' . $message);

                        // Clear corrupted cache
                        delete_option('winden_cache');

                        // Delete output.css file if it exists
                        $upload_dir = wp_upload_dir();
                        $output_file = $upload_dir['basedir'] . '/winden/output.css';
                        if (file_exists($output_file)) {
                            wp_delete_file($output_file);
                        }

                        // Return success with null status to indicate cache was cleared
                        // Frontend will see no valid cache and trigger fresh compilation
                        wp_send_json_success([
                            'status' => null,
                            'auto_fixed' => true,
                            'message' => 'Corrupted cache was automatically cleared'
                        ]);
                        wp_die();
                    }
                }
            }
        }

        if ($cache) {
            wp_send_json_success($cache);
        } else {
            wp_send_json_error(['message' => 'No cache found']);
        }

        wp_die();
    }

    public function get_winden_wizzard_state()
    {
        $wizzard_state = get_option('winden_wizzard_state');
        
        // If no wizard state found, get it from editor
        if (!$wizzard_state) {
            $winden_editor = get_option('winden_editor', []);
            $wizzard_state = $winden_editor['wizzard'] ?? null;
        }

        if ($wizzard_state) {
            wp_send_json_success($wizzard_state);
        } else {
            wp_send_json_error(['message' => 'No wizzard state found']);
        }

        wp_die();
    }

    public function get_crawled_classes()
    {
        // Check if the user has the right capability
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized user');
            return;
        }

        // Create an instance of ClassCrawler
        $crawler = new \Winden\App\Caching\ClassCrawler();
        $classes = $crawler->classes(); // Get the classes

        // Return the classes as a JSON response
        wp_send_json_success(['classes' => $classes]);
    }
}

// Instantiate the GetContent class
new GetContent();

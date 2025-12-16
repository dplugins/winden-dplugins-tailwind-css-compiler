<?php

namespace Winden\App\Admin;

use DateTime;
use DateTimeZone;
use Winden\App\Helpers\SettingsOptions;

class SaveContent
{
    public function __construct()
    {
        // Add AJAX action for saving content
        add_action('wp_ajax_save_winden_content', [$this, 'save_winden_content']);
        add_action('wp_ajax_nopriv_save_winden_content', [$this, 'save_winden_content']);
        add_action('wp_ajax_save_winden_cache', [$this, 'save_winden_cache']);
        add_action('wp_ajax_update_winden_wizzard_state', [$this, 'update_winden_wizzard_state']);
        add_action('wp_ajax_clear_winden_cache', [$this, 'clear_winden_cache']);
    }

    public function save_winden_content()
    {
        // Get the JSON data from the request
        $data = json_decode(file_get_contents('php://input'), true);

        // Check for the necessary permissions and nonce verification if required
        if (!current_user_can('edit_posts') || !wp_verify_nonce(sanitize_text_field(wp_unslash($data['_nonce'] ?? '')), 'winden_nonce')) {
            wp_send_json_error('You are not allowed to perform this action.');
            return;
        }

        if (isset($data['javascript']) && isset($data['scss']) && isset($data['wizzard'])) {
            // Decode the Base64 content
            $javascript = json_decode(base64_decode($data['javascript']), true);
            $scss = json_decode(base64_decode($data['scss']), true);
            $css = base64_decode($data['css']); // Decode CSS directly as a string
            $wizzard = json_decode(base64_decode($data['wizzard']), true); // Decode wizzard content

            // Save the data to the database
            $config_data = [
                'javascript' => $javascript,
                'scss' => $scss,
                // 'css' => $css, // Save CSS as a string
                'compiled_scss' => $css,
                'wizzard' => $wizzard // Save wizzard data
            ];

            // Update the option in the database
            update_option('winden_editor', $config_data);

            // Set flag to clear frontend compilation cache on next page load
            // This ensures old cached compilations don't persist after config changes
            update_option('winden_clear_cache_flag', time());

            // Update tailwind_version to v4 in winden_options
            $winden_options = get_option('winden_options', []);
            $winden_options['tailwind_version'] = 'v4';
            update_option('winden_options', $winden_options);

            // Define default file paths in winden folder
            $upload_dir = wp_upload_dir();
            $winden_dir = $upload_dir['basedir'] . '/winden';
            \wp_mkdir_p($winden_dir);

            // Default paths (always written to)
            $default_config_path = $winden_dir . '/tailwind.config.js';
            $default_style_tab_path = $winden_dir . '/style-tab.css';
            $default_input_path = $winden_dir . '/input.css';

            // Build input.css content: Style Tab + Wizard @theme (for external tools like VS Code)
            $input_content = $scss;
            if (isset($wizzard['configCode']) && !empty($wizzard['configCode'])) {
                $input_content .= "\n\n" . $wizzard['configCode'];
            }

            // Always save to default location
            file_put_contents($default_config_path, $javascript);
            file_put_contents($default_style_tab_path, $scss);
            file_put_contents($default_input_path, $input_content);

            // Allow filtering for additional copy locations
            $filtered_config_path = \apply_filters('winden_config_file_path', $default_config_path);
            $filtered_style_tab_path = \apply_filters('winden_scss_file_path', $default_style_tab_path);
            $filtered_input_path = \apply_filters('winden_input_file_path', $default_input_path);

            // Copy to filtered locations if different from default
            if ($filtered_config_path !== $default_config_path) {
                \wp_mkdir_p(dirname($filtered_config_path));
                file_put_contents($filtered_config_path, $javascript);
            }
            if ($filtered_style_tab_path !== $default_style_tab_path) {
                \wp_mkdir_p(dirname($filtered_style_tab_path));
                file_put_contents($filtered_style_tab_path, $scss);
            }
            if ($filtered_input_path !== $default_input_path) {
                \wp_mkdir_p(dirname($filtered_input_path));
                file_put_contents($filtered_input_path, $input_content);
            }

            // Save tailwind.config.js in wp-content/scan_path directory
            $options = get_option('winden_options', []);
            $scan_path = isset($options['scan_path']) ? $options['scan_path'] : '';
            $enable_files_scan = isset($options['enable_files_scan']) ? $options['enable_files_scan'] : false;
            $save_config_file = isset($options['save_config_file']) ? $options['save_config_file'] : false;

            if ($enable_files_scan && $save_config_file && !empty($scan_path)) {
                $scan_config_path = WP_CONTENT_DIR . '/' . trim($scan_path, '/') . '/tailwind.config.js';
                $scan_dir = dirname($scan_config_path);

                if (!file_exists($scan_dir)) {
                    wp_mkdir_p($scan_dir);
                }

                file_put_contents($scan_config_path, $combined_content);
            }

            // Respond with a success message
            wp_send_json_success('Content saved successfully!');
        } else {
            // Respond with an error message
            wp_send_json_error('Invalid data received.');
        }
    }

    public function save_winden_cache()
    {
        // Get the JSON data from the request
        $data = json_decode(file_get_contents('php://input'), true);

        // Check for the necessary permissions and nonce verification if required
        if (!current_user_can('edit_posts') || !wp_verify_nonce(sanitize_text_field(wp_unslash($data['_nonce'] ?? '')), 'winden_nonce')) {
            wp_send_json_error('You are not allowed to perform this action.');
            return;
        }

        // AUTO-FIX: Clear OLD PostCSS corrupted cache from plugin migration
        // Do NOT clear legitimate SCSS compilation errors (those should be saved and shown)
        $existing_cache = get_option('winden_cache');
        if ($existing_cache && isset($existing_cache['errors'])) {
            $errors = is_string($existing_cache['errors']) ? json_decode($existing_cache['errors'], true) : $existing_cache['errors'];

            if (is_array($errors)) {
                foreach ($errors as $error) {
                    $message = isset($error['message']) ? $error['message'] : '';

                    // Only auto-fix OLD PostCSS errors from plugin migration
                    $is_old_postcss_error = (
                        stripos($message, 'postcss') !== false ||
                        (stripos($message, 'Missed semicolon') !== false) ||
                        (stripos($message, 'Unexpected }') !== false && stripos($message, 'scss') === false)
                    );

                    // Skip SCSS compilation errors - these are legitimate and should be saved
                    $is_scss_error = (
                        stripos($message, 'SCSS compilation failed') !== false ||
                        stripos($message, 'expected selector') !== false ||
                        stripos($message, 'Dart Sass') !== false
                    );

                    if ($is_old_postcss_error && !$is_scss_error) {
                        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Intentional production logging for cache corruption auto-fix
                        error_log('[Winden Auto-Fix] Clearing OLD corrupted cache before saving: ' . $message);
                        delete_option('winden_cache');

                        // Delete output.css file if it exists
                        $upload_dir_temp = wp_upload_dir();
                        $output_file = $upload_dir_temp['basedir'] . '/winden/output.css';
                        if (file_exists($output_file)) {
                            wp_delete_file($output_file);
                        }
                        break;
                    }
                }
            }
        }

        $datetime = new DateTime();
        $datetime->setTimezone(new DateTimeZone('UTC'));
        $formattedDatetime = $datetime->format('Y-m-d H:i:s');

        // Check if this is a successful compilation with styles
        if (isset($data['styles']) && !empty($data['styles'])) {
            // Define default file path
            $upload_dir = wp_upload_dir();
            $default_path = $upload_dir['basedir'] . '/winden/output.css';

            // Always save to default location
            \wp_mkdir_p(dirname($default_path));
            $result = file_put_contents($default_path, $data['styles']);

            // Copy to filtered location if different
            $filtered_path = \apply_filters('winden_cache_file_path', $default_path);
            if ($filtered_path !== $default_path) {
                \wp_mkdir_p(dirname($filtered_path));
                file_put_contents($filtered_path, $data['styles']);
            }

            if ($result === false) {
                // Update the option in the database
                update_option('winden_cache', [
                    'createdAt' => $formattedDatetime,
                    'errors' => wp_json_encode([
                        [
                            'title' => 'Error',
                            'message' => 'Error writing file'
                        ]
                    ]),
                    'status' => 'failed'
                ]);
                wp_send_json_error('Error writing file');
                return;
            }

            // Update the option in the database - successful compilation
            update_option('winden_cache', [
                'createdAt' => $formattedDatetime,
                'status' => $data['status'] ?? 'completed'
            ]);

            // Respond with a success message
            wp_send_json_success('Content saved successfully!');
        } else {
            // This is a failed compilation or error case
            $errors = [];
            if (isset($data['errors'])) {
                // Errors is already JSON string from frontend
                $errors = $data['errors'];
            } else {
                $errors = wp_json_encode([
                    [
                        'title' => 'Error',
                        'message' => "Couldn't create cache"
                    ]
                ]);
            }

            // Update the option in the database with error info
            update_option('winden_cache', [
                'createdAt' => $formattedDatetime,
                'errors' => $errors,
                'status' => $data['status'] ?? 'failed'
            ]);

            // This is expected behavior for compilation errors, so return success
            // The error details are stored in the cache for display to the user
            wp_send_json_success('Cache updated with error status');
        }

        wp_die();
    }

    public function update_winden_wizzard_state()
    {
        // Get the JSON data from the request
        $data = json_decode(file_get_contents('php://input'), true);

        // Check for the necessary permissions and nonce verification if required
        if (!current_user_can('edit_posts') || !wp_verify_nonce(sanitize_text_field(wp_unslash($data['_nonce'] ?? '')), 'winden_nonce')) {
            wp_send_json_error('You are not allowed to perform this action.');
            return;
        }

        if (isset($data['wizzard'])) {
            // Update the option in the database
            update_option('winden_wizzard_state', $data['wizzard']);

            // Respond with a success message
            wp_send_json_success('Wizzard state saved successfully!');
        } else {
            // Respond with an error message
            wp_send_json_error('Invalid data received.');
        }
    }

    public function clear_winden_cache()
    {
        // Get the JSON data from the request
        $data = json_decode(file_get_contents('php://input'), true);

        // Check for the necessary permissions and nonce verification if required
        if (!current_user_can('manage_options') || !wp_verify_nonce(sanitize_text_field(wp_unslash($data['_nonce'] ?? '')), 'winden_nonce')) {
            wp_send_json_error('You are not allowed to perform this action.');
            return;
        }

        // Delete the cache option
        $deleted = delete_option('winden_cache');

        // Also delete the output.css file if it exists
        $upload_dir = wp_upload_dir();
        $file_path = $upload_dir['basedir'] . '/winden/output.css';

        if (file_exists($file_path)) {
            wp_delete_file($file_path);
        }

        if ($deleted) {
            wp_send_json_success('Cache cleared successfully! CSS will be recompiled on next page load.');
        } else {
            wp_send_json_success('Cache was already empty or has been cleared.');
        }

        wp_die();
    }
}

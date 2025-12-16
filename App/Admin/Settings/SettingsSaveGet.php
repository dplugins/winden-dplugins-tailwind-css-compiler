<?php

namespace Winden\App\Admin\Settings;

class SettingsSaveGet
{
    private $keys = [
        // 'tailwind_version' removed - always v4 now

        'autocomplete_gutenberg',
        'autocomplete_bricks',
        'autocomplete_oxygen',
        'autocomplete_oxygen6',
        'autocomplete_elementor',

        'dequeue_styles_gutenberg',
        'dequeue_styles_bricks',
        'dequeue_styles_oxygen',

        'register_wizzard_data_in_fse',
        'register_wizzard_data_in_bricks',

        'compiled_css',
        'cdn_for_admin',

        'folded_sidebar',

        'enable_files_scan',
        'scan_path',
        'scan_file_formats',
        'save_config_file',

        'css_preprocessor',
        'disable_dev_mode',
        'inline_compiled_css',
    ];

    public function __construct()
    {
        add_action('wp_ajax_save_winden_settings', [$this, 'save_winden_settings']);
        add_action('wp_ajax_nopriv_save_winden_settings', [$this, 'save_winden_settings']);
        add_action('wp_ajax_get_winden_settings', [$this, 'get_winden_settings']);
        add_action('wp_ajax_nopriv_get_winden_settings', [$this, 'get_winden_settings']);
    }

    public function save_winden_settings()
    {
        // Get the JSON data from the request
        $data = json_decode(file_get_contents('php://input'), true);

        // Check for the necessary permissions and nonce verification if required
        if (!current_user_can('manage_options') || !wp_verify_nonce(sanitize_text_field(wp_unslash($data['_nonce'] ?? '')), 'winden_nonce')) {
            wp_send_json_error('You are not allowed to perform this action.');
            return;
        }

        // DEBUG: Log received data
        // error_log('[Winden Settings] Received data keys: ' . implode(', ', array_keys($data)));
        // error_log('[Winden Settings] Allowed keys: ' . implode(', ', $this->keys));

        // Filter the data to only include keys that are in the $keys array
        $filtered_data = array_intersect_key($data, array_flip($this->keys));

        // DEBUG: Log filtered data
        // error_log('[Winden Settings] Filtered data keys: ' . implode(', ', array_keys($filtered_data)));
        // error_log('[Winden Settings] Filtered data: ' . print_r($filtered_data, true));

        // Ensure scan_path is always an array
        if (isset($filtered_data['scan_path'])) {
            if (!is_array($filtered_data['scan_path'])) {
                $filtered_data['scan_path'] = $filtered_data['scan_path'] ? [$filtered_data['scan_path']] : [];
            }
            // Remove any empty paths
            $filtered_data['scan_path'] = array_filter($filtered_data['scan_path'], 'strlen');
        }

        if (!empty($filtered_data)) {
            // Update the option in the database
            $update_result = update_option('winden_options', $filtered_data);

            // DEBUG: Log what was saved
            // error_log('[Winden Settings] Settings saved successfully. update_option returned: ' . ($update_result ? 'true' : 'false'));

            // DEBUG: Verify what was actually saved by reading it back
            // $verify = get_option('winden_options');
            // error_log('[Winden Settings] Verification - Read back from DB: ' . print_r($verify, true));

            // Respond with a success message
            wp_send_json_success('Settings saved successfully!');
        } else {
            // DEBUG: Log error
            // error_log('[Winden Settings] ERROR: No valid data to save');

            // Respond with an error message
            wp_send_json_error('Invalid data received.');
        }
    }

    public function get_winden_settings()
    {
        // Check for the necessary permissions if required
        if (!current_user_can('manage_options')) {
            wp_send_json_error('You are not allowed to perform this action.');
            return;
        }

        // Retrieve the settings from the database
        $settings = get_option('winden_options', array_fill_keys($this->keys, false));

        // DEBUG: Log what was retrieved
        // error_log('[Winden Settings GET] Retrieved settings: ' . print_r($settings, true));

        // Respond with the settings
        wp_send_json_success($settings);
    }
}

new SettingsSaveGet();

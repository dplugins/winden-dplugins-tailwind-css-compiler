<?php namespace Winden\App\Admin\Settings;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Winden\App\Helpers\Sanitization;
use Winden\App\Helpers\SettingsOptions;
use Winden\App\Helpers\AjaxHelper;

class SettingsSaveGet
{
    private $keys = [
        // 'tailwind_version' removed - always v4 now

        'autocomplete_gutenberg',
        'autocomplete_bricks',
        'autocomplete_oxygen',
        'autocomplete_oxygen6',
        'autocomplete_elementor',
        'autocomplete_builderius',

        'winden_classes_gutenberg',
        'winden_classes_bricks',
        'winden_classes_oxygen',
        'winden_classes_oxygen6',
        'winden_classes_elementor',

        'autocomplete_mode',

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

        'css_preprocessor',
        'disable_dev_mode',
        'inline_compiled_css',
    ];

    public function __construct()
    {
        add_action('wp_ajax_winden_save_settings', [$this, 'save_winden_settings']);
        add_action('wp_ajax_nopriv_winden_save_settings', [$this, 'save_winden_settings']);
        add_action('wp_ajax_winden_get_settings', [$this, 'get_winden_settings']);
        add_action('wp_ajax_nopriv_winden_get_settings', [$this, 'get_winden_settings']);
    }

    public function save_winden_settings()
    {
        // Validate request (JSON input, capability, nonce)
        $request = AjaxHelper::validateRequest('manage_options');
        if (!$request['success']) {
            AjaxHelper::sendError($request['error']);
            return;
        }
        $data = $request['data'];

        // Filter the data to only include keys that are in the $keys array
        $filtered_data = array_intersect_key($data, array_flip($this->keys));

        // Sanitize all settings values with type-aware sanitization
        $sanitized_data = Sanitization::sanitize_settings($filtered_data);

        if (!empty($sanitized_data)) {
            // Update the option in the database
            $update_result = update_option('winden_dplugins_options', $sanitized_data);

            // DEBUG: Log what was saved
            // error_log('[Winden Settings] Settings saved successfully. update_option returned: ' . ($update_result ? 'true' : 'false'));

            // DEBUG: Verify what was actually saved by reading it back
            // $verify = get_option('winden_dplugins_options');
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

        // Retrieve the settings using centralized defaults from SettingsOptions
        $settings = SettingsOptions::getWindenOptions();

        // Respond with the settings
        wp_send_json_success($settings);
    }
}

new SettingsSaveGet();

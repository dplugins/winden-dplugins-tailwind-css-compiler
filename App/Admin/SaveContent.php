<?php namespace Winden\App\Admin;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use DateTime;
use DateTimeZone;
use Winden\App\Helpers\SettingsOptions;
use Winden\App\Helpers\Sanitization;
use Winden\App\Helpers\AjaxHelper;
use Winden\App\Helpers\CacheValidator;
use Winden\App\Helpers\FileWriter;

class SaveContent
{
    /**
     * 3-line minimum baseline used when the Style tab is hidden from
     * the editor. Skips preflight on purpose so Gutenberg's own reset
     * survives. Kept in sync with src/admin/const/contentDefaults.ts's
     * MINIMAL_BASE_CSS.
     */
    const MINIMAL_BASE_CSS = "@layer theme, base, components, utilities;\n@import \"tailwindcss/theme.css\" layer(theme);\n@import \"tailwindcss/utilities.css\" layer(utilities);\n";

    /**
     * Returns false when the user has hidden the Style tab via
     * Settings → editor_tabs. Used by the compile pipeline to swap
     * the user's scss for MINIMAL_BASE_CSS without touching the
     * stored content.
     */
    public static function isStyleTabVisible()
    {
        $options = get_option('winden_dplugins_options', []);
        $tabs = isset($options['editor_tabs']) ? $options['editor_tabs'] : null;
        if (!is_array($tabs)) {
            return true;
        }
        foreach ($tabs as $tab) {
            if (is_array($tab) && isset($tab['value']) && $tab['value'] === 'style') {
                return !isset($tab['visible']) || $tab['visible'] !== false;
            }
        }
        return true;
    }

    public function __construct()
    {
        // Add AJAX action for saving content
        add_action('wp_ajax_winden_save_content', [$this, 'save_winden_content']);
        add_action('wp_ajax_nopriv_winden_save_content', [$this, 'save_winden_content']);
        add_action('wp_ajax_winden_save_cache', [$this, 'save_winden_cache']);
        add_action('wp_ajax_winden_update_wizzard_state', [$this, 'update_winden_wizzard_state']);
        add_action('wp_ajax_winden_clear_cache', [$this, 'clear_winden_cache']);
    }

    private function winden_log($phase, $message, $context = [])
    {
        if (!defined('WP_DEBUG') || !WP_DEBUG) return;
        $ctx = $context ? ' ' . wp_json_encode($context) : '';
        $scope = strtolower((string) $phase);
        error_log("[winden:{$scope}] {$message}{$ctx}");
    }

    public function save_winden_content()
    {
        // Validate request (JSON input, capability, nonce)
        $request = AjaxHelper::validateRequest('edit_posts');
        if (!$request['success']) {
            $this->winden_log('Save', 'Validation failed', ['error' => $request['error']]);
            AjaxHelper::sendError($request['error']);
            return;
        }
        $data = $request['data'];

        if (isset($data['javascript']) && isset($data['scss']) && isset($data['wizzard'])) {
            // Decode and validate the Base64 content
            $javascript_raw = base64_decode($data['javascript'], true);
            $scss_raw = base64_decode($data['scss'], true);
            $css_raw = base64_decode($data['css'], true);
            $wizzard_raw = base64_decode($data['wizzard'], true);

            // Validate base64 decoding succeeded
            if ($javascript_raw === false || $scss_raw === false || $css_raw === false || $wizzard_raw === false) {
                wp_send_json_error('Invalid base64 encoded data.');
                return;
            }

            // Decode JSON
            $javascript = json_decode($javascript_raw, true);
            $scss = json_decode($scss_raw, true);
            $wizzard = json_decode($wizzard_raw, true);

            // Validate JSON decoding
            if (!is_string($javascript) || !is_string($scss) || !is_array($wizzard)) {
                wp_send_json_error('Invalid data structure.');
                return;
            }

            // Sanitize data based on type and user capabilities
            $javascript = Sanitization::sanitize_javascript($javascript);
            $scss = Sanitization::sanitize_css($scss);
            $css = Sanitization::sanitize_css($css_raw);
            $wizzard = Sanitization::sanitize_wizzard_state($wizzard);

            // Stale-write detection: if the client sends expected_updated_at,
            // verify it matches what's currently stored before overwriting.
            if (!empty($data['expected_updated_at'])) {
                $existing = get_option('winden_dplugins_editor');
                $stored_ts = is_array($existing) ? ($existing['updated_at'] ?? null) : null;
                if ($stored_ts && $stored_ts !== $data['expected_updated_at']) {
                    $this->winden_log('Save', 'Stale write rejected', [
                        'client_ts' => $data['expected_updated_at'],
                        'server_ts' => $stored_ts,
                    ]);
                    wp_send_json_error([
                        'code'    => 'STALE_SAVE',
                        'message' => 'Another save occurred since you last loaded. Please reload and try again.',
                        'server_updated_at' => $stored_ts,
                    ]);
                    return;
                }
            }

            $now = gmdate('Y-m-d\TH:i:s\Z');

            // Save the data to the database
            $config_data = [
                'javascript' => $javascript,
                'scss' => $scss,
                // 'css' => $css, // Save CSS as a string
                'compiled_scss' => $css,
                'wizzard' => $wizzard, // Save wizzard data
                'updated_at' => $now,
            ];

            // Update the option in the database
            update_option('winden_dplugins_editor', $config_data);

            // Set flag to clear frontend compilation cache on next page load
            update_option('winden_dplugins_clear_cache_flag', time());

            // Update tailwind_version to v4 in winden_options
            $winden_options = get_option('winden_dplugins_options', []);
            $winden_options['tailwind_version'] = 'v4';
            update_option('winden_dplugins_options', $winden_options);

            // Define default file paths in winden folder
            $upload_dir = wp_upload_dir();
            $winden_dir = $upload_dir['basedir'] . '/winden';
            \wp_mkdir_p($winden_dir);

            // Default paths (always written to)
            $default_config_path = $winden_dir . '/tailwind.config.js';
            $default_style_tab_path = $winden_dir . '/style-tab.css';
            $default_input_path = $winden_dir . '/input.css';

            // Build input.css content. When the user has hidden the Style
            // tab via Settings → editor_tabs, the compile pipeline must
            // not see the saved scss — otherwise leftover rules (e.g. a
            // forgotten body { background: red }) keep producing output.
            // We substitute MINIMAL_BASE_CSS only here; the user's scss
            // stays in the DB and on style-tab.css so re-enabling the tab
            // restores their content.
            $style_tab_visible = self::isStyleTabVisible();
            $base_scss = $style_tab_visible ? $scss : self::MINIMAL_BASE_CSS;
            $input_content = $base_scss;
            if (isset($wizzard['configCode']) && !empty($wizzard['configCode'])) {
                $input_content .= "\n\n" . $wizzard['configCode'];
            }

            // Always save to default locations in uploads dir.
            // style-tab.css preserves the user's pure scss so React's
            // useWizzardContent (which prefers the file over the DB)
            // restores it correctly when the Style tab is re-enabled.
            // input.css is what the compile-from-crawled fallback reads,
            // so that one gets the substituted base when the tab is
            // hidden. The hot-reload watcher still reads style-tab.css
            // for in-editor previews — its preview may momentarily show
            // the user's css while the tab is disabled, but the actual
            // output.css for the frontend is correct because it goes
            // through compile-from-crawled's setting check.
            file_put_contents($default_config_path, $javascript);
            file_put_contents($default_style_tab_path, $scss);
            file_put_contents($default_input_path, $input_content);

            // Allow filtering for additional copy locations
            // Security check: ensure filtered paths are within allowed directories
            $filtered_config_path = \apply_filters('winden_config_file_path', $default_config_path);
            $filtered_style_tab_path = \apply_filters('winden_scss_file_path', $default_style_tab_path);
            $filtered_input_path = \apply_filters('winden_input_file_path', $default_input_path);

            // Copy to filtered locations if different, valid path, and writable
            // Path validation prevents directory traversal attacks
            if ($filtered_config_path !== $default_config_path && FileWriter::isPathAllowed($filtered_config_path) && wp_is_writable(dirname($filtered_config_path))) {
                \wp_mkdir_p(dirname($filtered_config_path));
                file_put_contents($filtered_config_path, $javascript);
            }
            if ($filtered_style_tab_path !== $default_style_tab_path && FileWriter::isPathAllowed($filtered_style_tab_path) && wp_is_writable(dirname($filtered_style_tab_path))) {
                \wp_mkdir_p(dirname($filtered_style_tab_path));
                file_put_contents($filtered_style_tab_path, $scss);
            }
            if ($filtered_input_path !== $default_input_path && FileWriter::isPathAllowed($filtered_input_path) && wp_is_writable(dirname($filtered_input_path))) {
                \wp_mkdir_p(dirname($filtered_input_path));
                file_put_contents($filtered_input_path, $input_content);
            }

            // Respond with success and the new timestamp for stale-write tracking
            wp_send_json_success([
                'message'    => 'Content saved successfully!',
                'updated_at' => $now,
            ]);
        } else {
            // Respond with an error message
            wp_send_json_error('Invalid data received.');
        }
    }

    public function save_winden_cache()
    {
        // Get the JSON data from the request
        $data = json_decode(file_get_contents('php://input'), true);

        // Validate JSON structure
        if (!is_array($data)) {
            wp_send_json_error('Invalid JSON data received.');
            return;
        }

        // Check for the necessary permissions and nonce verification
        if (!current_user_can('edit_posts') || !wp_verify_nonce(sanitize_text_field(wp_unslash($data['_nonce'] ?? '')), 'winden_nonce')) {
            wp_send_json_error('You are not allowed to perform this action.');
            return;
        }

        // AUTO-FIX: Clear OLD PostCSS corrupted cache from plugin migration
        $existing_cache = get_option('winden_dplugins_cache');
        if ($existing_cache) {
            CacheValidator::validateAndFix($existing_cache, 'save');
        }

        $datetime = new DateTime();
        $datetime->setTimezone(new DateTimeZone('UTC'));
        $formattedDatetime = $datetime->format('Y-m-d H:i:s');

        // Check if this is a successful compilation with styles
        if (isset($data['styles']) && !empty($data['styles'])) {
            // Validate and sanitize compiled CSS
            if (!is_string($data['styles'])) {
                wp_send_json_error('Invalid styles data type.');
                return;
            }

            $sanitized_styles = Sanitization::sanitize_compiled_css($data['styles']);

            if (empty($sanitized_styles)) {
                wp_send_json_error('Compiled CSS validation failed.');
                return;
            }

            // Define default file path
            $upload_dir = wp_upload_dir();
            $default_path = $upload_dir['basedir'] . '/winden/output.css';

            // Always save to default location
            \wp_mkdir_p(dirname($default_path));
            $result = file_put_contents($default_path, $sanitized_styles);

            // Copy to filtered location if different
            $filtered_path = \apply_filters('winden_cache_file_path', $default_path);
            if ($filtered_path !== $default_path) {
                \wp_mkdir_p(dirname($filtered_path));
                file_put_contents($filtered_path, $sanitized_styles);
            }

            // Invalidate filemtime cache so users see updated CSS immediately
            \Winden\App\Helpers\LoadAssets::invalidateCompiledCssCache();

            if ($result === false) {
                // Update the option in the database
                update_option('winden_dplugins_cache', [
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

            // Sanitize status
            $status = isset($data['status']) ? Sanitization::sanitize_status($data['status']) : 'completed';

            // Update the option in the database - successful compilation
            update_option('winden_dplugins_cache', [
                'createdAt' => $formattedDatetime,
                'status' => $status
            ]);

            // Respond with a success message
            wp_send_json_success('Content saved successfully!');
        } else {
            // This is a failed compilation or error case
            $errors = [];
            if (isset($data['errors'])) {
                // Sanitize errors data
                $errors = Sanitization::sanitize_errors($data['errors']);
            } else {
                $errors = wp_json_encode([
                    [
                        'title' => 'Error',
                        'message' => "Couldn't create cache"
                    ]
                ]);
            }

            // Sanitize status
            $status = isset($data['status']) ? Sanitization::sanitize_status($data['status']) : 'failed';

            // Update the option in the database with error info
            update_option('winden_dplugins_cache', [
                'createdAt' => $formattedDatetime,
                'errors' => $errors,
                'status' => $status
            ]);

            // This is expected behavior for compilation errors, so return success
            // The error details are stored in the cache for display to the user
            wp_send_json_success('Cache updated with error status');
        }

        wp_die();
    }

    public function update_winden_wizzard_state()
    {
        // Validate request (JSON input, capability, nonce)
        $request = AjaxHelper::validateRequest('edit_posts');
        if (!$request['success']) {
            AjaxHelper::sendError($request['error']);
            return;
        }
        $data = $request['data'];

        if (isset($data['wizzard'])) {
            // Decode base64
            $decoded_wizzard = base64_decode($data['wizzard'], true);

            // Parse JSON
            $wizzard_array = json_decode($decoded_wizzard, true);

            // Validate and sanitize wizzard state
            if (!is_array($wizzard_array)) {
                wp_send_json_error('Invalid wizzard data structure.');
                return;
            }

            $sanitized_wizzard = Sanitization::sanitize_wizzard_state($wizzard_array);

            // Update the option in the database
            update_option('winden_dplugins_wizzard_state', $sanitized_wizzard);

            // Respond with a success message
            wp_send_json_success('Wizzard state saved successfully!');
        } else {
            wp_send_json_error('Invalid data received.');
        }
    }

    public function clear_winden_cache()
    {
        // Validate request (JSON input, capability, nonce) - requires manage_options
        $request = AjaxHelper::validateRequest('manage_options');
        if (!$request['success']) {
            AjaxHelper::sendError($request['error']);
            return;
        }

        // Delete the cache option
        $deleted = delete_option('winden_dplugins_cache');

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

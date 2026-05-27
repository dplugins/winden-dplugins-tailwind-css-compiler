<?php namespace Winden\App\Admin\Settings;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Winden\App\Helpers\LoadAssets;
use Winden\App\Helpers\LicenseManager;

// Note: License classes are in pro/ folder and loaded dynamically

class SettingsPage
{
    public function __construct()
    {
        add_filter('script_loader_tag', [$this, 'modify_script_loader_tag'], 10, 3);
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_post_winden_generate_classes', [$this, 'generate_classes_file']);
        add_action('wp_ajax_winden_get_classes', [$this, 'get_classes']); // Register the AJAX action
        add_action('wp_ajax_winden_get_classes_grouped', [$this, 'get_classes_grouped']); // Grouped classes with sources
        // Preload Monaco's CSS + editor workers in <head> so they're fetched in
        // parallel with the admin bundle instead of after the editor mounts.
        // Page-scoped: only fires on toplevel_page_winden.
        add_action('admin_head-toplevel_page_winden', [$this, 'preload_monaco_workers']);
    }

    /**
     * Print `<link rel="preload">` tags for Monaco's workers. Same-origin,
     * same cache as the regular enqueue — the browser just starts fetching
     * earlier so the workers are ready by the time the Style Editor mounts.
     */
    public function preload_monaco_workers()
    {
        $build_url = esc_url(WINDTACS_PLUGIN_URL . 'build/admin/');
        echo '<link rel="preload" as="script" crossorigin="anonymous" href="' . $build_url . 'css.worker.js">' . "\n";
        echo '<link rel="preload" as="script" crossorigin="anonymous" href="' . $build_url . 'editor.worker.js">' . "\n";
    }

    public function modify_script_loader_tag($tag, $handle, $src)
    {
        return LoadAssets::modify_script_loader_tag($tag, $handle, $src);
    }

    public function add_settings_page()
    {
        // phpcs:ignore Squiz.PHP.Heredoc.NotAllowed -- SVG icon requires multiline string
        $icon = '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20.0000801,0 C31.0456943,0 40,8.95434156 40,20 C40,31.0456584 31.0456943,40 20.0000801,40 C8.95433272,40 0,31.0456855 0,20 C0,8.95431454 8.95433272,0 20.0000801,0 Z M20.0000801,3.33198499 C10.7945253,3.33198499 3.33197164,10.7945235 3.33197164,20 C3.33197164,21.0913135 3.43685195,22.1581313 3.63708303,23.1909239 L3.68555815,23.075732 C7.24118391,24.5676128 10.362427,25.050991 13.2677187,24.7327848 C15.4845333,24.4899851 17.417562,23.8381353 19.8680498,22.6501083 L20.0187117,22.5755284 L20.6015312,22.2818208 L21.5013402,21.8333088 L22.1079592,21.5338435 L22.5440188,21.3206677 L22.9404749,21.1293303 L23.2302475,20.9921972 L23.3526798,20.9355596 L23.4883146,20.8746276 C24.8655285,20.2713962 26.0020748,19.9603987 27.1512195,19.9603987 C28.544431,19.9603987 29.8854811,20.4937554 30.8859805,21.4944972 C32.9315438,23.5400687 32.9315438,26.8564806 30.8859805,28.9020521 C28.8608729,30.9271678 25.5900625,30.947419 23.5400408,28.9628055 L23.4782952,28.9020521 L26.0720112,26.3083256 C26.6851047,26.9214216 27.679171,26.9214216 28.2922645,26.3083256 C28.9053579,25.6952297 28.9053579,24.7013196 28.2921101,24.0880692 C27.9930915,23.7889782 27.5895459,23.6284818 27.1511596,23.6284818 C26.6182139,23.6284644 25.9558065,23.8053231 25.0459975,24.197176 L24.9052389,24.2588819 L24.7339303,24.3378119 L24.4243233,24.4850898 L23.8234835,24.7775583 L23.37268,24.9998057 L21.6188874,25.8772313 L21.4632035,25.9531897 C18.669387,27.3073618 16.3685882,28.0831763 13.6670792,28.3790629 C10.9598606,28.6755748 8.13023536,28.4051957 5.10432575,27.4868062 C7.84641299,32.9324111 13.4869901,36.668015 20.0000801,36.668015 C29.2054972,36.668015 36.6680284,29.2054539 36.6680284,20 C36.6680284,19.5908687 36.6532876,19.1851802 36.6243081,18.7834365 C33.4713579,17.0582461 30.4445477,16.396836 27.3948289,16.5894439 C25.2939217,16.7221286 23.3217757,17.2175894 20.9761704,18.1277344 L20.674664,18.2461798 C20.5734598,18.2864152 20.4715406,18.3274055 20.3688679,18.3691546 L20.0585499,18.4966829 L20.0585499,18.4966829 L19.7493571,18.6263003 C19.6455051,18.6702436 19.5408534,18.7149255 19.4353651,18.7603499 L19.2105867,18.8585545 L17.359877,19.6808088 L16.6293872,20.0015144 L16.0312234,20.26082 L15.684196,20.4084061 L15.4868051,20.4901899 L15.4217581,20.5164194 C15.3052472,20.5628913 15.1908391,20.6075591 15.0783914,20.6504182 L14.856068,20.733723 C13.6472036,21.1786193 12.6640983,21.4042269 11.7175698,21.4042269 C10.3245615,21.4042269 8.98376421,20.8710096 7.98280877,19.8702886 C5.93724549,17.8247171 5.93724549,14.508145 7.98280877,12.4625735 C10.0079164,10.4374578 13.2787268,10.4172066 15.3287485,12.4018201 L15.3904941,12.4625735 L12.7967781,15.0563 C12.1836846,14.443204 11.1896183,14.443204 10.5765248,15.0563 C9.96343135,15.6693959 9.96343135,16.6634662 10.5763704,17.2764077 C10.8756769,17.5756442 11.2792599,17.7361438 11.7176297,17.7361438 C12.0963214,17.7361561 12.5963899,17.631633 13.2584566,17.4078414 L13.4082657,17.3561407 L13.5635072,17.3004775 L13.72428,17.2408159 L13.8906832,17.17712 C13.9188918,17.1661659 13.9473392,17.1550421 13.9760273,17.143748 L14.1753031,17.0635896 L14.4742815,16.9376657 L14.8517943,16.7750406 L15.6871741,16.4094605 L17.815662,15.4644092 L18.1625016,15.315083 C21.4924812,13.893859 24.172207,13.1175804 27.1636302,12.9286543 C30.0005324,12.7494871 32.8233547,13.1744831 35.6632628,14.2882919 C33.3320675,7.89591583 27.1990283,3.33198499 20.0000801,3.33198499 Z" fill="currentColor"/></svg>';

        add_menu_page(
            'Winden Settings', // Page title
            'Winden', // Menu title
            'manage_options', // Capability
            'winden', // Menu slug
            [$this, 'create_settings_page'], // Callback function
            sprintf('data:image/svg+xml;base64,%s', base64_encode($icon)),
            // 0 // Position (optional)
        );

        // Rename the default submenu from "Winden" to "Settings"
        add_submenu_page(
            'winden', // Parent slug
            'Winden Settings', // Page title
            'Settings', // Menu title (changed from "Winden")
            'manage_options', // Capability
            'winden', // Menu slug (same as parent)
            [$this, 'create_settings_page'] // Callback function
        );
    }

    public function register_settings()
    {
        register_setting('winden_options_group', 'winden_option_name', [
            'type' => 'array',
            'sanitize_callback' => [$this, 'sanitize_winden_options'],
            'default' => [],
        ]);
    }

    /**
     * Sanitize callback for winden_option_name
     *
     * Properly sanitizes different data types:
     * - Arrays: Recursively sanitizes each element
     * - Booleans: Preserves boolean type
     * - Strings: Uses sanitize_text_field()
     *
     * @param mixed $input The input to sanitize.
     * @return array Sanitized array.
     */
    public function sanitize_winden_options($input)
    {
        if (!is_array($input)) {
            return [];
        }

        return $this->sanitize_array_recursive($input);
    }

    /**
     * Recursively sanitize an array with type-aware sanitization
     *
     * @param array $array The array to sanitize.
     * @return array Sanitized array.
     */
    private function sanitize_array_recursive($array)
    {
        $sanitized = [];

        foreach ($array as $key => $value) {
            $sanitized_key = sanitize_key($key);

            if (is_array($value)) {
                // Recursively sanitize arrays
                $sanitized[$sanitized_key] = $this->sanitize_array_recursive($value);
            } elseif (is_bool($value)) {
                // Preserve boolean type
                $sanitized[$sanitized_key] = (bool) $value;
            } elseif (is_numeric($value)) {
                // Preserve numeric values
                $sanitized[$sanitized_key] = $value;
            } elseif (is_string($value)) {
                // Sanitize strings
                $sanitized[$sanitized_key] = sanitize_text_field($value);
            } else {
                // For any other type, convert to string and sanitize
                $sanitized[$sanitized_key] = sanitize_text_field((string) $value);
            }
        }

        return $sanitized;
    }

    public function create_settings_page()
    {
        // Disable WordPress notifications
        remove_all_actions('admin_notices');
        remove_all_actions('all_admin_notices');

        // License Status - use LicenseManager which handles missing pro folder gracefully
        $license = LicenseManager::isProActive() ? 'true' : 'false';
        // Check if pro folder exists (for free version without pro folder)
        $proExists = LicenseManager::proFolderExists() ? 'true' : 'false';

        // Enqueue the script and asset file
        $asset_file = include WINDTACS_PLUGIN_DIR . 'build/admin/index.asset.php';

        $dependencies = array_unique(array_merge(
            $asset_file['dependencies'],
            ['wp-data', 'wp-commands']
        ));

        wp_enqueue_style('wp-commands');

        wp_enqueue_script(
            'winden-admin-script',
            WINDTACS_PLUGIN_URL . 'build/admin/index.js',
            $dependencies, // Add dependencies if any
            $asset_file['version'], // Add version if any
            true // Load in footer
        );

        // Set webpack public path for dynamic chunk loading (Monaco Editor, etc.)
        // This ensures chunks load correctly regardless of plugin folder name
        wp_add_inline_script(
            'winden-admin-script',
            sprintf('window.__webpack_public_path__ = %s;', wp_json_encode(WINDTACS_PLUGIN_URL . 'build/')),
            'before'
        );

        // Localize script for Monaco Editor workers
        wp_localize_script(
            'winden-admin-script',
            'windenData',
            [
                'pluginUrl' => WINDTACS_PLUGIN_URL,
                'buildUrl' => WINDTACS_PLUGIN_URL . 'build/',
                'ajaxUrl' => admin_url('admin-ajax.php')
            ]
        );

        wp_enqueue_style(
            'winden-admin-style',
            WINDTACS_PLUGIN_URL . 'build/admin/index.css',
            [],
            $asset_file['version']
        );

        wp_enqueue_style(
            'winden-wp-editor',
            includes_url('css/dist/editor/style.css'),
            [],
            filemtime(ABSPATH . 'wp-includes/css/dist/editor/style.css')
        );

        // Use wp_add_inline_style to hide WordPress notifications
        // WordPress.org requirement: Use wp_add_inline_style instead of echo
        wp_add_inline_style('winden-admin-style', '#wpbody-content .notice { display: none !important; }');

        // Settings page HTML
        // Note: SCSS compilation is handled by the bundled Dart Sass (loaded automatically by the compiler)
        echo '<div class="wrap">';
        echo '<div id="App" data-license="' . esc_attr($license) . '" data-pro-exists="' . esc_attr($proExists) . '"></div>';
        echo '</div>';

        LoadAssets::loadInlineScripts();
        LoadAssets::loadCDNScripts('inlinemodule');
    }

    public function get_classes()
    {
        // Check if the user has the right capability
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized user');
            return;
        }

        // Create an instance of ClassCrawler
        $crawler = new \Winden\App\Caching\ClassCrawler();
        $classes = $crawler->classes();

        // Ensure classes is an array
        if (!is_array($classes)) {
            $classes = [];
        }

        // Return the classes as a JSON response
        wp_send_json_success(['classes' => $classes]);
    }

    /**
     * Get classes grouped by source for the cache status dialog
     */
    public function get_classes_grouped()
    {
        // Check if the user has the right capability
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized user');
            return;
        }

        // Create an instance of ClassCrawler
        $crawler = new \Winden\App\Caching\ClassCrawler();
        $groupedData = $crawler->classesWithSources();

        // Return the grouped data as a JSON response
        wp_send_json_success($groupedData);
    }
}

<?php namespace Winden\App\Caching;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Winden\App\Helpers\SettingsOptions;
use Winden\App\Helpers\Builders;

/**
 * AutoCompile - Automatically crawl classes and flag for recompilation when posts are saved
 *
 * This class hooks into WordPress save_post action and crawls Tailwind classes.
 * Since Winden's compiler only runs in page builder editors, this sets a flag
 * that will trigger recompilation the next time an admin visits a builder.
 */
class AutoCompile
{
    private static $is_compiling = false;

    public function __construct()
    {
        // Hook into post save actions
        add_action('save_post', [$this, 'on_post_save'], 10, 3);

        // Hook into Fancoolo post save (generic hook from Fancoolo plugin)
        add_action('fancoolo_post_saved', [$this, 'on_fancoolo_post_save'], 10, 3);

        // AJAX endpoints
        add_action('wp_ajax_winden_trigger_recompile', [$this, 'ajax_trigger_recompile']);
        add_action('wp_ajax_winden_compile_from_crawled', [$this, 'ajax_compile_from_crawled']);
        add_action('wp_ajax_winden_get_compile_status', [$this, 'ajax_get_compile_status']);
        add_action('wp_ajax_winden_clear_recompile_flag', [$this, 'ajax_clear_recompile_flag']);

        // Load auto-compile script in all post editor contexts (Gutenberg, Bricks, Oxygen, Elementor)
        add_action('enqueue_block_editor_assets', [$this, 'enqueue_auto_compile_script']); // Gutenberg
        add_action('admin_enqueue_scripts', [$this, 'enqueue_auto_compile_script']); // Classic editor & other builders
        add_action('wp_enqueue_scripts', [$this, 'enqueue_auto_compile_script'], 99999999); // Frontend builders (Bricks 2)
    }

    /**
     * Triggered when a post is saved
     *
     * @param int $post_id The post ID
     * @param \WP_Post $post The post object
     * @param bool $update Whether this is an existing post being updated
     */
    public function on_post_save($post_id, $post, $update)
    {
        // Avoid infinite loops
        if (self::$is_compiling) {
            return;
        }

        // Don't run on autosaves
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        // Don't run on revisions
        if (wp_is_post_revision($post_id)) {
            return;
        }

        // Don't run on auto-drafts
        if ($post->post_status === 'auto-draft') {
            return;
        }

        // Mark that we're processing to prevent recursion
        self::$is_compiling = true;

        // Schedule the crawl to run after the request completes
        // This prevents slowing down the save operation
        add_action('shutdown', function() use ($post_id) {
            $this->crawl_and_flag($post_id);
        });
    }

    /**
     * Triggered when a Fancoolo post is saved
     *
     * @param int $post_id The post ID
     * @param \WP_Post $post The post object
     * @param bool $update Whether this is an existing post being updated
     */
    public function on_fancoolo_post_save($post_id, $post, $update)
    {
        // Avoid infinite loops
        if (self::$is_compiling) {
            return;
        }

        // Mark that we're processing to prevent recursion
        self::$is_compiling = true;

        // Schedule the crawl to run after the request completes
        // This prevents slowing down the save operation
        add_action('shutdown', function() use ($post_id) {
            $this->crawl_and_flag($post_id);
        });
    }

    /**
     * Crawl classes and store for compilation
     *
     * @param int $post_id Optional post ID for context
     * @param bool $compile_now Whether to compile immediately (for non-JS contexts)
     */
    public function crawl_and_flag($post_id = null, $compile_now = false)
    {
        try {
            // Crawl all classes from the site
            $crawler = new ClassCrawler();
            $classes = $crawler->classes();

            // Store the classes and timestamp
            update_option('winden_crawled_classes', $classes);
            update_option('winden_last_crawl_time', current_time('mysql'));
            update_option('winden_needs_recompile', true);

            // If requested, compile immediately (for Bricks/Oxygen without JS events)
            if ($compile_now) {
                // Trigger compilation via existing compile endpoint
                // This would need the Compiler class to be available
                // For now, just set the flag - JS will pick it up on next page load
            }

        } catch (\Exception $e) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Intentional production logging for error tracking
            error_log('[Winden AutoCompile] Error: ' . $e->getMessage());
        } finally {
            // Reset the flag
            self::$is_compiling = false;
        }
    }

    /**
     * AJAX endpoint to trigger crawl + recompile immediately
     * Called from JS when save completes
     */
    public function ajax_trigger_recompile()
    {
        // Check permissions
        if (!current_user_can('edit_posts')) {
            wp_send_json_error('Unauthorized');
            return;
        }

        // Check nonce
        if (!isset($_POST['_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['_nonce'])), 'winden_nonce')) {
            wp_send_json_error('Invalid nonce');
            return;
        }

        $post_id = isset($_POST['post_id']) ? intval($_POST['post_id']) : 0;

        // Trigger crawl immediately
        $this->crawl_and_flag($post_id);

        wp_send_json_success([
            'message' => 'Crawl completed, ready to compile',
            'needs_recompile' => get_option('winden_needs_recompile', false)
        ]);
    }

    /**
     * AJAX endpoint to get compilation status
     */
    public function ajax_get_compile_status()
    {
        // Check permissions
        if (!current_user_can('edit_posts')) {
            wp_send_json_error('Unauthorized');
            return;
        }

        wp_send_json_success([
            'needs_recompile' => get_option('winden_needs_recompile', false),
            'last_crawl' => get_option('winden_last_crawl_time', 'Never'),
            'class_count' => count(get_option('winden_crawled_classes', []))
        ]);
    }

    /**
     * AJAX endpoint to compile CSS from crawled classes
     * This loads the compiler on-demand and compiles immediately
     */
    public function ajax_compile_from_crawled()
    {
        // Check permissions
        if (!current_user_can('edit_posts')) {
            wp_send_json_error('Unauthorized');
            return;
        }

        // Get crawled classes
        $classes = get_option('winden_crawled_classes', []);

        // Ensure classes is always an array
        if (!is_array($classes)) {
            if (is_string($classes)) {
                // Try to unserialize if it's a serialized string
                $unserialized = @unserialize($classes);
                $classes = is_array($unserialized) ? $unserialized : [$classes];
            } else if (is_object($classes)) {
                $classes = (array) $classes;
            } else {
                $classes = [];
            }
        }

        // Ensure we have unique values, re-index, and filter to only strings
        $classes = array_values(array_unique($classes));
        $classes = array_filter($classes, function($class) {
            return is_string($class) && !empty(trim($class));
        });
        $classes = array_values($classes); // Re-index after filter

        // Return classes and config to browser for compilation
        // Even with empty classes, we still need to compile (for @apply directives, custom components, etc.)
        $editor_content = get_option('winden_editor', []);

        // Wizzard data is stored inside winden_editor['wizzard']
        $wizzard_state = isset($editor_content['wizzard']) ? $editor_content['wizzard'] : null;

        // Extract Wizzard config if available
        $wizzard_config = '';
        if ($wizzard_state && isset($wizzard_state['configCode'])) {
            $wizzard_config = $wizzard_state['configCode'];
        }

        wp_send_json_success([
            'classes' => $classes,
            'config' => $editor_content['javascript'] ?? '',
            'styles' => $editor_content['scss'] ?? '',
            'wizzardConfig' => $wizzard_config,
            'message' => empty($classes)
                ? 'No HTML classes found, compiling custom CSS only'
                : 'Ready to compile ' . count($classes) . ' classes'
        ]);
    }

    /**
     * Clear the recompile flag after successful compilation
     */
    public function ajax_clear_recompile_flag()
    {
        if (!current_user_can('edit_posts')) {
            wp_send_json_error('Unauthorized');
            return;
        }

        update_option('winden_needs_recompile', false);

        wp_send_json_success([
            'message' => 'Recompile flag cleared',
            'needs_recompile' => false
        ]);
    }

    /**
     * Enqueue auto-compile script in all editor contexts
     */
    public function enqueue_auto_compile_script($hook = null)
    {
        // Check if dev mode is disabled
        $settings = SettingsOptions::getWindenOptions();
        $dev_mode_disabled = $settings['disable_dev_mode'] ?? false;

        // Don't load compiler scripts if dev mode is disabled
        if ($dev_mode_disabled) {
            return;
        }

        // Check if we're in a page builder using the Builders helper
        $is_bricks = Builders::isBricksEditorPage();
        $is_oxygen = Builders::isOxygenEditorPage();
        $is_oxygen6 = Builders::isOxygen6EditorPage();
        $is_elementor = isset($_GET['action']) && $_GET['action'] === 'elementor';
        $is_fancoolo = Builders::isFancooloEditorPage();
        $is_builder = $is_bricks || $is_oxygen || $is_oxygen6 || $is_elementor || $is_fancoolo;

        // Don't load on frontend unless it's a builder editor
        if (!is_admin() && !$is_builder) {
            return;
        }

        // Only load on post edit screens OR in page builders OR Fancoolo admin page
        if ($hook && !in_array($hook, ['post.php', 'post-new.php', 'toplevel_page_fancoolo-app']) && !$is_builder) {
            return;
        }

        // Load the browser-based Tailwind compiler
        wp_enqueue_script(
            'winden-compiler-module',
            WINDEN_PLUGIN_URL . 'build/compiler/tailwindcss-compiler.js',
            [],
            filemtime(WINDEN_PLUGIN_DIR . 'build/compiler/tailwindcss-compiler.js'),
            true
        );

        // Protect other AMD loaders (e.g., Monaco) from being used by the compiler bundle
        wp_add_inline_script(
            'winden-compiler-module',
            "window.__winden_prev_process=typeof window.process==='undefined'?null:window.process;window.__winden_amd_require=(typeof require==='function'&&require.toUrl)?require:null;window.__winden_amd_define=(typeof define==='function'&&define.amd)?define:null;if(window.__winden_prev_process!==null){window.process=undefined;}if(window.__winden_amd_require){window.require=undefined;}if(window.__winden_amd_define){window.define=undefined;}",
            'before'
        );

        // Restore any previously registered AMD loader after the compiler is loaded
        wp_add_inline_script(
            'winden-compiler-module',
            "if(window.__winden_amd_define){window.define=window.__winden_amd_define;delete window.__winden_amd_define;}if(window.__winden_amd_require){window.require=window.__winden_amd_require;delete window.__winden_amd_require;}if(window.__winden_prev_process!==null){window.process=window.__winden_prev_process;if(typeof window.process==='object'&&typeof window.process.env==='undefined'){window.process.env={};}}else if(typeof window.process==='object'){if(typeof window.process.env==='undefined'){window.process.env={};}}else{delete window.process;}delete window.__winden_prev_process;",
            'after'
        );

        // Enqueue CSS injector (no dependencies - pure injection logic)
        wp_enqueue_script(
            'winden-css-injector',
            WINDEN_PLUGIN_URL . 'assets/css-injector.js',
            [],
            filemtime(WINDEN_PLUGIN_DIR . 'assets/css-injector.js'),
            true
        );

        // Enqueue compile trigger script that listens for post save
        $dependencies = ['winden-compiler-module', 'winden-css-injector', 'jquery'];

        // Add Gutenberg dependencies if available
        if (function_exists('get_current_screen')) {
            $screen = get_current_screen();
            if ($screen && $screen->is_block_editor()) {
                $dependencies[] = 'wp-data';
                $dependencies[] = 'wp-editor';
            }
        }

        wp_enqueue_script(
            'winden-compile-trigger',
            WINDEN_PLUGIN_URL . 'assets/compile-trigger.js',
            $dependencies,
            filemtime(WINDEN_PLUGIN_DIR . 'assets/compile-trigger.js'),
            true
        );

        wp_localize_script('winden-compile-trigger', 'windenAutoCompile', [
            'needsCompile' => get_option('winden_needs_recompile', false),
            'clearCache' => get_option('winden_clear_cache_flag', false),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('winden_nonce')
        ]);
    }
}

// Initialize AutoCompile
new AutoCompile();

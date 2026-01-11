<?php

/**
 * ClassCrawler - Optimized for performance on large WordPress sites
 *
 * Optimizations applied:
 * 1. Lean SQL queries: Only fetch post IDs first with 'fields' => 'ids',
 *    no meta/term cache updates
 * 2. Batch processing: Load full post objects in chunks of 200 to prevent
 *    memory exhaustion
 * 3. Early exits: Skip inactive builders and empty post sets to avoid
 *    unnecessary processing
 *
 * Future improvements to consider:
 * - Incremental crawling: Only rescan posts modified since last crawl
 * - Background processing: Queue heavy crawlers (ScanCrawler, FancooloCrawler)
 *   to wp-cron or Action Scheduler
 * - Configurable scope: Allow users to limit post types/statuses in settings
 */

namespace Winden\App\Caching;

use Winden\App\Caching\Crawlers\GutenbergCrawler;
use Winden\App\Caching\Crawlers\ScriptsOrganizerCrawler;
use Winden\App\Caching\Crawlers\MetaBoxBlockViews;
use Winden\App\Caching\Crawlers\HookCrawler;
use Winden\App\Caching\Crawlers\FancooloCrawler;
use Winden\App\Helpers\SettingsOptions;
use Winden\App\Helpers\Builders;
use Winden\App\Helpers\LicenseManager;

class ClassCrawler
{
    private array $classes;
    private array $posts;

    /**
     * @param int|null $single_post_id If provided, only crawl this single post (for incremental updates)
     */
    public function __construct(?int $single_post_id = null)
    {
        $this->classes = [];

        if ($single_post_id && $single_post_id > 0) {
            // Single post mode: only query this specific post
            $post = get_post($single_post_id);
            $this->posts = $post ? [$post] : [];
        } else {
            // Full crawl mode: query all posts
            $this->posts = $this->queryPosts();
        }
    }

    /**
     * Crawl classes from a single post and update the cache correctly
     * This removes old classes from that post and adds new ones
     *
     * @param int $post_id The post ID to crawl
     * @return array Merged array of all classes (other posts + new from this post)
     */
    public static function crawlSinglePost(int $post_id): array
    {
        // Get per-post class index (tracks which classes belong to which post)
        $post_classes_index = get_option('winden_post_classes_index', []);
        if (!is_array($post_classes_index)) {
            $post_classes_index = [];
        }

        // Get the old classes for this specific post (before the edit)
        $old_post_classes = $post_classes_index[$post_id] ?? [];

        // Crawl the updated post to get its current classes
        $crawler = new self($post_id);
        $new_post_classes = $crawler->classes();

        // Update the index with new classes for this post
        $post_classes_index[$post_id] = $new_post_classes;
        update_option('winden_post_classes_index', $post_classes_index);

        // Build the complete class list from all posts
        // This ensures removed classes don't persist
        $all_classes = [];
        foreach ($post_classes_index as $pid => $classes) {
            if (is_array($classes)) {
                $all_classes = array_merge($all_classes, $classes);
            }
        }

        // Deduplicate and return
        return array_values(array_unique($all_classes));
    }

    private function queryPosts(): array
    {
        $post_types = array_unique(array_merge(array_keys(get_post_types()), [
            'post',
            'page',
            'product',
            'wp_block',
            'wp_template',
            'wp_template_part',
            'wp_global_styles',
            'wp_navigation',
            'ct_template',
            'bricks_fonts',
            'bricks_template',
            'elementor_library',
            'funculo'
        ]));

        // Default exclusions - post types that never contain Tailwind classes
        $excluded_post_types = [
            'attachment',
            'revision',
            'custom_css',
        ];

        /**
         * Filter the list of excluded post types
         *
         * @param array $excluded_post_types Array of post type slugs to exclude from class scanning
         * @return array Modified array of post types to exclude
         *
         * @example
         * add_filter('winden_excluded_post_types', function($excluded) {
         *     $excluded[] = 'product';  // Exclude WooCommerce products
         *     $excluded[] = 'edd_license';  // Exclude EDD licenses
         *     return $excluded;
         * });
         */
        $excluded_post_types = apply_filters('winden_excluded_post_types', $excluded_post_types);

        // Convert arrays to sets for efficient removal
        $post_types_set = array_flip($post_types);
        $remove_set = array_flip($excluded_post_types);

        // Calculate the difference between the sets
        $result_set = array_diff_key($post_types_set, $remove_set);

        // Convert the result set back to an array
        $post_types = array_keys($result_set);

        // Optimized query: fetch only IDs, no meta/term cache
        $query = new \WP_Query([
            'fields' => 'ids',
            'posts_per_page' => -1,
            'post_type' => $post_types,
            'post_status' => 'publish',
            'no_found_rows' => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        // Batch processing: get full post objects in chunks of 200
        $post_ids = $query->posts;
        $posts = [];
        $batch_size = 200;

        for ($i = 0; $i < count($post_ids); $i += $batch_size) {
            $batch_ids = array_slice($post_ids, $i, $batch_size);

            $batch_query = new \WP_Query([
                'post__in' => $batch_ids,
                'posts_per_page' => $batch_size,
                'post_type' => $post_types,
                'post_status' => 'publish',
                'no_found_rows' => true,
                'orderby' => 'post__in',
            ]);

            $posts = array_merge($posts, $batch_query->posts);
        }

        return $posts;
    }

    public function classes(): array
    {
        // Process Gutenberg classes if posts exist
        if (!empty($this->posts)) {
            $gutenbergCrawler = new GutenbergCrawler($this->posts);
            $gutenbergClasses = $gutenbergCrawler->classes();

            // Ensure gutenbergClasses is an array
            if (!is_array($gutenbergClasses)) {
                $gutenbergClasses = [];
            }

            $this->classes = array_merge($this->classes, $gutenbergClasses);
        }

        // Pro crawlers - only load if license is active
        if (LicenseManager::isProActive()) {
            // Process Bricks classes if theme is active and posts exist
            if (Builders::isBricksThemeActivated() && !empty($this->posts)) {
                $bricksCrawler = new \Winden\Pro\Crawlers\BricksCrawler($this->posts);
                $bricksClasses = $bricksCrawler->classes();
                $this->classes = array_merge($this->classes, $bricksClasses);

                // Also run Bricks2Crawler for Bricks 2 global classes
                $bricks2Crawler = new \Winden\Pro\Crawlers\Bricks2Crawler($this->posts);
                $bricks2Classes = $bricks2Crawler->classes();
                $this->classes = array_merge($this->classes, $bricks2Classes);
            }

            // Process Oxygen classes if plugin is active and posts exist
            if (Builders::isOxygenPluginActivated() && !empty($this->posts)) {
                $oxygenCrawler = new \Winden\Pro\Crawlers\OxygenCrawler($this->posts);
                $oxygenClasses = $oxygenCrawler->classes();
                $this->classes = array_merge($this->classes, $oxygenClasses);
            }

            // Process Oxygen 6 classes if plugin is active and posts exist
            if (Builders::isOxygen6PluginActivated() && !empty($this->posts)) {
                $oxygen6Crawler = new \Winden\Pro\Crawlers\Oxygen6Crawler($this->posts);
                $oxygen6Classes = $oxygen6Crawler->classes();
                $this->classes = array_merge($this->classes, $oxygen6Classes);
            }

            // Process Elementor classes if plugin is active and posts exist
            if (Builders::isElementorPluginActivated() && !empty($this->posts)) {
                $elementorCrawler = new \Winden\Pro\Crawlers\ElementorCrawler($this->posts);
                $elementorClasses = $elementorCrawler->classes();
                $this->classes = array_merge($this->classes, $elementorClasses);
            }
        }

        $scorgCrawler = new ScriptsOrganizerCrawler();
        $scorgClasses = $scorgCrawler->classes();
        $this->classes = array_merge($this->classes, $scorgClasses);

        $metaBoxBlockViews = new MetaBoxBlockViews();
        $metaBoxClasses = $metaBoxBlockViews->classes();
        $this->classes = array_merge($this->classes, $metaBoxClasses);

        // Scan Fancoolo custom post type and meta fields
        $fancooloCrawler = new FancooloCrawler($this->posts);
        $fancoloClasses = $fancooloCrawler->classes();
        $this->classes = array_merge($this->classes, $fancoloClasses);

        $settings = SettingsOptions::getWindenOptions();

        // Check if scan paths are provided
        $has_scan_paths = isset($settings['scan_path']) &&
                         is_array($settings['scan_path']) &&
                         count($settings['scan_path']) > 0;

        // Enable scanning if paths are provided (Pro feature)
        if ($has_scan_paths && LicenseManager::isProActive()) {
            $scannerCrawler = new \Winden\Pro\Crawlers\ScanCrawler();

            // Initialize default scan path
            $scan_path = ['/'];

            // Handle scan_path from settings
            if (isset($settings['scan_path'])) {
                if (is_array($settings['scan_path'])) {
                    // Filter out empty paths and ensure non-empty array
                    $filtered_paths = array_filter($settings['scan_path'], function($path) {
                        return !empty(trim($path));
                    });
                    $scan_path = !empty($filtered_paths) ? $filtered_paths : ['/'];
                } else if (!empty(trim($settings['scan_path']))) {
                    $scan_path = [trim($settings['scan_path'])];
                }
            }

            $scan_file_formats = [];
            if (isset($settings['scan_file_formats']) && is_array($settings['scan_file_formats'])) {
                $scan_file_formats = $settings['scan_file_formats'];
            }

            try {
                $scanned_classes = $scannerCrawler->classes($scan_path, $scan_file_formats);
                $this->classes = array_merge($this->classes, $scanned_classes);
            } catch (\Exception $e) {
                // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log -- Intentional production logging for error tracking
                error_log('[Winden ClassCrawler] Exception in ScanCrawler: ' . $e->getMessage());
            }
        }

        // Execute custom crawlers through hooks
        $hookCrawler = new HookCrawler();
        $hookClasses = $hookCrawler->classes();
        $this->classes = array_merge($this->classes, $hookClasses);

        $finalClasses = array_unique($this->classes);

        // Ensure we return a proper indexed array
        $finalClasses = array_values($finalClasses);

        return $finalClasses;
    }

    public function addClass(string $class): void
    {
        if (!in_array($class, $this->classes, true)) {
            $this->classes[] = $class;
        }
    }
}

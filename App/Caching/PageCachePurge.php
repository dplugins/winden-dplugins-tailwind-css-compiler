<?php

namespace Winden\App\Caching;

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * Purges third-party full-page caches after output.css changes.
 *
 * A cached HTML page keeps whatever CSS it was rendered with: with "Inline
 * Compiled CSS" the old CSS is embedded in the page, and without it the page
 * still points at the old ?ver= of output.css. So a new compile is invisible
 * to visitors until the page cache is cleared.
 *
 * Every integration is guarded (function_exists / class_exists / has_action)
 * and isolated in its own try/catch, so a missing or broken cache plugin can
 * never break the save. Each call below was checked against the plugin's own
 * source on plugins.svn.wordpress.org (WP Rocket: github.com/wp-media/wp-rocket).
 */
class PageCachePurge
{
    /**
     * Hash of a file's current contents, or '' when it does not exist yet.
     * Taken before the write, handed back to afterCssSaved() after it.
     */
    public static function hashFile(string $path): string
    {
        if (!is_readable($path)) {
            return '';
        }
        $hash = md5_file($path);
        return $hash === false ? '' : $hash;
    }

    /**
     * Called after output.css was written. Does nothing when the CSS is
     * identical to what was there before, so a no-op recompile does not wipe
     * every cached page on the site.
     *
     * @param string $previousHash hashFile() of the file before the write.
     * @param string $css          The CSS that was written.
     * @param string $path         The file it was written to.
     * @return string[] Names of the caches that were purged.
     */
    public static function afterCssSaved(string $previousHash, string $css, string $path): array
    {
        if ($previousHash !== '' && hash_equals($previousHash, md5($css))) {
            return [];
        }

        $purged = [];
        /**
         * Filters whether Winden purges known page caches after output.css changes.
         *
         * @param bool   $purge Default true.
         * @param string $path  Path of the written output.css.
         */
        if (\apply_filters('winden_purge_page_cache', true, $path)) {
            $purged = self::purgeAll();
        }

        /**
         * Fires after output.css was written with changed content, e.g. to
         * purge a CDN or a cache Winden does not know about.
         *
         * @param string   $path   Path of the written output.css.
         * @param string[] $purged Names of the caches Winden purged.
         */
        \do_action('winden_after_css_saved', $path, $purged);

        return $purged;
    }

    /**
     * Purges every supported page cache that is active.
     *
     * @return string[] Names of the caches that were purged.
     */
    public static function purgeAll(): array
    {
        $purgers = [
            // WP Rocket: inc/functions/files.php. rocket_clean_minify() only
            // deletes cache/min files, which are rebuilt on the next request.
            'wp-rocket' => [
                'function_exists' => 'rocket_clean_domain',
                'call' => static function () {
                    \rocket_clean_domain();
                    if (function_exists('rocket_clean_minify')) {
                        \rocket_clean_minify('css');
                    }
                },
            ],
            // LiteSpeed Cache: src/api.cls.php registers the action.
            'litespeed-cache' => [
                'has_action' => 'litespeed_purge_all',
                'call' => static function () {
                    \do_action('litespeed_purge_all');
                },
            ],
            // W3 Total Cache: w3-total-cache-api.php.
            'w3-total-cache' => [
                'function_exists' => 'w3tc_flush_all',
                'call' => static function () {
                    \w3tc_flush_all();
                },
            ],
            // WP Super Cache: wp-cache-phase2.php.
            'wp-super-cache' => [
                'function_exists' => 'wp_cache_clear_cache',
                'call' => static function () {
                    \wp_cache_clear_cache();
                },
            ],
            // SiteGround Optimizer: helpers/helpers.php. purge_everything
            // (5.7.14+) also drops combined/minified assets.
            'siteground-optimizer' => [
                'function_exists' => ['sg_cachepress_purge_everything', 'sg_cachepress_purge_cache'],
                'call' => static function () {
                    if (function_exists('sg_cachepress_purge_everything')) {
                        \sg_cachepress_purge_everything();
                    } else {
                        \sg_cachepress_purge_cache();
                    }
                },
            ],
            // WP Fastest Cache: wpFastestCache.php, deleteCache($minified).
            'wp-fastest-cache' => [
                'has_action' => 'wpfc_clear_all_cache',
                'call' => static function () {
                    \do_action('wpfc_clear_all_cache', true);
                },
            ],
            // Cache Enabler: inc/cache_enabler.class.php.
            'cache-enabler' => [
                'has_action' => 'cache_enabler_clear_complete_cache',
                'call' => static function () {
                    \do_action('cache_enabler_clear_complete_cache');
                },
            ],
            // Hummingbird: core/modules/class-page-cache.php.
            'hummingbird' => [
                'has_action' => 'wphb_clear_page_cache',
                'call' => static function () {
                    \do_action('wphb_clear_page_cache');
                },
            ],
            // Breeze: inc/breeze-admin.php.
            'breeze' => [
                'has_action' => 'breeze_clear_all_cache',
                'call' => static function () {
                    \do_action('breeze_clear_all_cache');
                },
            ],
            // Nginx Helper: includes/class-nginx-helper.php.
            'nginx-helper' => [
                'has_action' => 'rt_nginx_helper_purge_all',
                'call' => static function () {
                    \do_action('rt_nginx_helper_purge_all');
                },
            ],
        ];

        $purged = [];
        foreach ($purgers as $name => $purger) {
            if (!self::isAvailable($purger)) {
                continue;
            }
            try {
                ($purger['call'])();
                $purged[] = $name;
            } catch (\Throwable $e) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- debug-only failure report.
                    error_log('[Winden Error] PageCachePurge: ' . $name . ' failed: ' . $e->getMessage());
                }
            }
        }

        return $purged;
    }

    private static function isAvailable(array $purger): bool
    {
        if (isset($purger['function_exists'])) {
            foreach ((array) $purger['function_exists'] as $function) {
                if (function_exists($function)) {
                    return true;
                }
            }
            return false;
        }
        return isset($purger['has_action']) && \has_action($purger['has_action']) !== false;
    }
}

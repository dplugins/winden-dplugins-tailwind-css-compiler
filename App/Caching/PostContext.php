<?php

namespace Winden\App\Caching;

/**
 * Renders content for the crawlers, as if the given post were the current one.
 *
 * Shortcodes that read get_the_ID()/get_post() (ACF, custom ones) and
 * dynamic blocks that take postId from the global post print nothing
 * without it. Echoed output is kept; a render that throws is skipped.
 */
class PostContext
{
    /**
     * @param \WP_Post|null $post   Post to make current while rendering, null to leave the global post alone
     * @param callable      $render Returns the rendered HTML
     * @return string|null Rendered HTML plus anything echoed, or null when rendering threw
     */
    public static function render(?\WP_Post $post, callable $render): ?string
    {
        $previous = $GLOBALS['post'] ?? null;
        $ob_level = ob_get_level();

        if ($post) {
            // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restored below
            $GLOBALS['post'] = $post;
            setup_postdata($post);
        }

        // Catch shortcodes that echo instead of return
        ob_start();

        try {
            $html = (string) $render();
            $echoed = (string) ob_get_clean();

            return $html . $echoed;
        } catch (\Throwable $e) {
            // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- Intentional production logging for error tracking
            error_log(sprintf('[Winden ClassCrawler] Skipped %s, render failed: %s', $post ? 'post ' . $post->ID : 'content', $e->getMessage()));

            return null;
        } finally {
            // Drop buffers left open by the render or by the error
            while (ob_get_level() > $ob_level) {
                ob_end_clean();
            }

            if ($post) {
                // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- Restoring the previous global post
                $GLOBALS['post'] = $previous;
                if ($previous instanceof \WP_Post) {
                    setup_postdata($previous);
                }
            }
        }
    }
}

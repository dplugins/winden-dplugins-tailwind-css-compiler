<?php

namespace Winden\App\Caching\Crawlers;

use Winden\App\Caching\PostContext;
use Winden\App\Caching\StringParser;

/**
 * Widgets: classic widget options (`widget_text`, `widget_custom_html`, …)
 * and block widgets (`widget_block`, rendered first).
 */
class WidgetCrawler
{
    use StringParser;

    public function classes(): array
    {
        global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- One read per crawl
        $names = $wpdb->get_col(
            $wpdb->prepare("SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like('widget_') . '%')
        );

        $classes = [];

        foreach ((array) $names as $name) {
            $instances = get_option($name);
            if (!is_array($instances)) {
                continue;
            }

            if ($name === 'widget_block') {
                $classes = array_merge($classes, $this->blockWidgetClasses($instances));
            } else {
                $classes = array_merge($classes, $this->classesFromInstances($instances));
            }
        }

        return array_values(array_unique($classes));
    }

    /**
     * Classes from every HTML string in classic widget instances (any field, any depth).
     *
     * @param array $instances Widget option value
     * @return array
     */
    public function classesFromInstances(array $instances): array
    {
        $classes = [];

        array_walk_recursive($instances, function ($value) use (&$classes) {
            if (is_string($value) && strpos($value, 'class') !== false) {
                $classes = array_merge($classes, $this->parseString($value));
            }
        });

        return array_values(array_unique($classes));
    }

    private function blockWidgetClasses(array $instances): array
    {
        $classes = [];

        foreach ($instances as $instance) {
            if (!is_array($instance) || empty($instance['content']) || !is_string($instance['content'])) {
                continue;
            }

            $source = $instance['content'];

            // Same filters core runs on block widget content
            $html = PostContext::render(null, function () use ($source) {
                return do_shortcode(do_blocks($source));
            });

            // Raw markup too: className attrs, and a fallback when rendering failed
            $classes = array_merge($classes, $this->parseString($source));
            if ($html !== null) {
                $classes = array_merge($classes, $this->parseString($html));
            }
        }

        return $classes;
    }
}

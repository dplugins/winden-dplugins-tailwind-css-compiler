<?php

namespace Winden\App\Caching\Crawlers;

/**
 * Classic menu items: the "CSS Classes" field, stored as `_menu_item_classes`
 * post meta (serialized array) on nav_menu_item posts.
 */
class MenuCrawler
{
    public function classes(): array
    {
        global $wpdb;

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- One read per crawl
        $values = $wpdb->get_col(
            $wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s", '_menu_item_classes')
        );

        return self::classesFromMetaValues(is_array($values) ? $values : []);
    }

    /**
     * @param array $values Raw `_menu_item_classes` meta values
     * @return array Unique class names
     */
    public static function classesFromMetaValues(array $values): array
    {
        $classes = [];

        foreach ($values as $value) {
            if (is_string($value)) {
                $value = @unserialize($value, ['allowed_classes' => false]);
            }

            if (!is_array($value)) {
                continue;
            }

            foreach ($value as $entry) {
                if (!is_string($entry)) {
                    continue;
                }

                foreach (preg_split('/\s+/', trim($entry)) as $class) {
                    if ($class !== '') {
                        $classes[] = $class;
                    }
                }
            }
        }

        return array_values(array_unique($classes));
    }
}

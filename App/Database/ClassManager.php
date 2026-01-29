<?php
namespace Winden\App\Database;

if (!defined('ABSPATH')) exit;

/**
 * Class Manager
 *
 * CRUD operations for Winden element classes
 */
class ClassManager
{
    /**
     * Save classes for an element
     *
     * @param int $post_id Post ID
     * @param string $element_id Oxygen element ID
     * @param string $classes Space-separated class string
     * @return bool Success
     */
    public static function saveClasses($post_id, $element_id, $classes)
    {
        global $wpdb;

        WindenClassesTable::ensureTable();
        $table_name = WindenClassesTable::getTableName();

        // Sanitize
        $post_id = absint($post_id);
        $element_id = sanitize_text_field($element_id);
        $classes = sanitize_text_field($classes);

        // If classes empty, delete the record
        if (empty(trim($classes))) {
            return self::deleteElement($post_id, $element_id);
        }

        // Upsert: insert or update on duplicate key
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $result = $wpdb->replace(
            $table_name,
            [
                'post_id' => $post_id,
                'element_id' => $element_id,
                'classes' => $classes,
            ],
            ['%d', '%s', '%s']
        );

        return $result !== false;
    }

    /**
     * Get classes for an element
     *
     * @param int $post_id Post ID
     * @param string $element_id Oxygen element ID
     * @return string Classes string or empty
     */
    public static function getClasses($post_id, $element_id)
    {
        global $wpdb;

        if (!WindenClassesTable::tableExists()) {
            return '';
        }

        $table_name = WindenClassesTable::getTableName();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $result = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT classes FROM {$table_name} WHERE post_id = %d AND element_id = %s",
                absint($post_id),
                sanitize_text_field($element_id)
            )
        );

        return $result ? $result : '';
    }

    /**
     * Get all classes for a post
     *
     * @param int $post_id Post ID
     * @return array Array of element_id => classes
     */
    public static function getClassesForPost($post_id)
    {
        global $wpdb;

        if (!WindenClassesTable::tableExists()) {
            return [];
        }

        $table_name = WindenClassesTable::getTableName();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT element_id, classes FROM {$table_name} WHERE post_id = %d",
                absint($post_id)
            ),
            ARRAY_A
        );

        $classes_map = [];
        if ($results) {
            foreach ($results as $row) {
                $classes_map[$row['element_id']] = $row['classes'];
            }
        }

        return $classes_map;
    }

    /**
     * Get all unique classes from all elements (for Tailwind compilation)
     *
     * @return array Unique class names
     */
    public static function getAllClasses()
    {
        global $wpdb;

        if (!WindenClassesTable::tableExists()) {
            return [];
        }

        $table_name = WindenClassesTable::getTableName();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $results = $wpdb->get_col("SELECT classes FROM {$table_name}");

        if (!$results) {
            return [];
        }

        // Merge all classes and get unique
        $all_classes = [];
        foreach ($results as $classes_string) {
            $classes = preg_split('/\s+/', $classes_string, -1, PREG_SPLIT_NO_EMPTY);
            $all_classes = array_merge($all_classes, $classes);
        }

        return array_values(array_unique($all_classes));
    }

    /**
     * Delete classes for an element
     *
     * @param int $post_id Post ID
     * @param string $element_id Oxygen element ID
     * @return bool Success
     */
    public static function deleteElement($post_id, $element_id)
    {
        global $wpdb;

        if (!WindenClassesTable::tableExists()) {
            return true;
        }

        $table_name = WindenClassesTable::getTableName();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $result = $wpdb->delete(
            $table_name,
            [
                'post_id' => absint($post_id),
                'element_id' => sanitize_text_field($element_id),
            ],
            ['%d', '%s']
        );

        return $result !== false;
    }

    /**
     * Delete all classes for a post
     *
     * @param int $post_id Post ID
     * @return bool Success
     */
    public static function deletePost($post_id)
    {
        global $wpdb;

        if (!WindenClassesTable::tableExists()) {
            return true;
        }

        $table_name = WindenClassesTable::getTableName();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $result = $wpdb->delete(
            $table_name,
            ['post_id' => absint($post_id)],
            ['%d']
        );

        return $result !== false;
    }

    /**
     * Bulk save classes for multiple elements
     *
     * @param int $post_id Post ID
     * @param array $elements Array of ['element_id' => 'classes']
     * @return bool Success
     */
    public static function bulkSaveClasses($post_id, $elements)
    {
        global $wpdb;

        WindenClassesTable::ensureTable();

        $post_id = absint($post_id);
        $success = true;

        foreach ($elements as $element_id => $classes) {
            if (!self::saveClasses($post_id, $element_id, $classes)) {
                $success = false;
            }
        }

        return $success;
    }
}

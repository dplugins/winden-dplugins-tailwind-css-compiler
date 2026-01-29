<?php
namespace Winden\App\Database;

if (!defined('ABSPATH')) exit;

/**
 * Winden Classes Database Table
 *
 * Creates and manages the custom table for storing Winden/Tailwind classes
 * separately from page builder class storage (Oxygen, Bricks, etc.)
 */
class WindenClassesTable
{
    /**
     * Table name without prefix
     */
    const TABLE_NAME = 'winden_element_classes';

    /**
     * Get full table name with prefix
     *
     * @return string
     */
    public static function getTableName()
    {
        global $wpdb;
        return $wpdb->prefix . self::TABLE_NAME;
    }

    /**
     * Create the database table if it doesn't exist
     */
    public static function createTable()
    {
        global $wpdb;

        $table_name = self::getTableName();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            post_id BIGINT(20) UNSIGNED NOT NULL,
            element_id VARCHAR(100) NOT NULL,
            classes TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY post_element (post_id, element_id),
            KEY post_id (post_id)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
    }

    /**
     * Ensure table exists (call before any DB operations)
     */
    public static function ensureTable()
    {
        if (!self::tableExists()) {
            self::createTable();
        }
    }

    /**
     * Check if table exists
     *
     * @return bool
     */
    public static function tableExists()
    {
        global $wpdb;
        $table_name = self::getTableName();

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $result = $wpdb->get_var(
            $wpdb->prepare("SHOW TABLES LIKE %s", $table_name)
        );

        return $result === $table_name;
    }
}

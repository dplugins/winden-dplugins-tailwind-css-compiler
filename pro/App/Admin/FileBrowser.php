<?php

namespace Winden\Pro\Admin;

class FileBrowser
{
    // Folders to ignore when scanning
    private $ignored_folders = [
        'node_modules',
        'vendor',
        '.git',
        '.svn',
        '.hg',
        'bower_components',
        'jspm_packages',
        'dist',
        'build',
        '.cache',
        '.vscode',
        '.idea',
        '__pycache__',
        '.DS_Store',
    ];

    public function __construct()
    {
        // Add AJAX action for browsing filesystem
        add_action('wp_ajax_winden_browse_files', [$this, 'browse_files']);
    }

    /**
     * Browse wp-content directory structure
     * Returns tree structure with files/folders
     */
    public function browse_files()
    {
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions', 403);
            return;
        }

        // Verify nonce
        if (!isset($_GET['_nonce']) || !wp_verify_nonce($_GET['_nonce'], 'winden_nonce')) {
            wp_send_json_error('Invalid nonce', 403);
            return;
        }

        try {
            $wp_content_path = WP_CONTENT_DIR;

            // Build tree structure
            $tree = $this->build_tree($wp_content_path);

            wp_send_json_success([
                'tree' => $tree,
                'base_path' => $wp_content_path
            ]);
        } catch (\Exception $e) {
            wp_send_json_error('Error browsing filesystem: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Build tree structure from directory
     *
     * @param string $path Directory path
     * @param int $depth Current depth (for limiting recursion)
     * @param int $max_depth Maximum depth to traverse
     * @return array Tree structure
     */
    private function build_tree($path, $depth = 0, $max_depth = 3)
    {
        if (!is_dir($path) || !is_readable($path)) {
            return [];
        }

        // Limit depth to avoid performance issues
        if ($depth >= $max_depth) {
            return [];
        }

        $tree = [];
        $items = scandir($path);

        if ($items === false) {
            return [];
        }

        // Separate folders and files for sorting
        $folders = [];
        $files = [];

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $full_path = $path . '/' . $item;

            // Skip ignored folders
            if (in_array($item, $this->ignored_folders)) {
                continue;
            }

            // Skip hidden files/folders (starting with .)
            if (strpos($item, '.') === 0) {
                continue;
            }

            if (is_dir($full_path)) {
                $folders[] = $item;
            } else {
                $files[] = $item;
            }
        }

        // Sort alphabetically
        sort($folders);
        sort($files);

        // Process folders first
        foreach ($folders as $folder) {
            $full_path = $path . '/' . $folder;
            $relative_path = $this->get_relative_path($full_path);

            $children = $this->build_tree($full_path, $depth + 1, $max_depth);
            $file_count = $this->count_files_recursive($full_path);

            $tree[] = [
                'name' => $folder,
                'path' => $relative_path,
                'type' => 'directory',
                'children' => $children,
                'file_count' => $file_count,
            ];
        }

        // Don't show individual files at root level (wp-content) - only show folders
        // Files will be shown when folders are expanded

        return $tree;
    }

    /**
     * Get relative path from wp-content
     *
     * @param string $full_path Full filesystem path
     * @return string Relative path
     */
    private function get_relative_path($full_path)
    {
        $wp_content_path = WP_CONTENT_DIR;
        return str_replace($wp_content_path . '/', '', $full_path);
    }

    /**
     * Count files recursively in a directory
     *
     * @param string $path Directory path
     * @param int $depth Current depth
     * @param int $max_depth Maximum depth
     * @return int Number of files
     */
    private function count_files_recursive($path, $depth = 0, $max_depth = 5)
    {
        if (!is_dir($path) || !is_readable($path) || $depth >= $max_depth) {
            return 0;
        }

        $count = 0;
        $items = @scandir($path);

        if ($items === false) {
            return 0;
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            // Skip ignored folders
            if (in_array($item, $this->ignored_folders)) {
                continue;
            }

            $full_path = $path . '/' . $item;

            if (is_dir($full_path)) {
                $count += $this->count_files_recursive($full_path, $depth + 1, $max_depth);
            } else {
                // Only count specific file types
                $extension = strtolower(pathinfo($item, PATHINFO_EXTENSION));
                if (in_array($extension, ['php', 'css', 'js', 'html', 'jsx', 'tsx', 'ts'])) {
                    $count++;
                }
            }
        }

        return $count;
    }

    /**
     * Format file size to human readable
     *
     * @param int $bytes File size in bytes
     * @return string Formatted size
     */
    private function format_file_size($bytes)
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' B';
        }
    }
}

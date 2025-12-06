<?php

namespace Winden\Pro\Crawlers;

use Winden\App\Caching\StringParser;
use Winden\App\Helpers\FileManager;

class ScanCrawler
{
    use StringParser;

    /**
     * @return array
     */
    public function classes(array $scan_path, array $scan_file_formats)
    {
        $classes = [];

        try {
            foreach ($scan_path as $path) {
                // Ensure path is properly formatted
                $path = trim($path, '/');

                try {
                    $files = FileManager::list_wp_directories($path, $scan_file_formats);

                    // Loop through each path and get file contents
                    foreach ($files as $file) {
                        try {
                            $fileContent = FileManager::get_file_contents($file);
                            if ($fileContent !== false) {
                                $parsed_classes = $this->parseString($fileContent);
                                if (is_array($parsed_classes)) {
                                    array_push($classes, ...$parsed_classes);
                                }
                            }
                        } catch (\Exception $e) {
                            // Skip file if error occurs
                            continue;
                        }
                    }
                } catch (\Exception $e) {
                    // Skip directory if error occurs
                    continue;
                }
            }
        } catch (\Exception $e) {
            // Return empty array on error
            return [];
        }

        return array_unique(array_filter($classes));
    }
}
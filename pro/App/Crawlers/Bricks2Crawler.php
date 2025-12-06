<?php

namespace Winden\Pro\Crawlers;

use Winden\App\Caching\StringParser;

class Bricks2Crawler
{
    use StringParser;

    private array $posts;

    public function __construct(array $posts)
    {
        $this->posts = $posts;
    }

    public function classes(): array
    {
        $classes = [];

        // Get Bricks 2 global classes from wp_options
        $bricksGlobalClasses = $this->getBricks2GlobalClasses();
        if (!empty($bricksGlobalClasses)) {
            $classes = array_merge($classes, $bricksGlobalClasses);
        }

        // Also scan posts for Bricks 2 content
        foreach ($this->posts as $post) {
            $headerBlocks = defined('BRICKS_DB_PAGE_HEADER') ? get_post_meta($post->ID, BRICKS_DB_PAGE_HEADER, true) : null;
            $contentBlocks = defined('BRICKS_DB_PAGE_CONTENT') ? get_post_meta($post->ID, BRICKS_DB_PAGE_CONTENT, true) : null;
            $footerBlocks = defined('BRICKS_DB_PAGE_FOOTER') ? get_post_meta($post->ID, BRICKS_DB_PAGE_FOOTER, true) : null;

            if (is_array($headerBlocks)) {
                array_push($classes, ...$this->parseBlocks($headerBlocks));
            }

            if (is_array($contentBlocks)) {
                array_push($classes, ...$this->parseBlocks($contentBlocks));
            }

            if (is_array($footerBlocks)) {
                array_push($classes, ...$this->parseBlocks($footerBlocks));
            }
        }

        return array_unique($classes);
    }

    /**
     * Get Bricks 2 global classes from wp_options
     * 
     * @return array
     */
    private function getBricks2GlobalClasses(): array
    {
        $classes = [];
        
        // Get the bricks_global_classes option
        $bricksGlobalClasses = get_option('bricks_global_classes', []);

        if (empty($bricksGlobalClasses)) {
            return $classes;
        }

        // If it's a serialized string, unserialize it
        if (is_string($bricksGlobalClasses)) {
            $bricksGlobalClasses = maybe_unserialize($bricksGlobalClasses);
        }

        // If it's not an array, return empty
        if (!is_array($bricksGlobalClasses)) {
            return $classes;
        }

        // Extract class names from the array structure
        foreach ($bricksGlobalClasses as $classItem) {
            if (isset($classItem['name']) && !empty($classItem['name'])) {
                $classes[] = $classItem['name'];
            }
        }

        return $classes;
    }

    /**
     * @param array $blocks
     * @return array
     */
    private function parseBlocks(array $blocks)
    {
        $blockClasses = [];

        foreach ($blocks as $block) {
            if (isset($block['settings'])) {
                $settings = $block['settings'];

                if (isset($settings['_cssClasses'])) {
                    $blockClasses = array_merge($blockClasses, explode(' ', $settings['_cssClasses']));
                }

                if (isset($settings['_cssGlobalClasses'])) {
                    foreach ($settings['_cssGlobalClasses'] as $classId) {
                        // Retrieve the global classes option
                        $globalClasses = $this->globalClasses();

                        // Find the first class item with the specified ID
                        $classItem = null;
                        foreach ($globalClasses as $class) {
                            if (isset($class['id']) && $class['id'] == $classId) {
                                $classItem = $class;
                                break;
                            }
                        }

                        if ($classItem) {
                            $blockClasses[] = $classItem['name'];
                        }
                    }
                }

                if (isset($settings['text'])) {
                    array_push($blockClasses, ...$this->parseString($settings['text']));
                }

                if (isset($settings['code']) && isset($settings['executeCode'])) {
                    if ($settings['executeCode']) {
                        array_push($blockClasses, ...$this->parseString($settings['code']));
                    }
                }
            }
        }

        return $blockClasses;
    }

    private function globalClasses()
    {
        return defined('BRICKS_DB_GLOBAL_CLASSES') ? get_option(BRICKS_DB_GLOBAL_CLASSES, []) : [];
    }
} 
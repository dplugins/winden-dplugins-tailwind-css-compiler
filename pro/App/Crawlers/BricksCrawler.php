<?php

namespace Winden\Pro\Crawlers;

use Winden\App\Caching\StringParser;

class BricksCrawler
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

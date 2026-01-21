<?php

namespace Winden\App\Caching\Crawlers;

use Winden\App\Caching\StringParser;

class GutenbergCrawler
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
            // Render blocks to get the full HTML output with all classes
            // This is necessary because Gutenberg stores blocks as JSON comments
            // and the actual CSS classes only appear in the rendered HTML
            $content = do_blocks($post->post_content);
            $content = do_shortcode($content);
            $postClasses = $this->parseString($content);

            // Also parse blocks to get className attributes from block attrs
            // This catches classes that might not appear in rendered HTML
            $blocks = parse_blocks($post->post_content);
            $blocksClasses = $this->extractClassesFromBlocks($blocks);

            $classes = array_merge($classes, $postClasses, $blocksClasses);
        }

        return array_unique($classes);
    }

    private function extractClassesFromBlocks(array $blocks): array
    {
        $classes = [];

        foreach ($blocks as $block) {
            // Check if the block has attr classname
            if (!empty($block['attrs']['className'])) {
                // Extract classes from the attrs classname
                $classValue = $block['attrs']['className'];
                // Decode JSON Unicode escapes (e.g., \u0026 -> &, \u003e -> >)
                // This handles classes that might still contain Unicode escapes from raw block storage
                $classValue = preg_replace_callback('/\\\\u([0-9a-fA-F]{4})/', function($match) {
                    return mb_convert_encoding(pack('H*', $match[1]), 'UTF-8', 'UTF-16BE');
                }, $classValue);
                $attr_classes = preg_split('/\s+/', $classValue);
                $classes = array_merge($classes, $attr_classes);
            }

            // Check if the block has inner content (HTML)
            if (!empty($block['innerHTML'])) {
                // Extract classes from the inner HTML
                $html_classes = $this->parseString($block['innerHTML']);
                $classes = array_merge($classes, $html_classes);
            }

            // Recursively process inner blocks
            if (!empty($block['innerBlocks'])) {
                $inner_classes = $this->extractClassesFromBlocks($block['innerBlocks']);
                $classes = array_merge($classes, $inner_classes);
            }
        }

        return $classes;
    }
}

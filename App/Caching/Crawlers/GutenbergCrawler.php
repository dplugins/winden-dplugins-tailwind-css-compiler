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
            // Extract classes directly from raw post_content without rendering
            // This is MUCH faster than do_blocks()/do_shortcode() which execute PHP code
            // and can be slow when plugins like EDD-SL add heavy filters
            $postClasses = $this->parseString($post->post_content);

            // Also parse blocks to get className attributes
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
                $attr_classes = preg_split('/\s+/', $block['attrs']['className']);
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

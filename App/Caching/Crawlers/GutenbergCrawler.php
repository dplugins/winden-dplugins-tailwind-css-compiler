<?php

namespace Winden\App\Caching\Crawlers;

use Winden\App\Caching\StringParser;

class GutenbergCrawler
{
    use StringParser;

    private array $posts;
    private bool $useCache;

    public function __construct(array $posts)
    {
        $this->posts = $posts;
        $this->useCache = function_exists('wp_using_ext_object_cache') && wp_using_ext_object_cache();
    }

    public function classes(): array
    {
        $classes = [];

        foreach ($this->posts as $post) {
            $cacheKey = $this->getCacheKey($post);

            if ($this->useCache) {
                $cached = wp_cache_get($cacheKey, 'winden_gutenberg');
                if ($cached !== false) {
                    $classes = array_merge($classes, $cached);
                    continue;
                }
            }

            // Render blocks to get the full HTML output with all classes
            // This is necessary because Gutenberg stores blocks as JSON comments
            // and the actual CSS classes only appear in the rendered HTML
            $postClasses = $this->collectPostClasses($post);

            if ($this->useCache) {
                // Cache per post + modification timestamp to avoid repeated rendering on large sites
                wp_cache_set($cacheKey, $postClasses, 'winden_gutenberg', DAY_IN_SECONDS);
            }

            $classes = array_merge($classes, $postClasses);
        }

        return array_unique($classes);
    }

    private function collectPostClasses($post): array
    {
        // Short-circuit heavy rendering when there are no blocks or shortcodes
        $hasBlocks = function_exists('has_blocks') && has_blocks($post->post_content);
        $hasShortcodes = $this->contentHasShortcodes($post->post_content);

        $content = $post->post_content;

        if ($hasBlocks && function_exists('do_blocks')) {
            $content = do_blocks($content);
        }

        if ($hasShortcodes || $this->contentHasShortcodes($content)) {
            $content = do_shortcode($content);
        }

        $classes = $this->parseString($content);

        // Also parse blocks to get className attributes from block attrs
        // This catches classes that might not appear in rendered HTML
        if ($hasBlocks) {
            $blocks = parse_blocks($post->post_content);
            $blocksClasses = $this->extractClassesFromBlocks($blocks);
            $classes = array_merge($classes, $blocksClasses);
        }

        return $classes;
    }

    private function contentHasShortcodes(string $content): bool
    {
        // Cheap regex to detect any shortcode-like pattern without invoking do_shortcode
        return (bool) preg_match('/\\[[a-zA-Z0-9_-]+[\\s\\]]/', $content);
    }

    private function getCacheKey($post): string
    {
        $modified = $post->post_modified_gmt ?: $post->post_modified ?: '0';

        return sprintf('gutenberg_classes_%d_%s', $post->ID, $modified);
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

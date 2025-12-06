<?php

namespace Winden\App\Caching\Crawlers;

use Winden\App\Caching\StringParser;

class FancooloCrawler
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
            // Skip if not a funculo post type
            if ($post->post_type !== 'funculo') {
                continue;
            }

            // Scan _funculo_block_php meta (PHP code)
            $blockPhp = get_post_meta($post->ID, '_funculo_block_php', true);
            if (!empty($blockPhp) && is_string($blockPhp)) {
                $phpClasses = $this->parseString($blockPhp);
                $classes = array_merge($classes, $phpClasses);
            }

            // Scan _funculo_block_js meta (JavaScript code)
            $blockJs = get_post_meta($post->ID, '_funculo_block_js', true);
            if (!empty($blockJs) && is_string($blockJs)) {
                $jsClasses = $this->parseString($blockJs);
                $classes = array_merge($classes, $jsClasses);
            }

            // Scan _funculo_symbol_php meta (PHP code)
            $symbolPhp = get_post_meta($post->ID, '_funculo_symbol_php', true);
            if (!empty($symbolPhp) && is_string($symbolPhp)) {
                $symbolClasses = $this->parseString($symbolPhp);
                $classes = array_merge($classes, $symbolClasses);
            }
        }

        return array_unique($classes);
    }
}

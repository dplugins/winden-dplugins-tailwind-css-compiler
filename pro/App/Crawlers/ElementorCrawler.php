<?php

namespace Winden\Pro\Crawlers;

use Winden\App\Caching\StringParser;

class ElementorCrawler
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
            if ($this->is_elementor_content($post->ID)) {
                $content = \Elementor\Plugin::$instance->frontend->get_builder_content_for_display($post->ID);
            } else {
                // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- This is a WordPress core filter
                $content = apply_filters('the_content', $post->post_content);
            }

            $postClasses = $this->parseString($content);
            $classes = array_merge($classes, $postClasses);
        }

        return array_unique($classes);
    }

    public function is_elementor_content($post_id): bool
    {
        return get_post_meta($post_id, '_elementor_data', true) ? true : false;
    }
}

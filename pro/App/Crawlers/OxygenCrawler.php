<?php

namespace Winden\Pro\Crawlers;

use Winden\App\Caching\StringParser;

class OxygenCrawler
{
    use StringParser;

    /**
     * @var \WP_Post[]
     */
    private array $posts;

    /**
     * @param \WP_Post[] $posts
     */
    public function __construct(array $posts)
    {
        $this->posts = $posts;
    }

    /**
     * @return array
     */
    public function classes()
    {
        $meta_function_name = function_exists('oxy_get_post_meta') ? 'oxy_get_post_meta' : 'get_post_meta';

        $classes = [];

        foreach ($this->posts as $post) {
            $block = call_user_func($meta_function_name, $post->ID, 'ct_builder_json', true);
            $block = json_decode($block, true);

            if (is_array($block)) {
                $children = $block['children'];

                array_push($classes, ...$this->parseChildren($children));
            }
        }

        return array_unique($classes);
    }

    /**
     * @param array $children
     * @return array
     */
    public function parseChildren(array $children)
    {
        $classes = [];

        foreach ($children as $child) {
            if (isset($child['children'])) {
                array_push($classes, ...$this->parseChildren($child['children']));
            }

            if (isset($child['options'])) {
                $options = $child['options'];

                if (isset($options['ct_content'])) {
                    array_push($classes, ...$this->parseString($options['ct_content']));
                }

                if (isset($options['classes'])) {
                    $classNames = $options['classes'];

                    foreach ($classNames as $className) {
                        array_push($classes, $className);
                    }
                }

                if (isset($options['original'])) {
                    $original = $options['original'];

                    if (isset($original['code-php'])) {
                        array_push($classes, ...$this->parseString($original['code-php']));
                    }
                }
            }
        }

        return array_unique($classes);
    }
}

<?php

namespace Winden\App\Caching\Crawlers;

use Winden\App\Caching\StringParser;

class MetaBoxBlockViews
{
    use StringParser;

    /**
     * @var \WP_Post[]
     */
    private array $posts;

    public function __construct()
    {
        $query = new \WP_Query([
            'posts_per_page' => -1,
            'post_type' => [
                'mb-views'
            ],
        ]);
        $this->posts = $query->posts;
    }

    /**
     * @return array
     */
    public function classes()
    {
        $classes = [];

        foreach ($this->posts as $post) {
            $fields = [
                'post_content',
                'post_content_filtered'
            ];

            foreach ($fields as $field) {
                $value = get_post_meta($post->ID, $field, true);

                if ($value) {
                    array_push($classes, ...$this->parseString(base64_decode($value)));
                }
            }
        }

        return array_unique($classes);
    }
}

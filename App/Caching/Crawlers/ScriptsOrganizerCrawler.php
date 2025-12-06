<?php

namespace Winden\App\Caching\Crawlers;

use Winden\App\Caching\StringParser;

class ScriptsOrganizerCrawler
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
                'scorg',
                'scorg_ga'
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
                'SCORG_header_script',
                'SCORG_footer_script',
                'SCORG_GACF_php_script'
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
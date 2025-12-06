<?php

namespace Winden\App\Caching\Crawlers;

use Winden\App\Caching\StringParser;

class HookCrawler
{
    use StringParser;

    private array $customCrawlers = [];

    public function __construct()
    {
        $this->customCrawlers = apply_filters('winden_register_crawlers', []);
    }

    public function classes(): array
    {
        $classes = [];

        foreach ($this->customCrawlers as $crawler) {
            if (method_exists($crawler, 'classes')) {
                $classes = array_merge($classes, $crawler->classes());
            }
        }

        return array_unique($classes);
    }
} 
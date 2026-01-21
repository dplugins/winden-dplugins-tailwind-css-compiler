<?php

namespace Winden\App\Caching;

trait StringParser
{
    protected function parseString(string $string): array
    {
        $classes = [];

        // Strip PHP tags to handle class attributes with embedded PHP
        $stringWithoutPhp = preg_replace('/<\?php.*?\?>/s', ' ', $string);

        // HTML attributes: class="..."
        $classes = array_merge($classes, $this->parseClasses($stringWithoutPhp, '/(?:class=["\'])([^"\']+)["\']/s'));

        // Also parse original string
        $classes = array_merge($classes, $this->parseClasses($string, '/(?:class=["\'])([^"\']+)["\']/s'));

        // JSON className props
        $classes = array_merge($classes, $this->parseClasses($string, '/(?:["\']className["\']\s*:\s*["\'])([^"\']+)["\']/s'));

        // PHP arrays with class keys
        $classes = array_merge($classes, $this->parseClasses($string, '/(?:["\'](?:[\w]+_)?class(?:es)?(?:_[\w]+)?["\']\s*=>\s*["\'])([^"\']+)["\']/s'));

        return array_unique($classes);
    }

    private function parseClasses(string $string, string $pattern): array
    {
        preg_match_all($pattern, $string, $matches);
        $classes = [];

        if (!empty($matches[1])) {
            foreach ($matches[1] as $classAttribute) {
                $classNames = preg_split('/\s+/', $classAttribute);
                foreach ($classNames as $className) {
                    $trimmed = html_entity_decode(trim($className));
                    // Decode JSON Unicode escapes (e.g., \u0026 -> &, \u003e -> >)
                    // This handles classes like [\u0026\u003eimg]:w-full from raw block JSON
                    $trimmed = preg_replace_callback('/\\\\u([0-9a-fA-F]{4})/', function($match) {
                        return mb_convert_encoding(pack('H*', $match[1]), 'UTF-8', 'UTF-16BE');
                    }, $trimmed);
                    if ($trimmed && !preg_match('/^(<\?|echo|esc_|implode|sprintf|\$|->|=>)/', $trimmed)) {
                        $classes[] = $trimmed;
                    }
                }
            }
        }

        return $classes;
    }
}

<?php

namespace Winden\App\Caching;

trait StringParser
{
    protected function parseString(string $string): array
    {
        $classes = [];

		// HTML attributes: class="..."
		$classes = array_merge($classes, $this->parseClasses($string, '/(?:class=["\'])([^"\']+)["\']/s'));
		// JSON or JSX-like props inside strings: "className":"..."
		$classes = array_merge($classes, $this->parseClasses($string, '/(?:["\']className["\']\s*:\s*["\'])([^"\']+)["\']/s'));
		// PHP arrays: ['class' => '...'] and wildcard variants
		// Matches: 'class', 'menu_class', 'item_classes', 'class_name', 'classes_array', etc.
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
                    $classes[] = html_entity_decode(trim($className));
                }
            }
        }

        return $classes;
    }
}

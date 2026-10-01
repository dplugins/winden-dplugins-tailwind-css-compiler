<?php
/**
 * Plain PHP test for the WordPress-free parts of MenuCrawler and WidgetCrawler.
 *
 *   php tests/menu-widget-crawler.test.php
 */

require_once __DIR__ . '/../App/Caching/StringParser.php';
require_once __DIR__ . '/../App/Caching/Crawlers/MenuCrawler.php';
require_once __DIR__ . '/../App/Caching/Crawlers/WidgetCrawler.php';

use Winden\App\Caching\Crawlers\MenuCrawler;
use Winden\App\Caching\Crawlers\WidgetCrawler;

$failures = 0;
$assertions = 0;

function check(bool $ok, string $message): void
{
    global $failures, $assertions;
    $assertions++;
    if (!$ok) {
        $failures++;
    }
    echo ($ok ? 'PASS: ' : 'FAIL: ') . $message . "\n";
}

// Menus: serialized arrays straight from postmeta, and already unserialized ones
$menu = MenuCrawler::classesFromMetaValues([
    serialize(['bg-[#155e75]', 'px-2']),
    serialize(['']),
    ['md:flex  hover:underline', 'px-2'],
    'not serialized',
    serialize('a string'),
    serialize([new ArrayObject()]),
]);
check(in_array('bg-[#155e75]', $menu, true), 'menu: arbitrary value class from serialized meta');
check(in_array('md:flex', $menu, true) && in_array('hover:underline', $menu, true), 'menu: space-separated entry split');
check(count(array_keys($menu, 'px-2', true)) === 1, 'menu: duplicates removed');
check(!in_array('', $menu, true), 'menu: empty entries skipped');
check(!in_array('not', $menu, true) && !in_array('a string', $menu, true), 'menu: non-array values ignored');

// Classic widgets: any HTML string field, nested included
$widgets = (new WidgetCrawler())->classesFromInstances([
    '_multiwidget' => 1,
    2 => ['title' => 'Hi', 'content' => '<div class="bg-[#86198f] p-2">x</div>'],
    3 => ['text' => "<p class='font-[\"Inter\"] text-sm'>y</p>", 'filter' => true],
    4 => ['nested' => ['html' => '<span class="ring-2">z</span>']],
    5 => ['title' => 'plain text, no markup'],
]);
check(in_array('bg-[#86198f]', $widgets, true), 'widget: custom HTML content');
check(in_array('text-sm', $widgets, true), 'widget: text widget with single quotes');
check(in_array('ring-2', $widgets, true), 'widget: nested field');
check(!in_array('plain', $widgets, true), 'widget: plain text not read as classes');

echo "\n{$assertions} assertions, " . ($assertions - $failures) . " passed, {$failures} failed.\n";

exit($failures > 0 ? 1 : 0);

<?php
/**
 * Plain PHP test for App/Caching/PageCachePurge.php.
 *
 * Stubs the WordPress hook API and two cache plugins, then checks the purge
 * runs once per changed CSS, and not at all for identical CSS or when the
 * winden_purge_page_cache filter returns false. Run it directly:
 *
 *   php tests/page-cache-purge.test.php
 */

define('ABSPATH', __DIR__);

$calls = [];
$filters = [];
$actions = [];

function apply_filters($hook, $value, ...$args)
{
    global $filters;
    return isset($filters[$hook]) ? $filters[$hook]($value, ...$args) : $value;
}

function has_action($hook)
{
    global $actions;
    return isset($actions[$hook]) ? 10 : false;
}

function do_action($hook, ...$args)
{
    global $actions, $calls;
    $calls[] = 'action:' . $hook;
    if (isset($actions[$hook])) {
        $actions[$hook](...$args);
    }
}

// Stubbed cache plugins: WP Rocket (function API), LiteSpeed (hook API).
function rocket_clean_domain()
{
    global $calls;
    $calls[] = 'rocket_clean_domain';
}

function rocket_clean_minify($extensions)
{
    global $calls;
    $calls[] = 'rocket_clean_minify:' . $extensions;
}

$actions['litespeed_purge_all'] = static function () {
    global $calls;
    $calls[] = 'litespeed';
};

// A broken cache plugin must not stop the others.
$actions['breeze_clear_all_cache'] = static function () {
    throw new \RuntimeException('breeze exploded');
};

require_once __DIR__ . '/../App/Caching/PageCachePurge.php';

use Winden\App\Caching\PageCachePurge;

$failures = 0;
$assertions = 0;

function check(bool $ok, string $message): void
{
    global $failures, $assertions;
    $assertions++;
    if ($ok) {
        echo "PASS: {$message}\n";
    } else {
        $failures++;
        echo "FAIL: {$message}\n";
    }
}

function count_calls(string $name): int
{
    global $calls;
    return count(array_keys($calls, $name, true));
}

$file = tempnam(sys_get_temp_dir(), 'winden-css');
file_put_contents($file, '.a{color:red}');

// 1. Changed CSS: every available cache is purged exactly once, then the action fires.
$calls = [];
$before = PageCachePurge::hashFile($file);
file_put_contents($file, '.a{color:blue}');
$purged = PageCachePurge::afterCssSaved($before, '.a{color:blue}', $file);
check(count_calls('rocket_clean_domain') === 1, 'changed CSS: rocket_clean_domain called once');
check(count_calls('rocket_clean_minify:css') === 1, 'changed CSS: rocket_clean_minify(css) called once');
check(count_calls('litespeed') === 1, 'changed CSS: litespeed_purge_all fired once');
check(count_calls('action:winden_after_css_saved') === 1, 'changed CSS: winden_after_css_saved fired once');
check($purged === ['wp-rocket', 'litespeed-cache'], 'changed CSS: reports purged caches, skips the throwing one');
check(count_calls('action:wpfc_clear_all_cache') === 0, 'inactive plugin (no listener) is not called');

// 2. Identical CSS: nothing is purged and the action does not fire.
$calls = [];
$before = PageCachePurge::hashFile($file);
file_put_contents($file, '.a{color:blue}');
$purged = PageCachePurge::afterCssSaved($before, '.a{color:blue}', $file);
check($calls === [] && $purged === [], 'unchanged CSS: no purge, no action');

// 3. First write (no previous file) counts as changed.
$calls = [];
$purged = PageCachePurge::afterCssSaved(PageCachePurge::hashFile($file . '-missing'), '.b{}', $file);
check(count_calls('rocket_clean_domain') === 1, 'first write: purges');

// 4. Filter off: no purge, but the action still fires for user hooks.
$calls = [];
$filters['winden_purge_page_cache'] = static function () {
    return false;
};
$before = PageCachePurge::hashFile($file);
file_put_contents($file, '.a{color:green}');
$purged = PageCachePurge::afterCssSaved($before, '.a{color:green}', $file);
check(count_calls('rocket_clean_domain') === 0 && count_calls('litespeed') === 0, 'filter false: no purge');
check(count_calls('action:winden_after_css_saved') === 1, 'filter false: winden_after_css_saved still fires');
check($purged === [], 'filter false: reports nothing purged');

unlink($file);

echo "\n{$assertions} assertions, {$failures} failures\n";
exit($failures > 0 ? 1 : 0);

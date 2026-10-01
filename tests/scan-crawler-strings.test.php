<?php
/**
 * Plain PHP test for StringParser::parseQuotedStrings (file scanner, code files).
 *
 *   php tests/scan-crawler-strings.test.php
 */

require_once __DIR__ . '/../App/Caching/StringParser.php';

use Winden\App\Caching\StringParser;

class QuotedStringsTestHarness
{
    use StringParser;

    public function php(string $code): array
    {
        return $this->parseQuotedStrings($code, true);
    }

    public function js(string $code): array
    {
        return $this->parseQuotedStrings($code);
    }
}

$failures = 0;
$assertions = 0;

function check(bool $ok, string $message, array $got): void
{
    global $failures, $assertions;
    $assertions++;
    if ($ok) {
        echo "PASS: {$message}\n";
        return;
    }
    $failures++;
    echo "FAIL: {$message}\n  got [" . implode(', ', $got) . "]\n";
}

function has(array $got, array $needles, string $message): void
{
    check(!array_diff($needles, $got), $message, $got);
}

function hasNone(array $got, array $needles, string $message): void
{
    check(!array_intersect($needles, $got), $message, $got);
}

$p = new QuotedStringsTestHarness();

// 1. Variable assignment
has($p->php('<?php $c = \'p-4 flex\';'), ['p-4', 'flex'], 'php: $c = \'p-4 flex\'');

// 2. Array of classes, double and single quotes
$got = $p->php('<?php $classes = ["grid", \'md:grid-cols-3\', "gap-4"]; echo implode(" ", $classes);');
has($got, ['grid', 'md:grid-cols-3', 'gap-4'], 'php: array of classes');

// 3. sprintf args and format string
$got = $p->php('<?php printf(\'<div class="%1$s text-lg">\', esc_attr(\'bg-red-500/50 hover:underline\'));');
has($got, ['text-lg', 'bg-red-500/50', 'hover:underline'], 'php: sprintf format + args');
hasNone($got, ['%1$s', 'class="%1$s'], 'php: sprintf placeholders dropped');

// 4. Interpolated PHP string: fragments kept, variables dropped
$got = $p->php('<?php $x = "py-2 {$extra} rounded-md $size";');
has($got, ['py-2', 'rounded-md'], 'php: interpolated string fragments');
hasNone($got, ['$extra', '$size', '{$extra}'], 'php: interpolated variables dropped');

// 5. Inline HTML prose apostrophe must not mis-pair quotes in PHP files
$got = $p->php("<p>Don't panic</p><?php \$a = 'mt-8'; ?><p>It's fine</p><?php \$b = 'mb-8';");
has($got, ['mt-8', 'mb-8'], 'php: apostrophes in inline HTML are ignored');

// 6. classList.add
$got = $p->js("el.classList.add('opacity-0', \"translate-y-4\"); el.classList.toggle('is-open');");
has($got, ['opacity-0', 'translate-y-4', 'is-open'], 'js: classList.add / toggle');

// 7. Template literal with ${} interpolation, including nested quotes
$got = $p->js('const c = `px-3 ${active ? \'bg-blue-600\' : "bg-gray-100"} text-sm ${size}`;');
has($got, ['px-3', 'text-sm', 'bg-blue-600', 'bg-gray-100'], 'js: template literal with ${}');
hasNone($got, ['${active', 'size}', '?', ':'], 'js: interpolation fragments dropped');

// 8. Arbitrary values with quotes inside a double-quoted string
$got = $p->php('<?php $bg = "bg-[url(\'/a.png\')] font-[\'Inter\'] content-[\'x\'] bg-(--brand)";');
has($got, ["bg-[url('/a.png')]", "font-['Inter']", "content-['x']", 'bg-(--brand)'], 'php: arbitrary values with quotes');
$got = $p->js('const bg = "bg-[url(\'/a.png\')] w-[calc(100%-2rem)]";');
has($got, ["bg-[url('/a.png')]", 'w-[calc(100%-2rem)]'], 'js: arbitrary values with quotes');

// 9. Valid Tailwind syntax variety
$got = $p->js("x = '-mt-4 !p-4 p-4! w-1/2 p-1.5 from-10% @container @md:flex *:p-2 [&>img]:w-full group-hover/item:block data-[open]:flex [mask-type:luminance]';");
has($got, ['-mt-4', '!p-4', 'p-4!', 'w-1/2', 'p-1.5', 'from-10%', '@container', '@md:flex', '*:p-2', '[&>img]:w-full', 'group-hover/item:block', 'data-[open]:flex', '[mask-type:luminance]'], 'valid candidate syntax kept');

// 10. Junk filtering
$junk = "x = ['https://example.com/a.png', '/wp-content/themes/x/app.js', './img/logo.svg', '12345', '1.5', '\$var', "
    . "'{name}', 'Foo::bar', 'WP_Query', 'get_the_title', 'jquery.min.js', 'hello world.', 'a', '#fff', 'x=1', 'foo()', "
    . "'esc_html(x)', 'bg-[red', 'text-', 'hover:', '%s', 'items[]', \"[data-x*='a']\", '" . str_repeat('a-', 120) . "b'];";
$got = $p->js($junk);
hasNone($got, ['https://example.com/a.png', '/wp-content/themes/x/app.js', './img/logo.svg', '12345', '1.5', '$var', '{name}', 'name',
    'Foo::bar', 'WP_Query', 'get_the_title', 'jquery.min.js', 'world.', 'a', '#fff', 'x=1', 'foo()', 'esc_html(x)', 'bg-[red', 'text-',
    'hover:', '%s', 'items[]', "[data-x*='a']", str_repeat('a-', 120) . 'b'], 'junk dropped');
has($got, ['hello'], 'plain words still pass (harmless, like Tailwind)');

// 11. Comments: apostrophes in JS comments don't open a string; URLs in strings survive comment stripping
$got = $p->js("// don't break\nconst a = 'ring-2'; /* it's ok */ const u = 'https://x.dev'; const b = 'ring-offset-2';");
has($got, ['ring-2', 'ring-offset-2'], 'js: comments skipped');

// 12. Linear time on ~3MB of code
$chunk = str_repeat("const a = 'p-4 flex items-center'; el.classList.add(\"hidden\"); // it's\n", 400);
$big = str_repeat($chunk, 100) . "const z = 'tail-marker';";
$start = microtime(true);
$got = $p->js($big);
$elapsed = microtime(true) - $start;
check($elapsed < 5.0 && in_array('tail-marker', $got, true), 'js: ~' . round(strlen($big) / 1048576, 1) . 'MB in ' . round($elapsed, 3) . 's', array_slice($got, 0, 5));

echo "\n{$assertions} assertions, " . ($assertions - $failures) . " passed, {$failures} failed.\n";

exit($failures > 0 ? 1 : 0);

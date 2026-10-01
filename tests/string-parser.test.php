<?php
/**
 * Plain PHP test for App/Caching/StringParser.php.
 *
 * No PHPUnit/composer test runner exists in this repo yet, so this is a
 * standalone assertion script. Run it directly:
 *
 *   php tests/string-parser.test.php
 */

require_once __DIR__ . '/../App/Caching/StringParser.php';

use Winden\App\Caching\StringParser;

class StringParserTestHarness
{
    use StringParser;

    public function parse(string $string): array
    {
        return $this->parseString($string);
    }
}

$failures = 0;
$assertions = 0;

function assertContains(array $haystack, string $needle, string $message): void
{
    global $failures, $assertions;
    $assertions++;
    if (!in_array($needle, $haystack, true)) {
        $failures++;
        echo "FAIL: {$message}\n";
        echo '  expected to find "' . $needle . '" in [' . implode(', ', $haystack) . "]\n";
    } else {
        echo "PASS: {$message}\n";
    }
}

function assertNotContains(array $haystack, string $needle, string $message): void
{
    global $failures, $assertions;
    $assertions++;
    if (in_array($needle, $haystack, true)) {
        $failures++;
        echo "FAIL: {$message}\n";
        echo '  did not expect to find "' . $needle . '" in [' . implode(', ', $haystack) . "]\n";
    } else {
        echo "PASS: {$message}\n";
    }
}

$parser = new StringParserTestHarness();

// 1. Regression: double-quoted class attribute containing single-quoted arbitrary values.
// Previously stopped at the first inner quote, e.g. yielded "bg-[url(" instead of the full class.
$html = "<div class=\"bg-[url('/a.png')] font-['Inter'] content-['x'] p-4\">";
$classes = $parser->parse($html);
assertContains($classes, "bg-[url('/a.png')]", 'double-quoted attr: bg-[url(...)] survives inner single quotes');
assertContains($classes, "font-['Inter']", "double-quoted attr: font-['Inter'] survives inner single quotes");
assertContains($classes, "content-['x']", "double-quoted attr: content-['x'] survives inner single quotes");
assertContains($classes, 'p-4', 'double-quoted attr: trailing plain class p-4 still parsed');

// 2. Single-quoted class attribute containing double-quoted arbitrary values.
$html2 = "<div class='font-[\"Inter\"] p-4'>";
$classes2 = $parser->parse($html2);
assertContains($classes2, 'font-["Inter"]', 'single-quoted attr: font-["Inter"] survives inner double quotes');
assertContains($classes2, 'p-4', 'single-quoted attr: trailing plain class p-4 still parsed');

// 3. Existing behaviour kept: plain arbitrary values, modifiers, important markers.
$html3 = '<div class="text-[37px] md:hover:bg-red-500 !p-4 p-4! [&>img]:w-full">';
$classes3 = $parser->parse($html3);
assertContains($classes3, 'text-[37px]', 'kept: text-[37px]');
assertContains($classes3, 'md:hover:bg-red-500', 'kept: md:hover:bg-red-500');
assertContains($classes3, '!p-4', 'kept: !p-4');
assertContains($classes3, 'p-4!', 'kept: p-4!');
assertContains($classes3, '[&>img]:w-full', 'kept: [&>img]:w-full');

// 4. JSON className prop, double-quoted, with an escaped quote inside.
$json = '{"className":"bg-[url(\'/a.png\')] text-[37px]"}';
$classesJson = $parser->parse($json);
assertContains($classesJson, "bg-[url('/a.png')]", "JSON className: bg-[url('/a.png')] survives inner single quotes");
assertContains($classesJson, 'text-[37px]', 'JSON className: text-[37px] kept');

// 5. JSON className with an escaped double quote inside the value. The parser does not
// unescape JSON backslash sequences (only \uXXXX is decoded), so the literal backslash
// stays in the token — the important regression check is that the match isn't truncated
// at the escaped quote and the rest of the value (including the trailing class) survives.
$jsonEscaped = '{"className":"content-[\"x\"] p-4"}';
$classesJsonEscaped = $parser->parse($jsonEscaped);
assertContains($classesJsonEscaped, 'content-[\"x\"]', 'JSON className: escaped \\" inside value does not truncate match');
assertContains($classesJsonEscaped, 'p-4', 'JSON className: trailing class after escaped quote still parsed');

// 6. PHP array class keys, single-quoted value containing double quotes.
$phpArray = "['class' => 'font-[\"Inter\"] p-4']";
$classesPhpArray = $parser->parse($phpArray);
assertContains($classesPhpArray, 'font-["Inter"]', "PHP array 'class' => value survives inner double quotes");
assertContains($classesPhpArray, 'p-4', "PHP array 'class' => value: trailing class p-4 still parsed");

// 7. PHP array with a *_class_* style key, double-quoted value containing single quotes.
$phpArray2 = '["wrapper_class" => "bg-[url(\'/a.png\')] p-4"]';
$classesPhpArray2 = $parser->parse($phpArray2);
assertContains($classesPhpArray2, "bg-[url('/a.png')]", 'PHP array wrapper_class => value survives inner single quotes');
assertContains($classesPhpArray2, 'p-4', 'PHP array wrapper_class => value: trailing class p-4 still parsed');

// 8. PHP tags are stripped from the class-attribute pass, but the raw string is still scanned.
$phpTag = '<div class="<?php echo esc_attr(\'p-4\'); ?> static-class">';
$classesPhpTag = $parser->parse($phpTag);
assertContains($classesPhpTag, 'static-class', 'PHP tag stripping: trailing static class still parsed');
assertNotContains($classesPhpTag, '<?', 'PHP tag stripping: raw PHP open tag token not emitted as a class');

// 9. Should not runaway-match across an unrelated later class= on the same line
// when the first attribute is unterminated in this fragment (defensive check —
// this input isn't valid HTML, we just make sure it doesn't loop forever).
$weird = 'class="a b c" class="d e f"';
$classesWeird = $parser->parse($weird);
assertContains($classesWeird, 'a', 'independent class= attrs: first attribute parsed');
assertContains($classesWeird, 'd', 'independent class= attrs: second attribute parsed');

// 10. Timing / catastrophic-backtracking guard on a large (~2MB) string.
$chunk = str_repeat('lorem ipsum dolor sit amet class="foo bar" ', 2000); // ~88KB per unit
$big = str_repeat($chunk, 25); // ~2.2MB
$big .= '<div class="tail-marker-class">';

$start = microtime(true);
$bigClasses = $parser->parse($big);
$elapsed = microtime(true) - $start;

$assertions++;
if ($elapsed > 5.0) {
    $failures++;
    echo "FAIL: 2MB string parses within a reasonable time (took {$elapsed}s, expected <= 5s)\n";
} else {
    echo 'PASS: 2MB string parses within a reasonable time (took ' . round($elapsed, 3) . "s)\n";
}
assertContains($bigClasses, 'tail-marker-class', '2MB string: trailing class still found after the bulk of the string');
assertContains($bigClasses, 'foo', '2MB string: repeated classes still found');

echo "\n{$assertions} assertions, " . ($assertions - $failures) . " passed, {$failures} failed.\n";

exit($failures > 0 ? 1 : 0);

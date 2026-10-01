<?php

namespace Winden\App\Caching;

trait StringParser
{
    protected function parseString(string $string): array
    {
        $classes = [];

        // Strip PHP tags to handle class attributes with embedded PHP
        $stringWithoutPhp = preg_replace('/<\?php.*?\?>/s', ' ', $string);

        // HTML attributes: class="..." or class='...', read up to the matching quote so font-['Inter'] survives
        $classes = array_merge($classes, $this->parseClasses($stringWithoutPhp, '/class=(["\'])((?:\\\\.|(?!\1).)*+)\1/s'));

        // Also parse original string
        $classes = array_merge($classes, $this->parseClasses($string, '/class=(["\'])((?:\\\\.|(?!\1).)*+)\1/s'));

        // JSON className props
        $classes = array_merge($classes, $this->parseClasses($string, '/["\']className["\']\s*:\s*(["\'])((?:\\\\.|(?!\1).)*+)\1/s'));

        // PHP arrays with class keys
        $classes = array_merge($classes, $this->parseClasses($string, '/["\'](?:[\w]+_)?class(?:es)?(?:_[\w]+)?["\']\s*=>\s*(["\'])((?:\\\\.|(?!\1).)*+)\1/s'));

        return array_unique($classes);
    }

    /**
     * Class candidates from every quoted string literal in a code file, like
     * Tailwind's own scanner: catches `$c = 'p-4 flex'`, arrays, sprintf args,
     * classList.add('…') and template literals. Linear in the file size.
     *
     * @param string $code      File contents
     * @param bool   $tokenize  PHP files: use the PHP tokenizer (inline HTML is skipped, prose apostrophes can't mis-pair quotes)
     */
    protected function parseQuotedStrings(string $code, bool $tokenize = false): array
    {
        $literals = [];

        if ($tokenize && function_exists('token_get_all')) {
            foreach (@token_get_all($code) as $token) {
                if (!is_array($token)) {
                    continue;
                }
                if ($token[0] === T_CONSTANT_ENCAPSED_STRING) {
                    $literals[] = substr($token[1], 1, -1);
                } elseif ($token[0] === T_ENCAPSED_AND_WHITESPACE) {
                    // Fragments of "…{$var}…" strings and heredocs
                    $literals[] = $token[1];
                }
            }
        } else {
            // Comments are matched first and dropped, so a `'` inside one can't open a string
            preg_match_all(
                '~/\*.*?\*/|(?<![:\\\\])//[^\n]*|\'((?:\\\\.|[^\'\\\\])*+)\'|"((?:\\\\.|[^"\\\\])*+)"|`((?:\\\\.|[^`\\\\])*+)`~s',
                $code,
                $matches,
                PREG_SET_ORDER
            );
            foreach ($matches as $match) {
                $literal = ($match[1] ?? '') . ($match[2] ?? '') . ($match[3] ?? '');
                if ($literal !== '') {
                    $literals[] = $literal;
                }
            }
        }

        $candidates = [];
        foreach ($literals as $literal) {
            // Unescape quotes, cut ${…} interpolation apart (a lone `{name}` stays and is dropped)
            $literal = str_replace(['\\\'', '\\"', '${', '}'], ['\'', '"', ' ', ' '], $literal);
            // Split on whitespace, and on quotes / = < > outside [...] (HTML inside strings: class="%s p-4">)
            foreach (preg_split('/\s+|[\'"`=<>](?![^\[\s]*\])/', $literal, -1, PREG_SPLIT_NO_EMPTY) as $token) {
                $token = trim($token, ',;');
                if (!isset($candidates[$token]) && $this->isClassCandidate($token)) {
                    $candidates[$token] = true;
                }
            }
        }

        return array_keys($candidates);
    }

    /**
     * Could this token be a Tailwind candidate? Bracket / parenthesis contents
     * are free-form (arbitrary url() values, `bg-(--brand)`); the rest must be
     * lowercase utility syntax. Drops paths, URLs, $vars, numbers, identifiers.
     */
    private function isClassCandidate(string $token): bool
    {
        $length = strlen($token);
        if ($length < 2 || $length > 200 || !preg_match('/[a-z]/', $token) || strpos($token, '[]') !== false) {
            return false;
        }

        // Blank out balanced [...] and -(...) contents; anything left unbalanced is not a candidate
        $outside = preg_replace('/(?<b>\[(?:[^\[\]]++|(?&b))*+\])|(?<=-)(?<p>\((?:[^()]++|(?&p))*+\))/', '[]', $token);
        if ($outside === null || strpbrk(str_replace('[]', '', $outside), '[]()') !== false) {
            return false;
        }

        // A standalone [...] must be an arbitrary property ([mask-type:luminance]), not an attribute selector
        if (preg_match('/(?:^|:)\[\]$/', $outside) && !preg_match('/(?:^|:)\[-{0,2}[a-z][a-z-]*:[^\[\]]+\]$/', $token)) {
            return false;
        }

        // Lowercase utility syntax: !important, @container, *: variants, / modifiers
        if (!preg_match('~^(?:\*{1,2}:)?[!@-]*[a-z0-9\[][a-z0-9\[\]\-:/.%@*!]*$~', $outside)) {
            return false;
        }

        // Trailing separators, ::, //, dots outside decimals, % outside numbers, leading digit other than 2xl: (SVG paths, versions)
        return !preg_match('~::|//|[-:/]$|\.(?!\d)|(?<!\d)\.|%(?![:/]|$)|(?<!\d)%|^\d(?!\d*xl:)~', $outside);
    }

    private function parseClasses(string $string, string $pattern): array
    {
        preg_match_all($pattern, $string, $matches);
        $classes = [];

        // Group 1 is the opening quote, group 2 the value
        if (!empty($matches[2])) {
            foreach ($matches[2] as $classAttribute) {
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

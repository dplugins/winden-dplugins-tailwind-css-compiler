<?php

namespace Winden\App\Assets\Providers\FSE;

if (!defined('ABSPATH')) exit;

/**
 * Shared helper functions for FSE providers
 */
class FSEHelpers
{
    /**
     * Number to word mapping for slugs
     */
    private static $numberMap = [
        '0' => 'zero',
        '1' => 'one',
        '2' => 'two',
        '3' => 'three',
        '4' => 'four',
        '5' => 'five',
        '6' => 'six',
        '7' => 'seven',
        '8' => 'eight',
        '9' => 'nine',
        '10' => 'ten',
        '11' => 'eleven',
        '12' => 'twelve',
        '13' => 'thirteen',
        '14' => 'fourteen',
        '15' => 'fifteen',
        '16' => 'sixteen',
        '17' => 'seventeen',
        '18' => 'eighteen',
        '19' => 'nineteen',
        '20' => 'twenty',
        '30' => 'thirty',
        '40' => 'forty',
        '50' => 'fifty',
        '60' => 'sixty',
        '70' => 'seventy',
        '80' => 'eighty',
        '90' => 'ninety',
        '100' => 'hundred'
    ];

    /**
     * Convert numbers in a string to their English word equivalents
     *
     * @param string $str Input string with numbers
     * @return string String with numbers converted to words
     */
    public static function numberToWordSlug($str)
    {
        $map = self::$numberMap;
        return strtolower(preg_replace_callback('/\d+/', function ($matches) use ($map) {
            $num = $matches[0];
            return $map[$num] ?? $num;
        }, $str));
    }

    /**
     * Calculate fluid clamp value
     *
     * @param float $minSize Minimum size in pixels
     * @param float $maxSize Maximum size in pixels
     * @param int $minScreen Minimum screen size
     * @param int $maxScreen Maximum screen size
     * @return string CSS clamp() function
     */
    public static function calculateClamp($minSize, $maxSize, $minScreen, $maxScreen)
    {
        $slope = ($maxSize - $minSize) / ($maxScreen - $minScreen);
        $intersection = -$minScreen * $slope + $minSize;
        $slopeVi = $slope * 100;

        return sprintf(
            'clamp(%spx, %spx + %svi, %spx)',
            round($minSize, 2),
            round($intersection, 2),
            round($slopeVi, 2),
            round($maxSize, 2)
        );
    }

    /**
     * Ensure a value has a unit
     *
     * @param string|int|float $value Value to check
     * @return string Value with unit
     */
    public static function ensureUnit($value)
    {
        if (empty($value)) {
            return '';
        }

        if (preg_match('/(clamp|calc|px|rem|em|%|vw|vh|vi)/', $value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return $value . 'px';
        }

        return $value;
    }

    /**
     * Get Winden editor options
     *
     * @return array
     */
    public static function getWindenEditor()
    {
        return get_option('winden_dplugins_editor', []);
    }

    /**
     * Get merged theme.json data
     *
     * @return array
     */
    public static function getThemeData()
    {
        return \WP_Theme_JSON_Resolver::get_merged_data()->get_data();
    }
}

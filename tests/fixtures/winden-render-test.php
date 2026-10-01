<?php
/**
 * Plugin Name: Winden render test fixture
 * Description: Test only. Copy to wp-content/mu-plugins/ to test production CSS; delete afterwards.
 *
 * Prints Tailwind classes the way theme and plugin code does:
 * - wp_footer box whose classes live in a PHP variable (found by the Pro file scanner)
 * - [winden_meta_test] shortcode printing the `winden_test_classes` custom field of the current post (found by the crawl)
 */

if (!defined('ABSPATH')) exit;

add_action('wp_footer', function () {
    if (!is_page('winden-production-test')) {
        return;
    }
    $classes = 'mx-auto my-8 max-w-xl rounded-lg bg-[#0f766e] p-6 text-[#fefce8]';
    printf('<div class="%s">Example A: classes in a PHP variable. Teal box = compiled.</div>', esc_attr($classes));
});

add_shortcode('winden_meta_test', function () {
    $classes = get_post_meta(get_the_ID(), 'winden_test_classes', true);
    if (!$classes) {
        return '';
    }
    return '<div class="' . esc_attr($classes) . '">Example B: classes from a custom field. Brown box with thick border = compiled.</div>';
});

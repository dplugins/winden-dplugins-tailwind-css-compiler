<?php
/**
 * Winden Image — server side.
 *
 * A Winden image from the media library or a URL is static: `$content` is the
 * `<img>` the editor saved, and it goes out as it is. WordPress adds `srcset`,
 * `sizes` and lazy loading on the way through `wp_filter_content_tags` from
 * the `wp-image-{id}` class, the same as core/image.
 *
 * "Use featured image" cannot be static — which image it is depends on the
 * post this block renders in — so that case is built here, as one `<img>`
 * with the block's classes and attributes and nothing wrapped around it.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Saved markup.
 * @var WP_Block $block      Block instance, with context.
 */

if (!defined('ABSPATH')) {
    exit;
}

// WordPress reads this file through an output buffer: what is echoed is the
// block, and a bare `return` renders nothing
if (empty($attributes['useFeaturedImage'])) {
    echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- saved block markup, already kses-filtered
    return;
}

$winden_post_id = $block->context['postId'] ?? get_the_ID();
if (!$winden_post_id || !has_post_thumbnail($winden_post_id)) {
    return;
}

$winden_thumbnail_id = get_post_thumbnail_id($winden_post_id);
$winden_size = !empty($attributes['sizeSlug']) ? $attributes['sizeSlug'] : 'full';

$winden_classes = ['wp-block-winden-image'];
if (!empty($attributes['className'])) {
    $winden_classes[] = $attributes['className'];
}

$winden_img_attributes = [
    'class' => implode(' ', $winden_classes),
];
if (!empty($attributes['anchor'])) {
    $winden_img_attributes['id'] = $attributes['anchor'];
}
if (!empty($attributes['htmlAttributes']) && is_array($attributes['htmlAttributes'])) {
    foreach ($attributes['htmlAttributes'] as $winden_name => $winden_value) {
        $winden_name = strtolower(trim((string) $winden_name));
        // The editor refuses these too; a saved post that somehow carries one
        // still does not run it
        if ($winden_name === '' || $winden_name === 'class' || $winden_name === 'id' || str_starts_with($winden_name, 'on')) {
            continue;
        }
        if (!preg_match('/^[a-z_:][a-z0-9_:.-]*$/', $winden_name)) {
            continue;
        }
        $winden_img_attributes[$winden_name] = (string) $winden_value;
    }
}

// wp_get_attachment_image escapes every attribute value and adds alt, srcset,
// sizes, loading and decoding from the attachment itself
echo wp_get_attachment_image($winden_thumbnail_id, $winden_size, false, $winden_img_attributes); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by wp_get_attachment_image

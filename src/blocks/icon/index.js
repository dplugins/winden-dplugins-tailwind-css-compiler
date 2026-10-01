/**
 * Winden Icon — the SVG a component library actually shipped.
 *
 * WordPress 7.0 added `core/icon`, and its `icon` attribute looks like it
 * takes markup. It does not: `render_block_core_icon` passes it to
 * `wp_get_icon`, which looks the string up in `WP_Icons_Registry` and returns
 * `''` when it misses — and the render callback then returns nothing at all.
 * Measured through `do_blocks()`, an `<svg>` from a Tailwind component mapped
 * onto that block rendered to zero bytes. Not a broken icon: no icon.
 *
 * The registry holds 88 WordPress icons in one collection. Heroicons — what
 * every Tailwind component uses — are not among them and cannot be, since
 * registering is a PHP-time call with a global namespace, and these arrive by
 * the pasteful.
 *
 * So the markup is kept as markup, which also keeps the two things `core/icon`
 * would take away: it wraps its output in `<div class="wp-block-icon">`, and
 * it sets `width`/`height` on the SVG. Tailwind puts `size-6 text-indigo-600`
 * on the `<svg>` itself, inside a flex row — the same argument that gave
 * `winden/image` its bare `<img>`.
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import { svgIcon } from '../shared/icons';
import Edit from './edit';
import save from './save';

registerBlockType(metadata.name, {
    ...metadata,
    // Winden's own; block.json can only name a dashicon
    icon: svgIcon,
    edit: Edit,
    save,
});

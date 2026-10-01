/**
 * Winden Text — one inline element, without the paragraph.
 *
 * `<time datetime="2022-10-10" class="block text-xs">10th Oct 2022</time>` in a
 * card had nowhere to go: `<time>` is an inline tag, so the converter only ever
 * saw it as content *inside* another block, and at block position it fell to
 * `core/html`. Wrapping it in a paragraph was the cheap fix and is wrong — the
 * `<p>` becomes the flex or grid item, so an `order-2` or `col-span-2` on the
 * element stops applying to the box that is actually laid out.
 *
 * Same argument that gave `winden/image` its bare `<img>`: the wrapper core
 * would add is the thing Tailwind markup cannot afford.
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';

registerBlockType(metadata.name, {
    ...metadata,
    edit: Edit,
    save,
});

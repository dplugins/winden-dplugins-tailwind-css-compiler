/**
 * Winden Image — an `<img>` without the figure.
 *
 * core/image wraps every image in `<figure class="wp-block-image">` and puts
 * the block's classes there, so `absolute inset-0 object-cover` styles a
 * wrapper and the image stays where it was. Tailwind markup puts classes on
 * the image, and so does this block. It also stands in for the featured
 * image, rendered server-side per post.
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';
import { imageIcon } from '../shared/icons';
import './index.scss';

registerBlockType(metadata.name, {
    ...metadata,
    // The block editor's own image icon; block.json can only name a dashicon
    icon: imageIcon,
    edit: Edit,
    save,
});

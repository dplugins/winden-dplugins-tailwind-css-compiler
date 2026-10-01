/**
 * The saved markup: one `<img>`, and nothing around it.
 *
 * `wp-image-{id}` is what WordPress reads at render time to add `srcset`,
 * `sizes` and lazy loading — the same class core/image writes — so a Winden
 * image from the media library is as responsive as any other.
 *
 * With "Use featured image" on there is nothing to save: which image it is
 * depends on the post it renders in, and `render.php` answers that.
 */

import { useBlockProps } from '@wordpress/block-editor';
import { htmlAttributesToProps, sanitizeHtmlAttributes } from '../shared/html-attributes';

export const imageClassName = (id) => (id ? `wp-image-${id}` : undefined);

export default function save({ attributes }) {
    const { id, url, alt, width, height, useFeaturedImage, htmlAttributes } = attributes;
    if (useFeaturedImage || !url) return null;

    const blockProps = useBlockProps.save({ className: imageClassName(id) });
    const extra = htmlAttributesToProps(sanitizeHtmlAttributes(htmlAttributes), blockProps);

    return (
        <img
            {...blockProps}
            {...extra}
            src={url}
            alt={alt ?? ''}
            {...(width ? { width } : {})}
            {...(height ? { height } : {})}
        />
    );
}

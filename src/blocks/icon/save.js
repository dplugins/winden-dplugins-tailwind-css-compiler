/**
 * The saved markup: the `<svg>`, and nothing around it.
 *
 * `content` is the SVG's children, read back out of the markup by the block's
 * `html` source rather than carried in the delimiter — so the icon is in the
 * post as ordinary markup, and renders without a callback.
 */

import { useBlockProps } from '@wordpress/block-editor';
import { htmlAttributesToProps, sanitizeHtmlAttributes } from '../shared/html-attributes';
import { withSvgAttributeCase } from '../shared/svg-attributes';

export default function save({ attributes }) {
    const { content, htmlAttributes } = attributes;
    const blockProps = useBlockProps.save();
    const extra = withSvgAttributeCase(htmlAttributesToProps(sanitizeHtmlAttributes(htmlAttributes), blockProps));

    return <svg {...blockProps} {...extra} dangerouslySetInnerHTML={{ __html: content || '' }} />;
}

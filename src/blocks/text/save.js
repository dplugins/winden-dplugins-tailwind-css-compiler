/**
 * The saved markup: one inline element, and nothing around it.
 *
 * `tagName` is a plain string the way core/group's is, so the element is
 * whatever the markup asked for and the classes sit on it rather than on a
 * wrapper — which is the whole reason this block exists.
 */

import { useBlockProps, RichText } from '@wordpress/block-editor';
import { htmlAttributesToProps, sanitizeHtmlAttributes } from '../shared/html-attributes';

export default function save({ attributes }) {
    const { tagName, content, htmlAttributes } = attributes;
    const blockProps = useBlockProps.save();
    const extra = htmlAttributesToProps(sanitizeHtmlAttributes(htmlAttributes), blockProps);

    return <RichText.Content {...blockProps} {...extra} tagName={tagName || 'span'} value={content} />;
}

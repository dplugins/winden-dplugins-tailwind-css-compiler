/**
 * Editing a Winden text.
 *
 * The canvas shows the same element the block saves, so a `<time>` wearing
 * `block text-xs` looks in the editor as it will on the page.
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl, BaseControl } from '@wordpress/components';
import { Fragment, useState } from '@wordpress/element';
import { HtmlAttributesControl } from '../shared/HtmlAttributesControl';
import { htmlAttributesToProps, sanitizeHtmlAttributes } from '../shared/html-attributes';

/**
 * The inline elements this block offers.
 *
 * Phrasing content that carries meaning of its own — the tags a component
 * library reaches for. `<a>` is deliberately absent: a link is a link, and the
 * converter already keeps one inside its sentence or gives it a Winden Group
 * when it wraps blocks. `<br>` is absent because it holds no text.
 */
const TEXT_TAGS = [
    'span', 'time', 'code', 'abbr', 'mark', 'small',
    'strong', 'em', 'b', 'i', 's', 'sub', 'sup',
    'q', 'cite', 'dfn', 'kbd', 'samp', 'var', 'bdi', 'bdo',
];
const CUSTOM_TAG = '__custom__';
const isValidTag = (tag) => /^[a-z][a-z0-9-]*$/.test(tag);

/** Element select with a custom entry, the same shape the Winden Group panel uses */
function ElementControl({ tagName, onChange }) {
    const listed = TEXT_TAGS.includes(tagName);
    const [custom, setCustom] = useState(!listed);
    const showField = custom || !listed;

    return (
        <Fragment>
            <SelectControl
                __next40pxDefaultSize
                __nextHasNoMarginBottom
                label={__('HTML element', 'winden-dplugins-tailwind-css-compiler')}
                value={showField ? CUSTOM_TAG : tagName}
                options={[
                    ...TEXT_TAGS.map((tag) => ({ value: tag, label: `<${tag}>` })),
                    { value: CUSTOM_TAG, label: __('Custom…', 'winden-dplugins-tailwind-css-compiler') },
                ]}
                onChange={(next) => {
                    if (next === CUSTOM_TAG) { setCustom(true); return; }
                    setCustom(false);
                    onChange(next);
                }}
            />
            {showField && (
                <TextControl
                    __next40pxDefaultSize
                    __nextHasNoMarginBottom
                    label={__('Custom element', 'winden-dplugins-tailwind-css-compiler')}
                    help={__('Any inline tag name — the block renders it as written.', 'winden-dplugins-tailwind-css-compiler')}
                    placeholder="time"
                    value={tagName}
                    onChange={(next) => {
                        const tag = String(next ?? '').trim().toLowerCase();
                        if (isValidTag(tag)) onChange(tag);
                    }}
                />
            )}
        </Fragment>
    );
}

export default function Edit({ attributes, setAttributes }) {
    const { tagName, content, htmlAttributes } = attributes;
    const blockProps = useBlockProps();
    const extra = htmlAttributesToProps(sanitizeHtmlAttributes(htmlAttributes), blockProps, { inEditor: true });

    return (
        <Fragment>
            <InspectorControls>
                <PanelBody title={__('Winden Text', 'winden-dplugins-tailwind-css-compiler')} initialOpen>
                    <ElementControl tagName={tagName || 'span'} onChange={(tag) => setAttributes({ tagName: tag })} />
                    <BaseControl
                        __nextHasNoMarginBottom
                        label={__('HTML attributes', 'winden-dplugins-tailwind-css-compiler')}
                        help={__('Written onto this element as-is: datetime, aria-*, data-*, style, and any other attribute the markup needs.', 'winden-dplugins-tailwind-css-compiler')}
                    >
                        <HtmlAttributesControl
                            value={htmlAttributes}
                            onChange={(next) => setAttributes({ htmlAttributes: next })}
                        />
                    </BaseControl>
                </PanelBody>
            </InspectorControls>
            <RichText
                {...blockProps}
                {...extra}
                tagName={tagName || 'span'}
                value={content}
                onChange={(next) => setAttributes({ content: next })}
                placeholder={__('Text…', 'winden-dplugins-tailwind-css-compiler')}
            />
        </Fragment>
    );
}

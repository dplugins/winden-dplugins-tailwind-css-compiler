/**
 * Editing a Winden icon.
 *
 * The canvas draws the same `<svg>` the block saves, so an icon wearing
 * `size-6 text-indigo-600` looks here as it will on the page.
 *
 * An SVG with nothing in it is 0×0 — invisible, and so unselectable — so an
 * empty block shows a placeholder to paste into instead.
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextareaControl, BaseControl, Placeholder } from '@wordpress/components';
import { Fragment } from '@wordpress/element';
import { svgIcon } from '../shared/icons';
import { HtmlAttributesControl } from '../shared/HtmlAttributesControl';
import { htmlAttributesToProps, sanitizeHtmlAttributes, readHtmlAttributes } from '../shared/html-attributes';
import { withSvgAttributeCase } from '../shared/svg-attributes';

/** The block's two halves written back out as one `<svg …>…</svg>`, which is how anyone thinks of an icon */
function toMarkup({ content, htmlAttributes, className }) {
    const attributes = { ...(className ? { class: className } : {}), ...(sanitizeHtmlAttributes(htmlAttributes) ?? {}) };
    const written = Object.entries(attributes)
        .map(([name, value]) => ` ${name}="${String(value).replace(/"/g, '&quot;')}"`)
        .join('');
    return `<svg${written}>${content || ''}</svg>`;
}

/**
 * A pasted `<svg>` split into the parts the block keeps.
 *
 * Parsed as XML rather than HTML: an HTML parser lower-cases nothing inside
 * SVG but does move a stray `<path>` around, and XML keeps `viewBox` spelled
 * as it was written. A parse failure leaves the block alone.
 */
function fromMarkup(markup) {
    const parsed = new DOMParser().parseFromString(String(markup ?? '').trim(), 'image/svg+xml');
    const svg = parsed.querySelector('svg');
    if (!svg || parsed.querySelector('parsererror')) return null;

    return {
        content: svg.innerHTML,
        className: svg.getAttribute('class') || undefined,
        htmlAttributes: readHtmlAttributes(svg, ['class', 'id']),
    };
}

export default function Edit({ attributes, setAttributes }) {
    const { content, htmlAttributes, className } = attributes;
    const blockProps = useBlockProps();
    const extra = withSvgAttributeCase(
        htmlAttributesToProps(sanitizeHtmlAttributes(htmlAttributes), blockProps, { inEditor: true })
    );

    const inspector = (
        <InspectorControls>
            <PanelBody title={__('Winden Icon', 'winden-dplugins-tailwind-css-compiler')} initialOpen>
                <TextareaControl
                    __nextHasNoMarginBottom
                    label={__('SVG', 'winden-dplugins-tailwind-css-compiler')}
                    help={__('Paste an <svg> — its attributes and classes are read onto the block.', 'winden-dplugins-tailwind-css-compiler')}
                    rows={8}
                    value={toMarkup({ content, htmlAttributes, className })}
                    onChange={(next) => {
                        const parts = fromMarkup(next);
                        if (parts) setAttributes(parts);
                    }}
                />
                <BaseControl
                    __nextHasNoMarginBottom
                    label={__('HTML attributes', 'winden-dplugins-tailwind-css-compiler')}
                    help={__('Written onto the <svg> as-is: viewBox, fill, stroke, aria-*, data-*.', 'winden-dplugins-tailwind-css-compiler')}
                >
                    <HtmlAttributesControl
                        value={htmlAttributes}
                        onChange={(next) => setAttributes({ htmlAttributes: next })}
                    />
                </BaseControl>
            </PanelBody>
        </InspectorControls>
    );

    if (!content) {
        return (
            <Fragment>
                {inspector}
                <div {...blockProps}>
                    <Placeholder
                        icon={svgIcon}
                        label={__('Winden Icon', 'winden-dplugins-tailwind-css-compiler')}
                        instructions={__('Paste SVG markup in the block settings.', 'winden-dplugins-tailwind-css-compiler')}
                    />
                </div>
            </Fragment>
        );
    }

    return (
        <Fragment>
            {inspector}
            <svg {...blockProps} {...extra} dangerouslySetInnerHTML={{ __html: content }} />
        </Fragment>
    );
}

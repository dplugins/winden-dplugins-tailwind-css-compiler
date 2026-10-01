/**
 * Winden — HTML attributes on core blocks, and the "Winden Group" variation
 *
 * A Tailwind component is markup, and some of it is attributes a core block
 * cannot keep: `aria-hidden` on a decorative shape, `style="clip-path: …"`
 * on a gradient blob, `data-*` for a script, a `<dl>` where the group only
 * knows eight tags. This adds one `htmlAttributes` object to those blocks,
 * writes it onto the root element on save and in the editor, and offers a
 * "Winden Group" variation beside Row, Stack and Grid: a plain container
 * with any tag and any attribute, and no layout of its own.
 *
 * Loaded on every block editor screen, whether or not the Winden Classes
 * panel is on: a group saved with `htmlAttributes` has to be read back by the
 * same save function or the editor flags it as invalid.
 */

import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import { TextControl, BaseControl, SelectControl, PanelBody } from '@wordpress/components';
import { Fragment, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { tailwindIcon, shapeIcon } from '../shared/icons';
import { HtmlAttributesControl } from '../shared/HtmlAttributesControl';
import { HTML_ATTRIBUTE_BLOCKS, HTML_ATTRIBUTES_KEY, htmlAttributesToProps, sanitizeHtmlAttributes } from '../shared/html-attributes';
import './index.scss';

const EXTENDED = new Set(HTML_ATTRIBUTE_BLOCKS);
const GROUP = 'core/group';

/** The tags core's own "HTML element" select offers; anything else is ours to show */
const CORE_GROUP_TAGS = new Set(['div', 'header', 'main', 'section', 'article', 'aside', 'footer', 'nav']);

/**
 * What a Winden Group can be. Core's select stops at eight sectioning tags; a
 * Tailwind component is also made of lists, definition lists, figures,
 * spans and the odd details/summary. Anything else goes in as custom.
 */
const WINDEN_GROUP_TAGS = [
    'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav',
    // A group that is a link. Turning a wrapper into one is this select plus an
    // `href` row below it — reversible, and the block keeps its clientId, which
    // a block-to-block transform does not.
    'a',
    'ul', 'ol', 'li',
    'dl', 'dt', 'dd',
    'figure', 'figcaption',
    'span', 'p', 'address', 'blockquote',
    // An icon button is a Tailwind component, not behaviour: the commonest
    // shape in the premium set is `<button><span>…</span><svg/></button>`
    'button',
    'details', 'summary',
    'form', 'fieldset', 'legend', 'label',
];
const CUSTOM_TAG = '__custom__';
const isValidTag = (tag) => /^[a-z][a-z0-9-]*$/.test(tag);

/** Element select with a custom entry: the list for the common case, a field for the rest */
function ElementControl({ tagName, onChange }) {
    const listed = WINDEN_GROUP_TAGS.includes(tagName);
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
                    ...WINDEN_GROUP_TAGS.map((tag) => ({ value: tag, label: `<${tag}>` })),
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
                    help={__('Any tag name — the group renders it as written.', 'winden-dplugins-tailwind-css-compiler')}
                    placeholder="dl"
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

/**
 * A group is a "Winden Group" when it says so.
 *
 * It was first marked by having an `htmlAttributes` object, even an empty one
 * — and an empty object does not survive the trip through PHP: `serialize_blocks`
 * writes `{}` back as `[]`, which fails the attribute's `object` type on the
 * next load and comes back as no attribute at all. A boolean has no such
 * ambiguity.
 */
const WINDEN_GROUP_KEY = 'windenGroup';
const isWindenGroup = (attributes) => attributes?.[WINDEN_GROUP_KEY] === true;

/**
 * A group that is only there to be styled: a gradient blob, an overlay, a
 * divider, a spacer. Every Tailwind hero has them — the blurred shapes behind
 * the text are empty `<div>`s whose whole appearance is a `clip-path`.
 *
 * The difference that matters is what an *empty* group draws. Core shows its
 * variation picker inside one — a grey "Group blocks together…" card — so a
 * decoration measured 845px tall with a placeholder in it rather than the
 * gradient the classes ask for. Marked as a shape, that card is hidden and the
 * element draws itself.
 *
 * A variation rather than a block of its own: it *is* a group, with the same
 * element select, the same attributes and the same round trip. The only thing
 * it says is that nothing goes inside.
 */
const WINDEN_SHAPE_KEY = 'windenShape';
const isWindenShape = (attributes) => attributes?.[WINDEN_SHAPE_KEY] === true;

/**
 * The attribute, and — on the group — the variation.
 *
 * Core's four group variations decide which is active by `layout.type`, and a
 * "Group" with no layout is the default. Ours is appended after Grid, which
 * is where it should sit, but a function `isActive` returns the first match
 * in order — so core's are told to step aside when the block is a Winden
 * group.
 */
addFilter('blocks.registerBlockType', 'winden/html-attributes/attribute', (settings, name) => {
    if (!EXTENDED.has(name)) return settings;

    const next = {
        ...settings,
        attributes: {
            ...settings.attributes,
            [HTML_ATTRIBUTES_KEY]: { type: 'object' },
            ...(name === GROUP ? {
                [WINDEN_GROUP_KEY]: { type: 'boolean' },
                [WINDEN_SHAPE_KEY]: { type: 'boolean' },
            } : {}),
        },
    };

    if (name !== GROUP) return next;

    const coreVariations = (settings.variations ?? []).map((variation) => {
        if (typeof variation.isActive !== 'function') return variation;
        return {
            ...variation,
            isActive: (attributes, variationAttributes) => (
                !isWindenGroup(attributes) && !isWindenShape(attributes)
                && variation.isActive(attributes, variationAttributes)
            ),
        };
    });

    next.variations = [
        ...coreVariations,
        {
            name: 'winden',
            title: __('Winden Group', 'winden-dplugins-tailwind-css-compiler'),
            description: __('A plain container for Tailwind markup: any HTML element, any attribute, no layout of its own — just a div plus what the design needs.', 'winden-dplugins-tailwind-css-compiler'),
            icon: tailwindIcon,
            attributes: { [WINDEN_GROUP_KEY]: true, layout: undefined },
            scope: ['block', 'inserter', 'transform'],
            isActive: (attributes) => isWindenGroup(attributes),
        },
        {
            name: 'winden-shape',
            title: __('Winden Shape', 'winden-dplugins-tailwind-css-compiler'),
            description: __('A container with nothing in it: a gradient blob, an overlay, a divider, a spacer. Everything it is lives in its classes and attributes.', 'winden-dplugins-tailwind-css-compiler'),
            icon: shapeIcon,
            attributes: { [WINDEN_SHAPE_KEY]: true, layout: undefined },
            scope: ['block', 'inserter', 'transform'],
            isActive: (attributes) => isWindenShape(attributes),
        },
    ];

    return next;
});

/** On save: the attributes go onto the element that carries the classes */
addFilter('blocks.getSaveContent.extraProps', 'winden/html-attributes/save', (props, blockType, attributes) => {
    if (!EXTENDED.has(blockType?.name)) return props;
    const extra = htmlAttributesToProps(sanitizeHtmlAttributes(attributes?.[HTML_ATTRIBUTES_KEY]), props);
    return Object.keys(extra).length > 0 ? { ...props, ...extra } : props;
});

/**
 * A group that is a link is a real `<a href>` on the canvas, and the canvas does
 * not stop it following itself.
 *
 * Core's iframe does intercept link clicks, but only its own narrow case
 * (`interceptLinkClicks` in `@wordpress/block-editor`): `event.target` must be
 * the anchor itself *and* the href must start with `#`. Click the heading
 * inside `<a href="/post"><h3>…</h3></a>` and the target is the `H3` — nothing
 * intercepts, the browser follows the ancestor anchor, and the editor navigates
 * away mid-edit. Measured against core's source, not assumed.
 *
 * Capture, so it lands before anything inside the block reacts. The href stays
 * on the element rather than being withheld from the canvas: `hover:` classes
 * and a theme's own `a:hover` are exactly what the canvas is for. If this ever
 * fails to fire, the fallback is `EDITOR_OWNED` in `shared/html-attributes.ts`
 * — withholding `href` there kills navigation outright, at that cost.
 */
function preventLinkNavigation(event) {
    if (event.target?.closest?.('a')) event.preventDefault();
}

const isLinkGroup = (props) => props.name === GROUP && props.attributes?.tagName === 'a';

/**
 * "No layout of its own" has to be said to core, or it applies the flow one.
 *
 * A group without a `layout` attribute is not layout-free: core reads the
 * block's default (`flow`), writes `is-layout-flow` on the wrapper, and the
 * theme's block-gap rule — `:root :where(.is-layout-flow) > * { margin-block:
 * 1.2rem 0 }`, unlayered — lands on every child. Measured on a Tailwind
 * testimonial and a pricing list: a blockquote sat 19px below its figure's
 * padding, and the text beside a check icon in a `flex` list item dropped a
 * line, with no class on either to force. Only a class can be forced; a
 * margin nothing asked for has no handle.
 *
 * On the page `Blocks::without_layout` hands the layout flag a type it has no
 * definition for. That does not work here: `BlockEdit` copies
 * `attributes.layout` into the block-edit context before any filter runs,
 * and the inner block list asks that type for its orientation — measured,
 * `Cannot read properties of undefined (reading 'getOrientation')` and a
 * warning box where the group should be. So the classes are taken off
 * instead. Core's layout HOC computes them and hands them down as
 * `__unstableLayoutClassNames`; a filter at priority 9 sits *inside* that
 * HOC (priority 10) and sees them before the block does. The CSS core
 * generated for the container class stays in the document, aimed at a class
 * no element wears. Nothing is stored: a Winden Group saved before this reads
 * the same.
 */
const CORE_LAYOUT_CLASS = /^(is-layout-|wp-block-group-is-layout-|wp-container-core-group-is-layout-)/;
const hasNoLayout = (props) => (
    props.name === GROUP
    && (isWindenGroup(props.attributes) || isWindenShape(props.attributes))
    && !props.attributes?.layout
);

addFilter('editor.BlockListBlock', 'winden/html-attributes/no-layout', createHigherOrderComponent((BlockListBlock) => (props) => {
    if (!hasNoLayout(props)) return <BlockListBlock {...props} />;
    const kept = String(props.__unstableLayoutClassNames ?? '')
        .split(/\s+/)
        .filter((name) => name && !CORE_LAYOUT_CLASS.test(name))
        .join(' ');
    return <BlockListBlock {...props} __unstableLayoutClassNames={kept} />;
}, 'withoutCoreLayout'), 9);

/** In the editor: the same attributes on the block wrapper, so what is edited looks like what is saved */
addFilter('editor.BlockListBlock', 'winden/html-attributes/editor', createHigherOrderComponent((BlockListBlock) => (props) => {
    if (!EXTENDED.has(props.name)) return <BlockListBlock {...props} />;

    const extra = htmlAttributesToProps(
        sanitizeHtmlAttributes(props.attributes?.[HTML_ATTRIBUTES_KEY]),
        props.wrapperProps ?? {},
        { inEditor: true }
    );
    const link = isLinkGroup(props);
    // A shape marks its wrapper so the stylesheet can hide the variation
    // picker core draws inside an empty group — see `editor.scss`
    const shape = props.name === GROUP && isWindenShape(props.attributes);
    if (!link && !shape && Object.keys(extra).length === 0) return <BlockListBlock {...props} />;

    return (
        <BlockListBlock
            {...props}
            className={[props.className, shape ? 'is-winden-shape' : ''].filter(Boolean).join(' ')}
            wrapperProps={{
                ...(props.wrapperProps ?? {}),
                ...extra,
                ...(link ? { onClickCapture: preventLinkNavigation } : {}),
            }}
        />
    );
}, 'withWindenHtmlAttributes'));

/** The control, in the Advanced panel next to "Additional CSS class(es)" */
addFilter('editor.BlockEdit', 'winden/html-attributes/controls', createHigherOrderComponent((BlockEdit) => (props) => {
    if (!EXTENDED.has(props.name)) return <BlockEdit {...props} />;

    const { attributes, setAttributes, name } = props;
    const value = attributes[HTML_ATTRIBUTES_KEY];
    const winden = name === GROUP && isWindenGroup(attributes);
    const shape = name === GROUP && isWindenShape(attributes);
    const tagName = attributes.tagName ?? 'div';
    const onChange = (next) => setAttributes({ [HTML_ATTRIBUTES_KEY]: next });
    const setTag = (tag) => setAttributes({ tagName: tag });

    const attributesControl = (
        <BaseControl
            __nextHasNoMarginBottom
            label={__('HTML attributes', 'winden-dplugins-tailwind-css-compiler')}
            help={__('Written onto this block\'s element as-is: aria-*, data-*, style, role, and any other attribute a component needs.', 'winden-dplugins-tailwind-css-compiler')}
        >
            <HtmlAttributesControl value={value} onChange={onChange} />
        </BaseControl>
    );

    // A Winden Group or Shape gets its own panel up front — element and
    // attributes are what they are for, and a shape has nothing else at all:
    // without this it showed core's bare "Transform to variation" and no way
    // to reach the tag or the attributes that are the whole block. Every other
    // block keeps the attributes under Advanced, and a group whose tag core's
    // select cannot show gets the element field there so the tag is visible.
    if (winden || shape) {
        return (
            <Fragment>
                <BlockEdit {...props} />
                <InspectorControls>
                    <PanelBody title={shape ? __('Winden Shape', 'winden-dplugins-tailwind-css-compiler') : __('Winden Group', 'winden-dplugins-tailwind-css-compiler')} initialOpen>
                        <ElementControl tagName={tagName} onChange={setTag} />
                        {attributesControl}
                    </PanelBody>
                </InspectorControls>
            </Fragment>
        );
    }

    return (
        <Fragment>
            <BlockEdit {...props} />
            <InspectorControls group="advanced">
                {name === GROUP && !CORE_GROUP_TAGS.has(tagName) && (
                    <ElementControl tagName={tagName} onChange={setTag} />
                )}
                {attributesControl}
            </InspectorControls>
        </Fragment>
    );
}, 'withWindenHtmlAttributesControls'));

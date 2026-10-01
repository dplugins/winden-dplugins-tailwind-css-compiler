/**
 * Winden Classes — HTML into blocks, with the classes intact
 *
 * Tailwind's value is in libraries of ready markup, and getting one into
 * Gutenberg meant retyping it: `rawHandler` returns a single `core/html` block
 * that cannot be edited as blocks, and `pasteHandler` throws away the wrapper
 * and every class on the way in.
 *
 * This maps the markup onto core blocks and keeps `class` on each one, so what
 * arrives is a real block tree wearing the same utilities it had in the
 * library.
 */

/**
 * A block this converter cannot rebuild stands in the markup under its own
 * name: `core/query` becomes `<core-query>`, `fancoolo/hero` becomes
 * `<fancoolo-hero>`.
 *
 * A Query Loop is not its HTML — the loop lives in attributes the markup never
 * carries — and `core/navigation` saves no markup at all. Flattening those into
 * groups is silent destruction, so they are held aside and put back exactly as
 * they were, and the tag says which block is standing there and whose it is.
 */
import { readHtmlAttributes, areHtmlAttributesRepresentable, HTML_ATTRIBUTES_KEY, type HtmlAttributes } from '../../blocks/shared/html-attributes';

export function preservedTag(blockName: string): string {
    const tag = blockName.replace(/\//g, '-').toLowerCase();
    // A custom element has to have a hyphen in it, and a block registered
    // without a namespace would not
    return tag.includes('-') ? tag : `wp-${tag}`;
}

/**
 * What marks an element as a stand-in rather than markup someone wrote. The tag
 * alone would claim any custom element in a pasted page.
 */
export const PRESERVED_REF = 'data-ref';

/** The seed a marker becomes; the caller swaps in the real block */
export const PRESERVED_BLOCK = 'winden/preserved';

/**
 * A component tag someone wrote, rather than one held aside.
 *
 * `<core-columns>` is the same vocabulary a marker uses — `preservedTag` maps
 * `core/columns` onto it — with one difference: a marker carries `data-ref`
 * and names a block kept whole, while this carries attributes and children and
 * names a block to build. The two are told apart by the ref, which is already
 * how a marker is told apart from a custom element someone pasted.
 *
 * It exists because some blocks are not their markup. A Columns block saves a
 * `<div class="wp-block-columns">` whose widths hide in inline styles and whose
 * every other setting is invisible; mapping that back by reading classes is
 * archaeology, and mapping it to nested groups loses the block. A tag that
 * names the block says what it is.
 *
 * Plain HTML stays the vocabulary for every block that *is* its markup —
 * `<h2>`, `<p>`, `<img>`, a `<div>` of Tailwind classes. That is the whole
 * value of the converter and none of it changes.
 */
export interface BlockSchema {
    attributes?: Record<string, { type?: string; default?: unknown; source?: string }>;
    /** Blocks this one may sit inside, as `block.json` declares it */
    parent?: string[] | null;
}

export interface ConvertOptions {
    /**
     * The block a component tag names, or null when the tag is not one.
     *
     * There is no default: without a registry, `<my-widget>` and
     * `<core-columns>` are the same shape, and guessing turns a pasted custom
     * element into a bogus block. Callers that know which blocks are
     * authorable pass this; everyone else gets the behaviour that was here
     * before, where a custom element stays custom HTML.
     */
    blockForTag?: (tag: string) => string | null;
    /** The block's attribute types and parent rule, for coercing strings and refusing a stray child */
    blockSchema?: (name: string) => BlockSchema | null;
}

interface Context {
    options: ConvertOptions;
    /** The block being built around this one, for `parent` rules */
    parent: string | null;
}

const NO_CONTEXT: Context = { options: {}, parent: null };

/**
 * `core-columns` → `core/columns`, the inverse of `preservedTag`.
 *
 * Split at the first hyphen: a namespace has none, and `core-media-text` is
 * `core/media-text` rather than `core-media/text`. `wp-` is the prefix
 * `preservedTag` adds to a block registered without a namespace at all.
 */
export function blockNameForTag(tag: string): string | null {
    const lower = tag.toLowerCase();
    if (!lower.includes('-')) return null;
    if (lower.startsWith('wp-')) return lower.slice(3);

    const at = lower.indexOf('-');
    return `${lower.slice(0, at)}/${lower.slice(at + 1)}`;
}

/** `is-stacked-on-mobile` → `isStackedOnMobile`; an HTML attribute is lower-case, a block attribute is not */
export function attributeToCamel(name: string): string {
    return name.toLowerCase().replace(/-([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

/** `isStackedOnMobile` → `is-stacked-on-mobile` */
export function attributeToKebab(name: string): string {
    return name.replace(/([A-Z])/g, (_, character: string) => `-${character.toLowerCase()}`);
}

/**
 * An attribute string as the type the block declares.
 *
 * `width="33.33%"` is a string and stays one; `is-stacked-on-mobile="false"`
 * is a boolean and `false` is not the same as `"false"` — an attribute set to
 * the string would read as true everywhere it is checked. Without a schema the
 * shape of the value decides, which is what someone writing it by hand would
 * expect.
 */
export function coerceAttribute(raw: string, type?: string): unknown {
    if (type === 'boolean') return raw === '' || raw === 'true';
    if (type === 'number' || type === 'integer') {
        const value = Number(raw);
        return Number.isNaN(value) ? raw : value;
    }
    if (type === 'object' || type === 'array') {
        try {
            return JSON.parse(raw);
        } catch {
            return undefined;
        }
    }
    if (type) return raw;

    // No schema: an empty attribute is a boolean the way HTML means it
    if (raw === 'true' || raw === '') return true;
    if (raw === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
    return raw;
}

/** Attributes a block cannot express as an HTML attribute — objects, mostly */
export const COMPONENT_ATTRIBUTES = 'data-wp-attrs';

/** Names a component tag spends on something other than a block attribute */
const COMPONENT_RESERVED = new Set(['class', 'id', PRESERVED_REF, COMPONENT_ATTRIBUTES]);

function componentAttributes(element: Element, schema: BlockSchema | null): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};

    for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase();
        if (COMPONENT_RESERVED.has(name) || name.startsWith('on')) continue;

        const key = attributeToCamel(name);
        const value = coerceAttribute(attribute.value, schema?.attributes?.[key]?.type);
        if (value !== undefined) attributes[key] = value;
    }

    // What has no attribute spelling at all: a layout, a focal point
    const json = element.getAttribute(COMPONENT_ATTRIBUTES);
    if (json) {
        try {
            Object.assign(attributes, JSON.parse(json));
        } catch {
            // Malformed JSON is the author's typo, not a reason to lose the block
        }
    }

    const classes = className(element);
    if (classes) attributes.className = classes;
    const id = element.getAttribute('id');
    if (id) attributes.anchor = id;

    return attributes;
}

function escapeAttribute(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Preferred names for a block's content attribute, most specific first */
const CONTENT_ATTRIBUTE_ORDER = ['text', 'content', 'label'];

/**
 * The attribute a component tag writes as its content rather than as an
 * attribute, or null when the block has none.
 *
 * A Button's label is a `rich-text` attribute, not an inner block — so
 * `<core-button>Read more</core-button>` had nowhere to put "Read more" and
 * made a paragraph inside the button instead, which is not a child a Button
 * accepts. The block came out with an empty label and an invalid child, which
 * reads on the canvas as the button simply not being there.
 *
 * Written as content on the way out too, so the tag says the same thing in
 * both directions. `text` before `content` before `label` and then whatever
 * `rich-text` the block declares first: a block with two of them — a Details
 * block's summary beside its body — has no single answer, and the order is at
 * least the same one every time.
 */
export function componentContentAttribute(schema: BlockSchema | null): string | null {
    const attributes = schema?.attributes;
    if (!attributes) return null;

    const rich = Object.keys(attributes).filter((key) => attributes[key]?.type === 'rich-text');
    if (rich.length === 0) return null;

    for (const preferred of CONTENT_ATTRIBUTE_ORDER) {
        if (rich.includes(preferred)) return preferred;
    }
    return rich[0];
}

/**
 * The opening tag a block is written as — the other half of the component
 * vocabulary.
 *
 * Only what differs from the block's own defaults is written: a Columns block
 * left as it came out of the inserter is `<core-columns>` and nothing more.
 * Scalars become attributes, `true` becomes a bare one (which is what HTML
 * means by a boolean), and anything with a shape — a layout, a focal point —
 * goes into `data-wp-attrs` because there is no attribute spelling for it.
 */
export function componentOpenTag(name: string, attributes: Record<string, unknown> = {}, schema: BlockSchema | null = null): string {
    const parts: string[] = [];
    const structured: Record<string, unknown> = {};

    const content = componentContentAttribute(schema);

    for (const [key, raw] of Object.entries(attributes)) {
        if (raw === undefined || raw === null) continue;
        if (key === 'className' || key === 'anchor') continue;
        // Written between the tags instead, where it can be read and edited
        if (key === content) continue;

        // A rich-text attribute holds a `RichTextData`, not a string — a
        // Button's text, a Details block's summary. Left as an object it goes
        // to `data-wp-attrs` as the JSON of an internal structure, which is
        // neither readable nor something the way back could use. Its own
        // `toString` is the HTML it stands for.
        const declared = schema?.attributes?.[key]?.type;
        const value = declared === 'rich-text' && typeof raw === 'object' ? String(raw) : raw;
        // The inserter's own value says nothing; writing it is noise that
        // reads as a decision
        if (schema?.attributes?.[key] && Object.prototype.hasOwnProperty.call(schema.attributes[key], 'default')
            && JSON.stringify(schema.attributes[key].default) === JSON.stringify(value)) continue;

        if (typeof value === 'object') {
            structured[key] = value;
            continue;
        }
        if (value === true) {
            parts.push(attributeToKebab(key));
            continue;
        }
        parts.push(`${attributeToKebab(key)}="${escapeAttribute(String(value))}"`);
    }

    const classes = typeof attributes.className === 'string' ? attributes.className.trim() : '';
    if (classes) parts.unshift(`class="${escapeAttribute(classes)}"`);
    const anchor = typeof attributes.anchor === 'string' ? attributes.anchor.trim() : '';
    if (anchor) parts.push(`id="${escapeAttribute(anchor)}"`);

    if (Object.keys(structured).length > 0) {
        parts.push(`${COMPONENT_ATTRIBUTES}="${escapeAttribute(JSON.stringify(structured))}"`);
    }

    return `<${preservedTag(name)}${parts.length > 0 ? ' ' + parts.join(' ') : ''}>`;
}

export interface BlockSeed {
    name: string;
    attributes: Record<string, unknown>;
    innerBlocks: BlockSeed[];
}

/**
 * Tags that become a group, and the tagName the group renders.
 *
 * Group's own "HTML element" select stops at `nav`, but the attribute is a
 * plain string and the block renders whatever it is given — so a `<dl>` of
 * stats or a `<figure>` keeps its tag, and Winden's extension shows the tag in
 * the inspector.
 */
const CONTAINER_TAGS: Record<string, string> = {
    div: 'div',
    section: 'section',
    article: 'article',
    header: 'header',
    footer: 'footer',
    main: 'main',
    aside: 'aside',
    // Group renders whatever tagName it is given, so a nav stays a nav
    nav: 'nav',
    dl: 'dl',
    dt: 'dt',
    dd: 'dd',
    figure: 'figure',
    figcaption: 'figcaption',
    address: 'address',
    // A Tailwind blockquote is a styled element; core/quote is the block the
    // theme styles, and its border, padding and margin beat the classes. Only
    // a `<blockquote class="wp-block-quote">` — core's own — is that block.
    blockquote: 'blockquote',
};

/**
 * The layout a group is asked to use, written in the markup.
 *
 * A group's variation — Group, Row, Stack, Grid — is nothing but its `layout`
 * attribute; the picker reads that back through each variation's `isActive`.
 * Markup carries no such thing, so every container used to arrive as a plain
 * group and the variation had to be chosen again by hand.
 *
 * It is opt-in, and deliberately not inferred from the classes. Core's layout
 * is CSS: `type: 'flex'` emits `is-layout-flex` and a gap from
 * `--wp--style--block-gap`, which fights the `flex gap-4` the markup already
 * has. Guessing it from a `flex` class would put that CSS on exactly the
 * markup that least wants it — which is what Winden Group exists to avoid — so
 * the attribute has to be written for it to happen.
 */
export const LAYOUT_ATTRIBUTE = 'data-wp-layout';

export const GROUP_LAYOUTS: Record<string, Record<string, unknown>> = {
    constrained: { type: 'constrained' },
    row: { type: 'flex', flexWrap: 'nowrap' },
    stack: { type: 'flex', orientation: 'vertical' },
    grid: { type: 'grid' },
};

/**
 * What to write in `data-wp-layout` for a layout: its name, or the layout
 * itself when the name would lose something.
 *
 * `constrained` says the type and nothing else, so a group justified to the
 * centre came back justified to nothing — measured on the front end, where
 * `is-content-justification-center` simply stopped being emitted. Row, Stack
 * and Grid carry the same problem for `justifyContent`, `verticalAlignment`,
 * `columnCount` and the rest.
 *
 * One attribute either way: a name while the name is the whole story, JSON
 * when it is not. Readable in the case that is almost always true, lossless in
 * the case that is not.
 */
export function layoutValue(layout: unknown): string | null {
    const name = layoutName(layout);
    if (!name) return layout && typeof layout === 'object' ? JSON.stringify(layout) : null;

    const preset = GROUP_LAYOUTS[name];
    const same = Object.keys(layout as object).length === Object.keys(preset).length
        && Object.entries(preset).every(([key, value]) => (layout as Record<string, unknown>)[key] === value);

    return same ? name : JSON.stringify(layout);
}

/** The layout a `data-wp-layout` value asks for — a name, or the layout written out */
export function layoutFromValue(value: string): Record<string, unknown> | null {
    const written = value.trim();
    if (!written) return null;

    if (written.startsWith('{')) {
        try {
            const parsed = JSON.parse(written);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    }
    return GROUP_LAYOUTS[written.toLowerCase()] ?? null;
}

/** The name for a group's `layout`, or null when it is not one this writes */
export function layoutName(layout: unknown): string | null {
    if (!layout || typeof layout !== 'object') return null;
    const { type, orientation } = layout as { type?: string; orientation?: string };

    if (type === 'constrained') return 'constrained';
    if (type === 'grid') return 'grid';
    // Stack and Row are both flex; only the orientation separates them, and
    // core's own variation matches Stack on exactly that
    if (type === 'flex') return orientation === 'vertical' ? 'stack' : 'row';
    return null;
}

/** The tags core's own group "HTML element" select offers */
const CORE_GROUP_TAGS = new Set(['div', 'header', 'main', 'section', 'article', 'aside', 'footer', 'nav']);

/**
 * Inline elements that are a block when they stand on their own.
 *
 * Inside a sentence these are content, and `inlineHtml` keeps them there. At
 * block position — a `<time>` beside the `<h3>` in a card — there was no rule
 * for them at all, so they fell off the end of `elementToBlocks` into the
 * `core/html` catch-all and stopped being editable as blocks.
 *
 * `winden/text` renders exactly the element, so `datetime` and the Tailwind
 * classes stay on it. Wrapping them in a paragraph was the cheaper fix and
 * loses layout: the `<p>` becomes the flex or grid item, so `order-2` or
 * `col-span-2` on the element applies to a box that is no longer laid out.
 *
 * `a` is absent — a link is a link, and has its own two rules. `br` is absent
 * because it holds no text to edit.
 */
const TEXT_BLOCK = 'winden/text';

/**
 * What an empty element becomes: a group that says nothing goes inside it.
 *
 * Every Tailwind hero has them: the blurred gradient blobs are empty `<div>`s
 * whose whole appearance is a `clip-path` and a background, and a component
 * library is full of dividers, overlays and spacers written the same way.
 *
 * They arrive as groups like any other container, but an empty group draws a
 * `components-placeholder` in the canvas — a grey "Group blocks together…"
 * card *inside* the shape, measured at 845px tall on the hero blob. The Winden
 * Shape variation says the emptiness is deliberate, and the card is hidden.
 */
const SHAPE_ATTRIBUTE = 'windenShape';

/** Nothing inside it at all: no elements, no text, only whitespace if anything */
function isEmptyElement(element: Element): boolean {
    return element.children.length === 0 && (element.textContent ?? '').trim() === '';
}
const TEXT_TAGS = new Set([
    'span', 'time', 'code', 'abbr', 'mark', 'small',
    'strong', 'em', 'b', 'i', 's', 'sub', 'sup',
    'q', 'cite', 'dfn', 'kbd', 'samp', 'var', 'bdi', 'bdo',
]);

/**
 * Tags whose block carries `htmlAttributes` — anything else on them stays as it
 * was written.
 *
 * `a` is listed here rather than added to `CONTAINER_TAGS`, even though a link
 * around block content becomes a group: that map feeds this set, so putting it
 * there would flip `isRepresentable` for every anchor through a side door —
 * including the inline ones that never become a group at all.
 */
/**
 * Tags that are a label with text in them, and nothing else.
 *
 * `<button class="rounded-md p-3">Read more</button>` is a Tailwind component,
 * not behaviour: no handler, no children, just a tag wearing classes. It went
 * to custom HTML because `button` sits in `VERBATIM_TAGS` beside `iframe` and
 * `input` — which is right for those and wrong for this.
 *
 * A Plain Group cannot hold it: a group holds blocks, so the label would
 * arrive as `<button><p>Read more</p></button>`, and `<p>` is flow content
 * inside an element whose content model is phrasing. `winden/text` is the
 * block that renders one element with rich text inside, which is exactly what
 * these are.
 *
 * Only when there is nothing but text in them. A `<label>` wrapping an
 * `<input>`, or a `<button>` with an `<svg>` beside its text, is markup with
 * parts and stays verbatim — the parts are the reason it was written that way.
 */
const TEXT_WHEN_PLAIN = new Set(['button', 'label', 'summary', 'legend']);

/**
 * Tags that hold phrasing content, and what counts as phrasing.
 *
 * The icon button is the commonest thing in a component library —
 * `<button><span>Solutions</span><svg …/></button>` — and it went to custom
 * HTML for having parts. Measured across Tailwind's premium set: of 1,378
 * buttons, 415 hold only text and nearly all the rest hold exactly `span`,
 * `svg`, `time` or `img`. Every one of those is phrasing content, and every
 * one already maps to a block that renders phrasing — `winden/text`,
 * `winden/icon`, `winden/image` — so the wrapper can be a group wearing the tag,
 * the way a `<figure>` is.
 *
 * The limit is the content model, not convenience: a `<div>` inside a
 * `<button>` is invalid, and an `<input>` inside a `<label>` is a control this
 * cannot represent. Both keep the element verbatim.
 */
const PHRASING_CONTAINERS = new Set([...TEXT_WHEN_PLAIN, ...TEXT_TAGS]);
const PHRASING_CONTENT = new Set([
    'span', 'svg', 'img', 'time', 'a', 'br', 'strong', 'em', 'b', 'i', 's', 'u',
    'small', 'code', 'kbd', 'samp', 'var', 'abbr', 'mark', 'sub', 'sup', 'cite',
    'q', 'dfn', 'bdi', 'bdo', 'picture',
    // A button is phrasing content, and now that one can be a block there is
    // no reason to refuse the shape that puts it inside a badge:
    // `<span>Badge <button aria-label="Remove"/></span>`
    'button', 'label',
]);

/** Does this element hold only what may sit inside phrasing content? */
function holdsOnlyPhrasing(element: Element): boolean {
    const children = [...element.children];
    return children.length > 0
        && children.every((child) => PHRASING_CONTENT.has(child.tagName.toLowerCase()));
}

const HTML_ATTRIBUTE_TAGS = new Set([
    ...Object.keys(CONTAINER_TAGS),
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'ul', 'ol', 'li', 'hr', 'blockquote', 'pre', 'img', 'a',
    ...TEXT_TAGS,
    // `winden/text` carries `htmlAttributes` whatever tag it renders, so a
    // `<button type="button">` is as representable as a `<time datetime>`.
    // Judged by the short list instead, a single attribute sent the whole
    // element to custom HTML.
    ...TEXT_WHEN_PLAIN,
]);

/**
 * Kept as-is: a block cannot hold them without losing what they are. A form is
 * markup with behaviour, an iframe is a foreign document — custom HTML is the
 * honest home for both.
 */
const VERBATIM_TAGS = new Set(['form', 'video', 'audio', 'iframe', 'canvas', 'select', 'input', 'textarea', 'button']);

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** Inline tags belong inside a block's own content, not beside it */
const INLINE_TAGS = new Set(['a', 'span', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'code', 'sub', 'sup', 'mark', 'abbr', 'time', 'br']);

/**
 * Gutenberg writes `wp-block-group`, `wp-block-image` and friends itself when a
 * block saves. Reading them back in as user classes means every round trip
 * through this converter adds another copy to the block's `className`.
 */
function classList(element: Element): string[] {
    return (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
}

/**
 * Generated classes that are the only thing naming the block that wrote them.
 *
 * `<figure><img></figure>` is a Tailwind figure — a group with the classes on
 * the image — and `<figure class="wp-block-image"><img></figure>` is a core
 * Image block. Same tag, different block, and the class is the whole
 * difference. Stripping it with the rest of the `wp-block-*` noise left
 * nothing to tell them apart, so these two survive into the markup you see and
 * are consumed on the way back.
 */
const IDENTITY_CLASSES = new Set(['wp-block-image', 'wp-block-gallery', 'wp-block-quote']);

function className(element: Element): string | undefined {
    const value = classList(element)
        .filter((name) => !name.startsWith('wp-block-') || IDENTITY_CLASSES.has(name))
        .join(' ');
    return value ? value : undefined;
}

function withClass(attributes: Record<string, unknown>, element: Element): Record<string, unknown> {
    const value = className(element);
    const id = element.getAttribute('id');
    return {
        ...attributes,
        ...(value ? { className: value } : {}),
        // Every block this converter emits supports `anchor`, which is `id`
        ...(id ? { anchor: id } : {}),
    };
}

/**
 * Class, anchor, and every other attribute the element wears.
 *
 * `except` names what the block keeps in attributes of its own — an image's
 * `src` — so nothing is stored twice.
 */
function withAttributes(attributes: Record<string, unknown>, element: Element, except: string[] = []): Record<string, unknown> {
    const rest: HtmlAttributes | undefined = readHtmlAttributes(element, ['class', 'id', ...except]);
    return {
        ...withClass(attributes, element),
        ...(rest ? { [HTML_ATTRIBUTES_KEY]: rest } : {}),
    };
}

/**
 * What a block can wear without losing it, per tag.
 *
 * The blocks Winden extends — group, paragraph, heading, list, quote, and the
 * rest of `HTML_ATTRIBUTE_TAGS` — carry `htmlAttributes`, so `style`,
 * `aria-hidden`, `data-*` and `role` all have a home: the blurred gradient
 * shapes in a Tailwind hero, empty divs whose whole appearance is a
 * `clip-path` in a `style` attribute, come through as groups. `winden/image`
 * puts the classes on the `<img>` itself, so an image with `absolute inset-0
 * object-cover` is a block too. Only `on*` handlers are refused, everywhere.
 *
 * Tags mapped to blocks without that attribute keep the short lists below;
 * anything else on them stays custom HTML rather than being quietly dropped.
 */
const REPRESENTABLE_ATTRIBUTES: Record<string, Set<string>> = {
    a: new Set(['class', 'id', 'href', 'target', 'rel']),
    td: new Set(['class', 'id', 'colspan', 'rowspan']),
    th: new Set(['class', 'id', 'colspan', 'rowspan', 'scope']),
};

const REPRESENTABLE_DEFAULT = new Set(['class', 'id']);

/** Can a block carry everything this element is wearing? */
function isRepresentable(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    if (HTML_ATTRIBUTE_TAGS.has(tag)) return areHtmlAttributesRepresentable(element);

    const allowed = REPRESENTABLE_ATTRIBUTES[tag] ?? REPRESENTABLE_DEFAULT;
    return [...element.attributes].every((attribute) => allowed.has(attribute.name.toLowerCase()));
}

/** Does this element hold only text and inline markup? */
function isInlineOnly(element: Element): boolean {
    return [...element.children].every((child) => INLINE_TAGS.has(child.tagName.toLowerCase()));
}

/**
 * A row of links is a layout, not a sentence.
 *
 * `<div class="flex gap-8"><a>Open roles</a><a>Our values</a></div>` collapsed
 * into one paragraph, which put a grid on a `<p>` and the links inside it as
 * text. Links inside actual prose — "read the <a>docs</a>" — still belong in
 * the paragraph, and the difference is whether there is any text of its own.
 */
function isLinkRow(element: Element): boolean {
    const links = [...element.children].filter((child) => child.tagName.toLowerCase() === 'a');
    if (links.length === 0) return false;

    const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === 3)
        .map((node) => (node.textContent ?? '').trim())
        .join('');
    return ownText === '';
}

function html(element: Element): string {
    return element.innerHTML.trim();
}

/**
 * The same content with its line breaks read as HTML reads them.
 *
 * A newline between words is whitespace in HTML — `<br>` is the only line
 * break there is. RichText does not agree: it treats `\n` as a break and
 * writes a literal `<br>` when the markup becomes a block. So any formatter
 * that wraps a long paragraph to fit the editor — Monaco's does, at 120
 * columns — silently added a `<br>` nobody typed, every time that paragraph
 * was applied.
 *
 * Only for content that becomes RichText. `<pre>` and `<code>` keep their
 * newlines, which is the entire point of them.
 */
function inlineHtml(element: Element): string {
    return html(element).replace(/\s*\n\s*/g, ' ');
}

function block(name: string, attributes: Record<string, unknown> = {}, innerBlocks: BlockSeed[] = []): BlockSeed {
    return { name, attributes, innerBlocks };
}

/**
 * The group a container element becomes.
 *
 * Shared by the `CONTAINER_TAGS` path and by a link wrapper so there is one
 * answer to "is this a Winden Group": a group that needed more than a plain
 * group offers — attributes, or a tag core's select does not have — is one, so
 * the picker shows it as one. A layout was asked for by name, and Winden Group
 * is the one variation that means "no layout", so the two cannot both be true:
 * what the markup spelled out wins.
 */
function groupBlock(element: Element, tagName: string, inner: BlockSeed[], layout: Record<string, unknown> | null): BlockSeed {
    const attributes = withAttributes({
        tagName,
        ...(layout ? { layout } : {}),
    }, element, [LAYOUT_ATTRIBUTE]);
    const winden = !layout && (HTML_ATTRIBUTES_KEY in attributes || !CORE_GROUP_TAGS.has(tagName));
    return block('core/group', winden ? { ...attributes, windenGroup: true } : attributes, inner);
}

/**
 * A link stays a link.
 *
 * `core/buttons` looked like the right home — a lone `<a>` in a Tailwind
 * library usually is a call to action — but the button block wraps the anchor
 * in `wp-block-buttons` / `wp-block-button` and gives it `wp-element-button`,
 * which carries the theme's own padding and background. Measured on a Tailwind
 * hero: a row of four links came out as four boxed columns with the text
 * wrapping mid-word.
 *
 * A paragraph holds the anchor exactly as written, classes and all, and
 * Tailwind's preflight leaves `<p>` without margins — so the box is the one the
 * markup asked for, and the text is still editable in place.
 */
function linkToBlock(element: Element): BlockSeed {
    return block('core/paragraph', { content: element.outerHTML });
}

/**
 * A link around block content is a wrapper, and a paragraph cannot hold one.
 *
 * `<a href="/post"><h3 class="text-lg">How to position your furniture</h3></a>`
 * — the card link every component library is made of — used to become one
 * paragraph whose RichText content was the whole anchor. `<h3>` is not an
 * inline format, so the heading stopped being a block, stopped being editable
 * as one, and its classes rode along as raw markup inside someone else's text.
 *
 * A group renders whatever `tagName` it is given, so the anchor stays an
 * anchor, `href`/`target`/`rel` ride in `htmlAttributes`, and the heading
 * inside it is a heading again. `a` is not one of core's eight sectioning
 * tags, so `groupBlock` marks it a Winden Group without being asked.
 *
 * Nested anchors need no guarding here: an `<a>` inside an `<a>` is unnested
 * by the HTML parser itself, before this converter sees the tree.
 */
function linkGroup(element: Element, context: Context): BlockSeed {
    const inner = childBlocks(element, { ...context, parent: 'core/group' });
    return groupBlock(element, 'a', inner, layoutFromValue(element.getAttribute(LAYOUT_ATTRIBUTE) ?? ''));
}

/**
 * A list is `core/list` while every item is a sentence.
 *
 * `core/list-item` holds rich text and nested lists, nothing else. The
 * feature list in every Tailwind pricing card is `<li class="flex gap-x-3">`
 * holding a check `<svg>` and the text: written into `content`, RichText
 * dropped the icon on the floor, and the `flex` on the item then laid out
 * one child. Measured — no check marks on the canvas or the page.
 *
 * So an item holding anything that is a block of its own makes the whole
 * list a Winden Group `<ul>` of Winden Group `<li>`s, each holding its icon
 * and a paragraph — the markup it was, block by block. A list cannot be half
 * one thing: `core/list` accepts only list items.
 */
function listToBlock(element: Element, context: Context = NO_CONTEXT): BlockSeed {
    const ordered = element.tagName.toLowerCase() === 'ol';
    const items = [...element.children].filter((child) => child.tagName.toLowerCase() === 'li');

    if (items.some((item) => !isInlineOnly(item))) {
        const tag = ordered ? 'ol' : 'ul';
        const inner = items.map((item) => groupBlock(
            item,
            'li',
            childBlocks(item, { ...context, parent: 'core/group' }),
            layoutFromValue(item.getAttribute(LAYOUT_ATTRIBUTE) ?? '')
        ));
        return groupBlock(element, tag, inner, layoutFromValue(element.getAttribute(LAYOUT_ATTRIBUTE) ?? ''));
    }

    return block('core/list', withAttributes({ ordered }, element), items.map(
        (item) => block('core/list-item', withAttributes({ content: inlineHtml(item) }, item))
    ));
}

/** The block a Winden image is; `IMAGE_ATTRIBUTES` are what it keeps in attributes of its own */
export const IMAGE_BLOCK = 'winden/image';
const IMAGE_ATTRIBUTES = ['src', 'alt', 'width', 'height'];

/**
 * `<img>` becomes a Winden image: the classes stay on the image, and
 * `wp-image-{id}` — the class core writes for a media library image, and what
 * WordPress reads to add `srcset` — becomes the attachment id rather than a
 * class the user has to know about.
 */
/**
 * Does this `src` point at this site?
 *
 * `wp-image-42` only means anything here if attachment 42 is this site's. A
 * Tailwind library, or markup copied from someone else's WordPress, carries
 * both a foreign `src` and a foreign id — and WordPress reads that class at
 * render time to attach `srcset` and `sizes` from whatever attachment 42
 * happens to be *here*. That is a different photo's dimensions bolted onto
 * this one, silently. So the id is only believed for a local image, and the
 * class is dropped rather than left to be acted on.
 */
function isLocalSrc(src: string | null, element: Element): boolean {
    if (!src) return false;

    try {
        const base = element.ownerDocument?.baseURI;
        return new URL(src, base).origin === new URL(base ?? src).origin;
    } catch {
        return false;
    }
}

function imageToBlock(element: Element): BlockSeed {
    const classes = (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    const idClass = classes.find((name) => /^wp-image-\d+$/.test(name));
    const local = isLocalSrc(element.getAttribute('src'), element);
    const id = idClass && local ? Number(idClass.slice('wp-image-'.length)) : undefined;
    if (idClass) {
        const rest = classes.filter((name) => name !== idClass).join(' ');
        if (rest) element.setAttribute('class', rest);
        else element.removeAttribute('class');
    }

    const size = (name: string) => (element.getAttribute(name) ? { [name]: Number(element.getAttribute(name)) } : {});

    return block(IMAGE_BLOCK, withAttributes({
        ...(id ? { id } : {}),
        url: element.getAttribute('src') ?? undefined,
        alt: element.getAttribute('alt') ?? '',
        ...size('width'),
        ...size('height'),
    }, element, IMAGE_ATTRIBUTES));
}

/**
 * A core Image block: the `<figure>` core saves, not the bare `<img>` a Plain
 * image is.
 *
 * Held aside as a marker until now, because a round trip turned it into a
 * Winden Group wrapping a Winden Image — the right pixels, the wrong block. Read
 * properly it keeps what the figure carries and the `<img>` does not: the
 * caption, the size, the alignment, and the link around the image.
 */
function imageFigureToBlock(element: Element): BlockSeed {
    const image = element.querySelector(':scope > img, :scope > a > img');
    if (!image) return block('core/html', { content: element.outerHTML });

    const link = element.querySelector(':scope > a');
    const caption = element.querySelector(':scope > figcaption');

    const classes = classList(element);
    const size = classes.find((name) => /^size-[\w-]+$/.test(name));
    const align = classes.find((name) => /^align(left|center|right|wide|full)$/.test(name));
    // `is-style-*` is a style variation someone chose; it stays
    const rest = classes.filter((name) => (
        name !== 'wp-block-image' && name !== size && name !== align && !name.startsWith('wp-block-')
    ));

    const idClass = classList(image).find((name) => /^wp-image-\d+$/.test(name));
    const url = image.getAttribute('src') ?? undefined;
    const href = link?.getAttribute('href') ?? undefined;
    const number = (name: string) => (image.getAttribute(name) ? { [name]: Number(image.getAttribute(name)) } : {});
    const anchor = element.getAttribute('id');

    return block('core/image', {
        url,
        alt: image.getAttribute('alt') ?? '',
        // The same rule a bare `<img>` follows: a foreign id is another site's
        ...(idClass && isLocalSrc(url ?? null, image) ? { id: Number(idClass.slice('wp-image-'.length)) } : {}),
        ...(size ? { sizeSlug: size.slice('size-'.length) } : {}),
        ...(align ? { align: align.slice('align'.length) } : {}),
        ...number('width'),
        ...number('height'),
        ...(caption ? { caption: caption.innerHTML.trim().replace(/\s*\n\s*/g, ' ') } : {}),
        ...(href ? { href, linkDestination: href === url ? 'media' : 'custom' } : {}),
        ...(link?.getAttribute('target') ? { linkTarget: link.getAttribute('target') } : {}),
        ...(link?.getAttribute('rel') ? { rel: link.getAttribute('rel') } : {}),
        ...(rest.length > 0 ? { className: rest.join(' ') } : {}),
        ...(anchor ? { anchor } : {}),
    });
}

/** What a gallery writes about itself rather than about its contents */
const GALLERY_GENERATED = /^(has-nested-images|columns-\d+|is-cropped|is-layout-[\w-]+)$/;

/**
 * A core Gallery: a `<figure>` of `<figure>`s since WordPress 5.9.
 *
 * The layout lives in classes on the outer figure — `columns-2`, `is-cropped`
 * — which is why flattening it into groups lost the gallery and left two
 * images in a box.
 */
function galleryToBlock(element: Element): BlockSeed {
    const classes = classList(element);
    const columns = classes.find((name) => /^columns-\d+$/.test(name));
    const rest = classes.filter((name) => (
        name !== 'wp-block-gallery' && !GALLERY_GENERATED.test(name) && !name.startsWith('wp-block-')
    ));
    const caption = element.querySelector(':scope > figcaption');
    const anchor = element.getAttribute('id');

    const images = [...element.children]
        .filter((child) => child.tagName.toLowerCase() === 'figure')
        .map((child) => imageFigureToBlock(child));

    return block('core/gallery', {
        ...(columns ? { columns: Number(columns.slice('columns-'.length)) } : {}),
        imageCrop: classes.includes('is-cropped'),
        ...(caption ? { caption: caption.innerHTML.trim().replace(/\s*\n\s*/g, ' ') } : {}),
        ...(rest.length > 0 ? { className: rest.join(' ') } : {}),
        ...(anchor ? { anchor } : {}),
    }, images);
}

/** Rows of `{ content, tag }`, which is how core/table holds a section */
function tableSection(parent: Element | null, tag: 'th' | 'td'): { cells: { content: string; tag: string }[] }[] {
    if (!parent) return [];

    return [...parent.children]
        .filter((row) => row.tagName.toLowerCase() === 'tr')
        .map((row) => ({
            cells: [...row.children]
                .filter((cell) => ['td', 'th'].includes(cell.tagName.toLowerCase()))
                .map((cell) => {
                    // Declared by `core/table` on each cell, and dropped here
                    // until now — the representable check said a `colspan` was
                    // fine to keep and then nothing kept it
                    const attribute = (name: string) => {
                        const value = cell.getAttribute(name);
                        return value ? { [name]: value } : {};
                    };

                    return {
                        content: inlineHtml(cell),
                        tag: cell.tagName.toLowerCase() === 'th' ? 'th' : tag,
                        ...attribute('colspan'),
                        ...attribute('rowspan'),
                        ...attribute('scope'),
                        // Core keeps a cell's alignment in `data-align`
                        ...(cell.getAttribute('data-align') ? { align: cell.getAttribute('data-align') } : {}),
                    };
                }),
        }));
}

/**
 * The table a `<figure>` is wrapping, or null when it is wrapping something
 * else. The caption lives beside the table in a `<figcaption>`, which is where
 * core puts it.
 */
function tableInFigure(element: Element): BlockSeed | null {
    const children = [...element.children];
    const table = children.find((child) => child.tagName.toLowerCase() === 'table');
    if (!table) return null;

    const rest = children.filter((child) => (
        child !== table && child.tagName.toLowerCase() !== 'figcaption'
    ));
    if (rest.length > 0) return null;

    const caption = element.querySelector(':scope > figcaption');
    const seed = tableToBlock(table);
    // The figure carries the block's class and anchor; the table carries
    // `has-fixed-layout`, which `tableToBlock` has already read
    const outer = withClass({}, element);

    return block(seed.name, {
        ...seed.attributes,
        ...outer,
        ...(caption ? { caption: inlineHtml(caption) } : {}),
    }, seed.innerBlocks);
}

function tableToBlock(element: Element): BlockSeed {
    const section = (name: string) => element.querySelector(`:scope > ${name}`);
    const caption = element.querySelector(':scope > caption');

    // A table written without <tbody> still has rows; the browser adds one when
    // parsing, but a fragment from a library may not go through that path.
    const bodyRows = section('tbody')
        ?? (element.querySelector(':scope > tr') ? element : null);

    // Written by the block itself when the setting is on, so it reads back as
    // the setting rather than as a class the user is left holding
    const fixed = element.classList.contains('has-fixed-layout');
    if (fixed) {
        // Read as the setting, so leaving it in `className` would write it
        // back twice — once by the block, once as a class the user never added
        const rest = classList(element).filter((name) => name !== 'has-fixed-layout');
        if (rest.length > 0) element.setAttribute('class', rest.join(' '));
        else element.removeAttribute('class');
    }

    return block('core/table', withClass({
        ...(fixed ? { hasFixedLayout: true } : {}),
        head: tableSection(section('thead'), 'th'),
        body: tableSection(bodyRows, 'td'),
        foot: tableSection(section('tfoot'), 'td'),
        ...(caption ? { caption: inlineHtml(caption) } : {}),
    }, element));
}

/**
 * Core's quote block, read back: the citation lives in a `<cite>` and
 * everything else is inner blocks, which is how core saves it.
 *
 * Only for a `<blockquote class="wp-block-quote">`. A Tailwind blockquote is a
 * group wearing the tag (`CONTAINER_TAGS`): measured on a testimonial, the
 * theme's `:root :where(.wp-block-quote)` put a 2px border, 30px of padding
 * and a top margin on an element whose classes asked for none — unlayered, so
 * nothing on the class list could win, and none of those properties was in a
 * class to be forced. Same argument that keeps `<a>` out of `core/buttons`.
 */
const QUOTE_CLASS = 'wp-block-quote';

function quoteToBlock(element: Element, context: Context = NO_CONTEXT): BlockSeed {
    // Its identity, consumed: written again by the block on save
    element.classList.remove(QUOTE_CLASS);
    const cite = element.querySelector(':scope > cite');
    cite?.remove();

    const inner = childBlocks(element, { ...context, parent: 'core/quote' });
    return block('core/quote', withAttributes({
        ...(cite ? { citation: cite.innerHTML.trim().replace(/\s*\n\s*/g, ' ') } : {}),
    }, element), inner.length > 0 ? inner : [block('core/paragraph', { content: inlineHtml(element) })]);
}

/** `<pre><code>` is the code block; a bare `<pre>` is preformatted text */
function preToBlock(element: Element): BlockSeed {
    const code = element.querySelector(':scope > code');
    return code
        ? block('core/code', withAttributes({ content: code.innerHTML.trim() }, element))
        : block('core/preformatted', withAttributes({ content: html(element) }, element));
}

/**
 * A component tag into the block it names, or null when it names nothing this
 * caller is willing to build.
 *
 * A block that declares a `parent` is refused anywhere else: `core/column`
 * outside `core/columns` is invalid markup as far as the editor is concerned,
 * and it flags it rather than showing it. The children are still worth
 * keeping, so the caller falls back to a group instead of losing them.
 */
function componentToBlock(element: Element, tag: string, context: Context): BlockSeed | null {
    const name = context.options.blockForTag?.(tag);
    if (!name) return null;

    const schema = context.options.blockSchema?.(name) ?? null;
    const content = componentContentAttribute(schema);
    const built = () => {
        const attributes = componentAttributes(element, schema);

        // Its content is an attribute, and what is written between the tags is
        // that attribute — not children the block has no room for. Only when
        // the tag holds nothing but phrasing: an element that would be a block
        // of its own is one, and goes on being a child.
        const phrasingOnly = element.children.length === 0 || holdsOnlyPhrasing(element);
        if (content && phrasingOnly) {
            const written = inlineHtml(element).trim();
            // An attribute the tag also spelled out wins nothing back from an
            // empty body — `<core-button text="Buy"></core-button>` keeps it
            if (written || attributes[content] === undefined) attributes[content] = written;
            return block(name, attributes, []);
        }

        return block(name, attributes, childBlocks(element, { ...context, parent: name }));
    };

    if (!schema?.parent || schema.parent.includes(context.parent ?? '')) return built();

    // A block that may only live in one place gets taken there, rather than
    // being demoted to a group: a `<core-button>` written on its own is a
    // button someone wants, and `core/buttons` is the only place it can be.
    // Gutenberg does the same when you paste one. With a choice of parents
    // there is nothing to pick, so that stays a group.
    if (schema.parent.length !== 1) return null;

    const parent = schema.parent[0];
    const parentSchema = context.options.blockSchema?.(parent) ?? null;
    if (parentSchema?.parent && !parentSchema.parent.includes(context.parent ?? '')) return null;

    return block(parent, {}, [built()]);
}

function elementToBlocks(element: Element, context: Context = NO_CONTEXT): BlockSeed[] {
    const tag = element.tagName.toLowerCase();

    // A marker is a custom element carrying a ref. `<my-widget>` in pasted
    // markup is not one, and stays the custom HTML it was.
    if (tag.includes('-') && element.hasAttribute(PRESERVED_REF)) {
        return [block(PRESERVED_BLOCK, {
            ref: element.getAttribute(PRESERVED_REF) ?? '',
            blockName: tag,
        })];
    }

    // The same vocabulary without a ref: a block someone wrote rather than one
    // held aside
    if (tag.includes('-')) {
        const component = componentToBlock(element, tag, context);
        if (component) return [component];

        // A tag that names a real block but cannot sit here keeps its content
        // as a group; one that names no block at all is somebody's custom
        // element and stays the markup it is
        if (context.options.blockForTag?.(tag)) {
            return [block('core/group', withClass({ tagName: 'div' }, element), childBlocks(element, { ...context, parent: 'core/group' }))];
        }
    }

    if (VERBATIM_TAGS.has(tag)) {
        // …unless it is one of the ones that is only a label, in which case it
        // is a block like any other. `isRepresentable` still has its say: an
        // `onclick` is behaviour and keeps the whole thing verbatim.
        const label = TEXT_WHEN_PLAIN.has(tag) && isInlineOnly(element);
        const wrapper = PHRASING_CONTAINERS.has(tag) && holdsOnlyPhrasing(element);
        if ((!label && !wrapper) || !isRepresentable(element)) {
            return [block('core/html', { content: element.outerHTML })];
        }
    }

    // WordPress's own icon block cannot hold this. Its `icon` attribute is a
    // name looked up in `WP_Icons_Registry` — `core/star-filled` — and markup
    // simply misses: `wp_get_icon` returns '', and the render callback then
    // returns nothing at all. Measured through `do_blocks()`, an `<svg>` sent
    // there rendered to zero bytes.
    //
    // So it keeps its markup, with the SVG's own attributes on the SVG. Comes
    // before `isRepresentable` below, which judges by tag and would send every
    // `viewBox` to custom HTML.
    if (tag === 'svg') {
        return [block('winden/icon', withAttributes({ content: element.innerHTML }, element))];
    }

    // Kept exactly as written rather than mapped and quietly changed
    if (!isRepresentable(element)) {
        return [block('core/html', { content: element.outerHTML })];
    }

    // Core writes these two, and they are the only thing separating a core
    // Image from a Tailwind `<figure>` holding a Winden image
    if (tag === 'figure' && element.classList.contains('wp-block-gallery')) {
        return [galleryToBlock(element)];
    }

    if (tag === 'figure' && element.classList.contains('wp-block-image')) {
        return [imageFigureToBlock(element)];
    }

    if (tag === 'table') {
        return [tableToBlock(element)];
    }

    // `core/table` saves `<figure><table></figure>`, and `figure` is a
    // container — so the block came back as a group wrapping a table, and
    // nested one layer deeper on every round trip after that. Measured on the
    // front end: `<figure class="wp-block-table">` became
    // `<figure class="wp-block-group"><figure class="wp-block-table">`.
    // A figure whose only element is a table says what it is without needing a
    // class to survive the strip.
    if (tag === 'figure') {
        const wrapped = tableInFigure(element);
        if (wrapped) return [wrapped];
    }

    if (HEADING_TAGS.has(tag)) {
        return [block('core/heading', withAttributes({
            level: Number(tag.slice(1)),
            content: inlineHtml(element),
        }, element))];
    }

    if (tag === 'p') {
        return [block('core/paragraph', withAttributes({ content: inlineHtml(element) }, element))];
    }

    // An empty element is a decoration, whatever tag it was written as — a
    // blob, an overlay, a divider. Before the text and container rules, or an
    // empty `<span>` is a text block with nothing to say and an empty `<div>`
    // is a group that draws a placeholder inside the shape.
    if (isEmptyElement(element) && (tag in CONTAINER_TAGS || PHRASING_CONTAINERS.has(tag))) {
        return [block('core/group', withAttributes({
            tagName: CONTAINER_TAGS[tag] ?? tag,
            [SHAPE_ATTRIBUTE]: true,
        }, element))];
    }

    if ((TEXT_TAGS.has(tag) || TEXT_WHEN_PLAIN.has(tag)) && isInlineOnly(element)) {
        return [block(TEXT_BLOCK, withAttributes({ tagName: tag, content: inlineHtml(element) }, element))];
    }

    // A link is inline where it is inline — inside prose, in a row of links —
    // and a wrapper where it holds a block. Its children say which, and there
    // is nothing to choose: the markup already decided.
    if (tag === 'a') {
        return [isInlineOnly(element) ? linkToBlock(element) : linkGroup(element, context)];
    }

    if (tag === 'img') {
        return [imageToBlock(element)];
    }

    if (tag === 'ul' || tag === 'ol') {
        return [listToBlock(element, context)];
    }

    if (tag === 'hr') {
        return [block('core/separator', withAttributes({}, element))];
    }

    if (tag === 'blockquote' && element.classList.contains(QUOTE_CLASS)) {
        return [quoteToBlock(element, context)];
    }

    if (tag === 'pre') {
        return [preToBlock(element)];
    }

    if (tag in CONTAINER_TAGS || (PHRASING_CONTAINERS.has(tag) && holdsOnlyPhrasing(element))) {
        const inlineOnly = isInlineOnly(element) && !isLinkRow(element);
        const content = inlineHtml(element);
        const layout = layoutFromValue(element.getAttribute(LAYOUT_ATTRIBUTE) ?? '');

        // A div of nothing but text is a paragraph wearing the div's classes.
        // Only a div: a <nav> or <section> saying one sentence still means
        // something, and a paragraph cannot say it. An empty div is usually a
        // shape — a gradient, a divider, a decoration — and is kept as a group:
        // dropping it took the Tailwind blur blobs off the page.
        // Asking for a layout is asking for a container; a paragraph has none
        if (tag === 'div' && inlineOnly && content && !layout) {
            return [block('core/paragraph', withAttributes({ content }, element))];
        }

        // `<dt>Offices <span>worldwide</span></dt>`: the tag has to stay, and
        // its sentence has to stay whole — one paragraph inside, rather than a
        // paragraph per text run with the spans lost between them
        const inner = inlineOnly && content
            ? [block('core/paragraph', { content })]
            : childBlocks(element, { ...context, parent: 'core/group' });

        // A phrasing container renders the tag it was written as
        return [groupBlock(element, CONTAINER_TAGS[tag] ?? tag, inner, layout)];
    }

    // Anything unmapped keeps its markup rather than losing it
    return [block('core/html', { content: element.outerHTML })];
}

function childBlocks(parent: Element, context: Context = NO_CONTEXT): BlockSeed[] {
    const blocks: BlockSeed[] = [];

    for (const node of [...parent.childNodes]) {
        if (node.nodeType === 3) {
            const text = (node.textContent ?? '').trim();
            if (text) blocks.push(block('core/paragraph', { content: text }));
            continue;
        }
        if (node.nodeType !== 1) continue;

        blocks.push(...elementToBlocks(node as Element, context));
    }

    return blocks;
}

/**
 * The same markup with Gutenberg's generated classes taken out.
 *
 * Editing a block as HTML shows what it saved, `wp-block-group` and all. Those
 * are written by the block, not by the person editing it, and this converter
 * ignores them on the way back — so showing them is noise that reads as
 * something to preserve.
 */
export function stripGeneratedClasses(markup: string, doc?: Document): string {
    const source = markup?.trim();
    if (!source) return '';

    const parsed = doc ?? new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
    for (const element of [...parsed.body.querySelectorAll('[class]')]) {
        const kept = className(element);
        if (kept) element.setAttribute('class', kept);
        else element.removeAttribute('class');
    }
    return parsed.body.innerHTML;
}

/**
 * The single element a piece of custom HTML is, or null when it is not one.
 *
 * `core/html` blocks are where this converter puts everything a block cannot
 * wear — an image with positioning classes, a gradient shape carrying a
 * `clip-path`. Those still have Tailwind classes worth editing, and the block
 * itself has nowhere to keep a class, so the class list is read from and
 * written back into the markup.
 */
function onlyElement(markup: string, doc?: Document): Element | null {
    const parsed = doc ?? new DOMParser().parseFromString(`<body>${markup ?? ''}</body>`, 'text/html');
    const children = [...parsed.body.children];
    if (children.length !== 1) return null;

    // Text beside the element would be lost on the way back out
    const text = [...parsed.body.childNodes]
        .filter((node) => node.nodeType === 3)
        .map((node) => (node.textContent ?? '').trim())
        .join('');
    return text ? null : children[0];
}

/** The class attribute of custom HTML that is a single element */
export function rootClassName(markup: string, doc?: Document): string | null {
    const element = onlyElement(markup, doc);
    return element ? (element.getAttribute('class') ?? '') : null;
}

/** The same markup wearing a different class list, or unchanged if it is not one element */
export function withRootClassName(markup: string, classNames: string, doc?: Document): string {
    const element = onlyElement(markup, doc);
    if (!element) return markup;

    const value = classNames.trim();
    if (value) element.setAttribute('class', value);
    else element.removeAttribute('class');

    return element.ownerDocument.body.innerHTML;
}

/**
 * Turn a fragment of HTML into block seeds — plain objects, so this stays
 * testable and free of `wp.blocks`. The caller builds them with `createBlock`.
 */
/**
 * Comments, gone before anything reads the markup.
 *
 * Tailwind's own library explains itself in them — every flyout and transition
 * carries a paragraph of "Entering: …", 444 of its 693 components — and they
 * are notes *about* the markup, not part of it. `childBlocks` already skipped
 * them at block position, but `inlineHtml` reads `innerHTML`, so a comment
 * inside a heading or a paragraph rode into that block's RichText and stayed:
 * measured, 193 files carried one in.
 */
function withoutComments(root: Element): void {
    const doc = root.ownerDocument;
    const walker = doc.createTreeWalker(root, 128 /* NodeFilter.SHOW_COMMENT */);
    const comments: Node[] = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((comment) => comment.parentNode?.removeChild(comment));
}

export function htmlToBlockSeeds(markup: string, doc?: Document, options: ConvertOptions = {}): BlockSeed[] {
    const source = markup?.trim();
    if (!source) return [];

    const parser = doc ?? new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
    withoutComments(parser.body);
    return childBlocks(parser.body, { options, parent: null });
}

/** Tags that close themselves, so a `>` on them is not a level deeper */
const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * The line each top-level element starts on, in order — which is the line each
 * block starts on, since the markup is one block after another.
 *
 * Counted off the text rather than remembered from when the markup was built:
 * the formatter reflows it afterwards, and line numbers taken before that
 * describe a document which no longer exists.
 */
export function topLevelLineStarts(markup: string): number[] {
    const starts: number[] = [];
    let depth = 0;
    let line = 1;

    for (let at = 0; at < markup.length; at += 1) {
        if (markup[at] === '\n') {
            line += 1;
            continue;
        }

        if (markup[at] !== '<') continue;

        // A comment is not a tag and may hold anything at all
        if (markup.startsWith('<!--', at)) {
            const close = markup.indexOf('-->', at);
            if (close === -1) break;
            for (let scan = at; scan < close; scan += 1) if (markup[scan] === '\n') line += 1;
            at = close + 2;
            continue;
        }

        const name = /^<\/?\s*([a-zA-Z][\w-]*)/.exec(markup.slice(at, at + 40))?.[1]?.toLowerCase();
        if (!name) continue;

        const end = markup.indexOf('>', at);
        if (end === -1) break;

        if (markup[at + 1] === '/') {
            depth = Math.max(0, depth - 1);
        } else {
            if (depth === 0) starts.push(line);
            if (markup[end - 1] !== '/' && !VOID_TAGS.has(name)) depth += 1;
        }

        for (let scan = at; scan < end; scan += 1) if (markup[scan] === '\n') line += 1;
        at = end;
    }

    return starts;
}

/**
 * The line each element starts on, in document order.
 *
 * Same scan as `topLevelLineStarts`, without the depth filter — and in the
 * same order as `querySelectorAll('*')`, which is what lets the two be lined
 * up so a line can name an element.
 */
export function elementLineStarts(markup: string): number[] {
    const starts: number[] = [];
    let line = 1;

    for (let at = 0; at < markup.length; at += 1) {
        if (markup[at] === '\n') {
            line += 1;
            continue;
        }
        if (markup[at] !== '<') continue;

        if (markup.startsWith('<!--', at)) {
            const close = markup.indexOf('-->', at);
            if (close === -1) break;
            for (let scan = at; scan < close; scan += 1) if (markup[scan] === '\n') line += 1;
            at = close + 2;
            continue;
        }

        const name = /^<\/?\s*([a-zA-Z][\w-]*)/.exec(markup.slice(at, at + 40))?.[1];
        if (!name) continue;

        const end = markup.indexOf('>', at);
        if (end === -1) break;

        // Closing tags open nothing
        if (markup[at + 1] !== '/') starts.push(line);

        for (let scan = at; scan < end; scan += 1) if (markup[scan] === '\n') line += 1;
        at = end;
    }

    return starts;
}

/**
 * The lines each element occupies, 1-based and inclusive, in document order —
 * the same order as `elementLineStarts`, so an index into one is an index
 * into the other.
 *
 * A closing tag ends the innermost open element; a void or self-closed tag
 * ends on the line it started. The stack is what `topLevelLineStarts` counts
 * as a depth, kept whole here because every level matters.
 */
export function elementLineRanges(markup: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    const open: number[] = [];
    let line = 1;

    for (let at = 0; at < markup.length; at += 1) {
        if (markup[at] === '\n') {
            line += 1;
            continue;
        }
        if (markup[at] !== '<') continue;

        if (markup.startsWith('<!--', at)) {
            const close = markup.indexOf('-->', at);
            if (close === -1) break;
            for (let scan = at; scan < close; scan += 1) if (markup[scan] === '\n') line += 1;
            at = close + 2;
            continue;
        }

        const name = /^<\/?\s*([a-zA-Z][\w-]*)/.exec(markup.slice(at, at + 40))?.[1]?.toLowerCase();
        if (!name) continue;

        const end = markup.indexOf('>', at);
        if (end === -1) break;

        if (markup[at + 1] === '/') {
            const index = open.pop();
            if (index !== undefined) ranges[index].end = line;
        } else {
            const index = ranges.push({ start: line, end: line }) - 1;
            if (markup[end - 1] !== '/' && !VOID_TAGS.has(name)) open.push(index);
        }

        for (let scan = at; scan < end; scan += 1) if (markup[scan] === '\n') line += 1;
        at = end;
    }

    // Anything left open runs to the end of the text
    const total = markup.split('\n').length;
    for (const index of open) ranges[index].end = total;

    return ranges;
}

/** An element in the markup, named the way a block can be recognised from it */
export interface MarkupTarget {
    tag: string;
    className: string;
    /** Which one, among the elements wearing the same tag and classes */
    occurrence: number;
}

/**
 * The element a line is inside and every element around it, innermost first.
 *
 * The caret lands on a line; the block it belongs to may be that element or
 * any ancestor — an `<a>` is part of a paragraph's content and is no block of
 * its own, so the answer is the paragraph around it. Handing back the whole
 * chain lets the caller take the innermost one it recognises.
 *
 * Nothing here knows what a block is. It reports what the markup says, and is
 * empty when the scan and the parse disagree, which is the safe answer.
 */
export function targetsAtLine(markup: string, line: number, doc?: Document): MarkupTarget[] {
    const source = markup?.trim();
    if (!source) return [];

    const parsed = doc ?? new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
    const elements = [...parsed.body.querySelectorAll('*')];
    const starts = elementLineStarts(markup);
    // A mismatch means the scan and the parser read different documents;
    // guessing from that is worse than saying nothing
    if (elements.length !== starts.length) return [];

    let index = -1;
    for (let at = 0; at < starts.length; at += 1) {
        if (starts[at] <= line) index = at;
        else break;
    }
    if (index < 0) return [];

    const targets: MarkupTarget[] = [];
    for (let element: Element | null = elements[index]; element && element !== parsed.body; element = element.parentElement) {
        const tag = element.tagName.toLowerCase();
        const className = (element.getAttribute('class') ?? '').trim();
        const alike = elements.filter((other) => (
            other.tagName.toLowerCase() === tag && (other.getAttribute('class') ?? '').trim() === className
        ));
        targets.push({ tag, className, occurrence: Math.max(0, alike.indexOf(element)) });
    }

    return targets;
}

/**
 * The lines the element a target names occupies — `targetsAtLine` run the
 * other way, for the block picked in List View or on the canvas.
 *
 * Same recognition as the forward direction: tag, classes, and which one
 * among those alike. Null when the markup holds no such element, or when the
 * scan and the parser disagree about the document.
 */
export function lineRangeOfTarget(markup: string, target: MarkupTarget, doc?: Document): { start: number; end: number } | null {
    const source = markup?.trim();
    if (!source) return null;

    const parsed = doc ?? new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
    const elements = [...parsed.body.querySelectorAll('*')];
    const ranges = elementLineRanges(markup);
    if (elements.length !== ranges.length) return null;

    const alike = elements.filter((element) => (
        element.tagName.toLowerCase() === target.tag
        && (element.getAttribute('class') ?? '').trim() === target.className
    ));
    const element = alike[target.occurrence] ?? (alike.length === 1 ? alike[0] : null);
    if (!element) return null;

    return ranges[elements.indexOf(element)] ?? null;
}

/**
 * Which top-level element a line falls inside, counting from zero — the block
 * the caret is in.
 *
 * Top-level only, deliberately. A caret inside a paragraph three groups deep
 * resolves to the group, which is the block the panel is editing; the
 * paragraph has no markup of its own to point at.
 */
export function topLevelIndexAtLine(markup: string, line: number): number {
    const starts = topLevelLineStarts(markup);
    let index = -1;
    for (let at = 0; at < starts.length; at += 1) {
        if (starts[at] <= line) index = at;
        else break;
    }
    return index;
}

/** The lines one top-level block occupies, 1-based and inclusive */
export function topLevelLineRange(markup: string, index: number): { start: number; end: number } | null {
    const starts = topLevelLineStarts(markup);
    if (index < 0 || index >= starts.length) return null;

    const total = markup.split('\n').length;
    return { start: starts[index], end: (starts[index + 1] ?? total + 1) - 1 };
}

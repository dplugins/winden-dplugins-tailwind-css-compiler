/**
 * HTML attributes on blocks — the part a Tailwind component is made of that a
 * core block has nowhere to keep.
 *
 * A group block stores a class list and an anchor. The gradient blobs in every
 * Tailwind hero are `<div aria-hidden="true" style="clip-path: …">`; a
 * background image is `<img class="absolute inset-0 object-cover">` with the
 * class on the image, not a figure. Until this existed those fell back to
 * custom HTML, which keeps the markup but not the editing.
 *
 * `htmlAttributes` is one attribute — an object of name → value — added to the
 * blocks below and to `winden/image`. It is written onto the block's root
 * element when it saves and when it renders in the editor, and read back off
 * the markup by the HTML converter. Nothing here touches `class` or `id`:
 * those already have a home in `className` and `anchor`.
 */

/** Core blocks that grow an `htmlAttributes` attribute. Every one saves its root element through `useBlockProps`, so extra props land on the element that carries the classes. */
export const HTML_ATTRIBUTE_BLOCKS = [
    'core/group',
    'core/paragraph',
    'core/heading',
    'core/list',
    'core/list-item',
    'core/quote',
    'core/separator',
    'core/code',
    'core/preformatted',
] as const;

export const HTML_ATTRIBUTES_KEY = 'htmlAttributes';

export type HtmlAttributes = Record<string, string>;

/**
 * Names that are the block's own business, not the user's.
 *
 * `class` and `id` map to `className` and `anchor`. `on*` handlers are script:
 * a block that spreads them onto its wrapper runs whatever was pasted, and
 * `wp_kses` already strips them for anyone without `unfiltered_html`, so the
 * saved post would differ from what the editor showed.
 */
export function isAllowedAttributeName(name: string): boolean {
    const lower = name.trim().toLowerCase();
    if (!lower) return false;
    if (lower === 'class' || lower === 'id') return false;
    if (lower.startsWith('on')) return false;
    // Something an HTML parser would refuse anyway
    return /^[a-z_:][a-z0-9_:.-]*$/.test(lower);
}

/** Only the entries the block may carry, with names lower-cased */
export function sanitizeHtmlAttributes(value: unknown): HtmlAttributes | undefined {
    if (!value || typeof value !== 'object') return undefined;

    const clean: HtmlAttributes = {};
    for (const [name, raw] of Object.entries(value as Record<string, unknown>)) {
        if (!isAllowedAttributeName(name)) continue;
        clean[name.trim().toLowerCase()] = String(raw ?? '');
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
}

/**
 * The attributes of an element that are not the block's own.
 *
 * `except` lists names the block already stores in dedicated attributes — an
 * image's `src` and `alt`, say — so they are not doubled.
 */
export function readHtmlAttributes(element: Element, except: Iterable<string> = []): HtmlAttributes | undefined {
    const skip = new Set([...except].map((name) => name.toLowerCase()));
    const found: HtmlAttributes = {};

    for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase();
        if (skip.has(name) || !isAllowedAttributeName(name)) continue;
        found[name] = attribute.value;
    }
    return Object.keys(found).length > 0 ? found : undefined;
}

/** Can the block wear every attribute this element has? `class` and `id` always can — as `className` and `anchor` */
export function areHtmlAttributesRepresentable(element: Element, except: Iterable<string> = []): boolean {
    const skip = new Set(['class', 'id', ...[...except].map((name) => name.toLowerCase())]);
    return [...element.attributes].every((attribute) => {
        const name = attribute.name.toLowerCase();
        return skip.has(name) || isAllowedAttributeName(name);
    });
}

/** `-webkit-mask-image` → `WebkitMaskImage`, `clip-path` → `clipPath`; custom properties stay as they are */
function styleProperty(name: string): string {
    if (name.startsWith('--')) return name;
    return name
        .toLowerCase()
        .replace(/^-(webkit|moz|ms|o)-/, (_, vendor: string) => vendor.charAt(0).toUpperCase() + vendor.slice(1) + '-')
        .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * A `style="…"` string as the object React wants.
 *
 * The saved markup keeps the string; the editor's DOM is React's, and React
 * throws on a string `style`. Split on `;` outside parentheses and quotes —
 * `clip-path: polygon(74.1% 44.1%, …)` and `url("data:…;base64,…")` both carry
 * characters a naive split would break on.
 */
export function styleStringToObject(style: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!style) return result;

    const declarations: string[] = [];
    let depth = 0;
    let quote: string | null = null;
    let current = '';

    for (const char of style) {
        if (quote) {
            if (char === quote) quote = null;
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (char === '(') {
            depth += 1;
        } else if (char === ')') {
            depth = Math.max(0, depth - 1);
        } else if (char === ';' && depth === 0) {
            declarations.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    declarations.push(current);

    for (const declaration of declarations) {
        const colon = declaration.indexOf(':');
        if (colon === -1) continue;
        const name = declaration.slice(0, colon).trim();
        const value = declaration.slice(colon + 1).trim();
        if (!name || !value) continue;
        result[styleProperty(name)] = value;
    }
    return result;
}

/**
 * The props to spread onto a block's root element for these attributes.
 *
 * `style` becomes an object merged over whatever the block already had, so
 * a Tailwind `clip-path` and a core spacing preset can share one element.
 * Names the editor's own wrapper owns are left alone.
 */
const EDITOR_OWNED = new Set(['data-block', 'data-type', 'data-title', 'tabindex', 'role', 'contenteditable', 'draggable']);

export function htmlAttributesToProps(
    attributes: HtmlAttributes | undefined,
    existing: Record<string, unknown> = {},
    options: { inEditor?: boolean } = {}
): Record<string, unknown> {
    if (!attributes) return {};

    const props: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(attributes)) {
        if (!isAllowedAttributeName(name)) continue;
        if (options.inEditor && EDITOR_OWNED.has(name)) continue;

        if (name === 'style') {
            const parsed = styleStringToObject(value);
            const before = existing.style;
            props.style = before && typeof before === 'object'
                ? { ...(before as Record<string, unknown>), ...parsed }
                : parsed;
            continue;
        }
        props[name] = value;
    }
    return props;
}

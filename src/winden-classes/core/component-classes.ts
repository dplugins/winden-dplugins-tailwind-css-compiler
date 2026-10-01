/**
 * Winden Classes — component classes declared in the user's own CSS
 *
 * `@layer components { .card { @apply rounded-lg p-6 } }` is a real class the
 * moment it is written, and the better mechanism for a repeated look: one
 * definition, every instance follows. Tailwind does not know about it though —
 * `getClassList()` returns utilities only — so autocomplete never suggests it
 * and the helper shows an empty panel for an element wearing one.
 *
 * This module reads those declarations back out of the CSS, so both can.
 */

export interface ComponentClass {
    /** Class name without the dot: `card` */
    name: string;
    /** What it applies, when written with @apply: `rounded-lg p-6` */
    applies: string[];
    /** The declarations it sets directly, unparsed: `color: red` */
    declarations: string[];
}

/**
 * The body of every `@layer components { … }` block, brace-matched rather than
 * matched by regex — a rule inside the layer has braces of its own, and a
 * greedy pattern would stop at the first `}` or swallow the rest of the file.
 */
function componentLayerBodies(source: string): string[] {
    const bodies: string[] = [];
    // Comments first: a style tab is written out as
    // `/* Tab: Main Style (@layer components) */`, and that would match as a
    // layer opening and swallow the block it labels.
    const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const pattern = /@layer\s+([^{;]+)\{/g;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(css)) !== null) {
        const layers = match[1].split(',').map((name) => name.trim());
        const start = pattern.lastIndex;

        let depth = 1;
        let index = start;
        while (index < css.length && depth > 0) {
            if (css[index] === '{') depth++;
            else if (css[index] === '}') depth--;
            index++;
        }

        if (layers.includes('components')) bodies.push(css.slice(start, index - 1));
        pattern.lastIndex = index;
    }
    return bodies;
}

/** `.card`, `.btn-primary:hover`, `.a, .b` → the class names they define */
function classNamesIn(selector: string): string[] {
    // An escape ends the name it sits in — `.card\/2` is one class called
    // `card/2`, whose usable name is what precedes the escape. Replacing the
    // pair with a space keeps that boundary; deleting it would read `card2`.
    const cleaned = selector.replace(/\\./g, ' ');
    return [...cleaned.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]);
}

/**
 * Component classes declared in `css`, in declaration order and de-duplicated.
 * Only top-level rules of a components layer count: a nested `&:hover` belongs
 * to the class that contains it, not beside it.
 */
export function findComponentClasses(css: string): ComponentClass[] {
    const found = new Map<string, ComponentClass>();
    if (!css) return [];

    for (const body of componentLayerBodies(css)) {
        const pattern = /([^{}]+)\{/g;

        let match: RegExpExecArray | null;
        while ((match = pattern.exec(body)) !== null) {
            const selector = match[1].trim();
            const start = pattern.lastIndex;

            let depth = 1;
            let index = start;
            while (index < body.length && depth > 0) {
                if (body[index] === '{') depth++;
                else if (body[index] === '}') depth--;
                index++;
            }
            const rule = body.slice(start, index - 1);
            pattern.lastIndex = index;

            if (selector.startsWith('@')) continue;

            const applies = [...rule.matchAll(/@apply\s+([^;}]+)/g)]
                .flatMap((applied) => applied[1].trim().split(/\s+/))
                .filter(Boolean);
            const declarations = [...rule.matchAll(/([-a-zA-Z][\w-]*)\s*:\s*([^;{}]+)/g)]
                .map((declaration) => `${declaration[1].trim()}: ${declaration[2].trim()}`);

            for (const name of classNamesIn(selector)) {
                const existing = found.get(name);
                if (existing) {
                    existing.applies.push(...applies.filter((a) => !existing.applies.includes(a)));
                    existing.declarations.push(...declarations);
                } else {
                    found.set(name, { name, applies: [...applies], declarations: [...declarations] });
                }
            }
        }
    }

    return [...found.values()];
}

/** Just the names — what autocomplete needs */
export function componentClassNames(css: string): string[] {
    return findComponentClasses(css).map((component) => component.name);
}

/**
 * Winden Classes — unknown-class detection
 *
 * A mistyped class (`bg-blu-500`, `hoverr:flex`, `p-13x`) compiles to nothing
 * and fails silently: the element simply does not change, which is the most
 * common Tailwind debugging loop. This module asks the compiler which classes
 * it cannot turn into CSS so the UI can mark them.
 *
 * Design rules, in order of importance:
 *
 * 1. **Never mark a valid class.** If the compiler is missing, still loading,
 *    or throws, the answer is "nothing is unknown". A false positive is worse
 *    than no warning at all — it sends people hunting for a bug that is not
 *    there.
 * 1b. **Not every unbuildable class is a mistake.** The field this panel edits
 *    is Gutenberg's own "Additional CSS class(es)", which legitimately holds
 *    `is-style-outline`, `wp-block-*`, theme classes and JS hooks — none of
 *    which Tailwind can build, none of which are wrong. Only a class that
 *    reads as a botched utility is reported: its namespace is one the design
 *    system knows, and a real utility sits a typo away from it.
 * 2. Reuse the compiler's cached design system (`window.windenValidateClasses`)
 *    rather than compiling separately.
 * 3. Cache per class string, because the panel re-renders on every keystroke.
 */

const cache = new Map<string, string[]>();
const CACHE_LIMIT = 50;

interface CompilerWindow {
    windenValidateClasses?: (
        classNames: string[],
        customCss: string,
        configFileString?: string
    ) => Promise<{ unknown: string[] }>;
    tailwind_compiler_options?: { custom_css?: string; style_css?: string; config_content?: string };
    /** Every class the compiler knows, the same list that feeds autocomplete */
    winden_autocomplete?: string[] | Record<string, unknown>;
}

/** The compiler and its options may live in the parent window (builder iframes) */
function compilerWindow(): CompilerWindow | null {
    const candidates: unknown[] = [globalThis];
    try {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            candidates.push(window.parent);
        }
    } catch {
        // Cross-origin parent — ignore, the local window is all we have
    }
    return (candidates as CompilerWindow[]).find((w) => typeof w?.windenValidateClasses === 'function') ?? null;
}

/**
 * Mirrors the assembly in ProvidersHelpers::get_autocomplete_js — layer order,
 * then Tailwind's own imports, then the Wizzard @theme, then the Style tab.
 * Getting this wrong silently builds a design system without the defaults, and
 * every built-in class then looks unknown.
 */
function cssForValidation(source: CompilerWindow): string {
    const options = source.tailwind_compiler_options ?? {};
    const parts = [
        '@layer theme, base, components, utilities;',
        '@import "tailwindcss/theme.css" layer(theme);',
        '@import "tailwindcss/utilities.css" layer(utilities);',
    ];
    if (options.custom_css) parts.push(options.custom_css);
    if (options.style_css) parts.push(options.style_css);
    return parts.join('\n');
}

/**
 * The vocabulary behind autocomplete, as a flat list of class names. It can sit
 * on a different window from the compiler — builders run the panel in an iframe
 * and the data in the parent — so both are tried.
 */
function knownClasses(source: CompilerWindow): string[] {
    const candidates: unknown[] = [source, globalThis];
    try {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            candidates.push(window.parent);
        }
    } catch {
        // Cross-origin parent — ignore
    }

    for (const candidate of candidates as CompilerWindow[]) {
        const data = candidate?.winden_autocomplete;
        if (Array.isArray(data)) {
            const names = data.filter((entry): entry is string => typeof entry === 'string');
            if (names.length) return names;
        } else if (data && typeof data === 'object') {
            const names = Object.keys(data);
            if (names.length) return names;
        }
    }
    return [];
}

/** 'bg-blu-500' → 'bg'; the segment that decides which utility family it is */
function namespaceOf(utility: string): string {
    const dash = utility.indexOf('-');
    return dash === -1 ? utility : utility.slice(0, dash);
}

/** Levenshtein, abandoned as soon as it cannot come in under `limit` */
function withinDistance(a: string, b: string, limit: number): boolean {
    if (Math.abs(a.length - b.length) > limit) return false;

    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const current = [i];
        let best = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
            best = Math.min(best, current[j]);
        }
        if (best > limit) return false;
        previous = current;
    }
    return previous[b.length] <= limit;
}

/**
 * Does this read as a Tailwind class someone got wrong?
 *
 * Two ways to qualify. A variant typo — `hoverr:flex` — where the utility
 * itself is real and only the prefix is not. Or a utility typo, where the
 * namespace is one the design system uses and a real class sits within a
 * couple of edits: `bg-blu-500` against `bg-blue-500`. A class from another
 * system (`site-header`, `is-style-outline`) matches neither.
 */
function readsAsTypo(token: string, known: Set<string>, byNamespace: Map<string, string[]>): boolean {
    const segments = token.split(':');
    const utility = segments[segments.length - 1];
    if (!utility) return false;

    // The utility is real, so whatever failed is in the variants
    if (segments.length > 1 && known.has(utility)) return true;

    const candidates = byNamespace.get(namespaceOf(utility));
    if (!candidates) return false;

    // Two edits is the ceiling, and only once a class is long enough that two
    // edits still leave it recognisable — `p-13x` is a typo of `p-12`, whereas
    // at three or four characters two edits reach anything.
    const limit = utility.length >= 5 ? 2 : 1;
    return candidates.some((candidate) => withinDistance(utility, candidate, limit));
}

interface Vocabulary {
    known: Set<string>;
    byNamespace: Map<string, string[]>;
}

/**
 * The index is built once per vocabulary — there are ~25k classes in a stock
 * install and the panel validates on every pause in typing.
 */
let indexed: { classes: string[]; vocabulary: Vocabulary } | null = null;

function indexVocabulary(classes: string[]): Vocabulary {
    if (indexed && indexed.classes === classes) return indexed.vocabulary;

    const byNamespace = new Map<string, string[]>();
    for (const candidate of classes) {
        const namespace = namespaceOf(candidate);
        const bucket = byNamespace.get(namespace);
        if (bucket) bucket.push(candidate);
        else byNamespace.set(namespace, [candidate]);
    }

    const vocabulary = { known: new Set(classes), byNamespace };
    indexed = { classes, vocabulary };
    return vocabulary;
}

/** Drop everything that is simply not Tailwind's business — see rule 1b */
function typosOnly(unknown: string[], source: CompilerWindow): string[] {
    if (unknown.length === 0) return unknown;

    const classes = knownClasses(source);
    // No vocabulary to compare against: report nothing rather than everything
    if (classes.length === 0) return [];

    const { known, byNamespace } = indexVocabulary(classes);
    return unknown.filter((token) => readsAsTypo(token, known, byNamespace));
}

export function tokenizeClasses(classString: string): string[] {
    return (classString || '').split(/\s+/).filter(Boolean);
}

/**
 * Classes in `classString` that produce no CSS. Resolves to an empty array
 * whenever validation cannot run — see rule 1 above.
 */
export async function findUnknownClasses(classString: string): Promise<string[]> {
    const classNames = tokenizeClasses(classString);
    if (classNames.length === 0) return [];

    const key = classNames.join(' ');
    const cached = cache.get(key);
    if (cached) return cached;

    const source = compilerWindow();
    if (!source?.windenValidateClasses) return [];

    try {
        const options = source.tailwind_compiler_options ?? {};
        const result = await source.windenValidateClasses(
            classNames,
            cssForValidation(source),
            options.config_content ?? ''
        );
        const unknown = typosOnly(Array.isArray(result?.unknown) ? result.unknown : [], source);

        if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
        cache.set(key, unknown);
        return unknown;
    } catch {
        return [];
    }
}

/** Testing seam — the cache is process-wide otherwise */
export function clearValidationCache(): void {
    cache.clear();
    indexed = null;
}

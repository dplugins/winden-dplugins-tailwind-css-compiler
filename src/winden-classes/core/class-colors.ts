/**
 * Winden Classes — the colour a class paints
 *
 * `bg-red-400` and `bg-rose-400` are a paragraph apart when read and obvious
 * side by side, so the suggestion list shows the colour rather than naming it.
 *
 * The value cannot be measured on the page: Tailwind v4 emits a theme variable
 * only where some utility uses it, so `var(--color-red-500)` resolves to
 * nothing in a document that happens not to use red — including the user's own
 * palette. The compiler owns the design system and answers instead.
 */

interface ColorWindow {
    windenResolveColors?: (
        classNames: string[],
        customCss: string,
        configFileString?: string
    ) => Promise<{ colors: Record<string, string> }>;
    tailwind_compiler_options?: { custom_css?: string; style_css?: string; config_content?: string };
}

/** class → colour, or null for "asked, paints nothing" so it is not asked twice */
const cache = new Map<string, string | null>();

/** The compiler may live in the parent window — builders run panels in iframes */
function colorWindow(): ColorWindow | null {
    const candidates: unknown[] = [globalThis];
    try {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            candidates.push(window.parent);
        }
    } catch {
        // Cross-origin parent — ignore
    }
    return (candidates as ColorWindow[]).find((w) => typeof w?.windenResolveColors === 'function') ?? null;
}

/** Mirrors ProvidersHelpers::get_autocomplete_js — see class-explanation */
function cssForColors(source: ColorWindow): string {
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
 * Colours for the classes that have one, keyed by class name. Classes that
 * paint nothing are simply absent; so is everything, if the compiler is not
 * there — a missing swatch is a smaller problem than a wrong one.
 */
export async function resolveColors(classNames: string[]): Promise<Map<string, string>> {
    const wanted = [...new Set(classNames.filter(Boolean))];
    const result = new Map<string, string>();
    if (wanted.length === 0) return result;

    const missing = wanted.filter((name) => !cache.has(name));
    const source = colorWindow();

    if (missing.length > 0 && source?.windenResolveColors) {
        try {
            const { colors } = await source.windenResolveColors(
                missing,
                cssForColors(source),
                source.tailwind_compiler_options?.config_content ?? ''
            );
            for (const name of missing) {
                cache.set(name, colors?.[name] ?? null);
            }
        } catch {
            // Leave them unanswered rather than guessing a colour
        }
    }

    for (const name of wanted) {
        const colour = cache.get(name);
        if (colour) result.set(name, colour);
    }
    return result;
}

/** Testing seam — the cache is process-wide otherwise */
export function clearColorCache(): void {
    cache.clear();
}

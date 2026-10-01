/**
 * Winden Classes — what a class actually does
 *
 * `p-4` says nothing about 16px, and a theme token says even less: `bg-brand`
 * is only meaningful once you know it resolves to `oklch(0.62 0.21 12)`. The
 * compiler already writes the rule for every class it builds, so this module
 * asks for it (`window.windenExplainClasses`), reduces it to declarations the
 * UI can print, and resolves authored values like `calc(var(--spacing) * 4)`
 * to what the browser really computes.
 *
 * Same rules as class-validation: never invent an answer. If the compiler is
 * missing or throws, a class simply has no explanation and the UI shows none.
 */

import { findComponentClasses } from './component-classes';

export interface ClassDeclaration {
    property: string;
    /** As the design system wrote it: `calc(var(--spacing) * 4)` */
    value: string;
    /** What the browser computes for it, when it can be measured: `16px` */
    computed?: string;
}

export interface ClassExplanation {
    /** Set when the class is the user's own `@layer components` rule */
    isComponent?: boolean;
    /** Empty when the class builds nothing — a typo, or a class from elsewhere */
    declarations: ClassDeclaration[];
    /** `@media (width >= 48rem)`, `:hover` — why the rule may not apply now */
    conditions: string[];
    /** The rule as the design system wrote it, selector and braces included */
    css: string;
}

interface ExplainerWindow {
    windenExplainClasses?: (
        classNames: string[],
        customCss: string,
        configFileString?: string
    ) => Promise<{ css: Record<string, string | null> }>;
    tailwind_compiler_options?: { custom_css?: string; style_css?: string; config_content?: string };
}

const cache = new Map<string, ClassExplanation>();
const CACHE_LIMIT = 300;

/** The compiler may live in the parent window — builders run panels in iframes */
function explainerWindow(): ExplainerWindow | null {
    const candidates: unknown[] = [globalThis];
    try {
        if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
            candidates.push(window.parent);
        }
    } catch {
        // Cross-origin parent — ignore
    }
    return (candidates as ExplainerWindow[]).find((w) => typeof w?.windenExplainClasses === 'function') ?? null;
}

/** Mirrors ProvidersHelpers::get_autocomplete_js — see class-validation */
function cssForExplanation(source: ExplainerWindow): string {
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
 * `--tw-*` properties are the engine's own plumbing — a shadow utility writes
 * five of them before the one declaration anybody wants to read.
 */
function isPlumbing(property: string): boolean {
    return property.startsWith('--tw-');
}

/**
 * Reduce a compiled rule to its declarations and the conditions guarding them.
 *
 * ```
 * @media (width >= 48rem) {
 *   .md\:flex { display: flex }
 * }
 * ```
 * → conditions `['@media (width >= 48rem)']`, declarations `[display: flex]`
 */
export function parseRule(css: string): ClassExplanation {
    const conditions: string[] = [];
    const declarations: ClassDeclaration[] = [];
    if (!css) return { declarations, conditions, css: '' };

    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

    for (const match of withoutComments.matchAll(/@(media|supports|container)\s*([^{]+)\{/g)) {
        conditions.push(`@${match[1]} ${match[2].trim()}`);
    }

    // The selector carries the state: `.hover\:underline:hover` → `:hover`.
    // A variant's own colon is escaped in the class name (`.md\:flex`), so the
    // escapes are dropped first or every variant would look like a pseudo-class.
    for (const match of withoutComments.matchAll(/([^{}]+)\{/g)) {
        const selector = match[1].trim();
        if (!selector || selector.startsWith('@')) continue;

        const unescaped = selector.replace(/\\./g, '');
        for (const state of unescaped.matchAll(/(::?[a-z-]+(?:\([^)]*\))?)/g)) {
            if (!conditions.includes(state[1])) conditions.push(state[1]);
        }
    }

    const seen = new Set<string>();
    for (const match of withoutComments.matchAll(/([-a-zA-Z][\w-]*)\s*:\s*([^;{}]+)[;}]/g)) {
        const property = match[1].trim();
        const value = match[2].trim();
        if (!value || isPlumbing(property) || seen.has(property)) continue;
        seen.add(property);
        declarations.push({ property, value });
    }

    return { declarations, conditions, css: css.trim() };
}

/**
 * Ask the browser what a declaration really comes to.
 *
 * The declarations are set inline on a throwaway element inside the document
 * that carries the design system's custom properties — the canvas iframe, not
 * the admin page, which never loads the user's Tailwind. Inline rather than by
 * class name on purpose: Tailwind only compiles the classes a site actually
 * uses, so a helper option nobody has applied yet has no rule in that
 * stylesheet to read, while `var(--spacing)` still resolves there.
 *
 * Conditional rules are left alone: a `md:` utility measured in a canvas that
 * is not currently that wide would report the base value as though it were the
 * utility's, which is worse than saying nothing.
 */
export function resolveComputedValues(
    explanation: ClassExplanation,
    className: string,
    doc: Document | null
): ClassExplanation {
    if (!doc?.body || explanation.conditions.length > 0 || explanation.declarations.length === 0) {
        return explanation;
    }

    const probe = doc.createElement('div');
    probe.style.cssText = 'position:absolute!important;left:-9999px;top:0;visibility:hidden;pointer-events:none';
    for (const declaration of explanation.declarations) {
        probe.style.setProperty(declaration.property, declaration.value);
    }
    doc.body.appendChild(probe);

    try {
        const computed = doc.defaultView?.getComputedStyle(probe);
        if (!computed) return explanation;

        return {
            ...explanation,
            declarations: explanation.declarations.map((declaration) => {
                const value = computed.getPropertyValue(declaration.property).trim();
                // Only worth showing when it says something the author's value did not
                return value && value !== declaration.value
                    ? { ...declaration, computed: value }
                    : declaration;
            }),
        };
    } catch {
        return explanation;
    } finally {
        probe.remove();
    }
}

/**
 * A class the design system does not build may still be the user's own, from
 * `@layer components`. Tailwind reports those as unknown — they are plain CSS
 * rules, not utilities — so the rule is reconstructed from the declaration
 * instead of leaving the panel saying "builds no CSS" about a class that
 * plainly works.
 */
function explainComponent(name: string, source: ExplainerWindow): ClassExplanation | null {
    const options = source.tailwind_compiler_options ?? {};
    const declared = findComponentClasses(`${options.custom_css ?? ''}\n${options.style_css ?? ''}`)
        .find((component) => component.name === name);
    if (!declared) return null;

    const body = [
        declared.applies.length ? `  @apply ${declared.applies.join(' ')};` : '',
        ...declared.declarations.map((declaration) => `  ${declaration};`),
    ].filter(Boolean).join('\n');

    return {
        isComponent: true,
        conditions: [],
        // Kept as authored: an @apply list is the answer here, and expanding it
        // would hide the very thing that makes it one class instead of ten.
        declarations: [],
        css: `.${name} {\n${body}\n}`,
    };
}

/**
 * The rule as it should be read: exactly what the design system wrote, with
 * every authored value that could be measured replaced by what it comes to.
 * `.p-4 { padding: calc(var(--spacing) * 4) }` is an implementation detail;
 * `.p-4 { padding: 16px }` is the answer to the question being asked.
 */
export function formatRule(explanation: ClassExplanation): string {
    let text = explanation.css;
    for (const declaration of explanation.declarations) {
        if (!declaration.computed) continue;
        text = text.replace(
            `${declaration.property}: ${declaration.value}`,
            `${declaration.property}: ${declaration.computed}`
        );
    }
    return text;
}

/**
 * What each class does, keyed by class name. Classes the design system does not
 * build resolve to an empty declaration list rather than being dropped, so a
 * caller can tell "builds nothing" from "not asked about".
 */
export async function explainClasses(
    classNames: string[],
    doc: Document | null = null
): Promise<Map<string, ClassExplanation>> {
    const wanted = [...new Set(classNames.filter(Boolean))];
    const result = new Map<string, ClassExplanation>();
    if (wanted.length === 0) return result;

    const missing = wanted.filter((name) => !cache.has(name));
    const source = explainerWindow();

    if (missing.length > 0 && source?.windenExplainClasses) {
        try {
            const { css } = await source.windenExplainClasses(
                missing,
                cssForExplanation(source),
                source.tailwind_compiler_options?.config_content ?? ''
            );
            for (const name of missing) {
                const built = css?.[name];
                const explanation = built
                    ? resolveComputedValues(parseRule(built), name, doc)
                    : explainComponent(name, source) ?? parseRule('');
                if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
                cache.set(name, explanation);
            }
        } catch {
            // Leave them unexplained — the UI shows nothing rather than a guess
        }
    }

    for (const name of wanted) {
        const explanation = cache.get(name);
        if (explanation) result.set(name, explanation);
    }
    return result;
}

/** Testing seam — the cache is process-wide otherwise */
export function clearExplanationCache(): void {
    cache.clear();
}

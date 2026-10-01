/**
 * Winden Classes Helper — Wizzard theme integration
 *
 * Parses the user's @theme CSS (Wizzard configCode, delivered to the builder
 * as window.tailwind_compiler_options.custom_css) into structured tokens so
 * the helper's swatch grids can show the project's own design system first —
 * and hide the default Tailwind palette entirely when the Wizzard resets it
 * with `--color-*: initial`.
 *
 * Pure functions, no DOM — vitest-testable. The UI layer reads the CSS from
 * the window and passes it in.
 */

import type { ColorPrefix, HelperOption, HelperProperty } from './helper-schema';

/** @theme variable families the helper understands, beyond --color-* */
export type TokenFamily = 'spacing' | 'text' | 'radius' | 'shadow' | 'font';

const TOKEN_FAMILIES: TokenFamily[] = ['spacing', 'text', 'radius', 'shadow', 'font'];

export interface ParsedTheme {
    /** Custom color families, shades keyed 50…950; single colors have shade '' */
    colorFamilies: Array<{ name: string; shades: Array<{ shade: string; css: string }> }>;
    /** Named tokens per family: { spacing: ['section'], text: ['hero'], … } */
    namedTokens: Record<TokenFamily, string[]>;
    /** Named spacing tokens (--spacing-sm → p-sm, gap-sm, …) */
    spacingNames: string[];
    /** True when the theme resets the default palette (--color-*: initial) */
    colorReset: boolean;
    /** True when the theme resets the default spacing scale */
    spacingReset: boolean;
}

const emptyTokens = (): Record<TokenFamily, string[]> => ({
    spacing: [], text: [], radius: [], shadow: [], font: [],
});

const EMPTY_THEME: ParsedTheme = {
    colorFamilies: [],
    namedTokens: emptyTokens(),
    spacingNames: [],
    colorReset: false,
    spacingReset: false,
};

const SHADE_PATTERN = /^(50|[1-9]50|[1-9]00)$/; // 50, 100…900, 950

export function parseTheme(css: string): ParsedTheme {
    if (!css || !css.includes('@theme')) return EMPTY_THEME;

    const colorReset = /--color-\*\s*:\s*initial/.test(css);
    const spacingReset = /--spacing-\*\s*:\s*initial/.test(css);

    const familyMap = new Map<string, Array<{ shade: string; css: string }>>();
    const colorVar = /--color-([a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let match: RegExpExecArray | null;
    while ((match = colorVar.exec(css)) !== null) {
        const fullName = match[1];
        const value = match[2].trim();
        if (fullName === '*' || value === 'initial') continue;

        // Trailing -NNN is a shade when it looks like one (brand-500 → brand / 500)
        const lastDash = fullName.lastIndexOf('-');
        const tail = lastDash > 0 ? fullName.slice(lastDash + 1) : '';
        const isShade = SHADE_PATTERN.test(tail);
        const family = isShade ? fullName.slice(0, lastDash) : fullName;
        const shade = isShade ? tail : '';

        if (!familyMap.has(family)) familyMap.set(family, []);
        familyMap.get(family)!.push({ shade, css: value });
    }

    // --spacing-section, --text-hero, --radius-card, --shadow-glow, --font-display
    const namedTokens = emptyTokens();
    for (const family of TOKEN_FAMILIES) {
        const pattern = new RegExp(`--${family}-([a-z][a-z0-9-]*)\\s*:\\s*([^;]+);`, 'gi');
        while ((match = pattern.exec(css)) !== null) {
            if (match[1] !== '*' && match[2].trim() !== 'initial') {
                namedTokens[family].push(match[1]);
            }
        }
    }

    return {
        colorFamilies: [...familyMap.entries()].map(([name, shades]) => ({ name, shades })),
        namedTokens,
        spacingNames: namedTokens.spacing,
        colorReset,
        spacingReset,
    };
}

/** Swatch options for the user's own palette, in Wizzard order */
export function buildThemeColorOptions(theme: ParsedTheme, prefix: ColorPrefix): HelperOption[] {
    return theme.colorFamilies.flatMap(({ name, shades }) =>
        shades.map(({ shade, css }) => ({
            value: shade ? `${prefix}-${name}-${shade}` : `${prefix}-${name}`,
            label: shade ? `${name}-${shade}` : name,
            swatch: css,
            family: name,
            shade: shade || undefined,
        }))
    );
}

/**
 * Merge theme swatches ahead of the default palette. When the Wizzard resets
 * the palette, defaults would compile to nothing — drop them.
 */
export function mergeSwatchOptions(defaults: HelperOption[], theme: ParsedTheme, prefix: ColorPrefix): HelperOption[] {
    const custom = buildThemeColorOptions(theme, prefix);
    if (theme.colorReset) return custom.length > 0 ? custom : defaults;
    if (custom.length === 0) return defaults;
    const customValues = new Set(custom.map((o) => o.value));
    return [...custom, ...defaults.filter((o) => !customValues.has(o.value))];
}

/**
 * Extra chip options for named Wizzard spacing tokens (gap-sm, p-md, …).
 * `utilityPrefix` is e.g. 'gap', 'p', 'mt'.
 */
export function buildThemeSpacingOptions(theme: ParsedTheme, utilityPrefix: string): HelperOption[] {
    return theme.spacingNames.map((name) => ({
        value: `${utilityPrefix}-${name}`,
        label: name,
    }));
}

/** Colour properties and the utility prefix their swatches use */
export const COLOR_PROPERTY_PREFIX: Record<string, ColorPrefix> = {
    'background-color': 'bg',
    'text-color': 'text',
    'border-color': 'border',
    'outline-color': 'outline',
    'shadow-color': 'shadow',
    'gradient-from': 'from',
    'gradient-via': 'via',
    'gradient-to': 'to',
};

/**
 * Which @theme family a property draws its named tokens from. The utility
 * prefix is taken from the property's own options, so sided rows keep their
 * edge (`rounded-t-card`, `pt-section`) — verified against the compiler:
 * radius tokens apply to every side and corner, spacing to every edge.
 */
const PROPERTY_TOKEN_FAMILY: Array<{ match: RegExp; family: TokenFamily }> = [
    { match: /^(gap|padding|margin|offset)(-|$)/, family: 'spacing' },
    { match: /^text-size$/, family: 'text' },
    { match: /^border-radius(-|$)/, family: 'radius' },
    { match: /^shadow$/, family: 'shadow' },
    { match: /^font-family$/, family: 'font' },
];

function tokenFamilyOf(property: HelperProperty): TokenFamily | null {
    return PROPERTY_TOKEN_FAMILY.find(({ match }) => match.test(property.id))?.family ?? null;
}

function namedTokenPrefix(property: HelperProperty): string | null {
    const first = property.options[0];
    if (!first) return null;
    // `rounded` / `border-t` style bare options carry no value segment to strip
    return first.value.includes('-') ? first.value.replace(/-[^-]*$/, '') : first.value;
}

/**
 * The options a property really offers once the user's @theme is taken into
 * account. Used both for rendering and for detecting which option is active,
 * so a token that only exists in the theme still reads back as selected.
 */
export function mergeThemeOptions(property: HelperProperty, theme: ParsedTheme | null): HelperOption[] {
    if (!theme) return property.options;

    const colorPrefix = COLOR_PROPERTY_PREFIX[property.id];
    if (colorPrefix) return mergeSwatchOptions(property.options, theme, colorPrefix);

    const family = tokenFamilyOf(property);
    const names = family ? theme.namedTokens[family] : [];
    const prefix = family ? namedTokenPrefix(property) : null;
    if (prefix && names.length > 0) {
        return [...property.options, ...names.map((name) => ({ value: `${prefix}-${name}`, label: name }))];
    }

    return property.options;
}

/**
 * Tests for the Winden Classes helper theme parser
 * Covers: parseTheme, mergeSwatchOptions, buildThemeSpacingOptions
 */

import { describe, test, expect } from 'vitest';
import {
    COLOR_PROPERTY_PREFIX,
    mergeThemeOptions,
    buildThemeColorOptions,
    buildThemeSpacingOptions,
    mergeSwatchOptions,
    parseTheme,
} from '../src/winden-classes/core/helper-theme';
import { buildColorOptions, HELPER_SCHEMA, type HelperProperty } from '../src/winden-classes/core/helper-schema';

const WIZZARD_CSS = `@theme {
    --color-brand-50: #eef2ff;
    --color-brand-500: #6366f1;
    --color-brand-950: #1e1b4b;
    --color-accent: #f97316;
    --spacing-section: 6rem;
    --spacing-card: 1.5rem;
    --text-hero: 4rem;
    --radius-card: 14px;
    --shadow-glow: 0 0 20px #0ff;
    --font-display: "Playfair", serif;
}`;

const RESET_CSS = `@theme {
    --color-*: initial;
    --color-primary: #3b82f6;
    --spacing-*: initial;
}`;

describe('parseTheme', () => {
    test('groups shaded families and keeps single colors', () => {
        const theme = parseTheme(WIZZARD_CSS);
        expect(theme.colorFamilies.map((f) => f.name)).toEqual(['brand', 'accent']);
        expect(theme.colorFamilies[0].shades.map((s) => s.shade)).toEqual(['50', '500', '950']);
        expect(theme.colorFamilies[1].shades).toEqual([{ shade: '', css: '#f97316' }]);
        expect(theme.colorReset).toBe(false);
    });

    test('extracts named spacing tokens', () => {
        expect(parseTheme(WIZZARD_CSS).spacingNames).toEqual(['section', 'card']);
    });

    test('detects wildcard resets and skips the wildcard itself', () => {
        const theme = parseTheme(RESET_CSS);
        expect(theme.colorReset).toBe(true);
        expect(theme.spacingReset).toBe(true);
        expect(theme.colorFamilies.map((f) => f.name)).toEqual(['primary']);
    });

    test('non-theme or empty CSS yields empty theme', () => {
        expect(parseTheme('').colorFamilies).toEqual([]);
        expect(parseTheme('.foo { color: red; }').colorFamilies).toEqual([]);
    });
});

describe('buildThemeColorOptions', () => {
    test('builds prefixed classes with swatches', () => {
        const options = buildThemeColorOptions(parseTheme(WIZZARD_CSS), 'bg');
        expect(options.map((o) => o.value)).toEqual(['bg-brand-50', 'bg-brand-500', 'bg-brand-950', 'bg-accent']);
        expect(options[1].swatch).toBe('#6366f1');
        expect(options[3].family).toBe('accent');
    });
});

describe('mergeSwatchOptions', () => {
    const defaults = buildColorOptions('bg');

    test('theme colors come first, defaults keep following', () => {
        const merged = mergeSwatchOptions(defaults, parseTheme(WIZZARD_CSS), 'bg');
        expect(merged[0].value).toBe('bg-brand-50');
        expect(merged.length).toBe(defaults.length + 4);
        expect(merged.some((o) => o.value === 'bg-red-500')).toBe(true);
    });

    test('palette reset drops the defaults', () => {
        const merged = mergeSwatchOptions(defaults, parseTheme(RESET_CSS), 'bg');
        expect(merged.map((o) => o.value)).toEqual(['bg-primary']);
    });

    test('empty theme leaves defaults untouched', () => {
        expect(mergeSwatchOptions(defaults, parseTheme(''), 'bg')).toBe(defaults);
    });
});

describe('buildThemeSpacingOptions', () => {
    test('maps named tokens onto the utility prefix', () => {
        const options = buildThemeSpacingOptions(parseTheme(WIZZARD_CSS), 'gap');
        expect(options.map((o) => o.value)).toEqual(['gap-section', 'gap-card']);
    });
});

describe('mergeThemeOptions', () => {
    const theme = parseTheme(WIZZARD_CSS);
    const find = (id: string): HelperProperty => {
        const walk = (properties: HelperProperty[]): HelperProperty | undefined => {
            for (const property of properties) {
                if (property.id === id) return property;
                if (property.sideProperties) {
                    const hit = walk(property.sideProperties);
                    if (hit) return hit;
                }
                for (const branch of property.children ?? []) {
                    const hit = walk(branch.properties);
                    if (hit) return hit;
                }
            }
            return undefined;
        };
        for (const group of HELPER_SCHEMA) {
            const hit = walk(group.properties);
            if (hit) return hit;
        }
        throw new Error(`property not found: ${id}`);
    };

    test('colour properties gain the theme palette, defaults kept', () => {
        const options = mergeThemeOptions(find('background-color'), theme);
        expect(options[0].value).toBe('bg-brand-50');
        expect(options.some((o) => o.value === 'bg-red-500')).toBe(true);
    });

    test('every colour property resolves its own prefix', () => {
        for (const [id, prefix] of Object.entries(COLOR_PROPERTY_PREFIX)) {
            const options = mergeThemeOptions(find(id), theme);
            expect(options.some((o) => o.value === `${prefix}-accent`), `${id} missing ${prefix}-accent`).toBe(true);
        }
    });

    test('spacing tokens reach gap, padding, margin and offsets', () => {
        expect(mergeThemeOptions(find('gap-all'), theme).some((o) => o.value === 'gap-section')).toBe(true);
        expect(mergeThemeOptions(find('padding-top'), theme).some((o) => o.value === 'pt-card')).toBe(true);
        expect(mergeThemeOptions(find('margin-x'), theme).some((o) => o.value === 'mx-section')).toBe(true);
        expect(mergeThemeOptions(find('offset-top'), theme).some((o) => o.value === 'top-card')).toBe(true);
    });

    test('unrelated properties are untouched', () => {
        const display = find('display');
        expect(mergeThemeOptions(display, theme)).toBe(display.options);
    });

    test('no theme leaves options alone', () => {
        const bg = find('background-color');
        expect(mergeThemeOptions(bg, null)).toBe(bg.options);
    });
});

describe('named token families beyond spacing', () => {
    const theme = parseTheme(WIZZARD_CSS);
    const find = (id: string): HelperProperty => {
        const walk = (properties: HelperProperty[]): HelperProperty | undefined => {
            for (const property of properties) {
                if (property.id === id) return property;
                if (property.sideProperties) {
                    const hit = walk(property.sideProperties);
                    if (hit) return hit;
                }
                for (const branch of property.children ?? []) {
                    const hit = walk(branch.properties);
                    if (hit) return hit;
                }
            }
            return undefined;
        };
        for (const group of HELPER_SCHEMA) {
            const hit = walk(group.properties);
            if (hit) return hit;
        }
        throw new Error(`property not found: ${id}`);
    };

    test('every family is parsed off the @theme block', () => {
        expect(theme.namedTokens).toEqual({
            spacing: ['section', 'card'],
            text: ['hero'],
            radius: ['card'],
            shadow: ['glow'],
            font: ['display'],
        });
    });

    test('text tokens reach the text size chips', () => {
        expect(mergeThemeOptions(find('text-size'), theme).some((o) => o.value === 'text-hero')).toBe(true);
    });

    test('radius tokens reach every side and corner', () => {
        expect(mergeThemeOptions(find('border-radius-all'), theme).some((o) => o.value === 'rounded-card')).toBe(true);
        expect(mergeThemeOptions(find('border-radius-top'), theme).some((o) => o.value === 'rounded-t-card')).toBe(true);
        expect(mergeThemeOptions(find('border-radius-tl'), theme).some((o) => o.value === 'rounded-tl-card')).toBe(true);
    });

    test('shadow and font tokens reach their properties', () => {
        expect(mergeThemeOptions(find('shadow'), theme).some((o) => o.value === 'shadow-glow')).toBe(true);
        expect(mergeThemeOptions(find('font-family'), theme).some((o) => o.value === 'font-display')).toBe(true);
    });

    test('a family with no tokens leaves its property untouched', () => {
        const bare = parseTheme('@theme { --color-x: red; }');
        const textSize = find('text-size');
        expect(mergeThemeOptions(textSize, bare)).toBe(textSize.options);
    });

    test('spacingNames still mirrors the spacing family', () => {
        expect(theme.spacingNames).toEqual(theme.namedTokens.spacing);
    });
});

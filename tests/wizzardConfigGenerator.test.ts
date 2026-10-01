/**
 * The Wizzard's `@theme` config, and the one shape of it that destroys a site.
 *
 * "Replace rather than extend" emits Tailwind's wildcard reset —
 * `--color-*: initial` — which is right when a palette follows it and ruinous
 * when nothing does. Measured on a site in that state: the Style Guide showed
 * no colours, no font families and no font sizes; `bg-red-500` compiled to
 * nothing; `p-4` produced no padding, `--spacing-*: initial` having removed
 * the scale it is built from. Font weights were the only survivors, being a
 * namespace of their own.
 */

import { describe, test, expect } from 'vitest';
import generateTailwindConfig from '../src/admin/components/pages/Wizzard/utils/configGenerator';

describe('the Wizzard config', () => {
    test('a reset with nothing to put back is not written at all', () => {
        const config = generateTailwindConfig({
            colorsActive: true,
            spacesActive: true,
            fontSizesActive: true,
            fontFamilyActive: true,
            borderRadiusActive: true,
            breakpointsActive: true,
            // Every namespace set to replace rather than extend…
            extendColors: false,
            extendSpacing: false,
            extendFontSizes: false,
            extendFontFamily: false,
            extendBorderRadius: false,
            extendBreakpoints: false,
            // …and nothing defined to replace them with
        } as never);

        expect(config).not.toContain('initial');
        expect(config.replace(/\s/g, '')).toBe('@theme{}');
    });

    test('a reset with a palette behind it is written, because that is what it means', () => {
        const config = generateTailwindConfig({
            colorsActive: true,
            extendColors: false,
            colorsBuilders: { primary: '#3b82f6' },
            fontSizesActive: false,
            fontFamilyActive: false,
            spacesActive: false,
            borderRadiusActive: false,
            breakpointsActive: false,
        } as never);

        expect(config).toContain('--color-*: initial;');
        expect(config).toContain('--color-primary: #3b82f6;');
    });

    test('extending leaves the defaults alone', () => {
        const config = generateTailwindConfig({
            colorsActive: true,
            extendColors: true,
            colorsBuilders: { primary: '#3b82f6' },
            fontSizesActive: false,
            fontFamilyActive: false,
            spacesActive: false,
            borderRadiusActive: false,
            breakpointsActive: false,
        } as never);

        expect(config).not.toContain('--color-*: initial;');
        expect(config).toContain('--color-primary: #3b82f6;');
    });

    /**
     * How a real site ended up with every namespace deleted.
     *
     * A state saved by an older version does not carry every key the current
     * one expects. The generator's own defaults said "active" and "replace",
     * the opposite of `defaultWizzardState` — so keys nobody had ever set
     * asked for every Tailwind default to be thrown away.
     */
    test('keys nobody set do not switch a feature on, or turn off extending', () => {
        const config = generateTailwindConfig({} as never);

        expect(config).not.toContain('initial');
        expect(config.replace(/\s/g, '')).toBe('@theme{}');
    });

    test('a feature switched on with no preference still extends', () => {
        const config = generateTailwindConfig({
            colorsActive: true,
            colorsBuilders: { primary: '#3b82f6' },
        } as never);

        expect(config).not.toContain('--color-*: initial;');
        expect(config).toContain('--color-primary: #3b82f6;');
    });
});

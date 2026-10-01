/**
 * The `@plugin` lines a Style tab carries. The compiler has always resolved
 * them — three bundled, anything else from esm.sh — so this is only about
 * reading and writing the declaration without hand-editing CSS.
 */

import { describe, test, expect } from 'vitest';
import {
    addPlugin,
    enabledPlugins,
    isValidPluginName,
    listPlugins,
    removePlugin,
    setPluginEnabled,
} from '../src/admin/utils/tailwindPlugins';

const STYLE = `@layer theme, base, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);

@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";

@layer components {
  .card { @apply p-6; }
}
`;

describe('listPlugins', () => {
    test('reads the declared plugins in order', () => {
        expect(listPlugins(STYLE)).toEqual([
            { name: '@tailwindcss/typography', enabled: true },
            { name: '@tailwindcss/forms', enabled: true },
        ]);
    });

    test('a commented declaration is listed as switched off, not lost', () => {
        const css = '/* @plugin "daisyui"; */\n@plugin "@tailwindcss/forms";\n';
        expect(listPlugins(css)).toEqual([
            { name: 'daisyui', enabled: false },
            { name: '@tailwindcss/forms', enabled: true },
        ]);
        expect(enabledPlugins(css)).toEqual(['@tailwindcss/forms']);
    });

    test('single quotes and a missing semicolon still count', () => {
        expect(listPlugins("@plugin 'daisyui'\n")).toEqual([{ name: 'daisyui', enabled: true }]);
    });

    test('nothing declared is not an error', () => {
        expect(listPlugins('')).toEqual([]);
        expect(listPlugins('.card { color: red }')).toEqual([]);
    });
});

describe('setPluginEnabled', () => {
    test('switching off keeps the line, commented in place', () => {
        const off = setPluginEnabled(STYLE, '@tailwindcss/forms', false);
        expect(off).toContain('/* @plugin "@tailwindcss/forms"; */');
        expect(listPlugins(off)).toContainEqual({ name: '@tailwindcss/forms', enabled: false });
        // Still where it was, between the other declarations
        expect(off.indexOf('@tailwindcss/forms')).toBeLessThan(off.indexOf('@layer components'));
    });

    test('switching back on restores the directive', () => {
        const off = setPluginEnabled(STYLE, '@tailwindcss/forms', false);
        expect(setPluginEnabled(off, '@tailwindcss/forms', true)).toBe(STYLE);
    });

    test('switching on one that is not there adds it', () => {
        expect(enabledPlugins(setPluginEnabled('', 'daisyui', true))).toEqual(['daisyui']);
    });

    test('switching off one that is not there changes nothing', () => {
        expect(setPluginEnabled(STYLE, 'daisyui', false)).toBe(STYLE);
    });
});

describe('addPlugin', () => {
    test('lands with the other declarations, not at the end of the file', () => {
        const next = addPlugin(STYLE, 'daisyui');
        expect(enabledPlugins(next)).toEqual([
            '@tailwindcss/typography', '@tailwindcss/forms', 'daisyui',
        ]);
        // Before the rules, so the top of the file still reads as a preamble
        expect(next.indexOf('@plugin "daisyui"')).toBeLessThan(next.indexOf('@layer components'));
    });

    test('adding the same one twice changes nothing', () => {
        expect(addPlugin(STYLE, '@tailwindcss/forms')).toBe(STYLE);
    });

    test('adding one that is switched off turns it back on in place', () => {
        const off = setPluginEnabled(STYLE, '@tailwindcss/forms', false);
        expect(addPlugin(off, '@tailwindcss/forms')).toBe(STYLE);
    });

    test('a file with no imports gets the line at the top', () => {
        expect(addPlugin('.card { color: red }', 'daisyui'))
            .toBe('@plugin "daisyui";\n.card { color: red }');
    });

    test('an empty file is a file', () => {
        expect(addPlugin('', 'daisyui')).toBe('@plugin "daisyui";\n');
    });
});

describe('removePlugin', () => {
    test('takes the line out and leaves no gap behind', () => {
        const next = removePlugin(STYLE, '@tailwindcss/typography');
        expect(enabledPlugins(next)).toEqual(['@tailwindcss/forms']);
        expect(next).not.toContain('\n\n\n');
    });

    test('removes a switched-off declaration too', () => {
        const off = setPluginEnabled(STYLE, '@tailwindcss/forms', false);
        expect(listPlugins(removePlugin(off, '@tailwindcss/forms')))
            .toEqual([{ name: '@tailwindcss/typography', enabled: true }]);
    });

    test('removing one that is not there changes nothing', () => {
        expect(removePlugin(STYLE, 'daisyui')).toBe(STYLE);
    });

    test('a name with regex characters is matched literally', () => {
        const css = '@plugin "a.b+c";\n@plugin "keep-me";\n';
        expect(enabledPlugins(removePlugin(css, 'a.b+c'))).toEqual(['keep-me']);
    });
});

describe('isValidPluginName', () => {
    test('accepts what npm accepts', () => {
        for (const name of ['daisyui', '@tailwindcss/forms', 'flowbite/plugin', 'tw-elements']) {
            expect(isValidPluginName(name), name).toBe(true);
        }
    });

    test('rejects what would break the line', () => {
        for (const name of ['', ' ', 'has space', 'quote"inside', 'semi;colon', '../relative']) {
            expect(isValidPluginName(name), name).toBe(false);
        }
    });
});

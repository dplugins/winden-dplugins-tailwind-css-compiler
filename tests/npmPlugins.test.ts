/**
 * Reading the registry well enough to tell a Tailwind v4 plugin from a v3 one.
 *
 * Every range below is verbatim from a published package — sampled from the
 * registry rather than invented, because the shapes are the whole difficulty.
 */

import { describe, test, expect } from 'vitest';
import {
    admitsTailwind4,
    buildSearchUrl,
    classifyCompatibility,
    looksLikeTailwindPlugin,
    parseSearchResults,
} from '../src/admin/utils/npmPlugins';

describe('buildSearchUrl', () => {
    test('biases the query rather than filtering the registry', () => {
        // `keywords:tailwindcss-plugin daisy` makes npm ignore "daisy" and
        // return safe-area helpers, never daisyUI. Verified against the live
        // registry before choosing this.
        expect(buildSearchUrl('daisy')).toContain(encodeURIComponent('daisy tailwind'));
        expect(buildSearchUrl('daisy')).not.toContain('keywords');
    });

    test('searches verbatim when the filter is off', () => {
        expect(buildSearchUrl('daisy', false)).toContain('text=daisy');
    });
});

describe('looksLikeTailwindPlugin', () => {
    const base = { version: '1.0.0', description: '', npmUrl: '', keywords: [] as string[] };

    test('a Tailwind keyword counts, whatever the name', () => {
        expect(looksLikeTailwindPlugin({ ...base, name: 'daisyui', keywords: ['tailwind css'] })).toBe(true);
    });

    test('so does the name, for packages that skip keywords', () => {
        expect(looksLikeTailwindPlugin({ ...base, name: 'tailwind-scrollbar' })).toBe(true);
    });

    test('an unrelated package is left out', () => {
        expect(looksLikeTailwindPlugin({ ...base, name: 'prose', keywords: ['text'] })).toBe(false);
    });
});

describe('admitsTailwind4', () => {
    test('accepts ranges that include 4', () => {
        // Real ranges: typography, forms, tailwind-scrollbar, safe-area
        for (const range of [
            '>=3.0.0 || >=4.0.0 || insiders',
            '>=3.0.0 || >= 3.0.0-alpha.1 || >= 4.0.0-alpha.20 || >= 4.0.0-beta.1',
            '4.x',
            '^4.0.0',
            '^4.1.12',
            '>=3',
            '*',
        ]) {
            expect(admitsTailwind4(range), range).toBe(true);
        }
    });

    test('an open lower bound admits 4 even without mentioning it', () => {
        // tailwindcss-animate ships `>=3.0.0 || insiders`, which does allow v4 —
        // reading the string for a "4" would call this v3-only.
        expect(admitsTailwind4('>=3.0.0 || insiders')).toBe(true);
    });

    test('rejects ranges capped below 4', () => {
        for (const range of ['^3.0.0', '~3.4.1', '3.x', '>=2 <4', '<4.0.0', '^2.0.0']) {
            expect(admitsTailwind4(range), range).toBe(false);
        }
    });

    test('says no when there is nothing to read', () => {
        expect(admitsTailwind4(null)).toBe(false);
        expect(admitsTailwind4('')).toBe(false);
        expect(admitsTailwind4('insiders')).toBe(false);
    });
});

describe('classifyCompatibility', () => {
    test('a peer range decides it', () => {
        expect(classifyCompatibility({ peerDependencies: { tailwindcss: '^4.0.0' } }))
            .toEqual({ support: 'v4', range: '^4.0.0' });
        expect(classifyCompatibility({ peerDependencies: { tailwindcss: '^3.4.0' } }))
            .toEqual({ support: 'v3-only', range: '^3.4.0' });
    });

    test('a dependency counts when there is no peer — flowbite does this', () => {
        expect(classifyCompatibility({ dependencies: { tailwindcss: '^4.1.12' } }))
            .toEqual({ support: 'v4', range: '^4.1.12' });
    });

    test('a package that declares nothing is unknown, not compatible', () => {
        // daisyUI declares neither, and guessing on its behalf would be a lie
        expect(classifyCompatibility({ version: '5.7.17' }))
            .toEqual({ support: 'unknown', range: null });
        expect(classifyCompatibility(null)).toEqual({ support: 'unknown', range: null });
    });
});

describe('parseSearchResults', () => {
    const payload = {
        objects: [
            {
                package: {
                    name: 'tailwindcss-safe-area',
                    version: '1.3.0',
                    description: 'Tailwind CSS safe area helpers',
                    keywords: ['tailwindcss', 'tailwindcss-plugin'],
                    links: { npm: 'https://www.npmjs.com/package/tailwindcss-safe-area' },
                },
            },
            { package: { name: 'no-links' } },
            { nothing: true },
        ],
    };

    test('keeps what the UI shows and nothing else', () => {
        const [first, second] = parseSearchResults(payload);
        expect(first).toEqual({
            name: 'tailwindcss-safe-area',
            version: '1.3.0',
            description: 'Tailwind CSS safe area helpers',
            npmUrl: 'https://www.npmjs.com/package/tailwindcss-safe-area',
            keywords: ['tailwindcss', 'tailwindcss-plugin'],
        });
        // A package page can always be reached, link or no link in the response
        expect(second.npmUrl).toBe('https://www.npmjs.com/package/no-links');
    });

    test('entries without a package are dropped, not crashed on', () => {
        expect(parseSearchResults(payload)).toHaveLength(2);
        expect(parseSearchResults({})).toEqual([]);
        expect(parseSearchResults(null)).toEqual([]);
    });
});

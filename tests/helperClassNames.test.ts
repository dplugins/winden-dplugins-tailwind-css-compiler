/**
 * Every class name the helper can produce must actually exist in the installed
 * Tailwind build. Names were originally written from memory and the docs, and
 * five of them did not exist (rotate-x-none, rotate-y-none, rotate-z-none,
 * translate-x-none, translate-y-none) — they compiled to nothing and failed
 * silently in the editor. This test compiles the whole schema through the real
 * compiler so that can never regress.
 *
 * A deliberately fake class is compiled alongside the real ones: if the
 * detector stops working, that control fails first and the suite says so
 * instead of quietly passing everything.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { compile } from 'tailwindcss';
import { HELPER_SCHEMA, type HelperProperty } from '../src/winden-classes/core/helper-schema';

const CONTROL_CLASS = 'winden-control-class-that-cannot-exist';

function collectOptionValues(): string[] {
    const values = new Set<string>();
    const walk = (properties: HelperProperty[]) => {
        for (const property of properties) {
            for (const option of property.options) values.add(option.value);
            if (property.sideProperties) walk(property.sideProperties);
            for (const branch of property.children ?? []) walk(branch.properties);
        }
    };
    for (const group of HELPER_SCHEMA) walk(group.properties);
    return [...values];
}

/**
 * Tailwind writes a literal backslash before special characters in selectors:
 * `p-0.5` → `.p-0\.5`, `w-1/2` → `.w-1\/2`, `bg-[#fff]` → `.bg-\[\#fff\]`.
 * Build that escaped form, then escape it again for the regex engine.
 */
function selectorPattern(className: string): RegExp {
    const cssEscaped = className.replace(/[.*+?^${}()|[\]\\/#%:&~=<>'"!,]/g, '\\$&');
    const regexSafe = cssEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\.${regexSafe}(?![\\w-])`);
}

describe('helper class names exist in the installed Tailwind', () => {
    let css = '';
    const classNames = collectOptionValues();

    beforeAll(async () => {
        const compiler = await compile('@import "tailwindcss";', {
            base: process.cwd(),
            loadStylesheet: async (id: string, base: string) => {
                const path = id === 'tailwindcss' ? 'node_modules/tailwindcss/index.css' : id;
                return { path, base: base || 'node_modules/tailwindcss', content: readFileSync(path, 'utf8') };
            },
        });
        css = compiler.build([...classNames, CONTROL_CLASS]);
    }, 60_000);

    test('the detector itself works (control class is reported missing)', () => {
        expect(selectorPattern(CONTROL_CLASS).test(css)).toBe(false);
    });

    test('the schema is not empty', () => {
        expect(classNames.length).toBeGreaterThan(400);
    });

    test('every option compiles to a real utility', () => {
        const missing = classNames.filter((name) => !selectorPattern(name).test(css));
        expect(missing, `these classes produce no CSS: ${missing.join(', ')}`).toEqual([]);
    });
});

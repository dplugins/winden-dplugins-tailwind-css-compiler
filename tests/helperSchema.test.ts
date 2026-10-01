/**
 * Tests for the Winden Classes helper schema
 * Covers: structural sanity, color option generation, conditional children
 */

import { describe, test, expect } from 'vitest';
import {
    HELPER_SCHEMA,
    buildColorOptions,
    getColorFamilies,
    type HelperProperty,
} from '../src/winden-classes/core/helper-schema';

function allProperties(): HelperProperty[] {
    const out: HelperProperty[] = [];
    const walk = (properties: HelperProperty[]) => {
        for (const property of properties) {
            out.push(property);
            if (property.sideProperties) walk(property.sideProperties);
            for (const branch of property.children ?? []) walk(branch.properties);
        }
    };
    for (const group of HELPER_SCHEMA) walk(group.properties);
    return out;
}

describe('HELPER_SCHEMA structure', () => {
    test('has every group in order', () => {
        expect(HELPER_SCHEMA.map((g) => g.id)).toEqual([
            'layout', 'spacing', 'background', 'typography', 'borders',
            'sizing', 'position', 'effects', 'filters', 'transforms', 'motion',
        ]);
    });

    test('group ids are unique', () => {
        const ids = HELPER_SCHEMA.map((g) => g.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('property ids are unique except deliberately shared defs', () => {
        const properties = allProperties();
        const byId = new Map<string, HelperProperty[]>();
        for (const property of properties) {
            byId.set(property.id, [...(byId.get(property.id) ?? []), property]);
        }
        for (const [id, defs] of byId) {
            if (defs.length > 1) {
                // Shared defs must be the same object (gap and the alignment
                // properties are reused by both the flex and grid branches)
                expect(new Set(defs).size).toBe(1);
            }
        }
    });

    test('every option has a non-empty class value', () => {
        for (const property of allProperties()) {
            if (property.control === 'sided-chip-row') {
                expect(property.sideProperties!.length).toBeGreaterThan(0);
                continue;
            }
            expect(property.options.length).toBeGreaterThan(0);
            for (const option of property.options) {
                expect(option.value.trim().length).toBeGreaterThan(0);
                expect(option.value).not.toMatch(/\s/);
            }
        }
    });

    test('display has flex and grid conditional branches', () => {
        const display = allProperties().find((p) => p.id === 'display');
        expect(display).toBeDefined();
        const whens = (display!.children ?? []).map((c) => c.when);
        expect(whens).toContainEqual(['flex', 'inline-flex']);
        expect(whens).toContainEqual(['grid']);
    });

    test('grid branch exposes grid-cols-1 through grid-cols-12 plus none/subgrid', () => {
        const gridCols = allProperties().find((p) => p.id === 'grid-cols');
        expect(gridCols!.options.map((o) => o.value)).toEqual([
            ...Array.from({ length: 12 }, (_, i) => `grid-cols-${i + 1}`),
            'grid-cols-none',
            'grid-cols-subgrid',
        ]);
    });

    test('the rows a branch auto-shows are icon rows, every option with an icon', () => {
        const display = allProperties().find((p) => p.id === 'display')!;
        const autoShown = (display.children ?? []).flatMap((branch) => branch.autoShow ?? []);
        expect(autoShown.length).toBeGreaterThan(0);

        for (const id of new Set(autoShown)) {
            const property = allProperties().find((p) => p.id === id);
            expect(property, `missing ${id}`).toBeDefined();
            // An icon row with a text fallback would read as a class-name list,
            // which is exactly what these rows replaced.
            expect(property!.control, id).toBe('icon-row');
            for (const option of property!.options) {
                expect(option.icon, `${id} → ${option.value} has no icon`).toBeTruthy();
            }
        }
    });

    test('auto-shown ids exist in the branch they belong to', () => {
        const display = allProperties().find((p) => p.id === 'display')!;
        for (const branch of display.children ?? []) {
            const ids = branch.properties.map((p) => p.id);
            for (const id of branch.autoShow ?? []) {
                expect(ids, `${id} not in branch ${branch.when.join('/')}`).toContain(id);
            }
        }
    });

    test('multi-column carries the whole scale and its break control', () => {
        const columns = allProperties().find((p) => p.id === 'columns')!;
        const values = columns.options.map((o) => o.value);
        // A count up to 12, or a width from the --container-* scale
        expect(values).toContain('columns-12');
        expect(values).toContain('columns-3xs');
        expect(values).toContain('columns-7xl');

        // Without break control a card splits across a column
        const ids = new Set(allProperties().map((p) => p.id));
        for (const id of ['break-inside', 'break-after', 'break-before']) {
            expect(ids.has(id), `missing ${id}`).toBe(true);
        }
        const inside = allProperties().find((p) => p.id === 'break-inside')!;
        expect(inside.options.map((o) => o.value)).toContain('break-inside-avoid-column');
    });

    test('covers the documented flexbox and grid utilities', () => {
        const ids = new Set(allProperties().map((p) => p.id));
        for (const id of [
            'flex-basis', 'flex-direction', 'flex-wrap', 'flex', 'flex-grow', 'flex-shrink', 'order',
            'grid-cols', 'grid-column', 'grid-rows', 'grid-row', 'grid-auto-flow',
            'grid-auto-columns', 'grid-auto-rows', 'gap',
            'justify-content', 'justify-items', 'justify-self',
            'align-content', 'align-items', 'align-self',
            'place-content', 'place-items', 'place-self',
        ]) {
            expect(ids.has(id), `missing ${id}`).toBe(true);
        }
    });
});

describe('color options', () => {
    test('palette families each expose full shade records', () => {
        const families = getColorFamilies();
        expect(families.length).toBeGreaterThanOrEqual(22);
        for (const { shades } of families) {
            expect(Object.keys(shades).length).toBeGreaterThan(0);
            for (const css of Object.values(shades)) {
                expect(typeof css).toBe('string');
            }
        }
    });

    test('buildColorOptions produces prefixed classes with swatches', () => {
        const bg = buildColorOptions('bg');
        const text = buildColorOptions('text');

        expect(bg.length).toBe(text.length);
        expect(bg.some((o) => o.value === 'bg-red-500')).toBe(true);
        expect(text.some((o) => o.value === 'text-red-500')).toBe(true);
        expect(bg.some((o) => o.value === 'bg-black')).toBe(true);
        expect(bg.some((o) => o.value === 'bg-white')).toBe(true);

        for (const option of bg) {
            expect(option.value.startsWith('bg-')).toBe(true);
            expect(option.swatch).toBeTruthy();
            expect(option.family).toBeTruthy();
        }
    });
});

describe('borders coverage', () => {
    test('covers the documented border and outline utilities', () => {
        const ids = new Set(allProperties().map((p) => p.id));
        for (const id of [
            'border-radius', 'border-width', 'border-color', 'border-style',
            'outline-width', 'outline-color', 'outline-style', 'outline-offset',
        ]) {
            expect(ids.has(id), `missing ${id}`).toBe(true);
        }
    });
});

describe('group membership', () => {
    test('shadow lives in effects, not borders', () => {
        const idsIn = (groupId: string) => {
            const group = HELPER_SCHEMA.find((g) => g.id === groupId)!;
            return group.properties.map((p) => p.id);
        };
        expect(idsIn('effects')).toContain('shadow');
        expect(idsIn('effects')).toContain('shadow-color');
        expect(idsIn('borders')).not.toContain('shadow');
    });
});

describe('effects coverage', () => {
    test('covers the documented effects utilities', () => {
        const ids = new Set(allProperties().map((p) => p.id));
        for (const id of ['shadow', 'shadow-color', 'opacity', 'mix-blend-mode', 'background-blend-mode']) {
            expect(ids.has(id), `missing ${id}`).toBe(true);
        }
    });
});

describe('filters coverage', () => {
    test('covers the documented filter and backdrop-filter utilities', () => {
        const ids = new Set(allProperties().map((p) => p.id));
        for (const id of [
            'filter', 'blur', 'brightness', 'contrast', 'drop-shadow',
            'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia',
            'backdrop-filter', 'backdrop-blur', 'backdrop-brightness', 'backdrop-contrast',
            'backdrop-grayscale', 'backdrop-hue-rotate', 'backdrop-invert', 'backdrop-opacity',
            'backdrop-saturate', 'backdrop-sepia',
        ]) {
            expect(ids.has(id), `missing ${id}`).toBe(true);
        }
    });

    test('filters properties live in the filters group', () => {
        const filters = HELPER_SCHEMA.find((g) => g.id === 'filters')!;
        expect(filters.icon).toBe('aperture');
        expect(filters.properties.map((p) => p.id)).toContain('blur');
        expect(filters.properties.map((p) => p.id)).toContain('backdrop-blur');
    });
});

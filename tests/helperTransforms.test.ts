/**
 * Tests for the Winden Classes helper Transforms group
 * Covers: structural sanity, prefix discipline, engine resolution
 */

import { describe, test, expect } from 'vitest';
import { TRANSFORMS_GROUP } from '../src/winden-classes/core/helper-schema-transforms';
import { arbitraryPrefixOf, getActiveSelections, toggleOption } from '../src/winden-classes/core/helper-state';
import type { HelperProperty } from '../src/winden-classes/core/helper-schema';

function allProperties(): HelperProperty[] {
    const out: HelperProperty[] = [];
    const walk = (properties: HelperProperty[]) => {
        for (const property of properties) {
            out.push(property);
            if (property.sideProperties) walk(property.sideProperties);
            for (const branch of property.children ?? []) walk(branch.properties);
        }
    };
    walk(TRANSFORMS_GROUP.properties);
    return out;
}

const propertyById = (id: string): HelperProperty => {
    const property = allProperties().find((p) => p.id === id);
    expect(property, `missing property ${id}`).toBeDefined();
    return property!;
};

const EXPECTED_PROPERTY_IDS = [
    'transform',
    'transform-style',
    'transform-origin',
    'backface-visibility',
    'perspective',
    'perspective-origin',
    'rotate', 'rotate-x', 'rotate-y', 'rotate-z',
    'scale', 'scale-x', 'scale-y', 'scale-z',
    'skew', 'skew-x', 'skew-y',
    'translate', 'translate-x', 'translate-y', 'translate-z',
];

describe('TRANSFORMS_GROUP structure', () => {
    test('has the expected group id and label', () => {
        expect(TRANSFORMS_GROUP.id).toBe('transforms');
        expect(TRANSFORMS_GROUP.label).toBe('Transforms');
        expect(TRANSFORMS_GROUP.icon).toBe('axis-3d');
    });

    test('covers every expected transform utility', () => {
        const ids = new Set(allProperties().map((p) => p.id));
        for (const id of EXPECTED_PROPERTY_IDS) {
            expect(ids.has(id), `missing ${id}`).toBe(true);
        }
    });

    test('property ids are unique', () => {
        const ids = allProperties().map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('every option has a non-empty, whitespace-free class value', () => {
        for (const property of allProperties()) {
            expect(property.options.length, `${property.id} has no options`).toBeGreaterThan(0);
            for (const option of property.options) {
                expect(option.value.trim().length).toBeGreaterThan(0);
                expect(option.value).not.toMatch(/\s/);
            }
        }
    });

    test('option values are unique within each property', () => {
        for (const property of allProperties()) {
            const values = property.options.map((o) => o.value);
            expect(new Set(values).size, `duplicate option in ${property.id}`).toBe(values.length);
        }
    });

    test('every property shares one utility prefix so Custom input works', () => {
        for (const property of allProperties()) {
            expect(arbitraryPrefixOf(property), `${property.id} has no shared prefix`).not.toBeNull();
        }
    });

    test('no negative utilities leak into the presets', () => {
        for (const property of allProperties()) {
            for (const option of property.options) {
                expect(option.value.startsWith('-'), `${option.value} is negative`).toBe(false);
            }
        }
    });

    test('icon options reference registered icon keys', () => {
        const icons = allProperties().flatMap((p) => p.options.map((o) => o.icon).filter(Boolean));
        for (const icon of icons) {
            expect(['eye', 'eye-off']).toContain(icon);
        }
    });
});

describe('TRANSFORMS_GROUP option values', () => {
    test('rotate exposes the default degree scale', () => {
        expect(propertyById('rotate').options.map((o) => o.value)).toEqual([
            'rotate-none', 'rotate-0', 'rotate-1', 'rotate-2', 'rotate-3',
            'rotate-6', 'rotate-12', 'rotate-45', 'rotate-90', 'rotate-180', 'rotate-270',
        ]);
    });

    test('transform exposes none/gpu/cpu, transform-style exposes 3d/flat', () => {
        expect(propertyById('transform').options.map((o) => o.value))
            .toEqual(['transform-none', 'transform-gpu', 'transform-cpu']);
        expect(propertyById('transform-style').options.map((o) => o.value))
            .toEqual(['transform-3d', 'transform-flat']);
    });

    test('backface exposes visible/hidden', () => {
        expect(propertyById('backface-visibility').options.map((o) => o.value))
            .toEqual(['backface-visible', 'backface-hidden']);
    });

    test('perspective exposes the named v4 keywords', () => {
        expect(propertyById('perspective').options.map((o) => o.value)).toEqual([
            'perspective-dramatic', 'perspective-near', 'perspective-normal',
            'perspective-midrange', 'perspective-distant', 'perspective-none',
        ]);
    });

    test('transform-origin and perspective-origin cover the nine origins', () => {
        const origins = ['center', 'top', 'top-right', 'right', 'bottom-right',
            'bottom', 'bottom-left', 'left', 'top-left'];
        expect(propertyById('transform-origin').options.map((o) => o.value))
            .toEqual(origins.map((v) => `origin-${v}`));
        expect(propertyById('perspective-origin').options.map((o) => o.value))
            .toEqual(origins.map((v) => `perspective-origin-${v}`));
    });

    test('translate includes the spacing scale, fractions and full', () => {
        const values = propertyById('translate').options.map((o) => o.value);
        for (const expected of ['translate-none', 'translate-0', 'translate-px',
            'translate-4', 'translate-1/2', 'translate-full']) {
            expect(values).toContain(expected);
        }
    });

    test('chip labels drop the utility prefix', () => {
        expect(propertyById('rotate').options.find((o) => o.value === 'rotate-45')!.label).toBe('45');
        expect(propertyById('transform-origin').options.find((o) => o.value === 'origin-top-left')!.label)
            .toBe('top-left');
        expect(propertyById('translate-x').options.find((o) => o.value === 'translate-x-2')!.label).toBe('2');
    });

    test('derived arbitrary prefixes match the property intent', () => {
        expect(arbitraryPrefixOf(propertyById('rotate'))).toBe('rotate');
        expect(arbitraryPrefixOf(propertyById('rotate-x'))).toBe('rotate-x');
        expect(arbitraryPrefixOf(propertyById('perspective'))).toBe('perspective');
        expect(arbitraryPrefixOf(propertyById('perspective-origin'))).toBe('perspective-origin');
        expect(arbitraryPrefixOf(propertyById('transform-origin'))).toBe('origin');
        expect(arbitraryPrefixOf(propertyById('backface-visibility'))).toBe('backface');
    });
});

describe('TRANSFORMS_GROUP resolves through the state engine', () => {
    const rotate = () => propertyById('rotate');
    const option = (propertyId: string, value: string) =>
        propertyById(propertyId).options.find((o) => o.value === value)!;

    test('toggling rotate-45 onto an empty string yields rotate-45', () => {
        expect(toggleOption('', option('rotate', 'rotate-45'), rotate())).toBe('rotate-45');
    });

    test('a second rotate value replaces the first', () => {
        const next = toggleOption('rotate-45', option('rotate', 'rotate-90'), rotate());
        expect(next).toBe('rotate-90');
        expect(next).not.toContain('rotate-45');
    });

    test('toggling the active option off removes it', () => {
        expect(toggleOption('rotate-45', option('rotate', 'rotate-45'), rotate())).toBe('');
    });

    test('getActiveSelections resolves the group', () => {
        const selections = getActiveSelections(
            'rotate-45 scale-110 origin-top-left backface-hidden perspective-dramatic translate-x-1/2',
            [TRANSFORMS_GROUP]
        );
        expect(selections.get('rotate')).toBe('rotate-45');
        expect(selections.get('scale')).toBe('scale-110');
        expect(selections.get('transform-origin')).toBe('origin-top-left');
        expect(selections.get('backface-visibility')).toBe('backface-hidden');
        expect(selections.get('perspective')).toBe('perspective-dramatic');
        expect(selections.get('translate-x')).toBe('translate-x-1/2');
    });

    test('unrelated classes are preserved when toggling', () => {
        const next = toggleOption('flex p-4', option('rotate', 'rotate-90'), rotate());
        expect(next.split(' ')).toContain('flex');
        expect(next.split(' ')).toContain('p-4');
        expect(next.split(' ')).toContain('rotate-90');
    });

    test('variant-scoped toggles do not touch base classes', () => {
        const next = toggleOption('rotate-45', option('rotate', 'rotate-90'), rotate(), 'md');
        expect(next.split(' ')).toContain('rotate-45');
        expect(next.split(' ')).toContain('md:rotate-90');
    });

    test('every option round-trips through getActiveSelections', () => {
        for (const property of allProperties()) {
            for (const opt of property.options) {
                const selections = getActiveSelections(opt.value, [TRANSFORMS_GROUP]);
                expect(selections.get(property.id), `${opt.value} did not resolve`).toBe(opt.value);
            }
        }
    });
});

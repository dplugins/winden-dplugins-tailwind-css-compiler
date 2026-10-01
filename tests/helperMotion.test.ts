/**
 * Tests for the Transitions & Animation helper group
 * Covers: structural sanity, real Tailwind v4 class names, engine resolution
 */

import { describe, test, expect } from 'vitest';
import { MOTION_GROUP } from '../src/winden-classes/core/helper-schema-motion';
import type { HelperProperty } from '../src/winden-classes/core/helper-schema';
import { getActiveSelections, toggleOption } from '../src/winden-classes/core/helper-state';

const SCHEMA = [MOTION_GROUP];

function allProperties(): HelperProperty[] {
    const out: HelperProperty[] = [];
    const walk = (properties: HelperProperty[]) => {
        for (const property of properties) {
            out.push(property);
            if (property.sideProperties) walk(property.sideProperties);
            for (const branch of property.children ?? []) walk(branch.properties);
        }
    };
    walk(MOTION_GROUP.properties);
    return out;
}

function propertyById(id: string): HelperProperty {
    const property = allProperties().find((p) => p.id === id);
    expect(property, `missing property ${id}`).toBeDefined();
    return property!;
}

function optionByValue(propertyId: string, value: string) {
    const property = propertyById(propertyId);
    const option = property.options.find((o) => o.value === value);
    expect(option, `missing option ${value} on ${propertyId}`).toBeDefined();
    return { property, option: option! };
}

describe('MOTION_GROUP structure', () => {
    test('group id and label', () => {
        expect(MOTION_GROUP.id).toBe('motion');
        expect(MOTION_GROUP.label).toBe('Transitions & Animation');
    });

    test('covers every Transitions & Animation utility', () => {
        expect(MOTION_GROUP.properties.map((p) => p.id)).toEqual([
            'transition-property',
            'transition-behavior',
            'transition-duration',
            'transition-timing-function',
            'transition-delay',
            'animation',
        ]);
    });

    test('property ids are unique', () => {
        const ids = allProperties().map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('every option has a non-empty, whitespace-free class value', () => {
        for (const property of allProperties()) {
            expect(property.options.length).toBeGreaterThan(0);
            for (const option of property.options) {
                expect(option.value.trim().length).toBeGreaterThan(0);
                expect(option.value).not.toMatch(/\s/);
                expect(option.label?.trim().length).toBeGreaterThan(0);
            }
        }
    });

    test('option values are unique within each property', () => {
        for (const property of allProperties()) {
            const values = property.options.map((o) => o.value);
            expect(new Set(values).size, `duplicates in ${property.id}`).toBe(values.length);
        }
    });

    test('chip labels drop the utility prefix', () => {
        expect(optionByValue('transition-timing-function', 'ease-in-out').option.label).toBe('in-out');
        expect(optionByValue('animation', 'animate-spin').option.label).toBe('spin');
        expect(optionByValue('transition-duration', 'duration-150').option.label).toBe('150');
        expect(optionByValue('transition-behavior', 'transition-discrete').option.label).toBe('discrete');
    });
});

describe('MOTION_GROUP class names', () => {
    test('transition-property exposes the v4 keyword set', () => {
        expect(propertyById('transition-property').options.map((o) => o.value)).toEqual([
            'transition',
            'transition-all',
            'transition-colors',
            'transition-opacity',
            'transition-shadow',
            'transition-transform',
            'transition-none',
        ]);
    });

    test('transition-behavior is its own property', () => {
        expect(propertyById('transition-behavior').options.map((o) => o.value)).toEqual([
            'transition-normal',
            'transition-discrete',
        ]);
    });

    test('timing functions match the v4 --ease theme keys plus linear/initial', () => {
        expect(propertyById('transition-timing-function').options.map((o) => o.value)).toEqual([
            'ease-linear',
            'ease-in',
            'ease-out',
            'ease-in-out',
            'ease-initial',
        ]);
    });

    test('animation exposes the built-in keyframes', () => {
        expect(propertyById('animation').options.map((o) => o.value)).toEqual([
            'animate-none',
            'animate-spin',
            'animate-ping',
            'animate-pulse',
            'animate-bounce',
        ]);
    });

    test('duration and delay share one prefix each', () => {
        expect(propertyById('transition-duration').options.every((o) => o.value.startsWith('duration-'))).toBe(true);
        expect(propertyById('transition-delay').options.every((o) => o.value.startsWith('delay-'))).toBe(true);
    });
});

describe('MOTION_GROUP engine resolution', () => {
    test('getActiveSelections resolves motion utilities from a class string', () => {
        const selections = getActiveSelections(
            'transition-colors duration-300 ease-in-out delay-150 animate-spin transition-discrete',
            SCHEMA
        );
        expect(selections.get('transition-property')).toBe('transition-colors');
        expect(selections.get('transition-behavior')).toBe('transition-discrete');
        expect(selections.get('transition-duration')).toBe('duration-300');
        expect(selections.get('transition-timing-function')).toBe('ease-in-out');
        expect(selections.get('transition-delay')).toBe('delay-150');
        expect(selections.get('animation')).toBe('animate-spin');
    });

    test('unrelated classes resolve to nothing', () => {
        expect(getActiveSelections('flex p-4 text-red-500', SCHEMA).size).toBe(0);
    });

    test('toggling a duration adds it', () => {
        const { property, option } = optionByValue('transition-duration', 'duration-300');
        const result = toggleOption('', option, property);
        expect(result).toBe('duration-300');
        expect(getActiveSelections(result, SCHEMA).get('transition-duration')).toBe('duration-300');
    });

    test('a second duration replaces the first', () => {
        const first = optionByValue('transition-duration', 'duration-150');
        const second = optionByValue('transition-duration', 'duration-500');

        const withFirst = toggleOption('', first.option, first.property);
        const withSecond = toggleOption(withFirst, second.option, second.property);

        expect(withSecond.split(/\s+/).filter(Boolean)).toEqual(['duration-500']);
        expect(getActiveSelections(withSecond, SCHEMA).get('transition-duration')).toBe('duration-500');
    });

    test('toggling the active option removes it', () => {
        const { property, option } = optionByValue('animation', 'animate-spin');
        expect(toggleOption('animate-spin', option, property)).toBe('');
    });

    test('toggling keeps unrelated classes intact', () => {
        const { property, option } = optionByValue('transition-timing-function', 'ease-out');
        const result = toggleOption('flex p-4', option, property);
        expect(result.split(/\s+/).filter(Boolean).sort()).toEqual(['ease-out', 'flex', 'p-4']);
    });

    test('variant-scoped toggles do not touch the base scope', () => {
        const { property, option } = optionByValue('transition-duration', 'duration-700');
        const result = toggleOption('duration-150', option, property, 'md');
        expect(result.split(/\s+/).filter(Boolean)).toEqual(['duration-150', 'md:duration-700']);
        expect(getActiveSelections(result, SCHEMA).get('transition-duration')).toBe('duration-150');
        expect(getActiveSelections(result, SCHEMA, 'md').get('transition-duration')).toBe('duration-700');
    });
});

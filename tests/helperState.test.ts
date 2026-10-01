/**
 * Tests for the Winden Classes helper state engine
 * Covers: getActiveSelections, toggleOption (conflict resolution, variant
 * preservation, toggle-off), getVisibleProperties (conditional branches)
 */

import { describe, test, expect } from 'vitest';
import {
    arbitraryPrefixOf,
    getImportantUtilities,
    getNegativeUtilities,
    toggleImportance,
    toggleNegative,
    buildArbitraryClass,
    clearProperty,
    composeVariantPrefix,
    findArbitraryValue,
    getActiveSelections,
    getAutoShownIds,
    getScopedUtilities,
    getVisibleProperties,
    previewOverriddenUtilities,
    removeToken,
    toggleOption,
} from '../src/winden-classes/core/helper-state';
import { HELPER_SCHEMA, type HelperProperty } from '../src/winden-classes/core/helper-schema';

function findProperty(id: string): HelperProperty {
    const walk = (properties: HelperProperty[]): HelperProperty | undefined => {
        for (const property of properties) {
            if (property.id === id) return property;
            if (property.sideProperties) {
                const found = walk(property.sideProperties);
                if (found) return found;
            }
            for (const branch of property.children ?? []) {
                const found = walk(branch.properties);
                if (found) return found;
            }
        }
        return undefined;
    };
    for (const group of HELPER_SCHEMA) {
        const found = walk(group.properties);
        if (found) return found;
    }
    throw new Error(`property not found: ${id}`);
}

function option(propertyId: string, value: string) {
    const property = findProperty(propertyId);
    const found = property.options.find((o) => o.value === value);
    if (!found) throw new Error(`option not found: ${value}`);
    return { property, option: found };
}

const toggle = (classes: string, propertyId: string, value: string, prefix = '', synthetic = false) => {
    if (synthetic) {
        return toggleOption(classes, { value }, findProperty(propertyId), prefix);
    }
    const { property, option: opt } = option(propertyId, value);
    return toggleOption(classes, opt, property, prefix);
};

// ─── getActiveSelections ─────────────────────────────────────────

describe('getActiveSelections', () => {
    test('detects base-scope utilities', () => {
        const selections = getActiveSelections('flex gap-4 bg-red-500', HELPER_SCHEMA);
        expect(selections.get('display')).toBe('flex');
        expect(selections.get('gap-all')).toBe('gap-4');
        expect(selections.get('background-color')).toBe('bg-red-500');
    });

    test('ignores tokens with other variant prefixes', () => {
        const selections = getActiveSelections('md:flex hover:bg-red-500', HELPER_SCHEMA);
        expect(selections.get('display')).toBeUndefined();
        expect(selections.get('background-color')).toBeUndefined();
    });

    test('matches a specific variant prefix when asked', () => {
        const selections = getActiveSelections('flex md:grid', HELPER_SCHEMA, 'md');
        expect(selections.get('display')).toBe('grid');
    });

    test('empty string yields no selections', () => {
        expect(getActiveSelections('', HELPER_SCHEMA).size).toBe(0);
    });
});

// ─── toggleOption ────────────────────────────────────────────────

describe('toggleOption', () => {
    test('activating flex adds the class', () => {
        expect(toggle('', 'display', 'flex')).toBe('flex');
    });

    test('switching flex to grid removes flex, keeps gap', () => {
        expect(toggle('flex gap-4', 'display', 'grid')).toBe('gap-4 grid');
    });

    test('hidden removes flex (display conflict group)', () => {
        expect(toggle('flex justify-center', 'display', 'hidden')).toBe('justify-center hidden');
    });

    test('grid-cols-4 replaces grid-cols-3', () => {
        expect(toggle('grid grid-cols-3', 'grid-cols', 'grid-cols-4')).toBe('grid grid-cols-4');
    });

    test('clicking active option removes it', () => {
        expect(toggle('grid grid-cols-4 p-4', 'grid-cols', 'grid-cols-4')).toBe('grid p-4');
    });

    test('background color swap', () => {
        expect(toggle('bg-red-500 p-4', 'background-color', 'bg-blue-500')).toBe('p-4 bg-blue-500');
    });

    test('variant tokens untouched, order stable', () => {
        expect(toggle('md:flex hover:bg-red-500 p-4', 'display', 'grid')).toBe(
            'md:flex hover:bg-red-500 p-4 grid'
        );
    });

    test('toggling in md scope only touches md tokens', () => {
        expect(toggle('flex md:flex p-4', 'display', 'grid', 'md')).toBe('flex p-4 md:grid');
    });

    test('toggle-off in md scope keeps base twin', () => {
        expect(toggle('flex md:flex', 'display', 'flex', 'md')).toBe('flex');
    });

    test('idempotent when toggling on twice (on/off round trip)', () => {
        const on = toggle('p-4', 'display', 'flex');
        expect(on).toBe('p-4 flex');
        expect(toggle(on, 'display', 'flex')).toBe('p-4');
    });

    test('text size replaces previous size', () => {
        expect(toggle('text-sm font-bold', 'text-size', 'text-2xl')).toBe('font-bold text-2xl');
    });

    test('width replaces previous width including fractions', () => {
        expect(toggle('w-1/2', 'width', 'w-full')).toBe('w-full');
    });
});

// ─── getVisibleProperties ────────────────────────────────────────

describe('getVisibleProperties', () => {
    const layout = HELPER_SCHEMA.find((g) => g.id === 'layout')!;

    test('no display selected hides the flex/grid branches', () => {
        const visible = getVisibleProperties(layout, getActiveSelections('', HELPER_SCHEMA));
        expect(visible.map((p) => p.id)).toEqual([
            'display', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'order',
            'grid-column', 'grid-column-start', 'grid-column-end',
            'grid-row', 'grid-row-start', 'grid-row-end',
            'justify-self', 'align-self', 'place-self',
            'float', 'clear', 'columns', 'break-inside', 'break-after', 'break-before',
        ]);
    });

    test('flex reveals flex branch', () => {
        const visible = getVisibleProperties(layout, getActiveSelections('flex', HELPER_SCHEMA));
        const ids = visible.map((p) => p.id);
        expect(ids).toContain('flex-direction');
        expect(ids).toContain('justify-content');
        expect(ids).toContain('gap');
        expect(ids).not.toContain('grid-cols');
    });

    test('grid reveals grid branch', () => {
        const visible = getVisibleProperties(layout, getActiveSelections('grid', HELPER_SCHEMA));
        const ids = visible.map((p) => p.id);
        expect(ids).toContain('grid-cols');
        expect(ids).toContain('gap');
        expect(ids).not.toContain('flex-direction');
    });

    test('inline-flex reveals flex branch too', () => {
        const visible = getVisibleProperties(layout, getActiveSelections('inline-flex', HELPER_SCHEMA));
        expect(visible.map((p) => p.id)).toContain('flex-direction');
    });
});

// ─── Sided spacing properties ────────────────────────────────────

describe('sided spacing', () => {
    test('padding side utilities detected independently', () => {
        const selections = getActiveSelections('p-4 px-6 mt-2', HELPER_SCHEMA);
        expect(selections.get('padding-all')).toBe('p-4');
        expect(selections.get('padding-x')).toBe('px-6');
        expect(selections.get('margin-top')).toBe('mt-2');
    });

    test('px replaces px, leaves p alone', () => {
        expect(toggle('p-4 px-6', 'padding-x', 'px-8')).toBe('p-4 px-8');
    });

    test('margin auto available on x axis', () => {
        expect(toggle('', 'margin-x', 'mx-auto')).toBe('mx-auto');
    });

    test('changing the all side keeps the narrower sides', () => {
        // Tailwind emits pt after p, so `p-6 pt-2` really is 6 everywhere and 2
        // on top. tailwind-merge drops pt-2 as redundant; the helper must not,
        // or editing "All" silently wipes every per-side override.
        expect(toggle('p-4 pt-2', 'padding-all', 'p-6')).toBe('pt-2 p-6');
        expect(toggle('p-4 pt-2 mb-8', 'padding-all', 'p-6')).toBe('pt-2 mb-8 p-6');
        expect(toggle('m-4 mx-2 mt-1', 'margin-all', 'm-6')).toBe('mx-2 mt-1 m-6');
    });

    test('the x side keeps left and right overrides', () => {
        expect(toggle('px-4 pl-1', 'padding-x', 'px-8')).toBe('pl-1 px-8');
    });

    test('a narrower side still replaces its own value', () => {
        expect(toggle('p-4 pt-2', 'padding-top', 'pt-6')).toBe('p-4 pt-6');
    });
});

// ─── Auto-shown rows ─────────────────────────────────────────────

describe('getAutoShownIds', () => {
    const layout = HELPER_SCHEMA.find((group) => group.id === 'layout')!;
    const autoShown = (classes: string) =>
        getAutoShownIds(layout, getActiveSelections(classes, HELPER_SCHEMA));

    test('display:flex reveals the flex layout rows', () => {
        expect([...autoShown('flex')]).toEqual([
            'flex-direction', 'flex-wrap', 'align-content', 'justify-content', 'align-items',
        ]);
        expect([...autoShown('inline-flex')]).toEqual([...autoShown('flex')]);
    });

    test('display:grid reveals the grid layout rows', () => {
        expect([...autoShown('grid')]).toEqual([
            'grid-auto-flow', 'align-content', 'justify-content', 'align-items', 'justify-items',
        ]);
    });

    test('justify-items belongs to grid only — it does nothing in flex', () => {
        expect(autoShown('flex').has('justify-items')).toBe(false);
    });

    test('nothing is revealed without an active branch', () => {
        expect(autoShown('block').size).toBe(0);
        expect(autoShown('').size).toBe(0);
    });

    test('templates and gap stay behind the + menu', () => {
        for (const id of ['grid-cols', 'grid-rows', 'gap', 'place-items', 'place-content']) {
            expect(autoShown('grid').has(id), id).toBe(false);
        }
    });
});

// ─── Hover preview ───────────────────────────────────────────────

describe('previewOverriddenUtilities', () => {
    const overridden = (classes: string, preview: string, prefix = '') =>
        previewOverriddenUtilities(classes, preview, HELPER_SCHEMA, prefix);

    test('hides the value the preview would replace', () => {
        // Without this, p-2 over p-12 renders as 48px: the class attribute does
        // not decide, the stylesheet order does.
        expect(overridden('p-12', 'p-2')).toEqual(['p-12']);
        expect(overridden('bg-red-500 flex', 'bg-blue-500')).toEqual(['bg-red-500']);
    });

    test('keeps the sides the click would keep', () => {
        expect(overridden('p-12 pt-2', 'p-4')).toEqual(['p-12']);
        expect(overridden('p-12 pt-2', 'pt-6')).toEqual(['pt-2']);
    });

    test('hides nothing when the preview adds a new property', () => {
        expect(overridden('p-4', 'flex')).toEqual([]);
        expect(overridden('', 'p-4')).toEqual([]);
        expect(overridden('p-4', '')).toEqual([]);
    });

    test('an arbitrary value is resolved to its property', () => {
        expect(overridden('p-4', 'p-[13px]')).toEqual(['p-4']);
    });

    test('out-of-scope variants are never hidden', () => {
        expect(overridden('md:p-12 p-4', 'p-2')).toEqual(['p-4']);
        // Scoped to md:, the base p-4 is untouched and md:p-12 is the one hidden
        expect(overridden('md:p-12 p-4', 'p-2', 'md')).toEqual(['p-12']);
    });
});

// ─── Variant composition (breakpoint + state) ────────────────────

describe('composeVariantPrefix', () => {
    test('composes empty, single, and combined prefixes', () => {
        expect(composeVariantPrefix('', '')).toBe('');
        expect(composeVariantPrefix('md', '')).toBe('md');
        expect(composeVariantPrefix('', 'hover')).toBe('hover');
        expect(composeVariantPrefix('md', 'hover')).toBe('md:hover');
    });

    test('toggling in md:hover scope writes combined prefix', () => {
        expect(toggle('flex', 'background-color', 'bg-blue-500', 'md:hover')).toBe('flex md:hover:bg-blue-500');
    });

    test('md:hover scope replaces only md:hover tokens', () => {
        expect(toggle('hover:bg-red-500 md:hover:bg-red-500', 'background-color', 'bg-blue-500', 'md:hover')).toBe(
            'hover:bg-red-500 md:hover:bg-blue-500'
        );
    });
});

// ─── Multi-active + summary helpers ──────────────────────────────

describe('multi-active properties', () => {
    test('placement chips can be active together', () => {
        const next = toggle(toggle('absolute', 'offset-top', 'top-0'), 'offset-left', 'left-0');
        expect(next).toBe('absolute top-0 left-0');
        const utilities = getScopedUtilities(next);
        expect(utilities.has('top-0')).toBe(true);
        expect(utilities.has('left-0')).toBe(true);
    });

    test('getScopedUtilities respects the variant scope', () => {
        const utilities = getScopedUtilities('flex md:grid hover:underline', 'md');
        expect([...utilities]).toEqual(['grid']);
    });
});

describe('removeToken', () => {
    test('removes an exact token, variants included', () => {
        expect(removeToken('flex md:grid p-4', 'md:grid')).toBe('flex p-4');
    });

    test('leaves other tokens alone when token absent', () => {
        expect(removeToken('flex p-4', 'grid')).toBe('flex p-4');
    });
});

// ─── Text decoration additions ───────────────────────────────────

describe('typography decorations', () => {
    test('uppercase replaces lowercase (text-transform group)', () => {
        expect(toggle('lowercase font-bold', 'text-transform', 'uppercase')).toBe('font-bold uppercase');
    });

    test('underline and italic can coexist (multi decoration)', () => {
        const next = toggle(toggle('', 'text-decoration', 'underline'), 'text-decoration', 'italic');
        expect(next).toBe('underline italic');
    });

    test('leading replaces leading', () => {
        expect(toggle('leading-tight', 'line-height', 'leading-loose')).toBe('leading-loose');
    });
});

// ─── Sided border widths ─────────────────────────────────────────

describe('sided border width', () => {
    test('bare border form detected as width 1 on a side', () => {
        const selections = getActiveSelections('border-t border-x-2', HELPER_SCHEMA);
        expect(selections.get('border-width-top')).toBe('border-t');
        expect(selections.get('border-width-x')).toBe('border-x-2');
    });

    test('border-t-4 replaces border-t', () => {
        expect(toggle('border-t rounded-lg', 'border-width-top', 'border-t-4')).toBe('rounded-lg border-t-4');
    });
});

// ─── Sided radius / gap / overflow ───────────────────────────────

describe('sided radius, gap, overflow', () => {
    test('corner radius detected and replaced per corner', () => {
        const selections = getActiveSelections('rounded-lg rounded-tl-full', HELPER_SCHEMA);
        expect(selections.get('border-radius-all')).toBe('rounded-lg');
        expect(selections.get('border-radius-tl')).toBe('rounded-tl-full');
        expect(toggle('rounded-tl-full', 'border-radius-tl', 'rounded-tl-sm')).toBe('rounded-tl-sm');
    });

    test('bare rounded-t is the base radius on the top side', () => {
        expect(getActiveSelections('rounded-t', HELPER_SCHEMA).get('border-radius-top')).toBe('rounded-t');
        expect(toggle('rounded-t', 'border-radius-top', 'rounded-t-xl')).toBe('rounded-t-xl');
    });

    test('gap axes are independent', () => {
        const selections = getActiveSelections('flex gap-x-2 gap-y-8', HELPER_SCHEMA);
        expect(selections.get('gap-x')).toBe('gap-x-2');
        expect(selections.get('gap-y')).toBe('gap-y-8');
        expect(toggle('gap-x-2', 'gap-x', 'gap-x-4')).toBe('gap-x-4');
    });

    test('overflow axes are independent', () => {
        expect(toggle('overflow-x-auto', 'overflow-y', 'overflow-y-hidden')).toBe('overflow-x-auto overflow-y-hidden');
        expect(getActiveSelections('overflow-hidden', HELPER_SCHEMA).get('overflow-all')).toBe('overflow-hidden');
    });
});

// ─── clearProperty ───────────────────────────────────────────────

describe('clearProperty', () => {
    test('clears every option of a property in scope', () => {
        const order = findProperty('order');
        expect(clearProperty('flex order-2 md:order-3', order)).toBe('flex md:order-3');
    });

    test('clears only the given variant scope', () => {
        const display = findProperty('display');
        expect(clearProperty('flex md:grid', display, 'md')).toBe('flex');
    });

    test('leaves unrelated tokens alone', () => {
        const gapAll = findProperty('gap-all');
        expect(clearProperty('p-4 gap-4 gap-x-2', gapAll)).toBe('p-4 gap-x-2');
    });
});

// ─── Gradients ───────────────────────────────────────────────────

describe('gradients', () => {
    test('direction reveals stop properties', () => {
        const background = HELPER_SCHEMA.find((g) => g.id === 'background')!;
        const before = getVisibleProperties(background, getActiveSelections('', HELPER_SCHEMA)).map((p) => p.id);
        expect(before).not.toContain('gradient-from');
        const after = getVisibleProperties(background, getActiveSelections('bg-linear-to-r', HELPER_SCHEMA)).map((p) => p.id);
        expect(after).toEqual(expect.arrayContaining(['gradient-from', 'gradient-via', 'gradient-to']));
    });

    test('direction replaces direction, stops replace stops, color survives', () => {
        expect(toggle('bg-linear-to-r bg-indigo-500', 'gradient-direction', 'bg-linear-to-b')).toBe('bg-indigo-500 bg-linear-to-b');
        expect(toggle('from-red-500', 'gradient-from', 'from-blue-500')).toBe('from-blue-500');
        const full = toggle(toggle('bg-linear-to-r', 'gradient-from', 'from-indigo-500'), 'gradient-to', 'to-rose-500');
        expect(full).toBe('bg-linear-to-r from-indigo-500 to-rose-500');
    });
});

// ─── Arbitrary (custom) values ───────────────────────────────────

describe('arbitrary values', () => {
    test('arbitraryPrefixOf gates by shared prefix', () => {
        expect(arbitraryPrefixOf(findProperty('padding-all'))).toBe('p');
        expect(arbitraryPrefixOf(findProperty('padding-x'))).toBe('px');
        expect(arbitraryPrefixOf(findProperty('gap-x'))).toBe('gap-x');
        expect(arbitraryPrefixOf(findProperty('background-color'))).toBe('bg');
        expect(arbitraryPrefixOf(findProperty('display'))).toBeNull();
        expect(arbitraryPrefixOf(findProperty('text-transform'))).toBeNull();
    });

    test('buildArbitraryClass wraps raw values and passes classes through', () => {
        expect(buildArbitraryClass('p', '13px')).toBe('p-[13px]');
        expect(buildArbitraryClass('p', '[13px]')).toBe('p-[13px]');
        expect(buildArbitraryClass('p', 'p-[13px]')).toBe('p-[13px]');
        expect(buildArbitraryClass('bg', 'var(--brand)')).toBe('bg-[var(--brand)]');
        expect(buildArbitraryClass('w', 'calc(100% - 2rem)')).toBe('w-[calc(100%_-_2rem)]');
        expect(buildArbitraryClass('p', '   ')).toBe('');
    });

    test('custom value replaces preset via tailwind-merge and vice versa', () => {
        expect(toggle('p-4', 'padding-all', 'p-[13px]', '', true)).toBe('p-[13px]');
        expect(toggle('p-[13px]', 'padding-all', 'p-4')).toBe('p-4');
    });

    test('findArbitraryValue matches only the exact prefix', () => {
        const utilities = new Set(['px-[2vw]', 'p-4']);
        expect(findArbitraryValue(utilities, 'px')).toBe('px-[2vw]');
        expect(findArbitraryValue(utilities, 'p')).toBeUndefined();
    });

    test('clearProperty also removes the custom value', () => {
        expect(clearProperty('p-[13px] mt-2', findProperty('padding-all'))).toBe('mt-2');
        expect(clearProperty('bg-[var(--x)] p-4', findProperty('background-color'))).toBe('p-4');
    });
});

// ─── Aspect ratio + multi-column ─────────────────────────────────

describe('aspect ratio and columns', () => {
    test('aspect presets replace each other and support custom values', () => {
        expect(toggle('aspect-video', 'aspect-ratio', 'aspect-square')).toBe('aspect-square');
        expect(arbitraryPrefixOf(findProperty('aspect-ratio'))).toBe('aspect');
        expect(buildArbitraryClass('aspect', '21/9')).toBe('aspect-[21/9]');
    });

    test('multi-column is separate from grid columns', () => {
        const next = toggle(toggle('', 'columns', 'columns-3'), 'grid-cols', 'grid-cols-4');
        expect(next).toBe('columns-3 grid-cols-4');
        expect(arbitraryPrefixOf(findProperty('columns'))).toBe('columns');
        expect(arbitraryPrefixOf(findProperty('grid-cols'))).toBe('grid-cols');
    });
});

// ─── Positioned offsets ──────────────────────────────────────────

describe('offsets', () => {
    test('each edge tracks its own value', () => {
        const selections = getActiveSelections('absolute top-4 left-0 inset-x-2', HELPER_SCHEMA);
        expect(selections.get('offset-top')).toBe('top-4');
        expect(selections.get('offset-left')).toBe('left-0');
        expect(selections.get('offset-x')).toBe('inset-x-2');
    });

    test('a value replaces only its own edge', () => {
        expect(toggle('absolute top-4 left-0', 'offset-top', 'top-8')).toBe('absolute left-0 top-8');
    });

    test('edges accept auto and custom values', () => {
        expect(toggle('absolute', 'offset-left', 'left-auto')).toBe('absolute left-auto');
        expect(arbitraryPrefixOf(findProperty('offset-bottom'))).toBe('bottom');
        expect(buildArbitraryClass('bottom', '-1rem')).toBe('bottom-[-1rem]');
    });

    test('offsets only show once the element is positioned', () => {
        const position = HELPER_SCHEMA.find((g) => g.id === 'position')!;
        const staticIds = getVisibleProperties(position, getActiveSelections('static', HELPER_SCHEMA)).map((p) => p.id);
        expect(staticIds).not.toContain('offset');
        const absoluteIds = getVisibleProperties(position, getActiveSelections('absolute', HELPER_SCHEMA)).map((p) => p.id);
        expect(absoluteIds).toContain('offset');
    });
});

// ─── Float / clear ───────────────────────────────────────────────

describe('float and clear', () => {
    test('float values replace each other and pair with clear', () => {
        expect(toggle('float-left', 'float', 'float-right')).toBe('float-right');
        expect(toggle('float-right', 'clear', 'clear-both')).toBe('float-right clear-both');
    });

    test('clicking the active float removes it', () => {
        expect(toggle('float-right p-4', 'float', 'float-right')).toBe('p-4');
    });
});

// ─── Sided parents as one unit ───────────────────────────────────

describe('sided parents', () => {
    test('removing the parent clears every side, including custom values', () => {
        const padding = findProperty('padding');
        expect(clearProperty('p-4 pt-8 px-[13px] mt-2 md:p-4', padding)).toBe('mt-2 md:p-4');
    });

    test('radius corners all clear together', () => {
        const radius = findProperty('border-radius');
        expect(clearProperty('rounded-lg rounded-tl-full border-2', radius)).toBe('border-2');
    });

    test('sides remain independently addressable', () => {
        expect(toggle('p-4', 'padding-top', 'pt-8')).toBe('p-4 pt-8');
    });
});

/**
 * A forced class is still that class.
 *
 * Winden writes the `!` itself — `forceOverriddenClasses` measures a pasted
 * block and rewrites every utility the editor's own unlayered CSS beats, and
 * `withVariantSiblings` carries the marker onto the responsive siblings. The
 * panel matched on the exact string, so it went blind to precisely the classes
 * Winden had just forced: a pasted heading showed no size, no weight and no
 * gradient while the canvas rendered all three.
 */
describe('the importance marker', () => {
    const FORCED = 'text-4xl! font-bold! tracking-tight! sm:text-6xl! bg-linear-to-r! from-blue-500 to-purple-500 bg-clip-text text-transparent';

    test('reads exactly as the same string without markers', () => {
        const forced = getActiveSelections(FORCED, HELPER_SCHEMA, '');
        const plain = getActiveSelections(FORCED.replace(/!/g, ''), HELPER_SCHEMA, '');
        expect([...forced].sort()).toEqual([...plain].sort());
        expect(forced.get('text-size')).toBe('text-4xl');
        expect(forced.get('font-weight')).toBe('font-bold');
        expect(forced.get('gradient-direction')).toBe('bg-linear-to-r');
    });

    test('is scoped like any other token', () => {
        expect(getActiveSelections(FORCED, HELPER_SCHEMA, 'sm').get('text-size')).toBe('text-6xl');
    });

    test('lights up the option it belongs to', () => {
        expect(getScopedUtilities('font-bold! italic', '')).toContain('font-bold');
    });

    test('survives choosing a different value — the CSS that beat it has not changed', () => {
        const property = findProperty('text-size');
        const option = property.options.find((o) => o.value === 'text-5xl')!;
        const next = toggleOption('text-4xl! font-bold!', option, property, '');
        expect(next).toContain('text-5xl!');
        expect(next).not.toContain('text-4xl');
        // and leaves other forced classes alone
        expect(next).toContain('font-bold!');
    });

    test('an unforced value stays unforced', () => {
        const property = findProperty('text-size');
        const option = property.options.find((o) => o.value === 'text-5xl')!;
        expect(toggleOption('text-4xl', option, property, '')).toBe('text-5xl');
    });

    test('clicking the active option removes it, marker and all', () => {
        const property = findProperty('font-weight');
        const option = property.options.find((o) => o.value === 'font-bold')!;
        expect(toggleOption('font-bold! italic', option, property, '')).toBe('italic');
    });

    test('clearProperty reaches a forced token', () => {
        expect(clearProperty('text-4xl! font-bold!', findProperty('text-size'), '')).toBe('font-bold!');
    });
});

/**
 * Tailwind v4 renamed `bg-gradient-to-r` to `bg-linear-to-r` and kept the old
 * name compiling, so markup in the wild carries both. Read either; write one.
 */
describe('the v3 gradient spelling', () => {
    test('is read as the direction it means', () => {
        const found = getActiveSelections('bg-gradient-to-r from-blue-500 to-purple-500', HELPER_SCHEMA, '');
        expect(found.get('gradient-direction')).toBe('bg-linear-to-r');
        expect(found.get('gradient-from')).toBe('from-blue-500');
    });

    test('reveals the colour rows, which are gated on the direction', () => {
        const background = HELPER_SCHEMA.find((group) => group.id === 'background')!;
        const selections = getActiveSelections('bg-gradient-to-r', HELPER_SCHEMA, '');
        const visible = getVisibleProperties(background, selections).map((property) => property.id);
        expect(visible).toContain('gradient-from');
    });

    test('is replaced rather than left beside the new spelling', () => {
        const property = findProperty('gradient-direction');
        const option = property.options.find((o) => o.value === 'bg-linear-to-b')!;
        const next = toggleOption('bg-gradient-to-r from-blue-500', option, property, '');
        expect(next).toContain('bg-linear-to-b');
        expect(next).not.toContain('bg-gradient-to-r');
        expect(next).toContain('from-blue-500');
    });

    test('and a forced legacy spelling is both understood and replaced', () => {
        const property = findProperty('gradient-direction');
        const option = property.options.find((o) => o.value === 'bg-linear-to-b')!;
        const next = toggleOption('bg-gradient-to-r!', option, property, '');
        expect(next).toBe('bg-linear-to-b!');
    });
});

/**
 * The same problem one level down: an arbitrary value is not an enumerated
 * spelling, and tailwind-merge will not conflict `text-[13px]!` with
 * `text-5xl` across the marker. Both survived, the forced one won, and
 * choosing a new value in the panel changed nothing on the canvas.
 */
describe('a forced arbitrary value', () => {
    const size = () => findProperty('text-size');

    test('is replaced by a preset, keeping the marker', () => {
        const option = size().options.find((o) => o.value === 'text-5xl')!;
        expect(toggleOption('text-[13px]!', option, size(), '')).toBe('text-5xl!');
    });

    test('is replaced by another arbitrary value', () => {
        expect(toggleOption('text-[13px]!', { value: 'text-[14px]' }, size(), '')).toBe('text-[14px]!');
    });

    test('and an unforced one still swaps without gaining a marker', () => {
        expect(toggleOption('text-[13px]', { value: 'text-[14px]' }, size(), '')).toBe('text-[14px]');
    });

    test('leaves other properties, forced or not, alone', () => {
        const option = size().options.find((o) => o.value === 'text-5xl')!;
        expect(toggleOption('text-[13px]! font-bold! italic', option, size(), '')).toBe('font-bold! italic text-5xl!');
    });
});

/** What the row has to render, and the button behind the marker it renders */
describe('reading and flipping importance', () => {
    test('names the forced utilities in scope, without their markers', () => {
        const forced = getImportantUtilities('text-4xl! font-bold italic! sm:text-6xl!', '');
        expect([...forced].sort()).toEqual(['italic', 'text-4xl']);
    });

    test('is scoped like everything else', () => {
        expect([...getImportantUtilities('text-4xl! sm:text-6xl!', 'sm')]).toEqual(['text-6xl']);
    });

    test('adds the marker to one utility, leaving its neighbours alone', () => {
        expect(toggleImportance('text-4xl font-bold', 'text-4xl', '')).toBe('text-4xl! font-bold');
    });

    test('and removes it again', () => {
        expect(toggleImportance('text-4xl! font-bold!', 'text-4xl', '')).toBe('text-4xl font-bold!');
    });

    test('takes the utility either way round', () => {
        expect(toggleImportance('text-4xl! font-bold', 'text-4xl!', '')).toBe('text-4xl font-bold');
    });

    test('touches only the scope it was asked for', () => {
        expect(toggleImportance('text-4xl sm:text-4xl', 'text-4xl', 'sm')).toBe('text-4xl sm:text-4xl!');
    });

    test('leaves a class it does not name alone', () => {
        expect(toggleImportance('text-4xl font-bold', 'italic', '')).toBe('text-4xl font-bold');
    });
});

/**
 * The negative sign — a leading '-' on properties that opt into it
 * (`canBeNegative`, e.g. margin, offset/position, translate). Same shape as
 * importance throughout the engine: invisible to matching, preserved across
 * a value change, and the two markers never collide (sign at the front,
 * `!` at the back).
 */
describe('reading and flipping the negative sign', () => {
    test('names the negated utilities in scope, without their sign', () => {
        const negated = getNegativeUtilities('-top-2 mt-4 -mt-8 sm:-top-6', '');
        expect([...negated].sort()).toEqual(['mt-8', 'top-2']);
    });

    test('is scoped like everything else', () => {
        expect([...getNegativeUtilities('-top-2 sm:-top-6', 'sm')]).toEqual(['top-6']);
    });

    test('adds the sign to one utility, leaving its neighbours alone', () => {
        expect(toggleNegative('top-2 mt-4', 'top-2', '')).toBe('-top-2 mt-4');
    });

    test('and removes it again', () => {
        expect(toggleNegative('-top-2 -mt-4', 'top-2', '')).toBe('top-2 -mt-4');
    });

    test('touches only the scope it was asked for', () => {
        expect(toggleNegative('top-2 sm:top-2', 'top-2', 'sm')).toBe('top-2 sm:-top-2');
    });

    test('leaves a class it does not name alone', () => {
        expect(toggleNegative('top-2 mt-4', 'left-2', '')).toBe('top-2 mt-4');
    });

    test('preserves an importance marker while flipping sign', () => {
        expect(toggleNegative('top-2!', 'top-2', '')).toBe('-top-2!');
        expect(toggleNegative('-top-2!', 'top-2', '')).toBe('top-2!');
    });
});

describe('the negative sign is invisible to matching, same as importance', () => {
    test('a negated utility is read as its positive option, active', () => {
        const found = getActiveSelections('-top-2', HELPER_SCHEMA, '');
        expect(found.get('offset-top')).toBe('top-2');
    });

    test('the scoped-utilities set drops the sign the same way it drops the marker', () => {
        expect([...getScopedUtilities('-top-2 -mt-4', '')].sort()).toEqual(['mt-4', 'top-2']);
    });

    test('forcing importance on a negated utility keeps the sign', () => {
        expect(toggleImportance('-top-2', 'top-2', '')).toBe('-top-2!');
    });

    test('choosing a new value carries the sign across, same as the marker', () => {
        const property = findProperty('offset-top');
        const opt = property.options.find((o) => o.value === 'top-4')!;
        expect(toggleOption('-top-2', opt, property, '')).toBe('-top-4');
    });

    test('clearing the property removes the negated utility too', () => {
        expect(clearProperty('-top-2 left-4', findProperty('offset-top'), '')).toBe('left-4');
    });

    test('rotate keeps no canBeNegative flag — its negative form stays out of the picker', () => {
        expect(findProperty('rotate').canBeNegative).toBeFalsy();
    });

    test('margin, offset and translate opted in', () => {
        expect(findProperty('margin-top').canBeNegative).toBe(true);
        expect(findProperty('offset-top').canBeNegative).toBe(true);
        expect(findProperty('translate-x').canBeNegative).toBe(true);
    });

    test('padding did not opt in — it cannot go negative in Tailwind', () => {
        expect(findProperty('padding-top').canBeNegative).toBeFalsy();
    });
});

/**
 * Tailwind v3 wrote the marker in front of the utility, after the variant:
 * `sm:!text-6xl`. It still compiles in v4 and still emits `!important` —
 * measured through the installed Tailwind — so markup in the wild carries
 * both spellings.
 */
describe('the v3 marker position', () => {
    test('is read as the class it means', () => {
        const found = getActiveSelections('!font-bold !text-4xl', HELPER_SCHEMA, '');
        expect(found.get('font-weight')).toBe('font-bold');
        expect(found.get('text-size')).toBe('text-4xl');
    });

    test('counts as forced', () => {
        expect([...getImportantUtilities('!font-bold text-4xl', '')]).toEqual(['font-bold']);
    });

    test('is scoped like the trailing one', () => {
        expect(getActiveSelections('md:!text-6xl', HELPER_SCHEMA, 'md').get('text-size')).toBe('text-6xl');
        expect([...getImportantUtilities('md:!text-6xl', 'md')]).toEqual(['text-6xl']);
    });

    test('unforcing removes it from the side it is on', () => {
        expect(toggleImportance('!font-bold italic', 'font-bold', '')).toBe('font-bold italic');
    });

    test('and forcing writes the v4 spelling, never both', () => {
        const next = toggleImportance('font-bold', 'font-bold', '');
        expect(next).toBe('font-bold!');
        expect(next).not.toContain('!font-bold');
    });

    test('choosing a new value carries the marker across, in the new spelling', () => {
        const property = findProperty('text-size');
        const option = property.options.find((o) => o.value === 'text-5xl')!;
        expect(toggleOption('!text-4xl', option, property, '')).toBe('text-5xl!');
    });

    test('clearing reaches it too', () => {
        expect(clearProperty('!text-4xl font-bold', findProperty('text-size'), '')).toBe('font-bold');
    });
});

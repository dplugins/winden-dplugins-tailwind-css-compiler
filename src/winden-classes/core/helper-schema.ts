/**
 * Winden Classes Helper — declarative schema
 *
 * Describes the visual class-helper groups (Layout / Spacing / Background /
 * Typography / Borders / Sizing / Position / Effects / Filters) as pure data.
 * No DOM, no React — the UI layer renders this and the state engine (helper-state.ts)
 * resolves it against a class string, so the same schema serves the React
 * Gutenberg panel and the plain-DOM pro panels.
 *
 * Conflict resolution is NOT encoded here — tailwind-merge (via
 * plain-classes/shared/preview-utils.js) is the source of truth for which
 * utilities replace each other. `conflictsWith` exists only as an escape hatch
 * for the rare group tailwind-merge does not cover.
 */

import colors from 'tailwindcss/colors';
import { TRANSFORMS_GROUP } from './helper-schema-transforms';
import { MOTION_GROUP } from './helper-schema-motion';

export type HelperControl = 'icon-row' | 'chip-row' | 'swatch-grid' | 'sided-chip-row';

export interface HelperOption {
    /** Full utility class, e.g. 'flex', 'justify-center', 'bg-red-500' */
    value: string;
    /** Text label; omitted when icon-only */
    label?: string;
    /** Icon key resolved by the UI layer */
    icon?: string;
    /** CSS color used to render a swatch cell */
    swatch?: string;
    /** Swatch-grid layout metadata */
    family?: string;
    shade?: string;
    /**
     * Older spellings that mean this option, read but never written.
     *
     * Tailwind v4 renamed `bg-gradient-to-r` to `bg-linear-to-r` and kept the
     * old name compiling — so markup in the wild carries both, and a panel
     * that knows only the new one reports a gradient as absent while the page
     * renders it. One canonical spelling is still written back, or the class
     * string would change under the caret on every toggle.
     */
    aliases?: string[];
}

export interface HelperConditionalChildren {
    /** Parent option values that make these properties visible */
    when: string[];
    properties: HelperProperty[];
    /**
     * Property ids the panel renders as soon as the branch is active, without
     * waiting for the user to add the row — the layout controls a browser's
     * element inspector puts on screen the moment display becomes flex or grid.
     * The rest of the branch stays behind the group's + menu.
     */
    autoShow?: string[];
}

export interface HelperProperty {
    id: string;
    label: string;
    control: HelperControl;
    options: HelperOption[];
    /** Clicking the active option removes it (default true) */
    allowNone?: boolean;
    /** Several options may be active at once (e.g. top-0 + left-0) */
    multi?: boolean;
    /** Escape hatch for conflicts tailwind-merge does not resolve */
    conflictsWith?: string[];
    /** Keyword-only property: suppress the arbitrary-value Custom input */
    noCustom?: boolean;
    /** Properties shown only when a given option of THIS property is active */
    children?: HelperConditionalChildren[];
    /** Sub-properties of a 'sided-chip-row' (All / X / Y / T / R / B / L) */
    sideProperties?: HelperProperty[];
    /** Utility prefix this side owns ('pt', 'rounded-tl'), set by the builders */
    sidePrefix?: string;
    /**
     * Prefixes owned by the OTHER sides of the same sided property, stamped by
     * `linkSidePeers`. The state engine keeps those utilities alive across a
     * toggle: `p-6 pt-2` is a deliberate pairing in Tailwind, not a redundancy.
     */
    sidePeers?: string[];
    /**
     * This property's values can be negated ('top-2' → '-top-2'). Tailwind
     * only ever writes the sign as a leading '-' on the whole utility, never
     * inside the value — so this is a per-property flag, not a chip variant.
     * Gates the ± toggle in `SidedControl`/`PropertyControl`.
     */
    canBeNegative?: boolean;
}

export interface HelperGroup {
    id: string;
    label: string;
    icon?: string;
    properties: HelperProperty[];
}

// ─── Color palette ───────────────────────────────────────────────

/** Family names whose value is a shade record (50…950) in tailwindcss/colors */
export function getColorFamilies(): Array<{ name: string; shades: Record<string, string> }> {
    return Object.entries(colors as Record<string, unknown>)
        .filter((entry): entry is [string, Record<string, string>] => {
            const value = entry[1];
            return typeof value === 'object' && value !== null;
        })
        .map(([name, shades]) => ({ name, shades }));
}

/** Single-value colors worth exposing as swatches */
const SPECIAL_COLORS: Array<{ name: string; css: string }> = [
    { name: 'black', css: '#000000' },
    { name: 'white', css: '#ffffff' },
    { name: 'transparent', css: 'transparent' },
];

export type ColorPrefix = 'bg' | 'text' | 'border' | 'outline' | 'shadow' | 'from' | 'via' | 'to';

export function buildColorOptions(prefix: ColorPrefix): HelperOption[] {
    const specials = SPECIAL_COLORS.map(({ name, css }) => ({
        value: `${prefix}-${name}`,
        label: name,
        swatch: css,
        family: 'basic', // one shared row, not one row per color
    }));

    const families = getColorFamilies().flatMap(({ name, shades }) =>
        Object.entries(shades).map(([shade, css]) => ({
            value: `${prefix}-${name}-${shade}`,
            label: `${name}-${shade}`,
            swatch: css,
            family: name,
            shade,
        }))
    );

    return [...specials, ...families];
}

// ─── Option builders ─────────────────────────────────────────────

const chip = (value: string, label?: string): HelperOption => ({
    value,
    label: label ?? value,
});

const chips = (values: string[], stripPrefix?: RegExp): HelperOption[] =>
    values.map((v) => chip(v, stripPrefix ? v.replace(stripPrefix, '') : v));

const GAP_VALUES = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16'];

export const SPACING_VALUES = ['0', '0.5', '1', '1.5', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'];

interface SideDef {
    id: string;
    label: string;
    prefix: string;
}

const PADDING_SIDES: SideDef[] = [
    { id: 'all', label: 'All', prefix: 'p' },
    { id: 'x', label: 'X', prefix: 'px' },
    { id: 'y', label: 'Y', prefix: 'py' },
    { id: 'top', label: 'Top', prefix: 'pt' },
    { id: 'right', label: 'Right', prefix: 'pr' },
    { id: 'bottom', label: 'Bottom', prefix: 'pb' },
    { id: 'left', label: 'Left', prefix: 'pl' },
];

const MARGIN_SIDES: SideDef[] = [
    { id: 'all', label: 'All', prefix: 'm' },
    { id: 'x', label: 'X', prefix: 'mx' },
    { id: 'y', label: 'Y', prefix: 'my' },
    { id: 'top', label: 'Top', prefix: 'mt' },
    { id: 'right', label: 'Right', prefix: 'mr' },
    { id: 'bottom', label: 'Bottom', prefix: 'mb' },
    { id: 'left', label: 'Left', prefix: 'ml' },
];

function buildSidedProperty(
    id: string,
    label: string,
    sides: SideDef[],
    extraValues: string[] = [],
    canBeNegative = false
): HelperProperty {
    return {
        id,
        label,
        control: 'sided-chip-row',
        options: [],
        sideProperties: sides.map((side) => ({
            id: `${id}-${side.id}`,
            label: side.label,
            control: 'chip-row',
            sidePrefix: side.prefix,
            canBeNegative,
            options: [...SPACING_VALUES, ...extraValues].map((v) => chip(`${side.prefix}-${v}`, v)),
        })),
    };
}

const BORDER_SIDES: SideDef[] = [
    { id: 'all', label: 'All', prefix: 'border' },
    { id: 'x', label: 'X', prefix: 'border-x' },
    { id: 'y', label: 'Y', prefix: 'border-y' },
    { id: 'top', label: 'Top', prefix: 'border-t' },
    { id: 'right', label: 'Right', prefix: 'border-r' },
    { id: 'bottom', label: 'Bottom', prefix: 'border-b' },
    { id: 'left', label: 'Left', prefix: 'border-l' },
];

/** Border widths per side; '1' is the bare form (border-t, not border-t-1) */
function buildBorderWidthProperty(): HelperProperty {
    return {
        id: 'border-width',
        label: 'Border Width',
        control: 'sided-chip-row',
        options: [],
        sideProperties: BORDER_SIDES.map((side) => ({
            id: `border-width-${side.id}`,
            label: side.label,
            control: 'chip-row',
            sidePrefix: side.prefix,
            options: [
                chip(`${side.prefix}-0`, '0'),
                chip(side.prefix, '1'),
                chip(`${side.prefix}-2`, '2'),
                chip(`${side.prefix}-4`, '4'),
                chip(`${side.prefix}-8`, '8'),
            ],
        })),
    };
}

const OFFSET_SIDES: SideDef[] = [
    { id: 'all', label: 'All', prefix: 'inset' },
    { id: 'x', label: 'X', prefix: 'inset-x' },
    { id: 'y', label: 'Y', prefix: 'inset-y' },
    { id: 'top', label: 'Top', prefix: 'top' },
    { id: 'right', label: 'Right', prefix: 'right' },
    { id: 'bottom', label: 'Bottom', prefix: 'bottom' },
    { id: 'left', label: 'Left', prefix: 'left' },
];

const OFFSET_VALUES = [...SPACING_VALUES, 'auto', 'px', 'full', '1/2', '1/3', '2/3', '1/4', '3/4'];

/** Offsets per edge for positioned elements (top-4, inset-x-0, left-auto …) */
function buildOffsetProperty(): HelperProperty {
    return {
        id: 'offset',
        label: 'Offset',
        control: 'sided-chip-row',
        options: [],
        sideProperties: OFFSET_SIDES.map((side) => ({
            id: `offset-${side.id}`,
            label: side.label,
            control: 'chip-row',
            sidePrefix: side.prefix,
            canBeNegative: true,
            options: OFFSET_VALUES.map((v) => chip(`${side.prefix}-${v}`, v)),
        })),
    };
}

const justifyContentProperty: HelperProperty = {
    id: 'justify-content',
    label: 'Justify Content',
    control: 'icon-row',
    options: [
        { value: 'justify-start', label: 'Start', icon: 'align-horizontal-justify-start' },
        { value: 'justify-center', label: 'Center', icon: 'align-horizontal-justify-center' },
        { value: 'justify-end', label: 'End', icon: 'align-horizontal-justify-end' },
        { value: 'justify-between', label: 'Between', icon: 'align-horizontal-space-between' },
        { value: 'justify-around', label: 'Around', icon: 'align-horizontal-space-around' },
        { value: 'justify-evenly', label: 'Evenly', icon: 'align-horizontal-distribute-center' },
        { value: 'justify-stretch', label: 'Stretch', icon: 'stretch-horizontal' },
        { value: 'justify-normal', label: 'Normal', icon: 'minus' },
    ],
};

const alignItemsProperty: HelperProperty = {
    id: 'align-items',
    label: 'Align Items',
    control: 'icon-row',
    options: [
        { value: 'items-start', label: 'Start', icon: 'align-vertical-justify-start' },
        { value: 'items-center', label: 'Center', icon: 'align-vertical-justify-center' },
        { value: 'items-end', label: 'End', icon: 'align-vertical-justify-end' },
        { value: 'items-stretch', label: 'Stretch', icon: 'stretch-vertical' },
        { value: 'items-baseline', label: 'Baseline', icon: 'baseline' },
    ],
};

const alignContentProperty: HelperProperty = {
    id: 'align-content',
    label: 'Align Content',
    control: 'icon-row',
    options: [
        { value: 'content-start', label: 'Start', icon: 'align-start-vertical' },
        { value: 'content-center', label: 'Center', icon: 'align-center-vertical' },
        { value: 'content-end', label: 'End', icon: 'align-end-vertical' },
        { value: 'content-between', label: 'Between', icon: 'align-vertical-space-between' },
        { value: 'content-around', label: 'Around', icon: 'align-vertical-space-around' },
        { value: 'content-evenly', label: 'Evenly', icon: 'align-vertical-distribute-center' },
        { value: 'content-stretch', label: 'Stretch', icon: 'stretch-horizontal' },
        { value: 'content-baseline', label: 'Baseline', icon: 'baseline' },
        { value: 'content-normal', label: 'Normal', icon: 'minus' },
    ],
};

const justifyItemsProperty: HelperProperty = {
    id: 'justify-items',
    label: 'Justify Items',
    control: 'icon-row',
    options: [
        { value: 'justify-items-start', label: 'Start', icon: 'align-start-horizontal' },
        { value: 'justify-items-center', label: 'Center', icon: 'align-center-horizontal' },
        { value: 'justify-items-end', label: 'End', icon: 'align-end-horizontal' },
        { value: 'justify-items-stretch', label: 'Stretch', icon: 'stretch-horizontal' },
        { value: 'justify-items-normal', label: 'Normal', icon: 'minus' },
    ],
};

const placeContentProperty: HelperProperty = {
    id: 'place-content',
    label: 'Place Content',
    control: 'chip-row',
    options: chips(
        ['place-content-start', 'place-content-end', 'place-content-center', 'place-content-between',
            'place-content-around', 'place-content-evenly', 'place-content-baseline', 'place-content-stretch'],
        /^place-content-/
    ),
};

const placeItemsProperty: HelperProperty = {
    id: 'place-items',
    label: 'Place Items',
    control: 'chip-row',
    options: chips(
        ['place-items-start', 'place-items-end', 'place-items-center', 'place-items-baseline', 'place-items-stretch'],
        /^place-items-/
    ),
};

/**
 * Alignment shared by the flex and grid branches, in the order a browser's
 * element inspector lists them; the place-* shorthands follow, off-screen until
 * added, since no inspector shows them.
 */
const alignmentProperties: HelperProperty[] = [
    alignContentProperty,
    justifyContentProperty,
    alignItemsProperty,
    justifyItemsProperty,
    placeContentProperty,
    placeItemsProperty,
];

const trackNumbers = (n: number) => Array.from({ length: n }, (_, i) => `${i + 1}`);

/** The --container-* scale, which `columns-*` takes a width from */
const CONTAINER_SIZES = ['3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'];

/** Shared by break-after and break-before, which take the same values */
const BREAK_VALUES = ['auto', 'avoid', 'all', 'avoid-page', 'page', 'left', 'right', 'column'];

/** Shared between the flex and grid branches — same id so state stays stable */
const gapProperty: HelperProperty = {
    id: 'gap',
    label: 'Gap',
    control: 'sided-chip-row',
    options: [],
    sideProperties: [
        { id: 'gap-all', label: 'All', control: 'chip-row', sidePrefix: 'gap', options: GAP_VALUES.map((n) => chip(`gap-${n}`, n)) },
        { id: 'gap-x', label: 'X', control: 'chip-row', sidePrefix: 'gap-x', options: GAP_VALUES.map((n) => chip(`gap-x-${n}`, n)) },
        { id: 'gap-y', label: 'Y', control: 'chip-row', sidePrefix: 'gap-y', options: GAP_VALUES.map((n) => chip(`gap-y-${n}`, n)) },
    ],
};

const RADIUS_SIDES: SideDef[] = [
    { id: 'all', label: 'All', prefix: 'rounded' },
    { id: 'top', label: 'T', prefix: 'rounded-t' },
    { id: 'right', label: 'R', prefix: 'rounded-r' },
    { id: 'bottom', label: 'B', prefix: 'rounded-b' },
    { id: 'left', label: 'L', prefix: 'rounded-l' },
    { id: 'tl', label: 'TL', prefix: 'rounded-tl' },
    { id: 'tr', label: 'TR', prefix: 'rounded-tr' },
    { id: 'br', label: 'BR', prefix: 'rounded-br' },
    { id: 'bl', label: 'BL', prefix: 'rounded-bl' },
];

const RADIUS_SIZES = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

/** Radius per side/corner; 'base' is the bare form (rounded-t, not rounded-t-base) */
function buildRadiusProperty(): HelperProperty {
    return {
        id: 'border-radius',
        label: 'Radius',
        control: 'sided-chip-row',
        options: [],
        sideProperties: RADIUS_SIDES.map((side) => ({
            id: `border-radius-${side.id}`,
            label: side.label,
            control: 'chip-row',
            sidePrefix: side.prefix,
            options: [
                chip(`${side.prefix}-none`, 'none'),
                chip(`${side.prefix}-sm`, 'sm'),
                chip(side.prefix, 'base'),
                ...RADIUS_SIZES.slice(2).map((s) => chip(`${side.prefix}-${s}`, s)),
            ],
        })),
    };
}

const OVERFLOW_VALUES = ['visible', 'hidden', 'auto', 'scroll'];

const overflowProperty: HelperProperty = {
    id: 'overflow',
    label: 'Overflow',
    control: 'sided-chip-row',
    options: [],
    sideProperties: [
        { id: 'overflow-all', label: 'All', control: 'chip-row', sidePrefix: 'overflow', options: OVERFLOW_VALUES.map((v) => chip(`overflow-${v}`, v)) },
        { id: 'overflow-x', label: 'X', control: 'chip-row', sidePrefix: 'overflow-x', options: OVERFLOW_VALUES.map((v) => chip(`overflow-x-${v}`, v)) },
        { id: 'overflow-y', label: 'Y', control: 'chip-row', sidePrefix: 'overflow-y', options: OVERFLOW_VALUES.map((v) => chip(`overflow-y-${v}`, v)) },
    ],
};

const TEXT_SIZES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl'];

const WIDTH_VALUES = [
    'w-full', 'w-auto', 'w-screen', 'w-fit', 'w-min', 'w-max', 'w-px',
    'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4',
    'w-4', 'w-8', 'w-12', 'w-16', 'w-20', 'w-24', 'w-32', 'w-40', 'w-48', 'w-64', 'w-80', 'w-96',
];

const MAX_WIDTH_VALUES = [
    'max-w-none', 'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl',
    'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl',
    'max-w-full', 'max-w-prose',
];

const HEIGHT_VALUES = [
    'h-auto', 'h-full', 'h-screen', 'h-fit', 'h-px',
    'h-4', 'h-8', 'h-12', 'h-16', 'h-20', 'h-24', 'h-32', 'h-40', 'h-48', 'h-64', 'h-80', 'h-96',
];

// ─── Schema ──────────────────────────────────────────────────────

/**
 * Stamp every side of a sided property with the prefixes its siblings own.
 * Done once over the finished schema so the builders stay declarative and
 * nothing has to repeat the sibling list.
 */
function linkSidePeers(groups: HelperGroup[]): HelperGroup[] {
    const walk = (properties: HelperProperty[]): void => {
        for (const property of properties) {
            const sides = property.sideProperties;
            if (sides?.length) {
                for (const side of sides) {
                    side.sidePeers = sides
                        .filter((other) => other !== side && other.sidePrefix)
                        .map((other) => other.sidePrefix as string);
                }
                walk(sides);
            }
            for (const branch of property.children ?? []) walk(branch.properties);
        }
    };
    for (const group of groups) walk(group.properties);
    return groups;
}

export const HELPER_SCHEMA: HelperGroup[] = linkSidePeers([
    {
        id: 'layout',
        label: 'Layout',
        icon: 'layout-grid',
        properties: [
            {
                id: 'display',
                label: 'Display',
                control: 'icon-row',
                options: [
                    { value: 'block', label: 'Block', icon: 'square' },
                    { value: 'flex', label: 'Flex', icon: 'columns-3' },
                    { value: 'grid', label: 'Grid', icon: 'layout-grid' },
                    { value: 'inline-flex', label: 'Inline Flex', icon: 'gallery-horizontal' },
                    { value: 'hidden', label: 'Hidden', icon: 'eye-off' },
                ],
                children: [
                    {
                        when: ['flex', 'inline-flex'],
                        autoShow: ['flex-direction', 'flex-wrap', 'align-content', 'justify-content', 'align-items'],
                        properties: [
                            {
                                id: 'flex-direction',
                                label: 'Direction',
                                control: 'icon-row',
                                options: [
                                    { value: 'flex-row', label: 'Row', icon: 'arrow-right' },
                                    { value: 'flex-col', label: 'Column', icon: 'arrow-down' },
                                    { value: 'flex-row-reverse', label: 'Row Reverse', icon: 'arrow-left' },
                                    { value: 'flex-col-reverse', label: 'Column Reverse', icon: 'arrow-up' },
                                ],
                            },
                            {
                                id: 'flex-wrap',
                                label: 'Wrap',
                                control: 'icon-row',
                                options: [
                                    { value: 'flex-nowrap', label: 'No Wrap', icon: 'move-horizontal' },
                                    { value: 'flex-wrap', label: 'Wrap', icon: 'wrap-text' },
                                    { value: 'flex-wrap-reverse', label: 'Wrap Reverse', icon: 'undo-2' },
                                ],
                            },
                            ...alignmentProperties,
                            gapProperty,
                        ],
                    },
                    {
                        when: ['grid'],
                        autoShow: ['grid-auto-flow', 'align-content', 'justify-content', 'align-items', 'justify-items'],
                        properties: [
                            {
                                id: 'grid-cols',
                                label: 'Template Columns',
                                control: 'chip-row',
                                options: [
                                    ...trackNumbers(12).map((n) => chip(`grid-cols-${n}`, n)),
                                    chip('grid-cols-none', 'none'),
                                    chip('grid-cols-subgrid', 'subgrid'),
                                ],
                            },
                            {
                                id: 'grid-rows',
                                label: 'Template Rows',
                                control: 'chip-row',
                                options: [
                                    ...trackNumbers(12).map((n) => chip(`grid-rows-${n}`, n)),
                                    chip('grid-rows-none', 'none'),
                                    chip('grid-rows-subgrid', 'subgrid'),
                                ],
                            },
                            {
                                id: 'grid-auto-flow',
                                label: 'Auto Flow',
                                control: 'icon-row',
                                options: [
                                    { value: 'grid-flow-row', label: 'Row', icon: 'rows-3' },
                                    { value: 'grid-flow-col', label: 'Column', icon: 'columns-3' },
                                    { value: 'grid-flow-row-dense', label: 'Row Dense', icon: 'rows-4' },
                                    { value: 'grid-flow-col-dense', label: 'Column Dense', icon: 'columns-4' },
                                    { value: 'grid-flow-dense', label: 'Dense', icon: 'grid-2x2' },
                                ],
                            },
                            {
                                id: 'grid-auto-columns',
                                label: 'Auto Columns',
                                control: 'chip-row',
                                options: chips(['auto-cols-auto', 'auto-cols-min', 'auto-cols-max', 'auto-cols-fr'], /^auto-cols-/),
                            },
                            {
                                id: 'grid-auto-rows',
                                label: 'Auto Rows',
                                control: 'chip-row',
                                options: chips(['auto-rows-auto', 'auto-rows-min', 'auto-rows-max', 'auto-rows-fr'], /^auto-rows-/),
                            },
                            ...alignmentProperties,
                            gapProperty,
                        ],
                    },
                ],
            },
            {
                id: 'flex',
                label: 'Flex',
                control: 'chip-row',
                options: chips(['flex-1', 'flex-auto', 'flex-initial', 'flex-none'], /^flex-/),
            },
            {
                id: 'flex-grow',
                label: 'Grow',
                control: 'chip-row',
                options: [chip('grow', 'grow'), chip('grow-0', '0')],
            },
            {
                id: 'flex-shrink',
                label: 'Shrink',
                control: 'chip-row',
                options: [chip('shrink', 'shrink'), chip('shrink-0', '0')],
            },
            {
                id: 'flex-basis',
                label: 'Basis',
                control: 'chip-row',
                options: [
                    chip('basis-auto', 'auto'),
                    chip('basis-full', 'full'),
                    chip('basis-px', 'px'),
                    ...['0', '1', '2', '4', '8', '12', '16', '20', '24', '32', '40', '48', '56', '64']
                        .map((n) => chip(`basis-${n}`, n)),
                    ...['1/2', '1/3', '2/3', '1/4', '3/4'].map((f) => chip(`basis-${f}`, f)),
                ],
            },
            {
                id: 'order',
                label: 'Order',
                control: 'chip-row',
                options: [
                    chip('order-first', 'first'),
                    chip('order-last', 'last'),
                    chip('order-none', 'none'),
                    ...trackNumbers(12).map((n) => chip(`order-${n}`, n)),
                ],
            },
            {
                id: 'grid-column',
                label: 'Grid Column',
                control: 'chip-row',
                options: [
                    chip('col-auto', 'auto'),
                    chip('col-span-full', 'span full'),
                    ...trackNumbers(12).map((n) => chip(`col-span-${n}`, `span ${n}`)),
                ],
            },
            {
                id: 'grid-column-start',
                label: 'Column Start',
                control: 'chip-row',
                options: [chip('col-start-auto', 'auto'), ...trackNumbers(13).map((n) => chip(`col-start-${n}`, n))],
            },
            {
                id: 'grid-column-end',
                label: 'Column End',
                control: 'chip-row',
                options: [chip('col-end-auto', 'auto'), ...trackNumbers(13).map((n) => chip(`col-end-${n}`, n))],
            },
            {
                id: 'grid-row',
                label: 'Grid Row',
                control: 'chip-row',
                options: [
                    chip('row-auto', 'auto'),
                    chip('row-span-full', 'span full'),
                    ...trackNumbers(12).map((n) => chip(`row-span-${n}`, `span ${n}`)),
                ],
            },
            {
                id: 'grid-row-start',
                label: 'Row Start',
                control: 'chip-row',
                options: [chip('row-start-auto', 'auto'), ...trackNumbers(13).map((n) => chip(`row-start-${n}`, n))],
            },
            {
                id: 'grid-row-end',
                label: 'Row End',
                control: 'chip-row',
                options: [chip('row-end-auto', 'auto'), ...trackNumbers(13).map((n) => chip(`row-end-${n}`, n))],
            },
            {
                id: 'justify-self',
                label: 'Justify Self',
                control: 'chip-row',
                options: chips(
                    ['justify-self-auto', 'justify-self-start', 'justify-self-center', 'justify-self-end', 'justify-self-stretch'],
                    /^justify-self-/
                ),
            },
            {
                id: 'align-self',
                label: 'Align Self',
                control: 'chip-row',
                options: chips(['self-auto', 'self-start', 'self-center', 'self-end', 'self-stretch', 'self-baseline'], /^self-/),
            },
            {
                id: 'place-self',
                label: 'Place Self',
                control: 'chip-row',
                options: chips(
                    ['place-self-auto', 'place-self-start', 'place-self-center', 'place-self-end', 'place-self-stretch'],
                    /^place-self-/
                ),
            },
            {
                id: 'float',
                label: 'Float',
                control: 'chip-row',
                options: [
                    chip('float-none', 'none'),
                    chip('float-left', 'left'),
                    chip('float-right', 'right'),
                    chip('float-start', 'start'),
                    chip('float-end', 'end'),
                ],
            },
            {
                id: 'clear',
                label: 'Clear',
                control: 'chip-row',
                options: [
                    chip('clear-none', 'none'),
                    chip('clear-left', 'left'),
                    chip('clear-right', 'right'),
                    chip('clear-both', 'both'),
                    chip('clear-start', 'start'),
                    chip('clear-end', 'end'),
                ],
            },
            {
                // CSS multi-column layout — independent of display, unlike grid-cols
                id: 'columns',
                label: 'Columns (multi-column)',
                control: 'chip-row',
                options: [
                    chip('columns-auto', 'auto'),
                    // A count, or a column width from the --container-* scale
                    ...trackNumbers(12).map((n) => chip(`columns-${n}`, n)),
                    ...CONTAINER_SIZES.map((size) => chip(`columns-${size}`, size)),
                ],
            },
            {
                // Multi-column's other half: without these a card splits across
                // a column break.
                id: 'break-inside',
                label: 'Break Inside',
                control: 'chip-row',
                options: chips(
                    ['break-inside-auto', 'break-inside-avoid', 'break-inside-avoid-page', 'break-inside-avoid-column'],
                    /^break-inside-/
                ),
            },
            {
                id: 'break-after',
                label: 'Break After',
                control: 'chip-row',
                options: chips(BREAK_VALUES.map((value) => `break-after-${value}`), /^break-after-/),
            },
            {
                id: 'break-before',
                label: 'Break Before',
                control: 'chip-row',
                options: chips(BREAK_VALUES.map((value) => `break-before-${value}`), /^break-before-/),
            },
        ],
    },
    {
        id: 'spacing',
        label: 'Spacing',
        icon: 'scan',
        properties: [
            buildSidedProperty('padding', 'Padding', PADDING_SIDES),
            buildSidedProperty('margin', 'Margin', MARGIN_SIDES, ['auto'], true),
        ],
    },
    {
        id: 'background',
        label: 'Background',
        icon: 'paint-bucket',
        properties: [
            {
                id: 'background-color',
                label: 'Background Color',
                control: 'swatch-grid',
                options: buildColorOptions('bg'),
            },
            {
                id: 'background-clip',
                label: 'Background Clip',
                control: 'chip-row',
                options: [
                    { value: 'bg-clip-border', label: 'Border' },
                    { value: 'bg-clip-padding', label: 'Padding' },
                    { value: 'bg-clip-content', label: 'Content' },
                    { value: 'bg-clip-text', label: 'Text' },
                ],
            },
            {
                id: 'gradient-direction',
                label: 'Gradient',
                control: 'icon-row',
                options: [
                    { value: 'bg-linear-to-t', label: 'To Top', icon: 'arrow-up', aliases: ['bg-gradient-to-t']},
                    { value: 'bg-linear-to-tr', label: 'To Top Right', icon: 'arrow-up-right', aliases: ['bg-gradient-to-tr']},
                    { value: 'bg-linear-to-r', label: 'To Right', icon: 'arrow-right', aliases: ['bg-gradient-to-r']},
                    { value: 'bg-linear-to-br', label: 'To Bottom Right', icon: 'arrow-down-right', aliases: ['bg-gradient-to-br']},
                    { value: 'bg-linear-to-b', label: 'To Bottom', icon: 'arrow-down', aliases: ['bg-gradient-to-b']},
                    { value: 'bg-linear-to-bl', label: 'To Bottom Left', icon: 'arrow-down-left', aliases: ['bg-gradient-to-bl']},
                    { value: 'bg-linear-to-l', label: 'To Left', icon: 'arrow-left', aliases: ['bg-gradient-to-l']},
                    { value: 'bg-linear-to-tl', label: 'To Top Left', icon: 'arrow-up-left', aliases: ['bg-gradient-to-tl']},
                    { value: 'bg-radial', label: 'Radial' },
                    { value: 'bg-conic', label: 'Conic' },
                ],
                children: [
                    {
                        when: [
                            'bg-linear-to-t', 'bg-linear-to-tr', 'bg-linear-to-r', 'bg-linear-to-br',
                            'bg-linear-to-b', 'bg-linear-to-bl', 'bg-linear-to-l', 'bg-linear-to-tl',
                            'bg-radial', 'bg-conic',
                        ],
                        properties: [
                            {
                                id: 'gradient-from',
                                label: 'From Color',
                                control: 'swatch-grid',
                                options: buildColorOptions('from'),
                            },
                            {
                                id: 'gradient-via',
                                label: 'Via Color',
                                control: 'swatch-grid',
                                options: buildColorOptions('via'),
                            },
                            {
                                id: 'gradient-to',
                                label: 'To Color',
                                control: 'swatch-grid',
                                options: buildColorOptions('to'),
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'typography',
        label: 'Typography',
        icon: 'type',
        properties: [
            {
                id: 'text-color',
                label: 'Text Color',
                control: 'swatch-grid',
                options: buildColorOptions('text'),
            },
            {
                // Tailwind ships three stacks; a Wizzard --font-* token adds its
                // own name here through mergeThemeOptions.
                id: 'font-family',
                label: 'Font Family',
                control: 'chip-row',
                options: chips(['font-sans', 'font-serif', 'font-mono'], /^font-/),
            },
            {
                id: 'text-size',
                label: 'Text Size',
                control: 'chip-row',
                options: TEXT_SIZES.map((s) => chip(`text-${s}`, s)),
            },
            {
                id: 'font-weight',
                label: 'Font Weight',
                control: 'chip-row',
                options: chips(
                    ['font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
                    /^font-/
                ),
            },
            {
                id: 'text-align',
                label: 'Text Align',
                control: 'icon-row',
                options: [
                    { value: 'text-left', label: 'Left', icon: 'align-left' },
                    { value: 'text-center', label: 'Center', icon: 'align-center' },
                    { value: 'text-right', label: 'Right', icon: 'align-right' },
                    { value: 'text-justify', label: 'Justify', icon: 'align-justify' },
                ],
            },
            {
                id: 'text-transform',
                label: 'Transform',
                control: 'chip-row',
                options: [
                    chip('uppercase', 'UPPER'),
                    chip('lowercase', 'lower'),
                    chip('capitalize', 'Capitalize'),
                    chip('normal-case', 'normal'),
                ],
            },
            {
                id: 'text-decoration',
                label: 'Decoration',
                control: 'chip-row',
                multi: true,
                options: chips(['underline', 'line-through', 'no-underline', 'italic', 'not-italic']),
            },
            {
                id: 'line-height',
                label: 'Line Height',
                control: 'chip-row',
                options: chips(
                    ['leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose'],
                    /^leading-/
                ),
            },
            {
                id: 'letter-spacing',
                label: 'Letter Spacing',
                control: 'chip-row',
                options: chips(
                    ['tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest'],
                    /^tracking-/
                ),
            },
        ],
    },
    {
        id: 'borders',
        label: 'Borders',
        icon: 'box-select',
        properties: [
            buildRadiusProperty(),
            buildBorderWidthProperty(),
            {
                id: 'border-color',
                label: 'Border Color',
                control: 'swatch-grid',
                options: buildColorOptions('border'),
            },
            {
                id: 'border-style',
                label: 'Border Style',
                control: 'chip-row',
                options: chips(
                    ['border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-hidden', 'border-none'],
                    /^border-/
                ),
            },
            {
                id: 'outline-width',
                label: 'Outline Width',
                control: 'chip-row',
                options: [
                    chip('outline-0', '0'),
                    chip('outline-1', '1'),
                    chip('outline-2', '2'),
                    chip('outline-4', '4'),
                    chip('outline-8', '8'),
                ],
            },
            {
                id: 'outline-color',
                label: 'Outline Color',
                control: 'swatch-grid',
                options: buildColorOptions('outline'),
            },
            {
                id: 'outline-style',
                label: 'Outline Style',
                control: 'chip-row',
                options: chips(
                    ['outline-solid', 'outline-dashed', 'outline-dotted', 'outline-double', 'outline-none', 'outline-hidden'],
                    /^outline-/
                ),
            },
            {
                id: 'outline-offset',
                label: 'Outline Offset',
                control: 'chip-row',
                options: [
                    chip('outline-offset-0', '0'),
                    chip('outline-offset-1', '1'),
                    chip('outline-offset-2', '2'),
                    chip('outline-offset-4', '4'),
                    chip('outline-offset-8', '8'),
                ],
            },
        ],
    },
    {
        id: 'sizing',
        label: 'Sizing',
        icon: 'ruler',
        properties: [
            {
                id: 'width',
                label: 'Width',
                control: 'chip-row',
                options: WIDTH_VALUES.map((w) => chip(w, w.replace(/^w-/, ''))),
            },
            {
                id: 'max-width',
                label: 'Max Width',
                control: 'chip-row',
                options: MAX_WIDTH_VALUES.map((w) => chip(w, w.replace(/^max-w-/, ''))),
            },
            {
                id: 'height',
                label: 'Height',
                control: 'chip-row',
                options: HEIGHT_VALUES.map((h) => chip(h, h.replace(/^h-/, ''))),
            },
            {
                id: 'min-height',
                label: 'Min Height',
                control: 'chip-row',
                options: chips(['min-h-0', 'min-h-full', 'min-h-screen', 'min-h-fit'], /^min-h-/),
            },
            {
                id: 'aspect-ratio',
                label: 'Aspect Ratio',
                control: 'chip-row',
                options: [
                    chip('aspect-auto', 'auto'),
                    chip('aspect-square', '1/1'),
                    chip('aspect-video', '16/9'),
                    chip('aspect-[4/3]', '4/3'),
                    chip('aspect-[3/2]', '3/2'),
                    chip('aspect-[2/1]', '2/1'),
                    chip('aspect-[9/16]', '9/16'),
                ],
            },
        ],
    },
    {
        id: 'position',
        label: 'Position',
        icon: 'move-vertical',
        properties: [
            {
                id: 'position',
                label: 'Position',
                control: 'chip-row',
                options: chips(['static', 'relative', 'absolute', 'fixed', 'sticky']),
                children: [
                    {
                        when: ['absolute', 'fixed', 'sticky'],
                        properties: [
                            buildOffsetProperty(),
                            {
                                id: 'z-index',
                                label: 'Z-Index',
                                control: 'chip-row',
                                options: chips(['z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-auto'], /^z-/),
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'effects',
        label: 'Effects',
        icon: 'blend',
        properties: [
            {
                id: 'shadow',
                label: 'Shadow',
                control: 'chip-row',
                options: [
                    chip('shadow-none', 'none'),
                    chip('shadow-sm', 'sm'),
                    chip('shadow', 'base'),
                    chip('shadow-md', 'md'),
                    chip('shadow-lg', 'lg'),
                    chip('shadow-xl', 'xl'),
                    chip('shadow-2xl', '2xl'),
                ],
            },
            {
                id: 'shadow-color',
                label: 'Shadow Color',
                control: 'swatch-grid',
                options: buildColorOptions('shadow'),
            },
            {
                id: 'mix-blend-mode',
                label: 'Mix Blend Mode',
                control: 'chip-row',
                options: [
                    chip('mix-blend-normal', 'normal'),
                    chip('mix-blend-multiply', 'multiply'),
                    chip('mix-blend-screen', 'screen'),
                    chip('mix-blend-overlay', 'overlay'),
                    chip('mix-blend-darken', 'darken'),
                    chip('mix-blend-lighten', 'lighten'),
                    chip('mix-blend-color-dodge', 'color-dodge'),
                    chip('mix-blend-color-burn', 'color-burn'),
                    chip('mix-blend-hard-light', 'hard-light'),
                    chip('mix-blend-soft-light', 'soft-light'),
                    chip('mix-blend-difference', 'difference'),
                    chip('mix-blend-exclusion', 'exclusion'),
                    chip('mix-blend-hue', 'hue'),
                    chip('mix-blend-saturation', 'saturation'),
                    chip('mix-blend-color', 'color'),
                    chip('mix-blend-luminosity', 'luminosity'),
                    chip('mix-blend-plus-darker', 'plus-darker'),
                    chip('mix-blend-plus-lighter', 'plus-lighter'),
                ],
            },
            {
                id: 'background-blend-mode',
                label: 'Background Blend Mode',
                control: 'chip-row',
                options: [
                    chip('bg-blend-normal', 'normal'),
                    chip('bg-blend-multiply', 'multiply'),
                    chip('bg-blend-screen', 'screen'),
                    chip('bg-blend-overlay', 'overlay'),
                    chip('bg-blend-darken', 'darken'),
                    chip('bg-blend-lighten', 'lighten'),
                    chip('bg-blend-color-dodge', 'color-dodge'),
                    chip('bg-blend-color-burn', 'color-burn'),
                    chip('bg-blend-hard-light', 'hard-light'),
                    chip('bg-blend-soft-light', 'soft-light'),
                    chip('bg-blend-difference', 'difference'),
                    chip('bg-blend-exclusion', 'exclusion'),
                    chip('bg-blend-hue', 'hue'),
                    chip('bg-blend-saturation', 'saturation'),
                    chip('bg-blend-color', 'color'),
                    chip('bg-blend-luminosity', 'luminosity'),
                ],
            },
            {
                id: 'opacity',
                label: 'Opacity',
                control: 'chip-row',
                options: chips(['opacity-0', 'opacity-25', 'opacity-50', 'opacity-75', 'opacity-90', 'opacity-100'], /^opacity-/),
            },
            overflowProperty,
        ],
    },
    {
        id: 'filters',
        label: 'Filters',
        icon: 'aperture',
        properties: [
            {
                id: 'filter',
                label: 'Filter',
                control: 'chip-row',
                options: [chip('filter-none', 'none'), chip('filter', 'on')],
            },
            {
                id: 'blur',
                label: 'Blur',
                control: 'chip-row',
                options: chips(
                    ['blur-none', 'blur-xs', 'blur-sm', 'blur-md', 'blur-lg', 'blur-xl', 'blur-2xl', 'blur-3xl'],
                    /^blur-/
                ),
            },
            {
                id: 'brightness',
                label: 'Brightness',
                control: 'chip-row',
                options: chips(
                    [
                        'brightness-0',
                        'brightness-50',
                        'brightness-75',
                        'brightness-90',
                        'brightness-95',
                        'brightness-100',
                        'brightness-105',
                        'brightness-110',
                        'brightness-125',
                        'brightness-150',
                        'brightness-200',
                    ],
                    /^brightness-/
                ),
            },
            {
                id: 'contrast',
                label: 'Contrast',
                control: 'chip-row',
                options: chips(
                    ['contrast-0', 'contrast-50', 'contrast-75', 'contrast-100', 'contrast-125', 'contrast-150', 'contrast-200'],
                    /^contrast-/
                ),
            },
            {
                id: 'drop-shadow',
                label: 'Drop Shadow',
                control: 'chip-row',
                options: chips(
                    [
                        'drop-shadow-none',
                        'drop-shadow-xs',
                        'drop-shadow-sm',
                        'drop-shadow-md',
                        'drop-shadow-lg',
                        'drop-shadow-xl',
                        'drop-shadow-2xl',
                    ],
                    /^drop-shadow-/
                ),
            },
            {
                id: 'grayscale',
                label: 'Grayscale',
                control: 'chip-row',
                options: chips(['grayscale-0', 'grayscale-25', 'grayscale-50', 'grayscale-75', 'grayscale-100'], /^grayscale-/),
            },
            {
                id: 'hue-rotate',
                label: 'Hue Rotate',
                control: 'chip-row',
                options: chips(
                    ['hue-rotate-0', 'hue-rotate-15', 'hue-rotate-30', 'hue-rotate-60', 'hue-rotate-90', 'hue-rotate-180'],
                    /^hue-rotate-/
                ),
            },
            {
                id: 'invert',
                label: 'Invert',
                control: 'chip-row',
                options: chips(['invert-0', 'invert-25', 'invert-50', 'invert-75', 'invert-100'], /^invert-/),
            },
            {
                id: 'saturate',
                label: 'Saturate',
                control: 'chip-row',
                options: chips(
                    ['saturate-0', 'saturate-50', 'saturate-75', 'saturate-100', 'saturate-150', 'saturate-200'],
                    /^saturate-/
                ),
            },
            {
                id: 'sepia',
                label: 'Sepia',
                control: 'chip-row',
                options: chips(['sepia-0', 'sepia-25', 'sepia-50', 'sepia-75', 'sepia-100'], /^sepia-/),
            },
            {
                id: 'backdrop-filter',
                label: 'Backdrop Filter',
                control: 'chip-row',
                options: [chip('backdrop-filter-none', 'none'), chip('backdrop-filter', 'on')],
            },
            {
                id: 'backdrop-blur',
                label: 'Backdrop Blur',
                control: 'chip-row',
                options: chips(
                    [
                        'backdrop-blur-none',
                        'backdrop-blur-xs',
                        'backdrop-blur-sm',
                        'backdrop-blur-md',
                        'backdrop-blur-lg',
                        'backdrop-blur-xl',
                        'backdrop-blur-2xl',
                        'backdrop-blur-3xl',
                    ],
                    /^backdrop-blur-/
                ),
            },
            {
                id: 'backdrop-brightness',
                label: 'Backdrop Brightness',
                control: 'chip-row',
                options: chips(
                    [
                        'backdrop-brightness-0',
                        'backdrop-brightness-50',
                        'backdrop-brightness-75',
                        'backdrop-brightness-90',
                        'backdrop-brightness-100',
                        'backdrop-brightness-110',
                        'backdrop-brightness-125',
                        'backdrop-brightness-150',
                        'backdrop-brightness-200',
                    ],
                    /^backdrop-brightness-/
                ),
            },
            {
                id: 'backdrop-contrast',
                label: 'Backdrop Contrast',
                control: 'chip-row',
                options: chips(
                    [
                        'backdrop-contrast-0',
                        'backdrop-contrast-50',
                        'backdrop-contrast-75',
                        'backdrop-contrast-100',
                        'backdrop-contrast-125',
                        'backdrop-contrast-150',
                        'backdrop-contrast-200',
                    ],
                    /^backdrop-contrast-/
                ),
            },
            {
                id: 'backdrop-grayscale',
                label: 'Backdrop Grayscale',
                control: 'chip-row',
                options: chips(
                    [
                        'backdrop-grayscale-0',
                        'backdrop-grayscale-25',
                        'backdrop-grayscale-50',
                        'backdrop-grayscale-75',
                        'backdrop-grayscale-100',
                    ],
                    /^backdrop-grayscale-/
                ),
            },
            {
                id: 'backdrop-hue-rotate',
                label: 'Backdrop Hue Rotate',
                control: 'chip-row',
                options: chips(
                    [
                        'backdrop-hue-rotate-0',
                        'backdrop-hue-rotate-15',
                        'backdrop-hue-rotate-30',
                        'backdrop-hue-rotate-60',
                        'backdrop-hue-rotate-90',
                        'backdrop-hue-rotate-180',
                    ],
                    /^backdrop-hue-rotate-/
                ),
            },
            {
                id: 'backdrop-invert',
                label: 'Backdrop Invert',
                control: 'chip-row',
                options: chips(
                    ['backdrop-invert-0', 'backdrop-invert-25', 'backdrop-invert-50', 'backdrop-invert-75', 'backdrop-invert-100'],
                    /^backdrop-invert-/
                ),
            },
            {
                id: 'backdrop-opacity',
                label: 'Backdrop Opacity',
                control: 'chip-row',
                options: chips(
                    [
                        'backdrop-opacity-0',
                        'backdrop-opacity-25',
                        'backdrop-opacity-50',
                        'backdrop-opacity-75',
                        'backdrop-opacity-90',
                        'backdrop-opacity-100',
                    ],
                    /^backdrop-opacity-/
                ),
            },
            {
                id: 'backdrop-saturate',
                label: 'Backdrop Saturate',
                control: 'chip-row',
                options: chips(
                    [
                        'backdrop-saturate-0',
                        'backdrop-saturate-50',
                        'backdrop-saturate-100',
                        'backdrop-saturate-150',
                        'backdrop-saturate-200',
                    ],
                    /^backdrop-saturate-/
                ),
            },
            {
                id: 'backdrop-sepia',
                label: 'Backdrop Sepia',
                control: 'chip-row',
                options: chips(
                    ['backdrop-sepia-0', 'backdrop-sepia-25', 'backdrop-sepia-50', 'backdrop-sepia-75', 'backdrop-sepia-100'],
                    /^backdrop-sepia-/
                ),
            },
        ],
    },
    TRANSFORMS_GROUP,
    MOTION_GROUP,
]);

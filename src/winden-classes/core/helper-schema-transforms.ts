/**
 * Winden Classes Helper — Transforms group
 *
 * Covers Tailwind v4's transform utilities: backface-visibility, perspective,
 * perspective-origin, rotate, scale, skew, transform, transform-origin,
 * transform-style and translate.
 *
 * Pure data — no DOM, no React, no side effects. The UI layer renders this and
 * helper-state.ts resolves it against a class string. Integration into
 * HELPER_SCHEMA happens in helper-schema.ts.
 *
 * Every option below was verified against tailwindcss 4.3.3 by compiling the
 * candidate list and checking the emitted selectors — none are guesses.
 *
 * Two deliberate constraints shape the preset lists:
 *
 * 1. One property = one utility prefix. `arbitraryPrefixOf()` derives the
 *    "Custom" arbitrary-value input from the shared prefix (rotate → the user
 *    can type `rotate-[17deg]`), so mixing `rotate-*` with `rotate-x-*` in a
 *    single property would disable that input. Axis variants therefore get
 *    their own properties.
 *
 * 2. No negative utilities. `-rotate-45` does not share the `rotate` prefix
 *    and would break rule 1. Users reach negatives through the Custom input
 *    instead (`rotate-[-45deg]`).
 */

import type { HelperGroup, HelperProperty, HelperOption } from './helper-schema';

// ─── Option builders (local — the schema module does not export these) ───

const chip = (value: string, label?: string): HelperOption => ({
    value,
    label: label ?? value,
});

/** Prefix every value and label it with the bare value ('rotate-45' → '45') */
const prefixed = (prefix: string, values: string[]): HelperOption[] =>
    values.map((value) => chip(`${prefix}-${value}`, value));

// ─── Value scales ────────────────────────────────────────────────

/** rotate-* — degrees on the default rotate scale */
const ROTATE_VALUES = ['none', '0', '1', '2', '3', '6', '12', '45', '90', '180', '270'];

/** rotate-x/y/z-* — no 'none' variant exists for the axis utilities */
const AXIS_ROTATE_VALUES = ['0', '6', '12', '45', '90', '180'];

const SCALE_VALUES = ['none', '0', '50', '75', '90', '95', '100', '105', '110', '125', '150', '200'];

const AXIS_SCALE_VALUES = ['0', '50', '75', '90', '100', '105', '110', '125', '150'];

/** scale-z-* has a shorter useful range than scale-x/y */
const SCALE_Z_VALUES = ['0', '50', '75', '100', '125', '150'];

const SKEW_VALUES = ['0', '1', '2', '3', '6', '12'];

/** translate-* — spacing scale plus fractions and 'full' */
const TRANSLATE_VALUES = [
    'none', '0', 'px', '1', '2', '4', '8', '12', '16', '24',
    '1/4', '1/3', '1/2', '2/3', '3/4', 'full',
];

/** translate-x/y-* — same as above minus 'none', which has no axis variant */
const AXIS_TRANSLATE_VALUES = TRANSLATE_VALUES.filter((v) => v !== 'none');

/** translate-z-* takes the spacing scale only — fractions resolve against no axis */
const TRANSLATE_Z_VALUES = ['0', 'px', '1', '2', '4', '8', '12', '16', '24'];

/** Shared by transform-origin (origin-*) and perspective-origin-* */
const ORIGIN_VALUES = [
    'center', 'top', 'top-right', 'right', 'bottom-right',
    'bottom', 'bottom-left', 'left', 'top-left',
];

// ─── Properties ──────────────────────────────────────────────────

const transformProperty: HelperProperty = {
    id: 'transform',
    label: 'Transform',
    control: 'chip-row',
    options: [
        chip('transform-none', 'none'),
        chip('transform-gpu', 'gpu'),
        chip('transform-cpu', 'cpu'),
    ],
};

const transformStyleProperty: HelperProperty = {
    id: 'transform-style',
    label: 'Transform Style',
    control: 'chip-row',
    options: [
        chip('transform-3d', '3d'),
        chip('transform-flat', 'flat'),
    ],
};

const backfaceVisibilityProperty: HelperProperty = {
    id: 'backface-visibility',
    label: 'Backface',
    control: 'icon-row',
    options: [
        { value: 'backface-visible', label: 'Visible', icon: 'eye' },
        { value: 'backface-hidden', label: 'Hidden', icon: 'eye-off' },
    ],
};

const rotateProperty: HelperProperty = {
    id: 'rotate',
    label: 'Rotate',
    control: 'chip-row',
    options: prefixed('rotate', ROTATE_VALUES),
};

const rotateXProperty: HelperProperty = {
    id: 'rotate-x',
    label: 'Rotate X',
    control: 'chip-row',
    options: prefixed('rotate-x', AXIS_ROTATE_VALUES),
};

const rotateYProperty: HelperProperty = {
    id: 'rotate-y',
    label: 'Rotate Y',
    control: 'chip-row',
    options: prefixed('rotate-y', AXIS_ROTATE_VALUES),
};

const rotateZProperty: HelperProperty = {
    id: 'rotate-z',
    label: 'Rotate Z',
    control: 'chip-row',
    options: prefixed('rotate-z', AXIS_ROTATE_VALUES),
};

const scaleProperty: HelperProperty = {
    id: 'scale',
    label: 'Scale',
    control: 'chip-row',
    options: [...prefixed('scale', SCALE_VALUES), chip('scale-3d', '3d')],
};

const scaleXProperty: HelperProperty = {
    id: 'scale-x',
    label: 'Scale X',
    control: 'chip-row',
    options: prefixed('scale-x', AXIS_SCALE_VALUES),
};

const scaleYProperty: HelperProperty = {
    id: 'scale-y',
    label: 'Scale Y',
    control: 'chip-row',
    options: prefixed('scale-y', AXIS_SCALE_VALUES),
};

const scaleZProperty: HelperProperty = {
    id: 'scale-z',
    label: 'Scale Z',
    control: 'chip-row',
    options: prefixed('scale-z', SCALE_Z_VALUES),
};

const skewProperty: HelperProperty = {
    id: 'skew',
    label: 'Skew',
    control: 'chip-row',
    options: prefixed('skew', SKEW_VALUES),
};

const skewXProperty: HelperProperty = {
    id: 'skew-x',
    label: 'Skew X',
    control: 'chip-row',
    options: prefixed('skew-x', SKEW_VALUES),
};

const skewYProperty: HelperProperty = {
    id: 'skew-y',
    label: 'Skew Y',
    control: 'chip-row',
    options: prefixed('skew-y', SKEW_VALUES),
};

// Unlike rotate (see ROTATE_VALUES above), translate's negative form is a
// toggle on the live utility, not a preset option — arbitraryPrefixOf never
// sees a '-translate-…' string, so it doesn't hit the shared-prefix problem
// that keeps negative rotate out of its options list.
const translateProperty: HelperProperty = {
    id: 'translate',
    label: 'Translate',
    control: 'chip-row',
    canBeNegative: true,
    options: [...prefixed('translate', TRANSLATE_VALUES), chip('translate-3d', '3d')],
};

const translateXProperty: HelperProperty = {
    id: 'translate-x',
    label: 'Translate X',
    control: 'chip-row',
    canBeNegative: true,
    options: prefixed('translate-x', AXIS_TRANSLATE_VALUES),
};

const translateYProperty: HelperProperty = {
    id: 'translate-y',
    label: 'Translate Y',
    control: 'chip-row',
    canBeNegative: true,
    options: prefixed('translate-y', AXIS_TRANSLATE_VALUES),
};

const translateZProperty: HelperProperty = {
    id: 'translate-z',
    label: 'Translate Z',
    control: 'chip-row',
    canBeNegative: true,
    options: prefixed('translate-z', TRANSLATE_Z_VALUES),
};

const transformOriginProperty: HelperProperty = {
    id: 'transform-origin',
    label: 'Transform Origin',
    control: 'chip-row',
    options: prefixed('origin', ORIGIN_VALUES),
};

const perspectiveProperty: HelperProperty = {
    id: 'perspective',
    label: 'Perspective',
    control: 'chip-row',
    options: prefixed('perspective', [
        'dramatic', 'near', 'normal', 'midrange', 'distant', 'none',
    ]),
};

const perspectiveOriginProperty: HelperProperty = {
    id: 'perspective-origin',
    label: 'Perspective Origin',
    control: 'chip-row',
    options: prefixed('perspective-origin', ORIGIN_VALUES),
};

// ─── Group ───────────────────────────────────────────────────────

export const TRANSFORMS_GROUP: HelperGroup = {
    id: 'transforms',
    label: 'Transforms',
    icon: 'axis-3d',
    properties: [
        transformProperty,
        translateProperty,
        translateXProperty,
        translateYProperty,
        translateZProperty,
        rotateProperty,
        rotateXProperty,
        rotateYProperty,
        rotateZProperty,
        scaleProperty,
        scaleXProperty,
        scaleYProperty,
        scaleZProperty,
        skewProperty,
        skewXProperty,
        skewYProperty,
        transformOriginProperty,
        transformStyleProperty,
        perspectiveProperty,
        perspectiveOriginProperty,
        backfaceVisibilityProperty,
    ],
};

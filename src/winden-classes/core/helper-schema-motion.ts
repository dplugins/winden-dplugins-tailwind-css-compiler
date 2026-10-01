/**
 * Winden Classes Helper — Transitions & Animation group
 *
 * Declarative data only: no DOM, no React, no side effects. Mirrors the
 * conventions of helper-schema.ts (which owns the shared types) so the same
 * state engine (helper-state.ts) resolves this group against a class string.
 *
 * Class names verified against tailwindcss 4.3.3 (node_modules/tailwindcss):
 *   transition / -all / -colors / -opacity / -shadow / -transform / -none
 *   transition-normal | transition-discrete   (transition-behavior)
 *   duration-<number> | duration-initial
 *   ease-linear | ease-in | ease-out | ease-in-out | ease-initial
 *   delay-<number>
 *   animate-none | animate-spin | animate-ping | animate-pulse | animate-bounce
 *
 * Conflict resolution is NOT encoded here — tailwind-merge is the source of
 * truth for which utilities replace each other.
 */

import type { HelperGroup, HelperProperty, HelperOption } from './helper-schema';

// ─── Option builders ─────────────────────────────────────────────
// Deliberately re-declared (helper-schema.ts keeps its own copies private)
// so this module stays self-contained.

const chip = (value: string, label?: string): HelperOption => ({
    value,
    label: label ?? value,
});

const chips = (values: string[], stripPrefix?: RegExp): HelperOption[] =>
    values.map((v) => chip(v, stripPrefix ? v.replace(stripPrefix, '') : v));

/** Bare numbers are milliseconds in v4 (duration-300 → 300ms) */
const TIME_VALUES = ['0', '75', '100', '150', '200', '300', '500', '700', '1000'];

// ─── Properties ──────────────────────────────────────────────────

/**
 * Bare `transition` sits first on purpose: it has no dash, so the engine's
 * arbitraryPrefixOf() returns null and no bogus `transition-[…]` custom input
 * is offered for a keyword-only property.
 */
const transitionPropertyProperty: HelperProperty = {
    id: 'transition-property',
    label: 'Transition',
    control: 'chip-row',
    options: [
        chip('transition', 'default'),
        chip('transition-all', 'all'),
        chip('transition-colors', 'colors'),
        chip('transition-opacity', 'opacity'),
        chip('transition-shadow', 'shadow'),
        chip('transition-transform', 'transform'),
        chip('transition-none', 'none'),
    ],
};

/** transition-behavior — separate CSS property from transition-property */
const transitionBehaviorProperty: HelperProperty = {
    id: 'transition-behavior',
    label: 'Behavior',
    control: 'chip-row',
    // Shares the `transition` prefix with transition-property, so an arbitrary
    // value typed here would emit a transition-property value instead.
    noCustom: true,
    options: chips(['transition-normal', 'transition-discrete'], /^transition-/),
};

const transitionDurationProperty: HelperProperty = {
    id: 'transition-duration',
    label: 'Duration',
    control: 'chip-row',
    options: [
        ...TIME_VALUES.map((v) => chip(`duration-${v}`, v)),
        chip('duration-initial', 'initial'),
    ],
};

const transitionTimingFunctionProperty: HelperProperty = {
    id: 'transition-timing-function',
    label: 'Timing Function',
    control: 'chip-row',
    options: chips(['ease-linear', 'ease-in', 'ease-out', 'ease-in-out', 'ease-initial'], /^ease-/),
};

const transitionDelayProperty: HelperProperty = {
    id: 'transition-delay',
    label: 'Delay',
    control: 'chip-row',
    options: TIME_VALUES.map((v) => chip(`delay-${v}`, v)),
};

const animationProperty: HelperProperty = {
    id: 'animation',
    label: 'Animation',
    control: 'chip-row',
    options: chips(['animate-none', 'animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce'], /^animate-/),
};

// ─── Group ───────────────────────────────────────────────────────

export const MOTION_GROUP: HelperGroup = {
    id: 'motion',
    label: 'Transitions & Animation',
    icon: 'zap',
    properties: [
        transitionPropertyProperty,
        transitionBehaviorProperty,
        transitionDurationProperty,
        transitionTimingFunctionProperty,
        transitionDelayProperty,
        animationProperty,
    ],
};

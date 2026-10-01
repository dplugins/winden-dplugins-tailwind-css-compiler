/**
 * The rule a class produces, shown on hover.
 *
 * Used in two places against the same data: over a class in the textarea, and
 * over an option in the helper — a swatch says more as
 * `background-color: oklch(…)` than as a colour with a name.
 *
 * Positioning is the caller's business (`style`), because the two differ: the
 * textarea anchors the rule to its own box, while the helper follows the
 * pointer around a scrolling panel.
 */

const { createElement } = wp.element;

/**
 * How long the pointer must rest before a rule is shown. Sweeping across a row
 * of chips, or reading a class list, should not flash tooltips on the way.
 */
export const HOVER_DELAY_MS = 1000;

import { formatRule } from '../../core/class-explanation';

/**
 * @param {object}  props
 * @param {string}  props.className   The class being explained
 * @param {object=} props.explanation Undefined while it is still being read
 * @param {object=} props.style       Placement, decided by the caller
 * @param {string=} props.extraClass  Modifier for placement-specific styling
 */
export function RuleTooltip({ className: name, explanation, style, extraClass = '' }) {
    const rule = explanation ? formatRule(explanation) : '';

    return createElement('div', {
        className: `winden-class-tooltip ${extraClass}`.trim(),
        'data-class': name,
        style,
    },
        explanation === undefined
            ? createElement('div', { className: 'winden-class-tooltip-empty' }, `${name} — reading…`)
            : rule
                ? createElement('pre', { className: 'winden-class-tooltip-rule' }, rule)
                : createElement('div', { className: 'winden-class-tooltip-empty' }, `${name} builds no CSS`)
    );
}

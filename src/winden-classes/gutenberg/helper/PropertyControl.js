/**
 * Property controls for the class helper.
 *
 * Each rendered property is a Figma-style row: label + remove button, with
 * the value control below (inline icon rows, or click-to-open pickers for
 * chips and swatches). Rows are added/removed by HelperPanel's + menu.
 * Swatch grids and spacing chips are augmented with the user's Wizzard
 * theme tokens (passed in as `theme`, parsed by core/helper-theme).
 * Matches the createElement style of the surrounding Gutenberg integration.
 */

import { getHelperIcon } from './icons';
import { mergeThemeOptions, COLOR_PROPERTY_PREFIX } from '../../core/helper-theme';
import { arbitraryPrefixOf, buildArbitraryClass, findArbitraryValue, optionIsActive } from '../../core/helper-state';

const { createElement, useState, useEffect, useRef, useMemo } = wp.element;

export function HelperIcon({ name }) {
    const svg = getHelperIcon(name);
    if (!svg) return null;
    return createElement('span', {
        className: 'winden-helper-icon',
        dangerouslySetInnerHTML: { __html: svg },
    });
}

function isOptionActive(option, property, activeValue, activeUtilities) {
    // Match against the live class list, not just the schema-derived selection:
    // options merged in from the user's @theme are not in the static schema.
    // Through the shared resolver, so an older spelling counts here exactly as
    // it counts in detection and in the panel's has-a-value test.
    if (activeUtilities && optionIsActive(option, activeUtilities)) return true;
    return !property.multi && option.value === activeValue;
}

/**
 * The utilities this property holds, spelled as they are written in the class
 * string — which for an older spelling is not the option's own value, and for
 * a custom value is not an option at all.
 *
 * Handing the importance toggle anything else finds no token to flip and
 * silently does nothing.
 */
function writtenUtilities(property, activeUtilities, theme) {
    if (!activeUtilities) return [];
    const sides = property.sideProperties?.length ? property.sideProperties : [property];
    const found = [];
    for (const side of sides) {
        for (const option of mergeThemeOptions(side, theme)) {
            if (activeUtilities.has(option.value)) { found.push(option.value); continue; }
            const alias = (option.aliases || []).find((a) => activeUtilities.has(a));
            if (alias) found.push(alias);
        }
        const prefix = COLOR_PROPERTY_PREFIX[side.id] || (side.noCustom ? null : arbitraryPrefixOf(side));
        const custom = prefix ? findArbitraryValue(activeUtilities, prefix) : undefined;
        if (custom) found.push(custom);
    }
    return found;
}

function OptionButton({ option, isActive, isImportant, onToggle, onPreview, showLabel }) {
    return createElement('button', {
        type: 'button',
        className: `winden-helper-option ${isActive ? 'is-active' : ''} ${isImportant ? 'is-important' : ''}`,
        // The panel shows the rule this writes; a native title would sit on
        // top of it saying less.
        'data-class': option.value,
        'aria-label': option.label || option.value,
        onClick: () => onToggle(option),
        onMouseEnter: () => onPreview && onPreview(option.value),
        onMouseLeave: () => onPreview && onPreview(null),
    },
        option.icon ? createElement(HelperIcon, { name: option.icon }) : null,
        (!option.icon || showLabel) ? createElement('span', { className: 'winden-helper-option-label' }, option.label || option.value) : null
    );
}

/**
 * An icon row has no label to hang a marker on — the value *is* the pressed
 * button — so a forced one is marked on the button itself, and the `!` chip
 * sits at the end of the row rather than inside a popover this control does
 * not have. Without this the Gradient row was the one place the panel still
 * said nothing about importance.
 */
function IconRow({ property, activeValue, activeUtilities, importantUtilities, onToggle, onPreview }) {
    const active = property.options.filter((o) => isOptionActive(o, property, activeValue, activeUtilities));
    // The utility as it is written in the class string, which for an older
    // spelling is not the option's own value
    const written = active.map((o) => (
        activeUtilities && activeUtilities.has(o.value)
            ? o.value
            : (o.aliases || []).find((alias) => activeUtilities && activeUtilities.has(alias)) || o.value
    ));
    const isForced = written.length > 0 && written.every((u) => importantUtilities && importantUtilities.has(u));

    return createElement('div', { className: 'winden-helper-icon-row' },
        property.options.map((option) => {
            const isActive = isOptionActive(option, property, activeValue, activeUtilities);
            return createElement(OptionButton, {
                key: option.value,
                option,
                isActive,
                isImportant: isActive && isForced,
                onToggle,
                onPreview,
            });
        })
    );
}

/** Debounced free-form value input; sits beside the Custom trigger */
function CustomValueInput({ prefix, currentValue, onApply, onCancel }) {
    const [draft, setDraft] = useState(
        // Stored underscores are Tailwind's space escape — show real spaces here
        currentValue ? currentValue.slice(prefix.length + 2, -1).replace(/_/g, ' ') : ''
    );
    const inputRef = useRef(null);
    const appliedRef = useRef(currentValue || '');
    // The debounce fires after the parent has re-rendered, so calling the
    // onApply captured at effect time would write against a stale class string.
    const onApplyRef = useRef(onApply);
    onApplyRef.current = onApply;

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    // Apply while typing, once the value settles — no submit button needed
    useEffect(() => {
        const cls = buildArbitraryClass(prefix, draft);
        if (!cls || cls === appliedRef.current) return;
        const timer = setTimeout(() => {
            appliedRef.current = cls;
            onApplyRef.current(cls);
        }, 400);
        return () => clearTimeout(timer);
    }, [draft, prefix]);

    return createElement('input', {
        ref: inputRef,
        type: 'text',
        className: 'winden-helper-custom-input',
        // An instruction, not a sample: only the value inside the brackets is
        // typed here, and a concrete example reads as the format required.
        placeholder: 'Add value',
        value: draft,
        onChange: (e) => setDraft(e.target.value),
        onKeyDown: (e) => {
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        },
    });
}

/** "Custom" entry at the end of a value list — hands editing back to the row */
function CustomChip({ isActive, onClick }) {
    return createElement('button', {
        type: 'button',
        className: `winden-helper-chip winden-helper-chip--custom ${isActive ? 'is-active' : ''}`,
        title: 'Enter a custom value',
        onClick,
    }, 'Custom');
}

/**
 * `text-4xl` → `text-4xl!` when the live token carries the marker.
 *
 * The row shows the class that is actually on the element, the way the
 * textarea beside it does. Showing the unforced spelling made the two
 * disagree about the same element.
 */
function withMarker(utility, important) {
    return important && important.has(utility) ? `${utility}!` : utility;
}

/** Generic click-to-open picker: compact trigger, options revealed in a popover */
function Picker({ triggerContent, triggerTitle, isSet, defaultOpen, compact, children }) {
    const [isOpen, setIsOpen] = useState(!!defaultOpen);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleOutside = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isOpen]);

    return createElement('div', {
        className: `winden-helper-popover-root winden-helper-picker ${compact ? 'is-compact' : ''}`,
        ref: rootRef,
    },
        createElement('button', {
            type: 'button',
            className: `winden-helper-popover-trigger ${isSet ? 'is-active' : ''}`,
            // On one line a long class is truncated, and the shade is exactly
            // what gets cut — `from-blue-500` reads as `from-blue-…`. The
            // trigger carries no rule tooltip of its own, so a native title is
            // the whole value without two tooltips over one element.
            title: triggerTitle || undefined,
            onClick: () => setIsOpen(!isOpen),
        }, triggerContent),
        isOpen && createElement('div', { className: 'winden-helper-popover winden-helper-picker-popover' },
            children(() => setIsOpen(false))
        )
    );
}

function ChipRow({ property, activeValue, activeUtilities, importantUtilities, onToggle, onPreview, theme, defaultOpen }) {
    const options = useMemo(() => mergeThemeOptions(property, theme), [property, theme]);

    const activeOptions = options.filter((o) => isOptionActive(o, property, activeValue, activeUtilities));
    // `noCustom` opts a keyword-only property out of the arbitrary-value input
    const prefix = property.noCustom ? null : arbitraryPrefixOf(property);
    const customValue = prefix ? findArbitraryValue(activeUtilities, prefix) : undefined;
    const [isCustom, setIsCustom] = useState(false);
    const inCustomMode = !!prefix && (isCustom || !!customValue);
    const activeUnits = [...activeOptions.map((o) => o.value), ...(customValue ? [customValue] : [])];
    const activeLabels = activeUnits.map((utility) => withMarker(utility, importantUtilities));

    const renderOptions = (close) => createElement('div', { className: 'winden-helper-chip-row' },
        options.map((option) =>
            createElement('button', {
                key: option.value,
                type: 'button',
                className: `winden-helper-chip ${isOptionActive(option, property, activeValue, activeUtilities) ? 'is-active' : ''}`,
                'data-class': option.value,
                'aria-label': option.value,
                onClick: () => {
                    onToggle(option);
                    setIsCustom(false);
                    if (!property.multi) close();
                },
                onMouseEnter: () => onPreview && onPreview(option.value),
                onMouseLeave: () => onPreview && onPreview(null),
            }, option.label || option.value)
        ),
        prefix && createElement(CustomChip, {
            key: 'custom',
            isActive: inCustomMode,
            onClick: () => { setIsCustom(true); close(); },
        })
    );

    if (inCustomMode) {
        return createElement('div', { className: 'winden-helper-custom-row' },
            createElement(Picker, { triggerContent: 'Custom', isSet: true, compact: true }, renderOptions),
            createElement(CustomValueInput, {
                prefix,
                currentValue: customValue,
                onApply: (cls) => onToggle({ value: cls }),
                onCancel: () => setIsCustom(false),
            })
        );
    }

    return createElement(Picker, {
        triggerContent: activeLabels.length > 0 ? activeLabels.join(' ') : 'Not set',
        triggerTitle: activeLabels.join(' '),
        isSet: activeLabels.length > 0,
        defaultOpen,
    }, renderOptions);
}

function SwatchGrid({ property, activeValue, activeUtilities, importantUtilities, onToggle, onPreview, theme, defaultOpen }) {
    const options = useMemo(() => mergeThemeOptions(property, theme), [property, theme]);

    const activeOption = options.find((o) => isOptionActive(o, property, activeValue, activeUtilities));
    const prefix = COLOR_PROPERTY_PREFIX[property.id];
    const customValue = prefix ? findArbitraryValue(activeUtilities || [], prefix) : undefined;
    const [isCustom, setIsCustom] = useState(false);
    const inCustomMode = !!prefix && (isCustom || !!customValue);
    const customSwatch = customValue ? customValue.slice(prefix.length + 2, -1).replace(/_/g, ' ') : null;
    const shown = activeOption ? activeOption.value : customValue;
    const shownLabel = shown ? withMarker(shown, importantUtilities) : null;

    // Palette mounts only while the picker is open — keeps ~290 buttons out
    // of the tree the rest of the time.
    const renderPalette = (close) => {
        const families = [];
        const byFamily = new Map();
        for (const option of options) {
            const family = option.family || 'other';
            if (!byFamily.has(family)) {
                byFamily.set(family, []);
                families.push(family);
            }
            byFamily.get(family).push(option);
        }
        return createElement('div', { className: 'winden-helper-swatch-grid' },
            families.map((family) =>
                // No native title here: the rule tooltip already names the class,
                // and two tooltip systems fired over the same swatch.
                createElement('div', { key: family, className: 'winden-helper-swatch-row' },
                    byFamily.get(family).map((option) =>
                        createElement('button', {
                            key: option.value,
                            type: 'button',
                            className: `winden-helper-swatch ${isOptionActive(option, property, activeValue, activeUtilities) ? 'is-active' : ''}`,
                            'data-class': option.value,
                            'aria-label': option.value,
                            style: { backgroundColor: option.swatch },
                            onClick: () => { onToggle(option); setIsCustom(false); close(); },
                            onMouseEnter: () => onPreview && onPreview(option.value),
                            onMouseLeave: () => onPreview && onPreview(null),
                        })
                    )
                )
            ),
            prefix && createElement('div', { className: 'winden-helper-chip-row winden-helper-swatch-custom' },
                createElement(CustomChip, {
                    isActive: inCustomMode,
                    onClick: () => { setIsCustom(true); close(); },
                })
            )
        );
    };

    if (inCustomMode) {
        return createElement('div', { className: 'winden-helper-custom-row' },
            createElement(Picker, {
                triggerContent: [
                    createElement('span', {
                        key: 'swatch',
                        className: 'winden-helper-swatch winden-helper-trigger-swatch',
                        style: { backgroundColor: customSwatch || 'transparent' },
                    }),
                    createElement('span', { key: 'label' }, 'Custom'),
                ],
                isSet: true,
                compact: true,
            }, renderPalette),
            createElement(CustomValueInput, {
                prefix,
                currentValue: customValue,
                onApply: (cls) => onToggle({ value: cls }),
                onCancel: () => setIsCustom(false),
            })
        );
    }

    return createElement(Picker, {
        triggerContent: [
            createElement('span', {
                key: 'swatch',
                className: 'winden-helper-swatch winden-helper-trigger-swatch',
                style: { backgroundColor: activeOption ? activeOption.swatch : 'transparent' },
            }),
            createElement('span', { key: 'label' }, shownLabel || 'Not set'),
        ],
        triggerTitle: shownLabel || '',
        isSet: !!shown,
        defaultOpen,
    }, renderPalette);
}

/** Sided property (padding, radius, offsets…): tabs pick the edge, one row of values */

/**
 * A sided property, as rows.
 *
 * It used to be a strip of seven tabs over one shared value box: the tab said
 * which edge, the box said the value of whichever tab was open, and the other
 * edges said nothing. Every other property in the panel is a labelled row with
 * its own value, its own `!` and its own remove — so a padding of four edges
 * was the one place in the helper that did not read like the rest of it.
 *
 * Each edge that holds something is now such a row. The edges that do not are
 * a strip of buttons underneath, which is the only thing the tabs were still
 * needed for: adding one.
 */
function SidedControl({ property, selections, activeUtilities, importantUtilities, negativeUtilities, onToggle, onToggleImportance, onToggleNegative, onClearProperty, onPreview, theme, autoOpen }) {
    const sides = property.sideProperties;
    const hasValue = (side) => mergeThemeOptions(side, theme).some((o) => activeUtilities.has(o.value))
        || !!(arbitraryPrefixOf(side) && findArbitraryValue(activeUtilities, arbitraryPrefixOf(side)));

    // An edge someone asked for but has not yet given a value. Without this
    // its row would appear and vanish again on the same click.
    //
    // A row added from the group's + menu seeds the first edge: "Padding" with
    // nothing set would otherwise be a strip of edge buttons and no way to
    // type a value, where it used to open straight into All.
    const [added, setAdded] = useState(
        () => (autoOpen && !sides.some(hasValue) ? [sides[0].id] : [])
    );
    const [openId, setOpenId] = useState(autoOpen ? (sides.find(hasValue) || sides[0]).id : null);

    const shown = sides.filter((side) => hasValue(side) || added.includes(side.id));
    const rest = sides.filter((side) => !shown.includes(side));

    const addSide = (side) => {
        if (!added.includes(side.id)) setAdded([...added, side.id]);
        setOpenId(side.id);
    };

    const dropSide = (side) => {
        setAdded(added.filter((id) => id !== side.id));
        if (hasValue(side) && onClearProperty) onClearProperty(side);
    };

    return createElement('div', { className: 'winden-helper-sided' },
        shown.map((side) => {
            const held = writtenUtilities(side, activeUtilities, theme);
            const isForced = held.length > 0 && held.every((u) => importantUtilities && importantUtilities.has(u));
            const isNegated = held.length > 0 && held.every((u) => negativeUtilities && negativeUtilities.has(u));
            return createElement('div', { key: side.id, className: 'winden-helper-side-row' },
                createElement('div', { className: 'winden-helper-property-header is-inline' },
                    createElement('span', {
                        className: 'winden-helper-property-label',
                        // One tooltip system per thing: a side holding a class
                        // gets the rule, an empty one has none to give.
                        'data-class': held.length === 1 ? held[0] : undefined,
                    }, side.label),
                    createElement(ChipRow, {
                        property: side,
                        activeValue: selections.get(side.id),
                        activeUtilities,
                        importantUtilities,
                        onToggle: (option) => onToggle(option, side),
                        onPreview,
                        theme,
                        defaultOpen: openId === side.id,
                    }),
                    held.length > 0 && side.canBeNegative && onToggleNegative && createElement('button', {
                        type: 'button',
                        className: `winden-helper-row-negative ${isNegated ? 'is-active' : ''}`,
                        title: isNegated
                            ? `Negative — click to make ${side.label.toLowerCase()} positive`
                            : `Make ${side.label.toLowerCase()} negative (e.g. -${held[0]})`,
                        'aria-pressed': isNegated ? 'true' : 'false',
                        onClick: () => held.forEach((utility) => onToggleNegative(utility)),
                    }, '±'),
                    held.length > 0 && onToggleImportance && createElement('button', {
                        type: 'button',
                        className: `winden-helper-row-important ${isForced ? 'is-active' : ''}`,
                        title: isForced
                            ? 'Forced with !important — click to stop forcing it'
                            : 'Force with !important, so unlayered CSS cannot beat it',
                        'aria-pressed': isForced ? 'true' : 'false',
                        onClick: () => held.forEach((utility) => onToggleImportance(utility)),
                    }, '!'),
                    createElement('button', {
                        type: 'button',
                        className: 'winden-helper-row-remove',
                        title: `Clear ${side.label.toLowerCase()}`,
                        onClick: () => dropSide(side),
                    }, '\u2212')
                )
            );
        }),
        rest.length > 0 && createElement('div', { className: 'winden-helper-side-add' },
            rest.map((side) => createElement('button', {
                key: side.id,
                type: 'button',
                className: 'winden-helper-side-tab',
                title: `Add ${side.label.toLowerCase()}`,
                onClick: () => addSide(side),
            }, side.label))
        )
    );
}


const CONTROLS = {
    'icon-row': IconRow,
    'chip-row': ChipRow,
    'swatch-grid': SwatchGrid,
};

/** One Figma-style property row: label + remove, control underneath */
export function PropertyControl({ property, label, selections, activeUtilities, importantUtilities, negativeUtilities, onToggle, onToggleImportance, onToggleNegative, onClearProperty, onRemoveRow, onPreview, theme, autoOpen, canRemove = true }) {
    const isSided = property.control === 'sided-chip-row' && property.sideProperties?.length;
    const setSides = isSided
        ? property.sideProperties.filter((side) =>
            mergeThemeOptions(side, theme).some((o) => activeUtilities.has(o.value))
            || !!(arbitraryPrefixOf(side) && findArbitraryValue(activeUtilities, arbitraryPrefixOf(side)))).length
        : 0;
    const Control = isSided ? SidedControl : (CONTROLS[property.control] || ChipRow);
    const held = writtenUtilities(property, activeUtilities, theme);
    const isForced = held.length > 0 && held.every((u) => importantUtilities && importantUtilities.has(u));
    const isNegated = held.length > 0 && held.every((u) => negativeUtilities && negativeUtilities.has(u));

    // A chip row and a swatch grid are one compact trigger, so the label, the
    // value and the two buttons fit on one line — which halves the height of
    // every row in the panel. An icon row is ten buttons and a sided property
    // is a stack of rows; neither fits, so both keep the value underneath.
    const inline = !isSided && property.control !== 'icon-row';

    const control = createElement(Control, isSided ? {
        property,
        selections,
        activeUtilities,
        importantUtilities,
        negativeUtilities,
        onToggle,
        onToggleImportance,
        onToggleNegative,
        onClearProperty,
        onPreview,
        theme,
        autoOpen,
    } : {
        property,
        activeValue: selections.get(property.id),
        activeUtilities,
        importantUtilities,
        onToggle: (option) => onToggle(option, property),
        onPreview,
        theme,
        defaultOpen: autoOpen,
    });

    return createElement('div', { className: `winden-helper-property ${inline ? 'is-inline' : ''}` },
        createElement('div', { className: `winden-helper-property-header ${inline ? 'is-inline' : ''}` },
            createElement('span', { className: 'winden-helper-property-label' },
                label || property.label,
                setSides > 0 ? createElement('span', { className: 'winden-helper-property-count' }, setSides) : null
            ),
            inline && control,
            // Beside Remove, and always visible once the row holds something:
            // adding the marker used to mean opening the picker to find a chip
            // inside it, so a value could be unforced from a glance but only
            // forced by going looking.
            // Not on a sided row: each edge carries its own, and two controls
            // for one thing at two depths is the confusion this whole change
            // is undoing.
            !isSided && held.length > 0 && property.canBeNegative && onToggleNegative && createElement('button', {
                type: 'button',
                className: `winden-helper-row-negative ${isNegated ? 'is-active' : ''}`,
                title: isNegated
                    ? 'Negative — click to make it positive'
                    : `Make it negative (e.g. -${held[0]})`,
                'aria-pressed': isNegated ? 'true' : 'false',
                onClick: () => held.forEach((utility) => onToggleNegative(utility)),
            }, '±'),
            !isSided && held.length > 0 && onToggleImportance && createElement('button', {
                type: 'button',
                className: `winden-helper-row-important ${isForced ? 'is-active' : ''}`,
                title: isForced
                    ? 'Forced with !important — click to stop forcing it'
                    : 'Force with !important, so unlayered CSS cannot beat it',
                'aria-pressed': isForced ? 'true' : 'false',
                onClick: () => held.forEach((utility) => onToggleImportance(utility)),
            }, '!'),
            // An auto-shown row with no value has nothing to take away, and a
            // button that does nothing reads as broken.
            canRemove && createElement('button', {
                type: 'button',
                className: 'winden-helper-row-remove',
                title: 'Remove',
                onClick: () => onRemoveRow(property),
            }, '\u2212')
        ),
        !inline && control
    );
}


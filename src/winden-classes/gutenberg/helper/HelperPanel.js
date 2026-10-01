/**
 * Class Helper panel — DevTools/Figma-style visual class picker.
 *
 * Figma-style additive rows: a group renders only properties that either
 * have a value in the class string or were explicitly added through the
 * group's + menu (sided properties like padding appear there per side —
 * "Padding Top", "Padding X"…). Adding a row auto-opens its picker; every
 * row has a − remove that clears its classes in the current scope.
 *
 * Scope bars: breakpoints (Default/SM/…) and states (Default/Hover/Focus)
 * compose a variant prefix — toggles then read/write e.g. `md:hover:bg-*`.
 * A funnel dropdown checks/unchecks which groups are shown.
 * Two-way sync: selections derive from the `value` prop on every render.
 */

import './helper.scss';
import { HELPER_SCHEMA } from '../../core/helper-schema';
import {
    arbitraryPrefixOf,
    clearProperty,
    composeVariantPrefix,
    findArbitraryValue,
    getActiveSelections,
    getAutoShownIds,
    getImportantUtilities,
    getNegativeUtilities,
    getScopedUtilities,
    optionIsActive,
    toggleImportance,
    toggleNegative,
    getVisibleProperties,
    toggleOption,
} from '../../core/helper-state';
import { parseTheme, mergeThemeOptions } from '../../core/helper-theme';
import { PropertyControl, HelperIcon } from './PropertyControl';
import { RuleTooltip, HOVER_DELAY_MS } from './RuleTooltip';
import { explainClasses } from '../../core/class-explanation';
import { findComponentClasses } from '../../core/component-classes';
import chevronDown from 'lucide-static/icons/chevron-down.svg';
import chevronRight from 'lucide-static/icons/chevron-right.svg';
import funnel from 'lucide-static/icons/funnel.svg';
import plus from 'lucide-static/icons/plus.svg';

const { createElement, useState, useEffect, useRef, useMemo } = wp.element;

const OPEN_GROUPS_KEY = 'winden-helper-open-groups';
const HIDDEN_GROUPS_KEY = 'winden-helper-hidden-groups';
const ADDED_STATES_KEY = 'winden-helper-added-states';
const BASE_STATES = ['hover'];
const EXTRA_STATES = ['focus', 'active', 'first', 'last', 'odd', 'even', 'before', 'after'];

function readStoredList(key) {
    try {
        const stored = JSON.parse(window.localStorage.getItem(key));
        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
}

function storeList(key, list) {
    try {
        window.localStorage.setItem(key, JSON.stringify(list));
    } catch {
        // localStorage unavailable — state just won't persist
    }
}

function getThemeCss() {
    try {
        const options = window.tailwind_compiler_options ||
            (window.parent && window.parent !== window ? window.parent.tailwind_compiler_options : null);
        return options?.custom_css || '';
    } catch {
        return '';
    }
}

/** One row per property; sided parents keep all their sides in a single row */
function flattenRows(properties) {
    return properties.map((property) => ({ property, label: property.label }));
}

function ScopeBar({ items, active, onSelect, onRemove, upcase }) {
    return createElement('div', { className: 'winden-helper-scope-bar' },
        items.map(({ id, label, removable, inUse }) =>
            createElement('span', {
                key: id || 'default',
                className: `winden-helper-scope-item ${removable ? 'is-removable' : ''}`,
            },
                createElement('button', {
                    type: 'button',
                    className: `winden-helper-scope-button ${id === active ? 'is-active' : ''}`,
                    title: inUse ? `${label} is in use by the current classes` : undefined,
                    onClick: () => onSelect(id),
                }, upcase && id ? label.toUpperCase() : label),
                removable && createElement('button', {
                    type: 'button',
                    className: 'winden-helper-scope-remove',
                    title: `Remove the ${label} tab`,
                    onClick: (event) => { event.stopPropagation(); onRemove(id); },
                }, '\u00d7')
            )
        )
    );
}

/** Small popover menu opened from an icon button (funnel filter, + add) */
function IconMenu({ icon, title, isActive, className, children }) {
    const [isOpen, setIsOpen] = useState(false);
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

    return createElement('div', { className: `winden-helper-filter-root ${className || ''}`, ref: rootRef },
        createElement('button', {
            type: 'button',
            className: `winden-helper-filter-trigger ${isActive ? 'is-active' : ''}`,
            title,
            onClick: (event) => { event.stopPropagation(); setIsOpen(!isOpen); },
        },
            createElement('span', {
                className: 'winden-helper-icon',
                dangerouslySetInnerHTML: { __html: icon },
            })
        ),
        isOpen && createElement('div', {
            className: 'winden-helper-popover winden-helper-filter-popover',
            onClick: (event) => event.stopPropagation(),
        },
            children(() => setIsOpen(false))
        )
    );
}

/**
 * @param {object} props
 * @param {string} props.value Current class string for the element
 * @param {(next: string) => void} props.onChange Receives the rewritten class string
 * @param {((previewClass: string | null) => void)=} props.onPreview Hover preview on the canvas
 * @param {string[]=} props.breakpoints Breakpoint names, from the Wizzard via PHP
 */
export function HelperPanel({ value, onChange, onPreview, breakpoints = [], getCanvasDocument }) {
    const [openGroups, setOpenGroups] = useState(() => readStoredList(OPEN_GROUPS_KEY));
    const [hiddenGroups, setHiddenGroups] = useState(() => readStoredList(HIDDEN_GROUPS_KEY));
    const [addedRows, setAddedRows] = useState([]);
    const [autoOpenRow, setAutoOpenRow] = useState(null);
    const [breakpoint, setBreakpoint] = useState('');
    const [state, setState] = useState('');
    const [addedStates, setAddedStates] = useState(() => readStoredList(ADDED_STATES_KEY));

    // States already used in the class string surface as tabs automatically
    const detectedStates = useMemo(() => {
        const found = new Set();
        for (const token of (value || '').split(/\s+/)) {
            for (const segment of token.split(':').slice(0, -1)) {
                if (EXTRA_STATES.includes(segment)) found.add(segment);
            }
        }
        return [...found];
    }, [value]);

    const shownStates = [
        { id: '', label: 'Default' },
        ...BASE_STATES.map((id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) })),
        ...EXTRA_STATES.filter((id) => addedStates.includes(id) || detectedStates.includes(id))
            .map((id) => ({
                id,
                label: id.charAt(0).toUpperCase() + id.slice(1),
                // A state the classes actually use cannot be hidden
                removable: !detectedStates.includes(id),
                inUse: detectedStates.includes(id),
            })),
    ];
    const addableStates = EXTRA_STATES.filter((id) => !shownStates.some((st) => st.id === id));

    const handleRemoveState = (id) => {
        const next = addedStates.filter((stateId) => stateId !== id);
        setAddedStates(next);
        storeList(ADDED_STATES_KEY, next);
        if (state === id) setState('');
    };

    const handleAddState = (id) => {
        if (!addedStates.includes(id)) {
            const next = [...addedStates, id];
            setAddedStates(next);
            storeList(ADDED_STATES_KEY, next);
        }
        setState(id);
    };

    const variantPrefix = composeVariantPrefix(breakpoint, state);
    const theme = useMemo(() => parseTheme(getThemeCss()), []);
    const selections = useMemo(
        () => getActiveSelections(value || '', HELPER_SCHEMA, variantPrefix),
        [value, variantPrefix]
    );
    const activeUtilities = useMemo(
        () => getScopedUtilities(value || '', variantPrefix),
        [value, variantPrefix]
    );
    // Which of them are forced. The textarea shows the marker; so must the rows.
    const importantUtilities = useMemo(
        () => getImportantUtilities(value || '', variantPrefix),
        [value, variantPrefix]
    );
    // Which of them are negated ('-top-2'), for the properties that allow it.
    const negativeUtilities = useMemo(
        () => getNegativeUtilities(value || '', variantPrefix),
        [value, variantPrefix]
    );

    /**
     * A component class is one name standing for a list of utilities, so the
     * rows below have nothing to show for it and the panel reads as empty on
     * an element that plainly has styling. What it stands for is shown here
     * instead — read-only, because the definition lives in the Style Editor and
     * editing it from a block would change every other instance too.
     */
    const components = useMemo(() => {
        const tokens = new Set((value || '').split(/\s+/).filter(Boolean));
        if (tokens.size === 0) return [];

        const options = (typeof window !== 'undefined' && window.tailwind_compiler_options) || {};
        const css = `${options.custom_css ?? ''}\n${options.style_css ?? ''}`;
        return findComponentClasses(css).filter((component) => tokens.has(component.name));
    }, [value]);

    // Hovering an option shows the rule it would write — a swatch says more as
    // `background-color: oklch(…)` than as a colour with a name. One delegated
    // listener rather than a prop threaded through five control types.
    const [hoveredOption, setHoveredOption] = useState(null);
    const [optionExplanation, setOptionExplanation] = useState(undefined);

    const hoveredOptionClass = hoveredOption?.name ?? null;
    useEffect(() => {
        if (!hoveredOptionClass) {
            setOptionExplanation(undefined);
            return;
        }

        let current = true;
        setOptionExplanation(undefined);
        explainClasses([hoveredOptionClass], getCanvasDocument ? getCanvasDocument() : null)
            .then((explained) => {
                if (current) {
                    setOptionExplanation(explained.get(hoveredOptionClass) ?? { declarations: [], conditions: [], css: '' });
                }
            });
        return () => { current = false; };
    }, [hoveredOptionClass, getCanvasDocument]);

    const hoverTimer = useRef(null);
    useEffect(() => () => clearTimeout(hoverTimer.current), []);

    const handleOptionOver = (event) => {
        const option = event.target.closest?.('[data-class]');
        if (!option) return;

        const name = option.getAttribute('data-class');
        if (hoveredOption?.name === name) return;

        // Only after the pointer settles: sweeping across a row of chips would
        // otherwise flash a rule for every one of them.
        clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => {
            // Clicking a chip closes its picker, so by now the option may be
            // gone. A detached node measures as all zeros, which used to put
            // the rule in the top-left corner of the screen.
            if (!option.isConnected) return;

            // Fixed to the viewport: the panel scrolls, and a picker popover
            // can sit anywhere in it.
            const rect = option.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            setHoveredOption({ name, element: option, rect: { left: rect.left, bottom: rect.bottom, top: rect.top } });
        }, HOVER_DELAY_MS);
    };

    const handleOptionOut = (event) => {
        const option = event.target.closest?.('[data-class]');
        if (!option) return;

        // mouseout fires when the pointer crosses onto the button's own icon,
        // which is still the same option — only a real exit counts.
        if (event.relatedTarget && option.contains(event.relatedTarget)) return;

        clearTimeout(hoverTimer.current);
        setHoveredOption(null);
    };

    /**
     * Choosing a value closes the picker, taking the option out of the DOM
     * without a mouseout — the rule would otherwise hang around describing
     * something no longer on screen.
     */
    const handlePanelClick = () => {
        clearTimeout(hoverTimer.current);
        setHoveredOption(null);
    };

    const handleToggleGroup = (groupId) => {
        setOpenGroups((current) => {
            const next = current.includes(groupId)
                ? current.filter((id) => id !== groupId)
                : [...current, groupId];
            storeList(OPEN_GROUPS_KEY, next);
            return next;
        });
    };

    const handleHiddenGroups = (next) => {
        setHiddenGroups(next);
        storeList(HIDDEN_GROUPS_KEY, next);
    };

    const handleToggleOption = (option, property) => {
        onChange(toggleOption(value || '', option, property, variantPrefix));
        if (onPreview) onPreview(null);
    };

    /** Force or unforce one utility — the `!` a row shows is the button for it */
    const handleToggleImportance = (utility) => {
        onChange(toggleImportance(value || '', utility, variantPrefix));
        if (onPreview) onPreview(null);
    };

    /** Negate or un-negate one utility — the '±' a row shows is the button for it */
    const handleToggleNegative = (utility) => {
        onChange(toggleNegative(value || '', utility, variantPrefix));
        if (onPreview) onPreview(null);
    };

    const handleAddRow = (propertyId, groupId) => {
        if (!addedRows.includes(propertyId)) setAddedRows([...addedRows, propertyId]);
        setAutoOpenRow(propertyId);
        if (!openGroups.includes(groupId)) handleToggleGroup(groupId);
    };

    /** Clear one property's classes but keep its row on screen */
    const handleClearProperty = (property) => {
        onChange(clearProperty(value || '', property, variantPrefix));
        if (onPreview) onPreview(null);
    };

    const handleRemoveRow = (property) => {
        onChange(clearProperty(value || '', property, variantPrefix));
        setAddedRows(addedRows.filter((id) => id !== property.id));
        if (autoOpenRow === property.id) setAutoOpenRow(null);
        if (onPreview) onPreview(null);
    };

    // Hover preview only makes sense in the base scope — a md:/hover: class
    // previewed on the desktop canvas would be misleading.
    const previewForScope = variantPrefix === '' ? onPreview : null;

    const hasOwnValue = (property) => {
        // Theme-only tokens live outside the static schema, so resolve first
        if (mergeThemeOptions(property, theme).some((o) => optionIsActive(o, activeUtilities))) return true;
        const prefix = arbitraryPrefixOf(property);
        return !!(prefix && findArbitraryValue(activeUtilities, prefix));
    };

    /** A sided parent counts as set when any of its sides carries a value */
    const hasValue = (property) => (property.sideProperties?.length
        ? property.sideProperties.some(hasOwnValue)
        : hasOwnValue(property));

    // Placed below the option, or above it when that would run off the screen
    const tooltipStyle = hoveredOption?.element?.isConnected ? (() => {
        const spaceBelow = window.innerHeight - hoveredOption.rect.bottom;
        const below = spaceBelow > 120;
        return {
            position: 'fixed',
            left: `${Math.max(8, Math.min(hoveredOption.rect.left, window.innerWidth - 268))}px`,
            [below ? 'top' : 'bottom']: below
                ? `${hoveredOption.rect.bottom + 6}px`
                : `${window.innerHeight - hoveredOption.rect.top + 6}px`,
            width: '260px',
            right: 'auto',
        };
    })() : null;

    return createElement('div', {
        className: 'winden-helper',
        onMouseOver: handleOptionOver,
        onMouseOut: handleOptionOut,
        onClick: handlePanelClick,
    },
        tooltipStyle && createElement(RuleTooltip, {
            className: hoveredOption.name,
            explanation: optionExplanation,
            style: tooltipStyle,
        }),
        createElement('div', { className: 'winden-helper-header-filter' },
            createElement(IconMenu, {
                icon: funnel,
                title: 'Choose which groups to show',
                isActive: hiddenGroups.length > 0,
            }, () =>
                HELPER_SCHEMA.map((group) =>
                    createElement('label', { key: group.id, className: 'winden-helper-filter-item' },
                        createElement('input', {
                            type: 'checkbox',
                            checked: !hiddenGroups.includes(group.id),
                            onChange: () => handleHiddenGroups(hiddenGroups.includes(group.id)
                                ? hiddenGroups.filter((id) => id !== group.id)
                                : [...hiddenGroups, group.id]),
                        }),
                        group.icon ? createElement(HelperIcon, { name: group.icon }) : null,
                        group.label
                    )
                )
            )
        ),
        createElement('div', { className: 'winden-helper-toolbar' },
            breakpoints.length > 0 ? createElement(ScopeBar, {
                items: [{ id: '', label: 'Default' }, ...breakpoints.map((bp) => ({ id: bp, label: bp }))],
                active: breakpoint,
                onSelect: setBreakpoint,
                upcase: true,
            }) : null,
            createElement('div', { className: 'winden-helper-toolbar-row' },
                createElement(ScopeBar, {
                    items: shownStates,
                    active: state,
                    onSelect: setState,
                    onRemove: handleRemoveState,
                }),
                addableStates.length > 0 && createElement(IconMenu, {
                    icon: plus,
                    title: 'Add a state (active, first, odd, ...)',
                }, (close) =>
                    addableStates.map((id) =>
                        createElement('button', {
                            key: id,
                            type: 'button',
                            className: 'winden-helper-add-item',
                            onClick: () => { handleAddState(id); close(); },
                        }, id)
                    )
                )
            )
        ),
        components.length > 0 && createElement('div', { className: 'winden-helper-components' },
            components.map((component) => createElement('div',
                { key: component.name, className: 'winden-helper-component' },
                createElement('div', { className: 'winden-helper-component-name' }, `.${component.name}`),
                createElement('div', { className: 'winden-helper-component-applies' },
                    component.applies.length > 0
                        ? component.applies.map((utility) => createElement('span',
                            { key: utility, className: 'winden-helper-component-utility', 'data-class': utility },
                            utility))
                        : createElement('span', { className: 'winden-helper-component-empty' },
                            'declared in your styles')
                )
            ))
        ),
        HELPER_SCHEMA.map((group) => {
            if (hiddenGroups.includes(group.id)) return null;
            const allRows = flattenRows(getVisibleProperties(group, selections));
            // Rows an active branch puts on screen by itself (display:flex → the
            // flex controls), on top of the ones with a value or added by hand.
            const autoShown = getAutoShownIds(group, selections);
            const shownRows = allRows.filter(({ property }) =>
                hasValue(property) || addedRows.includes(property.id) || autoShown.has(property.id));
            const addableRows = allRows.filter(({ property }) => !shownRows.some((row) => row.property.id === property.id));
            const setRows = shownRows.filter(({ property }) => hasValue(property)).length;
            const isOpen = openGroups.includes(group.id) && shownRows.length > 0;

            return createElement('div', { key: group.id, className: 'winden-helper-group' },
                createElement('div', {
                    className: `winden-helper-group-header ${isOpen ? 'is-open' : ''} ${shownRows.length === 0 ? 'is-empty' : ''}`,
                    onClick: shownRows.length > 0 ? () => handleToggleGroup(group.id) : undefined,
                },
                    shownRows.length > 0 && createElement('span', {
                        className: 'winden-helper-icon winden-helper-chevron',
                        dangerouslySetInnerHTML: { __html: isOpen ? chevronDown : chevronRight },
                    }),
                    group.icon ? createElement(HelperIcon, { name: group.icon }) : null,
                    createElement('span', { className: 'winden-helper-group-title' },
                        group.label,
                        // The badge counts what is *set*, not what is on screen:
                        // auto-shown and hand-added rows start empty.
                        setRows > 0 ? createElement('span', { className: 'winden-helper-group-count' }, setRows) : null
                    ),
                    addableRows.length > 0 && createElement(IconMenu, {
                        icon: plus,
                        title: `Add a ${group.label.toLowerCase()} property`,
                        className: 'winden-helper-add-menu',
                    }, (close) =>
                        addableRows.map(({ property, label }) =>
                            createElement('button', {
                                key: property.id,
                                type: 'button',
                                className: 'winden-helper-add-item',
                                onClick: () => { handleAddRow(property.id, group.id); close(); },
                            }, label)
                        )
                    )
                ),
                isOpen && createElement('div', { className: 'winden-helper-group-body' },
                    shownRows.map(({ property, label }) =>
                        createElement(PropertyControl, {
                            key: property.id,
                            property,
                            label,
                            selections,
                            activeUtilities,
                            importantUtilities,
                            negativeUtilities,
                            onToggle: handleToggleOption,
                            onToggleImportance: handleToggleImportance,
                            onToggleNegative: handleToggleNegative,
                            onClearProperty: handleClearProperty,
                            onRemoveRow: handleRemoveRow,
                            onPreview: previewForScope,
                            theme,
                            autoOpen: autoOpenRow === property.id,
                            canRemove: hasValue(property) || addedRows.includes(property.id),
                        })
                    )
                )
            );
        })
    );
}

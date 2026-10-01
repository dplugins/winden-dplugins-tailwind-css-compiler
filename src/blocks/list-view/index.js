/**
 * Expand or collapse a block and everything inside it, from the ⋮ menu.
 *
 * List View expands one level at a time, so opening a pasted hero means
 * clicking through every group to reach the paragraph three levels down, and
 * closing it again means the same trip back.
 *
 * There is no store action for this. The expanded state lives in React state
 * inside core's ListView component — `__unstableSetAllListViewPanelsOpen` and
 * friends are about the sidebar's panels, not the tree; measured, they leave
 * the rows exactly as they were. What the tree does expose is the row itself:
 * `data-expanded` says whether it is open, and the chevron beside it toggles
 * it. So this drives the rows, the way a person would, and gives up quietly
 * whenever the markup is not what it expects.
 *
 * The items sit in the block settings menu — the same ⋮ in List View and on
 * the block toolbar — because that is the one place core offers a fill. A
 * control literally beside the ⋮ would mean injecting into every row.
 */

import { registerPlugin } from '@wordpress/plugins';
import { BlockSettingsMenuControls } from '@wordpress/block-editor';
import { MenuItem } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/** How many passes to allow: each one reveals the next level down */
const MAX_PASSES = 30;

const rowFor = (clientId) => document.querySelector(
    `.block-editor-list-view-leaf[data-block="${clientId}"]`
);

/** The chevron, which only exists on a row that has something inside it */
const expanderIn = (row) => row?.querySelector('.block-editor-list-view__expander');

const nextFrame = () => new Promise((resolve) => {
    window.requestAnimationFrame(() => window.setTimeout(resolve, 30));
});

/**
 * Open or close every row in `clientIds`.
 *
 * Repeated passes, because a row does not exist until its parent is open: each
 * pass reveals the next level, and the loop stops as soon as a pass changes
 * nothing.
 */
async function setExpanded(clientIds, open) {
    for (let pass = 0; pass < MAX_PASSES; pass += 1) {
        let changed = false;

        for (const clientId of clientIds) {
            const row = rowFor(clientId);
            if (!row) continue;

            const isOpen = row.getAttribute('data-expanded') === 'true';
            if (isOpen === open) continue;

            const expander = expanderIn(row);
            if (!expander) continue;

            expander.click();
            changed = true;
        }

        if (!changed) return;
        await nextFrame();
    }
}

/* ── The buttons in the row itself ──────────────────────────────────────── */

/**
 * Material's `expand_all` and `collapse_all`, the pair Google draws for
 * exactly this.
 *
 * Not Gutenberg's own: `@wordpress/icons` is not published on the `wp` global
 * and is not a dependency here, which is why `blocks/shared/icons.js` draws
 * with `@wordpress/primitives` instead. `fill` is `currentColor` so the button
 * colours them like every other control in the row.
 */
const EXPAND_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M480-80 240-320l57-57 183 183 183-183 57 57L480-80ZM298-584l-58-56 240-240 240 240-58 56-182-182-182 182Z"/></svg>';
const COLLAPSE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="m296-80-56-56 240-240 240 240-56 56-184-184L296-80Zm184-504L240-824l56-56 184 184 184-184 56 56-240 240Z"/></svg>';

/**
 * Two buttons beside the ⋮, in the row.
 *
 * The menu items below do the same job and are the resilient half: they use a
 * slot core actually offers. Core offers none inside a List View row, so these
 * are put into the row's menu cell by hand and put back by a `MutationObserver`
 * whenever React rebuilds it. Everything here gives up quietly — a missing cell
 * means no buttons, never a broken List View.
 */
const MARKER = 'data-winden-expand';
const ROW = '.block-editor-list-view-leaf';
const MENU_CELL = '.block-editor-list-view-block__menu-cell';

function iconFrom(markup) {
    const holder = document.createElement('div');
    holder.innerHTML = markup;
    const svg = holder.querySelector('svg');
    // 18, not 24: three controls have to fit a cell core sizes for one
    svg?.setAttribute('width', '18');
    svg?.setAttribute('height', '18');
    return svg;
}

function makeButton(kind, label, markup, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'components-button has-icon winden-list-view-expand';
    button.setAttribute(MARKER, kind);
    button.setAttribute('aria-label', label);
    // The row is a link that selects the block; this is a control on top of it
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
    });

    const icon = iconFrom(markup);
    if (icon) button.appendChild(icon);
    return button;
}

function subtreeOf(clientId) {
    const { getClientIdsOfDescendants } = wp.data.select('core/block-editor');
    return getClientIdsOfDescendants([clientId]) ?? [];
}

function addButtonsTo(row) {
    const cell = row.querySelector(MENU_CELL);
    const clientId = row.getAttribute('data-block');
    if (!cell || !clientId || cell.querySelector(`[${MARKER}]`)) return;

    // Nothing inside it, nothing to open
    const descendants = subtreeOf(clientId);
    if (descendants.length === 0) return;

    // Before the ⋮ — and before its *wrapper*: the button itself is nested
    // inside a `components-dropdown`, so using it as the reference node throws
    // "not a child of this node" and, caught, looks like nothing happening
    const options = cell.firstElementChild;
    const run = (open) => {
        const order = open
            ? [clientId, ...subtreeOf(clientId)]
            : [...subtreeOf(clientId)].reverse().concat(clientId);
        setExpanded(order, open);
    };

    const expand = makeButton('expand', __('Expand all inside', 'winden-dplugins-tailwind-css-compiler'), EXPAND_ICON, () => run(true));
    const collapse = makeButton('collapse', __('Collapse all inside', 'winden-dplugins-tailwind-css-compiler'), COLLAPSE_ICON, () => run(false));
    cell.insertBefore(collapse, options);
    cell.insertBefore(expand, collapse);
}

function watchListView() {
    let scheduled = false;
    const sweep = () => {
        scheduled = false;
        // Per row, so one row core has changed the shape of does not stop the
        // rest from getting their buttons
        document.querySelectorAll(ROW).forEach((row) => {
            try {
                addButtonsTo(row);
            } catch { /* the tree is core's; never break it */ }
        });
    };

    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(sweep);
    };

    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    schedule();
}

if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', watchListView, { once: true });
    } else {
        watchListView();
    }
}

function ExpandControls() {
    return (
        <BlockSettingsMenuControls>
            {({ selectedClientIds, onClose }) => (
                <ExpandItems clientIds={selectedClientIds} onClose={onClose} />
            )}
        </BlockSettingsMenuControls>
    );
}

function ExpandItems({ clientIds, onClose }) {
    // Only worth offering for something that has an inside
    const descendants = useSelect((select) => {
        const { getClientIdsOfDescendants } = select(blockEditorStore);
        return getClientIdsOfDescendants(clientIds ?? []);
    }, [clientIds]);

    if (!clientIds?.length || descendants.length === 0) return null;

    const run = (open) => {
        // Collapsing works from the inside out: closing a parent first hides
        // the rows this would have to reach
        const order = open ? [...clientIds, ...descendants] : [...descendants].reverse().concat(clientIds);
        setExpanded(order, open);
        onClose?.();
    };

    return (
        <>
            <MenuItem onClick={() => run(true)}>
                {__('Expand all inside', 'winden-dplugins-tailwind-css-compiler')}
            </MenuItem>
            <MenuItem onClick={() => run(false)}>
                {__('Collapse all inside', 'winden-dplugins-tailwind-css-compiler')}
            </MenuItem>
        </>
    );
}

registerPlugin('winden-list-view-expand', { render: ExpandControls });

/**
 * Component tests for the class helper panel.
 *
 * The engine is covered by pure-function tests; these assert the part that
 * only exists in the browser — what the panel renders for a given class
 * string, and what it writes back when you click. The React layer previously
 * had no tests at all, so every regression there reached the editor.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { HelperPanel } from '../src/winden-classes/gutenberg/helper/HelperPanel';

const BREAKPOINTS = ['sm', 'md', 'lg'];

function renderPanel(value = '', overrides: Record<string, unknown> = {}) {
    const onChange = vi.fn();
    const utils = render(
        <HelperPanel value={value} onChange={onChange} breakpoints={BREAKPOINTS} {...overrides} />
    );
    return { onChange, ...utils };
}

/** Groups collapse to a header until something in them holds a value */
function openGroup(name: string) {
    fireEvent.click(screen.getByText(name));
}

/** The + menu on a group header lists the properties that can be added */
function addProperty(group: string, property: string) {
    const header = screen.getByText(group).closest('.winden-helper-group-header') as HTMLElement;
    fireEvent.click(within(header).getByTitle(/^Add a/));
    fireEvent.click(screen.getByRole('button', { name: property }));
}

function propertyRow(label: string): HTMLElement {
    return screen.getByText(label).closest('.winden-helper-property') as HTMLElement;
}

beforeEach(() => {
    window.localStorage.clear();
    cleanup();
});

describe('panel shell', () => {
    test('renders every group, collapsed, with no property rows', () => {
        renderPanel();
        for (const group of ['Layout', 'Spacing', 'Background', 'Typography', 'Borders', 'Sizing', 'Position', 'Effects']) {
            expect(screen.getByText(group)).toBeInTheDocument();
        }
        expect(document.querySelectorAll('.winden-helper-property')).toHaveLength(0);
    });

    test('breakpoint tabs come from the passed breakpoints, not a hardcoded list', () => {
        renderPanel();
        for (const bp of BREAKPOINTS) {
            expect(screen.getByRole('button', { name: bp.toUpperCase() })).toBeInTheDocument();
        }
    });

    test('groups with no rows have no chevron to click', () => {
        renderPanel();
        const header = screen.getByText('Layout').closest('.winden-helper-group-header') as HTMLElement;
        expect(header.querySelector('.winden-helper-chevron')).toBeNull();
        expect(header.className).toContain('is-empty');
    });
});

describe('reading the class string', () => {
    test('a row appears for each recognised class and shows its value', () => {
        renderPanel('flex bg-red-500');
        openGroup('Layout');
        openGroup('Background');

        expect(within(propertyRow('Display')).getByLabelText('Flex').className).toContain('is-active');
        expect(within(propertyRow('Background Color')).getByRole('button', { name: /bg-red-500/ })).toBeInTheDocument();
    });

    test('classes in another variant scope do not count as set', () => {
        renderPanel('md:flex hover:bg-red-500');
        const header = screen.getByText('Layout').closest('.winden-helper-group-header') as HTMLElement;
        expect(header.className).toContain('is-empty');
    });

    test('switching to a breakpoint reveals that scope', () => {
        renderPanel('md:flex');
        fireEvent.click(screen.getByRole('button', { name: 'MD' }));
        openGroup('Layout');
        expect(within(propertyRow('Display')).getByLabelText('Flex').className).toContain('is-active');
    });
});

describe('writing classes', () => {
    test('choosing a display option writes it', () => {
        const { onChange } = renderPanel();
        addProperty('Layout', 'Display');
        fireEvent.click(screen.getByLabelText('Grid'));
        expect(onChange).toHaveBeenCalledWith('grid');
    });

    test('a second choice replaces the first rather than appending', () => {
        const { onChange } = renderPanel('flex p-4');
        openGroup('Layout');
        fireEvent.click(within(propertyRow('Display')).getByLabelText('Grid'));
        expect(onChange).toHaveBeenCalledWith('p-4 grid');
    });

    test('clicking the active option clears it', () => {
        const { onChange } = renderPanel('grid p-4');
        openGroup('Layout');
        fireEvent.click(within(propertyRow('Display')).getByLabelText('Grid'));
        expect(onChange).toHaveBeenCalledWith('p-4');
    });

    test('the selected breakpoint prefixes what is written', () => {
        const { onChange } = renderPanel();
        fireEvent.click(screen.getByRole('button', { name: 'MD' }));
        addProperty('Layout', 'Display');
        fireEvent.click(screen.getByLabelText('Grid'));
        expect(onChange).toHaveBeenCalledWith('md:grid');
    });

    test('the selected state prefixes what is written', () => {
        const { onChange } = renderPanel();
        fireEvent.click(screen.getByRole('button', { name: 'Hover' }));
        addProperty('Layout', 'Display');
        fireEvent.click(screen.getByLabelText('Grid'));
        expect(onChange).toHaveBeenCalledWith('hover:grid');
    });
});

describe('branch rows', () => {
    test('picking flex puts the flex layout rows on screen unasked', () => {
        renderPanel('flex');
        openGroup('Layout');

        for (const label of ['Direction', 'Wrap', 'Align Content', 'Justify Content', 'Align Items']) {
            expect(propertyRow(label)).toBeInTheDocument();
        }
        // Grid-only and opt-in rows stay out of the way
        expect(screen.queryByText('Justify Items')).toBeNull();
        expect(screen.queryByText('Gap')).toBeNull();
    });

    test('picking grid swaps in the grid rows', () => {
        renderPanel('grid');
        openGroup('Layout');

        expect(propertyRow('Auto Flow')).toBeInTheDocument();
        expect(propertyRow('Justify Items')).toBeInTheDocument();
        expect(screen.queryByText('Direction')).toBeNull();
        expect(screen.queryByText('Template Columns')).toBeNull();
    });

    test('an auto-shown row with no value offers nothing to remove', () => {
        renderPanel('flex');
        openGroup('Layout');
        expect(within(propertyRow('Direction')).queryByTitle('Remove')).toBeNull();
    });

    test('the same row gains a remove button once it holds a value', () => {
        renderPanel('flex flex-col');
        openGroup('Layout');
        expect(within(propertyRow('Direction')).getByTitle('Remove')).toBeInTheDocument();
    });

    test('the group badge counts what is set, not what is shown', () => {
        // Five rows are on screen for display:flex; only display carries a value
        renderPanel('flex');
        const header = screen.getByText('Layout').closest('.winden-helper-group-header') as HTMLElement;
        expect(header.querySelector('.winden-helper-group-count')!.textContent).toBe('1');
    });

    test('the badge grows as those rows are filled in', () => {
        renderPanel('flex flex-col justify-center');
        const header = screen.getByText('Layout').closest('.winden-helper-group-header') as HTMLElement;
        expect(header.querySelector('.winden-helper-group-count')!.textContent).toBe('3');
    });
});

describe('removing', () => {
    test('the row remove clears that property only', () => {
        const { onChange } = renderPanel('grid p-4');
        openGroup('Layout');
        fireEvent.click(within(propertyRow('Display')).getByTitle('Remove'));
        expect(onChange).toHaveBeenCalledWith('p-4');
    });
});

describe('group filter', () => {
    test('unchecking a group hides it', () => {
        renderPanel();
        fireEvent.click(screen.getByTitle('Choose which groups to show'));
        const item = screen.getAllByText('Background')
            .map((el) => el.closest('.winden-helper-filter-item'))
            .find(Boolean) as HTMLElement;
        fireEvent.click(within(item).getByRole('checkbox'));

        const groupTitles = [...document.querySelectorAll('.winden-helper-group-title')].map((el) => el.textContent);
        expect(groupTitles).not.toContain('Background');
        expect(groupTitles).toContain('Layout');
    });
});

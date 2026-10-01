/**
 * Component tests for the individual property controls: pickers, sided rows
 * and the custom arbitrary-value input.
 *
 * The custom input is the reason this file exists. Its debounce previously
 * called the `onApply` captured when the effect ran, so a second edit wrote
 * against a stale class string — a bug ESLint's exhaustive-deps rule caught
 * only after it had shipped through several rounds of manual testing.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { HelperPanel } from '../src/winden-classes/gutenberg/helper/HelperPanel';

function renderPanel(value = '', onChange = vi.fn()) {
    render(<HelperPanel value={value} onChange={onChange} breakpoints={['sm', 'md']} />);
    return onChange;
}

function openGroup(name: string) {
    fireEvent.click(screen.getByText(name));
}

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

describe('pickers', () => {
    test('a chip row stays collapsed behind a trigger until opened', () => {
        renderPanel('p-4');
        openGroup('Spacing');
        const row = propertyRow('Padding');

        expect(within(row).getByRole('button', { name: /p-4/ })).toBeInTheDocument();
        expect(row.querySelector('.winden-helper-picker-popover')).toBeNull();

        fireEvent.click(within(row).getByRole('button', { name: /p-4/ }));
        expect(row.querySelector('.winden-helper-picker-popover')).not.toBeNull();
    });

    test('a swatch grid mounts its palette only while open', () => {
        renderPanel('bg-red-500');
        openGroup('Background');
        const row = propertyRow('Background Color');

        expect(row.querySelectorAll('.winden-helper-swatch:not(.winden-helper-trigger-swatch)')).toHaveLength(0);

        fireEvent.click(within(row).getByRole('button', { name: /bg-red-500/ }));
        expect(row.querySelectorAll('.winden-helper-swatch:not(.winden-helper-trigger-swatch)').length).toBeGreaterThan(200);
    });

    test('picking a value closes a single-select picker', () => {
        const onChange = renderPanel('p-4');
        openGroup('Spacing');
        const row = propertyRow('Padding');
        fireEvent.click(within(row).getByRole('button', { name: /p-4/ }));
        fireEvent.click(within(row).getByLabelText('p-8'));

        expect(onChange).toHaveBeenCalledWith('p-8');
        expect(row.querySelector('.winden-helper-picker-popover')).toBeNull();
    });

    test('a multi-select picker stays open so values can be stacked', () => {
        renderPanel('underline');
        openGroup('Typography');
        const row = propertyRow('Decoration');
        fireEvent.click(within(row).getByRole('button', { name: /underline/ }));
        fireEvent.click(within(row).getByLabelText('italic'));

        expect(row.querySelector('.winden-helper-picker-popover')).not.toBeNull();
    });
});

describe('sided rows', () => {
    test('every edge that holds something is a row of its own', () => {
        renderPanel('pt-8 px-2');
        openGroup('Spacing');
        const row = propertyRow('Padding');

        const rows = [...row.querySelectorAll('.winden-helper-side-row .winden-helper-property-label')]
            .map((el) => el.textContent);
        expect(rows).toEqual(['X', 'Top']);
    });

    /**
     * The edges with nothing in them are the only thing the old tab strip was
     * still needed for. They sit below the rows rather than above them.
     */
    test('the edges with nothing in them are offered underneath', () => {
        renderPanel('pt-8 px-2');
        openGroup('Spacing');
        const row = propertyRow('Padding');

        const rest = [...row.querySelectorAll('.winden-helper-side-add button')].map((el) => el.textContent);
        expect(rest).toEqual(['All', 'Y', 'Right', 'Bottom', 'Left']);
    });

    test('each row shows its own value, and its own importance', () => {
        renderPanel('p-16! px-12');
        openGroup('Spacing');
        const row = propertyRow('Padding');

        const shown = [...row.querySelectorAll('.winden-helper-side-row')].map((side) => ({
            label: side.querySelector('.winden-helper-property-label')?.textContent,
            value: side.querySelector('.winden-helper-popover-trigger')?.textContent,
            forced: side.querySelector('.winden-helper-row-important')?.getAttribute('aria-pressed'),
        }));
        expect(shown).toEqual([
            { label: 'All', value: 'p-16!', forced: 'true' },
            { label: 'X', value: 'px-12', forced: 'false' },
        ]);
    });

    test('adding an edge opens it without touching the class string', () => {
        const onChange = renderPanel('pt-8');
        openGroup('Spacing');
        const row = propertyRow('Padding');

        fireEvent.click(within(row).getByRole('button', { name: 'All' }));
        expect(onChange).not.toHaveBeenCalled();
        const labels = [...row.querySelectorAll('.winden-helper-side-row .winden-helper-property-label')]
            .map((el) => el.textContent);
        expect(labels).toContain('All');
    });

    test('a sided row keeps its importance per edge, not once for the property', () => {
        renderPanel('p-16! px-12');
        openGroup('Spacing');
        const header = propertyRow('Padding').querySelector('.winden-helper-property-header');
        // The property's own header carries Remove and nothing else — two
        // importance controls at two depths is what this layout undid.
        expect(header?.querySelector('.winden-helper-row-important')).toBeNull();
    });

    test('the row label counts how many edges are set', () => {
        renderPanel('pt-8 px-2 pb-4');
        openGroup('Spacing');
        expect(within(propertyRow('Padding')).getByText('3')).toBeInTheDocument();
    });

    test('an edge can be cleared without touching the others', () => {
        const onChange = renderPanel('pt-8 px-2');
        openGroup('Spacing');
        const row = propertyRow('Padding');
        const topRow = [...row.querySelectorAll('.winden-helper-side-row')]
            .find((el) => el.querySelector('.winden-helper-property-label')?.textContent === 'Top') as HTMLElement;

        fireEvent.click(within(topRow).getByTitle('Clear top'));
        expect(onChange).toHaveBeenCalledWith('px-2');
    });

    test('removing the row clears every edge at once', () => {
        const onChange = renderPanel('pt-8 px-2 m-6');
        openGroup('Spacing');
        fireEvent.click(within(propertyRow('Padding')).getByTitle('Remove'));
        expect(onChange).toHaveBeenCalledWith('m-6');
    });
});

describe('custom values', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
    afterEach(() => vi.useRealTimers());

    const openCustom = () => {
        openGroup('Spacing');
        const row = propertyRow('Padding');
        fireEvent.click(within(row).getByRole('button', { name: /Not set|p-/ }));
        fireEvent.click(within(row).getByRole('button', { name: 'Custom' }));
        return row;
    };

    test('typing applies once the value settles, not on every keystroke', () => {
        const onChange = renderPanel('');
        addProperty('Spacing', 'Padding');
        const row = propertyRow('Padding');
        fireEvent.click(within(row).getByRole('button', { name: 'Custom' }));

        const input = within(row).getByRole('textbox');
        fireEvent.change(input, { target: { value: '1' } });
        fireEvent.change(input, { target: { value: '13' } });
        fireEvent.change(input, { target: { value: '13p' } });
        fireEvent.change(input, { target: { value: '13px' } });
        expect(onChange).not.toHaveBeenCalled();

        vi.advanceTimersByTime(500);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('p-[13px]');
    });

    test('a pending edit applies against the classes as they are when it fires', () => {
        // Regression guard: the debounce captured `onApply` when the effect ran.
        // If the class string changes while a keystroke is still settling, that
        // captured handler writes against the old string and silently discards
        // whatever else was added in the meantime.
        const onChange = vi.fn();
        const { rerender } = render(<HelperPanel value="" onChange={onChange} breakpoints={['sm']} />);
        addProperty('Spacing', 'Padding');
        fireEvent.click(within(propertyRow('Padding')).getByRole('button', { name: 'Custom' }));

        fireEvent.change(within(propertyRow('Padding')).getByRole('textbox'), { target: { value: '27px' } });
        vi.advanceTimersByTime(200); // still pending

        // Something else writes a class before the debounce fires
        rerender(<HelperPanel value="m-4" onChange={onChange} breakpoints={['sm']} />);
        vi.advanceTimersByTime(300);

        expect(onChange).toHaveBeenCalledWith('m-4 p-[27px]');
    });

    test('a row holding a custom value keeps the presets one click away', () => {
        const onChange = renderPanel('p-[13px]');
        openGroup('Spacing');
        const row = propertyRow('Padding');

        expect(within(row).getByRole('textbox')).toHaveValue('13px');
        fireEvent.click(within(row).getByRole('button', { name: 'Custom' }));
        fireEvent.click(within(row).getByLabelText('p-6'));

        expect(onChange).toHaveBeenCalledWith('p-6');
    });

    test('keyword-only properties offer no custom input', () => {
        renderPanel('flex');
        openGroup('Layout');
        const row = propertyRow('Display');
        expect(within(row).queryByRole('button', { name: 'Custom' })).toBeNull();
    });
});

describe('the custom value field', () => {
    test('asks for a value rather than showing one', () => {
        // Only what goes inside the brackets is typed here, so `p-[ 13px ]`
        // described a string nobody enters — and a concrete example reads as
        // the required format rather than an invitation.
        renderPanel('');
        addProperty('Spacing', 'Padding');
        const row = propertyRow('Padding');
        fireEvent.click(within(row).getByRole('button', { name: 'Custom' }));

        expect(within(row).getByRole('textbox')).toHaveAttribute('placeholder', 'Add value');
    });
});

/**
 * The `htmlAttributes` object core blocks and the Winden image carry — what
 * goes in, what is refused, and how a `style` string becomes React's object.
 */

import { describe, test, expect } from 'vitest';
import {
    isAllowedAttributeName,
    sanitizeHtmlAttributes,
    readHtmlAttributes,
    areHtmlAttributesRepresentable,
    styleStringToObject,
    htmlAttributesToProps,
} from '../src/blocks/shared/html-attributes';

const element = (markup: string): Element => {
    const doc = new DOMParser().parseFromString(`<body>${markup}</body>`, 'text/html');
    return doc.body.firstElementChild as Element;
};

describe('attribute names', () => {
    test('aria, data, role, style and the rest are allowed', () => {
        for (const name of ['aria-hidden', 'data-x', 'role', 'style', 'loading', 'tabindex', 'xlink:href', 'v-if']) {
            expect(isAllowedAttributeName(name)).toBe(true);
        }
    });

    test('class and id have homes of their own; handlers are refused', () => {
        expect(isAllowedAttributeName('class')).toBe(false);
        expect(isAllowedAttributeName('id')).toBe(false);
        expect(isAllowedAttributeName('onclick')).toBe(false);
        expect(isAllowedAttributeName('ONLOAD')).toBe(false);
        expect(isAllowedAttributeName('')).toBe(false);
        expect(isAllowedAttributeName('bad name')).toBe(false);
        expect(isAllowedAttributeName('9x')).toBe(false);
    });

    test('sanitize drops what is refused, lower-cases names, and returns nothing for nothing', () => {
        expect(sanitizeHtmlAttributes({ 'ARIA-Hidden': 'true', onclick: 'x()', class: 'a', 'data-n': 3 }))
            .toEqual({ 'aria-hidden': 'true', 'data-n': '3' });
        expect(sanitizeHtmlAttributes({})).toBeUndefined();
        expect(sanitizeHtmlAttributes({ onclick: 'x' })).toBeUndefined();
        expect(sanitizeHtmlAttributes(null)).toBeUndefined();
        expect(sanitizeHtmlAttributes('style')).toBeUndefined();
    });
});

describe('reading from an element', () => {
    test('everything but the excepted names', () => {
        const img = element('<img src="/a.png" alt="" class="x" id="y" loading="lazy" aria-hidden="true">');
        expect(readHtmlAttributes(img, ['class', 'id', 'src', 'alt'])).toEqual({ loading: 'lazy', 'aria-hidden': 'true' });
        expect(readHtmlAttributes(element('<div class="a"></div>'), ['class'])).toBeUndefined();
    });

    test('representable unless a handler is on it', () => {
        expect(areHtmlAttributesRepresentable(element('<div class="a" id="b" style="c:d" data-e="f"></div>'))).toBe(true);
        expect(areHtmlAttributesRepresentable(element('<div onmouseover="x()"></div>'))).toBe(false);
    });
});

describe('style strings', () => {
    test('a Tailwind clip-path survives its commas and parentheses', () => {
        const polygon = 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%)';
        expect(styleStringToObject(`clip-path: ${polygon}`)).toEqual({ clipPath: polygon });
    });

    test('several declarations, vendor prefixes and custom properties', () => {
        expect(styleStringToObject('margin-top:4px; -webkit-mask-image: url("a;b.png"); --tw-x: 1; ;color:red'))
            .toEqual({ marginTop: '4px', WebkitMaskImage: 'url("a;b.png")', '--tw-x': '1', color: 'red' });
        expect(styleStringToObject('')).toEqual({});
        expect(styleStringToObject('nonsense')).toEqual({});
    });
});

describe('props for the block element', () => {
    test('style merges over what the block already had; other names pass through', () => {
        const props = htmlAttributesToProps(
            { style: 'clip-path: inset(0)', 'aria-hidden': 'true' },
            { className: 'wp-block-group', style: { paddingTop: '1rem' } }
        );
        expect(props).toEqual({ style: { paddingTop: '1rem', clipPath: 'inset(0)' }, 'aria-hidden': 'true' });
    });

    test('in the editor, names the wrapper owns are left to it', () => {
        expect(htmlAttributesToProps({ role: 'list', 'data-block': 'x', 'data-y': '1' }, {}, { inEditor: true }))
            .toEqual({ 'data-y': '1' });
        expect(htmlAttributesToProps({ role: 'list' })).toEqual({ role: 'list' });
        expect(htmlAttributesToProps(undefined)).toEqual({});
    });
});

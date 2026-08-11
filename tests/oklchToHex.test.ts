import { describe, expect, it, vi } from 'vitest';

import { oklchToHex } from '@utils/oklchToHex';

/**
 * Expected values were cross-checked against an independent implementation of
 * Björn Ottosson's OKLab <-> linear sRGB transform with the standard sRGB
 * transfer function. The conversion in the plugin agrees with it exactly.
 */
describe('oklchToHex', () => {
  it('converts a saturated orange', () => {
    expect(oklchToHex('oklch(76.9% 0.188 70.08)')).toBe('#fe9a00');
  });

  it('converts pure white', () => {
    expect(oklchToHex('oklch(100% 0 0)')).toBe('#ffffff');
  });

  it('converts pure black', () => {
    expect(oklchToHex('oklch(0% 0 0)')).toBe('#000000');
  });

  it('converts a saturated red', () => {
    expect(oklchToHex('oklch(62.8% 0.258 29.23)')).toBe('#ff0000');
  });

  it('accepts a lightness written without a percent sign', () => {
    expect(oklchToHex('oklch(100 0 0)')).toBe('#ffffff');
  });

  it('clamps out-of-gamut colours into a valid hex string rather than throwing', () => {
    const result = oklchToHex('oklch(99% 0.4 140)');

    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns black and warns when the string is not OKLCH', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(oklchToHex('not-a-color')).toBe('#000000');
    expect(warn).toHaveBeenCalled();
  });

  it('returns black for an empty string', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(oklchToHex('')).toBe('#000000');
  });

  it('returns a six-digit lowercase hex for every valid input', () => {
    const inputs = [
      'oklch(20% 0.05 10)',
      'oklch(50% 0.1 180)',
      'oklch(80% 0.15 300)',
    ];

    for (const input of inputs) {
      expect(oklchToHex(input)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

import { describe, expect, it } from 'vitest';

import {
  calculateClampValue,
  calculateClampsForFeature,
} from '@utils/clampCalculations';

describe('calculateClampValue', () => {
  it('produces slope-then-intercept order, matching fluid-type-scale.com', () => {
    // 16px -> 24px between 320px and 1920px.
    // slope = 8/1600 = 0.005 -> 0.50vi; intercept = 16 - 0.005*320 = 14.4px = 0.90rem.
    expect(calculateClampValue(16, 24, 320, 1920, true, 16, 2)).toBe(
      'clamp(1.00rem, 0.50vi + 0.90rem, 1.50rem)'
    );
  });

  it('emits px units when useRem is false, leaving the intercept unscaled', () => {
    expect(calculateClampValue(16, 24, 320, 1920, false, 16, 2)).toBe(
      'clamp(16.00px, 0.50vi + 14.40px, 24.00px)'
    );
  });

  it('honours decimalPlaces for the sizes but keeps the slope at two places', () => {
    expect(calculateClampValue(16, 24, 320, 1920, true, 16, 0)).toBe(
      'clamp(1rem, 0.50vi + 1rem, 2rem)'
    );
  });

  it('collapses to a flat value when min and max are equal', () => {
    // No growth: slope is 0, so the preferred term is a constant.
    expect(calculateClampValue(18, 18, 320, 1920, true, 16, 2)).toBe(
      'clamp(1.13rem, 0.00vi + 1.13rem, 1.13rem)'
    );
  });

  it('supports a shrinking scale where max is below min', () => {
    const result = calculateClampValue(24, 16, 320, 1920, true, 16, 2);
    expect(result).toBe('clamp(1.50rem, -0.50vi + 1.60rem, 1.00rem)');
  });

  it('respects a non-16 rem size', () => {
    expect(calculateClampValue(20, 20, 320, 1920, true, 10, 2)).toBe(
      'clamp(2.00rem, 0.00vi + 2.00rem, 2.00rem)'
    );
  });
});

describe('calculateClampsForFeature', () => {
  const base = {
    steps: ['sm', 'base', 'lg'],
    baseStep: 'base',
    minBaseSize: 16,
    maxBaseSize: 20,
    minScaleRatio: 1.2,
    maxScaleRatio: 1.25,
    minScreenSize: 320,
    maxScreenSize: 1920,
    useRem: true,
    remSize: 16,
    decimalPlaces: 2,
  };

  it('scales each step off the base step with a modular scale', () => {
    const result = calculateClampsForFeature(base);

    expect(Object.keys(result)).toEqual(['sm', 'base', 'lg']);
    // base sits at the identity power, so it is exactly minBaseSize/maxBaseSize.
    expect(result.base.minBase).toBe('16.00');
    expect(result.base.maxBase).toBe('20.00');
    // one step down divides by the ratio, one step up multiplies by it.
    expect(result.sm.minBase).toBe('13.33');
    expect(result.lg.minBase).toBe('19.20');
    expect(result.lg.maxBase).toBe('25.00');
  });

  it('falls back to the middle step when baseStep is not in steps', () => {
    const result = calculateClampsForFeature({ ...base, baseStep: 'nope' });

    // Math.floor(3/2) = index 1 = 'base', so the identity lands there anyway.
    expect(result.base.minBase).toBe('16.00');
  });

  it('marks every step enabled by default', () => {
    const result = calculateClampsForFeature(base);

    expect(result.sm.enabled).toBe(true);
    expect(result.base.enabled).toBe(true);
    expect(result.lg.enabled).toBe(true);
  });

  it('honours an explicit enabled:false override', () => {
    const result = calculateClampsForFeature({
      ...base,
      overrides: {
        sm: { enabled: false, value: '', fluidClamp: '', minBase: '', maxBase: '' },
      },
    });

    expect(result.sm.enabled).toBe(false);
    expect(result.base.enabled).toBe(true);
  });

  it('applies numeric minBase and maxBase overrides', () => {
    const result = calculateClampsForFeature({
      ...base,
      overrides: {
        lg: { enabled: true, value: '', fluidClamp: '', minBase: '30', maxBase: '40' },
      },
    });

    expect(result.lg.minBase).toBe('30.00');
    expect(result.lg.maxBase).toBe('40.00');
    // slope = (40-30)/1600 = 0.00625 -> 0.63vi at two decimal places.
    expect(result.lg.value).toBe('clamp(1.88rem, 0.63vi + 1.75rem, 2.50rem)');
  });

  it('ignores overrides that are empty or unparseable', () => {
    const result = calculateClampsForFeature({
      ...base,
      overrides: {
        base: { enabled: true, value: '', fluidClamp: '', minBase: '', maxBase: 'abc' },
      },
    });

    expect(result.base.minBase).toBe('16.00');
    expect(result.base.maxBase).toBe('20.00');
  });

  it('emits a fixed size and an empty fluidClamp when disableFluid is set', () => {
    const result = calculateClampsForFeature({ ...base, disableFluid: true });

    expect(result.base.value).toBe('1.00rem');
    expect(result.base.fluidClamp).toBe('');
  });

  it('emits px fixed sizes when disableFluid is set and useRem is false', () => {
    const result = calculateClampsForFeature({
      ...base,
      disableFluid: true,
      useRem: false,
    });

    expect(result.base.value).toBe('16.00px');
  });

  it('sets value and fluidClamp to the same clamp string in fluid mode', () => {
    const result = calculateClampsForFeature(base);

    expect(result.base.value).toBe(result.base.fluidClamp);
    expect(result.base.value).toMatch(/^clamp\(/);
  });

  it('returns an empty object for an empty step list', () => {
    expect(calculateClampsForFeature({ ...base, steps: [] })).toEqual({});
  });
});

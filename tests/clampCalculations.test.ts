/**
 * Tests for clamp calculation utilities
 * Covers: calculateClampValue, calculateClampsForFeature (with overrides, base step, units, etc.)
 */

import { describe, test, expect } from 'vitest';
import {
  calculateClampValue,
  calculateClampsForFeature,
  type FeatureConfig,
} from '../src/admin/utils/clampCalculations';

// ─── calculateClampValue ───────────────────────────────────

describe('calculateClampValue', () => {
  test('generates correct clamp in px', () => {
    const result = calculateClampValue(16, 24, 320, 1920, false, 16, 2);
    expect(result).toMatch(/^clamp\(16\.00px,/);
    expect(result).toMatch(/24\.00px\)$/);
    expect(result).toContain('vi');
  });

  test('generates correct clamp in rem', () => {
    const result = calculateClampValue(16, 24, 320, 1920, true, 16, 2);
    // 16px / 16 = 1rem, 24px / 16 = 1.5rem
    expect(result).toMatch(/^clamp\(1\.00rem,/);
    expect(result).toMatch(/1\.50rem\)$/);
  });

  test('slope is calculated correctly', () => {
    // slope = (24 - 16) / (1920 - 320) = 8 / 1600 = 0.005
    // slopeVi = 0.005 * 100 = 0.50
    const result = calculateClampValue(16, 24, 320, 1920, false, 16, 2);
    expect(result).toContain('0.50vi');
  });

  test('handles equal min and max (zero slope)', () => {
    const result = calculateClampValue(16, 16, 320, 1920, false, 16, 2);
    expect(result).toContain('0.00vi');
    expect(result).toMatch(/clamp\(16\.00px,.*16\.00px\)/);
  });

  test('handles different rem sizes', () => {
    // remSize = 10: 16px / 10 = 1.60rem
    const result = calculateClampValue(16, 24, 320, 1920, true, 10, 2);
    expect(result).toMatch(/^clamp\(1\.60rem,/);
    expect(result).toMatch(/2\.40rem\)$/);
  });

  test('respects decimal places', () => {
    const result = calculateClampValue(16, 24, 320, 1920, true, 16, 4);
    expect(result).toMatch(/^clamp\(1\.0000rem,/);
  });
});

// ─── calculateClampsForFeature ─────────────────────────────

describe('calculateClampsForFeature', () => {
  const baseConfig: FeatureConfig = {
    steps: ['xs', 'sm', 'base', 'lg', 'xl'],
    baseStep: 'base',
    minBaseSize: 16,
    maxBaseSize: 20,
    minScaleRatio: 1.2,
    maxScaleRatio: 1.25,
    minScreenSize: 320,
    maxScreenSize: 1920,
    useRem: false,
    remSize: 16,
    decimalPlaces: 2,
  };

  test('generates clamps for all steps', () => {
    const result = calculateClampsForFeature(baseConfig);
    expect(Object.keys(result)).toEqual(['xs', 'sm', 'base', 'lg', 'xl']);
  });

  test('base step has exact base sizes', () => {
    const result = calculateClampsForFeature(baseConfig);
    expect(result['base'].minBase).toBe('16.00');
    expect(result['base'].maxBase).toBe('20.00');
  });

  test('steps below base are smaller', () => {
    const result = calculateClampsForFeature(baseConfig);
    const xsMin = parseFloat(result['xs'].minBase);
    const baseMin = parseFloat(result['base'].minBase);
    expect(xsMin).toBeLessThan(baseMin);
  });

  test('steps above base are larger', () => {
    const result = calculateClampsForFeature(baseConfig);
    const xlMin = parseFloat(result['xl'].minBase);
    const baseMin = parseFloat(result['base'].minBase);
    expect(xlMin).toBeGreaterThan(baseMin);
  });

  test('each step is progressively larger', () => {
    const result = calculateClampsForFeature(baseConfig);
    const sizes = ['xs', 'sm', 'base', 'lg', 'xl'].map(
      (s) => parseFloat(result[s].minBase)
    );
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    }
  });

  test('modular scale is applied correctly', () => {
    const result = calculateClampsForFeature(baseConfig);
    // base = 16, lg = 16 * 1.2^1 = 19.2
    expect(parseFloat(result['lg'].minBase)).toBeCloseTo(19.2, 1);
    // xl = 16 * 1.2^2 = 23.04
    expect(parseFloat(result['xl'].minBase)).toBeCloseTo(23.04, 1);
    // sm = 16 * 1.2^-1 = 13.33
    expect(parseFloat(result['sm'].minBase)).toBeCloseTo(13.33, 1);
  });

  // ─── Base step not in steps ──────────────────────────

  test('falls back to middle index when baseStep not found', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      steps: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
      baseStep: 'base', // Not in steps!
    };
    const result = calculateClampsForFeature(config);
    // Middle index = 3 (lg), so lg should have the base size
    expect(parseFloat(result['lg'].minBase)).toBeCloseTo(16, 1);
    // xs should be smaller (3 steps below)
    expect(parseFloat(result['xs'].minBase)).toBeLessThan(16);
  });

  test('xs is smaller than base when baseStep not found (6 steps)', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      steps: ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'],
      baseStep: 'base',
    };
    const result = calculateClampsForFeature(config);
    const xsMin = parseFloat(result['xs'].minBase);
    const lgMin = parseFloat(result['lg'].minBase);
    expect(xsMin).toBeLessThan(lgMin);
  });

  // ─── Overrides ───────────────────────────────────────

  test('applies minBase override', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      overrides: {
        lg: { enabled: true, value: '', fluidClamp: '', minBase: '25', maxBase: '' },
      },
    };
    const result = calculateClampsForFeature(config);
    expect(parseFloat(result['lg'].minBase)).toBeCloseTo(25, 1);
    // Other steps unaffected
    expect(parseFloat(result['base'].minBase)).toBeCloseTo(16, 1);
  });

  test('applies maxBase override', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      overrides: {
        xl: { enabled: true, value: '', fluidClamp: '', minBase: '', maxBase: '120' },
      },
    };
    const result = calculateClampsForFeature(config);
    expect(parseFloat(result['xl'].maxBase)).toBeCloseTo(120, 1);
    // Clamp should reflect the override
    expect(result['xl'].value).toContain('120.00');
  });

  test('applies both min and max overrides', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      overrides: {
        lg: { enabled: true, value: '', fluidClamp: '', minBase: '30', maxBase: '50' },
      },
    };
    const result = calculateClampsForFeature(config);
    expect(parseFloat(result['lg'].minBase)).toBeCloseTo(30, 1);
    expect(parseFloat(result['lg'].maxBase)).toBeCloseTo(50, 1);
  });

  test('ignores empty string overrides', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      overrides: {
        lg: { enabled: true, value: '', fluidClamp: '', minBase: '', maxBase: '' },
      },
    };
    const result = calculateClampsForFeature(config);
    // Should use calculated values, not 0
    expect(parseFloat(result['lg'].minBase)).toBeCloseTo(19.2, 1);
  });

  test('override does not affect other steps', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      overrides: {
        xl: { enabled: true, value: '', fluidClamp: '', minBase: '100', maxBase: '200' },
      },
    };
    const result = calculateClampsForFeature(config);
    // xl is overridden
    expect(parseFloat(result['xl'].minBase)).toBeCloseTo(100, 1);
    // Others are normal
    expect(parseFloat(result['base'].minBase)).toBeCloseTo(16, 1);
    expect(parseFloat(result['lg'].minBase)).toBeCloseTo(19.2, 1);
  });

  test('respects enabled=false in overrides', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      overrides: {
        sm: { enabled: false, value: '', fluidClamp: '', minBase: '', maxBase: '' },
      },
    };
    const result = calculateClampsForFeature(config);
    expect(result['sm'].enabled).toBe(false);
    expect(result['base'].enabled).toBe(true);
  });

  // ─── disableFluid (fixed mode) ──────────────────────

  test('fixed mode outputs plain values without clamp', () => {
    const config: FeatureConfig = { ...baseConfig, disableFluid: true };
    const result = calculateClampsForFeature(config);
    expect(result['base'].value).toBe('16.00px');
    expect(result['base'].fluidClamp).toBe('');
  });

  test('fixed mode with rem', () => {
    const config: FeatureConfig = { ...baseConfig, disableFluid: true, useRem: true };
    const result = calculateClampsForFeature(config);
    expect(result['base'].value).toBe('1.00rem');
  });

  test('fixed mode applies overrides', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      disableFluid: true,
      overrides: {
        lg: { enabled: true, value: '', fluidClamp: '', minBase: '25', maxBase: '' },
      },
    };
    const result = calculateClampsForFeature(config);
    expect(result['lg'].value).toBe('25.00px');
  });

  // ─── REM mode ────────────────────────────────────────

  test('rem mode outputs rem units in clamp', () => {
    const config: FeatureConfig = { ...baseConfig, useRem: true };
    const result = calculateClampsForFeature(config);
    expect(result['base'].value).toContain('rem');
    expect(result['base'].value).not.toContain('px');
  });

  // ─── Edge cases ──────────────────────────────────────

  test('single step', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      steps: ['base'],
      baseStep: 'base',
    };
    const result = calculateClampsForFeature(config);
    expect(Object.keys(result)).toEqual(['base']);
    expect(parseFloat(result['base'].minBase)).toBeCloseTo(16, 1);
  });

  test('empty steps returns empty object', () => {
    const config: FeatureConfig = { ...baseConfig, steps: [] };
    const result = calculateClampsForFeature(config);
    expect(Object.keys(result)).toHaveLength(0);
  });

  test('scale ratio of 1 produces equal sizes for all steps', () => {
    const config: FeatureConfig = {
      ...baseConfig,
      minScaleRatio: 1,
      maxScaleRatio: 1,
    };
    const result = calculateClampsForFeature(config);
    const sizes = Object.values(result).map((c) => parseFloat(c.minBase));
    sizes.forEach((s) => expect(s).toBeCloseTo(16, 1));
  });
});

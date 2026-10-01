import { describe, test, expect, vi } from 'vitest';
import {
  generateColorShades,
  createUpdatedEntry,
  parseHexToHsl,
  roundRgbColor,
  getColorNameFromHex,
  isValidColorInput,
  parseAndValidateColor,
  getPlaceholderText,
  getColorSourceLabel,
  isSpecialUtilityColor,
  isSystemLockedColor,
  getSpecialUtilityAbbreviation,
} from '../src/admin/components/pages/Wizzard/Color/colorEntryCalculations';
import {
  createDefaultCurveHandles,
  getShadeBaseIndex,
} from '../src/admin/components/pages/Wizzard/Color/shadeCurves';
import type { ColorShade, ColorEntry } from '../src/admin/types/wizzard';

// ---------------------------------------------------------------------------
// Helpers: build the curve-based arguments generateColorShades / createUpdatedEntry now require.
// The shade pipeline switched from min/maxLightness to cubic-bezier curves in 3.3.0 (commit 0101827).
// ---------------------------------------------------------------------------
function defaultCurveSet(count: number) {
  const baseIndex = getShadeBaseIndex(count);
  const curves = createDefaultCurveHandles(count, baseIndex);
  return {
    baseIndex,
    lightnessCurve: curves,
    saturationCurve: curves,
    hueCurve: curves,
  };
}

function gen(hex: string, count: number, existing: ColorShade[] = []): ColorShade[] {
  const c = defaultCurveSet(count);
  return generateColorShades(
    hex,
    count,
    c.baseIndex,
    c.lightnessCurve,
    c.saturationCurve,
    c.hueCurve,
    existing
  );
}

function makeEntry(overrides: Partial<ColorEntry> = {}): ColorEntry {
  return {
    id: 1,
    name: 'blue',
    hex: '#3b82f6',
    colorFormat: 'hex',
    shades: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateColorShades
// ---------------------------------------------------------------------------
describe('generateColorShades', () => {
  test('generates the requested number of shades', () => {
    expect(gen('#3b82f6', 10)).toHaveLength(10);
  });

  test('each shade has required properties', () => {
    const shades = gen('#3b82f6', 5);
    for (const shade of shades) {
      expect(shade).toHaveProperty('name');
      expect(shade).toHaveProperty('hex');
      expect(shade).toHaveProperty('isEnabled');
      expect(shade).toHaveProperty('isDefault');
      expect(typeof shade.hex).toBe('string');
      expect(shade.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('shade names follow 100-step convention', () => {
    const shades = gen('#ff0000', 5);
    const names = shades.map((s) => s.name);
    expect(names).toEqual(['100', '200', '300', '400', '500']);
  });

  test('preserves custom shades on regeneration', () => {
    const existing: ColorShade[] = [
      { name: '100', hex: '#custom1', isEnabled: true, isDefault: false, isCustom: true },
      { name: '200', hex: '#aabbcc', isEnabled: true, isDefault: false, isCustom: false },
      { name: '300', hex: '#ddeeff', isEnabled: false, isDefault: true, isCustom: false },
    ];

    const regenerated = gen('#ff0000', 3, existing);
    expect(regenerated).toHaveLength(3);

    // Custom shade should keep its hex
    expect(regenerated[0].hex).toBe('#custom1');
    expect(regenerated[0].isCustom).toBe(true);

    // Non-custom shades should get new generated values (not their old ones)
    expect(regenerated[1].isCustom).toBe(false);
    expect(regenerated[2].isCustom).toBe(false);
  });

  test('preserves isEnabled from existing shades', () => {
    const existing: ColorShade[] = [
      { name: '100', hex: '#aaa', isEnabled: false, isDefault: false },
      { name: '200', hex: '#bbb', isEnabled: true, isDefault: false },
    ];

    const regenerated = gen('#ff0000', 2, existing);
    expect(regenerated[0].isEnabled).toBe(false);
    expect(regenerated[1].isEnabled).toBe(true);
  });

  test('preserves isDefault from existing shades', () => {
    const existing: ColorShade[] = [
      { name: '100', hex: '#aaa', isEnabled: true, isDefault: false },
      { name: '200', hex: '#bbb', isEnabled: true, isDefault: true },
    ];

    const regenerated = gen('#ff0000', 2, existing);
    expect(regenerated[0].isDefault).toBe(false);
    expect(regenerated[1].isDefault).toBe(true);
  });

  test('defaults isEnabled to true when no existing shades', () => {
    const shades = gen('#ff0000', 3);
    for (const shade of shades) {
      expect(shade.isEnabled).toBe(true);
    }
  });

  test('handles more shades than existing (new shades get defaults)', () => {
    const existing: ColorShade[] = [
      { name: '100', hex: '#custom', isEnabled: true, isDefault: false, isCustom: true },
    ];

    const regenerated = gen('#ff0000', 3, existing);
    expect(regenerated).toHaveLength(3);
    // First shade preserves custom
    expect(regenerated[0].hex).toBe('#custom');
    // New shades get defaults
    expect(regenerated[1].isEnabled).toBe(true);
    expect(regenerated[1].isDefault).toBe(false);
    expect(regenerated[2].isEnabled).toBe(true);
  });

  test('handles fewer shades than existing (extra shades dropped)', () => {
    const existing: ColorShade[] = [
      { name: '100', hex: '#aaa', isEnabled: true, isDefault: false, isCustom: true },
      { name: '200', hex: '#bbb', isEnabled: true, isDefault: false, isCustom: true },
      { name: '300', hex: '#ccc', isEnabled: true, isDefault: false, isCustom: true },
    ];

    const regenerated = gen('#ff0000', 2, existing);
    expect(regenerated).toHaveLength(2);
  });

  test('generates valid hex colors in shade range', () => {
    const shades = gen('#808080', 10);
    for (const shade of shades) {
      expect(shade.hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test('empty existing shades produces fresh generation', () => {
    const shades = gen('#3b82f6', 5, []);
    expect(shades).toHaveLength(5);
    for (const shade of shades) {
      expect(shade.isCustom).toBe(false);
      expect(shade.isEnabled).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// createUpdatedEntry
// ---------------------------------------------------------------------------
describe('createUpdatedEntry', () => {
  test('includes shades and originalGeneratedColors and curve params', () => {
    const entry = makeEntry();
    const shades: ColorShade[] = [
      { name: '100', hex: '#aaa', isEnabled: true, isDefault: false },
      { name: '200', hex: '#bbb', isEnabled: true, isDefault: false },
    ];
    const c = defaultCurveSet(2);

    const result = createUpdatedEntry(entry, shades, {
      baseIndex: c.baseIndex,
      lightnessCurve: c.lightnessCurve,
      saturationCurve: c.saturationCurve,
      hueCurve: c.hueCurve,
      isLocked: false,
      colorFormat: 'hex',
    });

    expect(result.shades).toEqual(shades);
    expect(result.originalGeneratedColors).toEqual(['#aaa', '#bbb']);
    expect(result.baseIndex).toBe(c.baseIndex);
    expect(result.lightnessCurve).toEqual(c.lightnessCurve);
    expect(result.saturationCurve).toEqual(c.saturationCurve);
    expect(result.hueCurve).toEqual(c.hueCurve);
    expect(result.isMainColorChange).toBe(true);
  });

  test('applies colorName when provided', () => {
    const entry = makeEntry();
    const c = defaultCurveSet(11);
    const result = createUpdatedEntry(entry, [], {
      baseIndex: c.baseIndex,
      lightnessCurve: c.lightnessCurve,
      saturationCurve: c.saturationCurve,
      hueCurve: c.hueCurve,
      isLocked: false,
      colorFormat: 'hex',
      colorName: 'Royal Blue',
    });

    expect(result.name).toBe('Royal Blue');
  });

  test('applies hexColor when provided', () => {
    const entry = makeEntry();
    const c = defaultCurveSet(11);
    const result = createUpdatedEntry(entry, [], {
      baseIndex: c.baseIndex,
      lightnessCurve: c.lightnessCurve,
      saturationCurve: c.saturationCurve,
      hueCurve: c.hueCurve,
      isLocked: false,
      colorFormat: 'hsl',
      hexColor: '#ff0000',
    });

    expect(result.hex).toBe('#ff0000');
    expect(result.colorFormat).toBe('hsl');
  });

  test('preserves entry fields via spread', () => {
    const entry = makeEntry({ enableShades: true, reverseShades: false });
    const c = defaultCurveSet(11);
    const result = createUpdatedEntry(entry, [], {
      baseIndex: c.baseIndex,
      lightnessCurve: c.lightnessCurve,
      saturationCurve: c.saturationCurve,
      hueCurve: c.hueCurve,
      isLocked: true,
      colorFormat: 'hex',
    });

    expect(result.enableShades).toBe(true);
    expect(result.reverseShades).toBe(false);
    expect(result.isLocked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseHexToHsl
// ---------------------------------------------------------------------------
describe('parseHexToHsl', () => {
  test('parses pure red correctly', () => {
    const hsl = parseHexToHsl('#ff0000');
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  test('parses white correctly', () => {
    const hsl = parseHexToHsl('#ffffff');
    expect(hsl.l).toBe(100);
  });

  test('parses black correctly', () => {
    const hsl = parseHexToHsl('#000000');
    expect(hsl.l).toBe(0);
  });

  test('returns rounded integer values', () => {
    const hsl = parseHexToHsl('#3b82f6');
    expect(Number.isInteger(hsl.h)).toBe(true);
    expect(Number.isInteger(hsl.s)).toBe(true);
    expect(Number.isInteger(hsl.l)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// roundRgbColor
// ---------------------------------------------------------------------------
describe('roundRgbColor', () => {
  test('rounds fractional RGB values', () => {
    const result = roundRgbColor({ r: 127.6, g: 0.4, b: 255.9 });
    expect(result.r).toBe(128);
    expect(result.g).toBe(0);
    expect(result.b).toBe(256);
  });

  test('defaults alpha to 1 when missing', () => {
    const result = roundRgbColor({ r: 0, g: 0, b: 0 });
    expect(result.a).toBe(1);
  });

  test('rounds alpha to 2 decimal places', () => {
    const result = roundRgbColor({ r: 0, g: 0, b: 0, a: 0.456 });
    expect(result.a).toBe(0.46);
  });
});

// ---------------------------------------------------------------------------
// getColorNameFromHex
// ---------------------------------------------------------------------------
describe('getColorNameFromHex', () => {
  test('returns nearest name for valid hex without invalid-hex warnings', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const colorName = getColorNameFromHex('#0ec4e3');

    expect(colorName).toBeTruthy();
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Invalid Hex value'));

    warnSpy.mockRestore();
  });

  test('returns Unknown for invalid hex', () => {
    expect(getColorNameFromHex('not-a-hex')).toBe('Unknown');
  });
});

// ---------------------------------------------------------------------------
// getColorSourceLabel / isSpecialUtilityColor / isSystemLockedColor
// ---------------------------------------------------------------------------
describe('color source detection', () => {
  test('getColorSourceLabel returns null for regular entries', () => {
    expect(getColorSourceLabel(makeEntry())).toBeNull();
  });

  test('getColorSourceLabel detects utility colors', () => {
    const entry = { ...makeEntry(), isUtility: true } as any;
    expect(getColorSourceLabel(entry)).toBe('Utility');
  });

  test('getColorSourceLabel detects FSE colors', () => {
    const entry = { ...makeEntry(), isFSE: true } as any;
    expect(getColorSourceLabel(entry)).toBe('FSE');
  });

  test('getColorSourceLabel detects Bricks colors', () => {
    const entry = { ...makeEntry(), isBricks: true } as any;
    expect(getColorSourceLabel(entry)).toBe('Bricks');
  });

  test('getColorSourceLabel detects Oxygen colors', () => {
    const entry = { ...makeEntry(), isOxygen: true } as any;
    expect(getColorSourceLabel(entry)).toBe('Oxygen');
  });

  test('isSpecialUtilityColor for transparent', () => {
    const entry = { ...makeEntry(), utilityValue: 'transparent' } as any;
    expect(isSpecialUtilityColor(entry)).toBe(true);
  });

  test('isSpecialUtilityColor for regular color', () => {
    expect(isSpecialUtilityColor(makeEntry())).toBeFalsy();
  });

  test('isSystemLockedColor detects locked', () => {
    const entry = { ...makeEntry(), locked: true } as any;
    expect(isSystemLockedColor(entry)).toBe(true);
  });

  test('isSystemLockedColor for unlocked', () => {
    expect(isSystemLockedColor(makeEntry())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getSpecialUtilityAbbreviation
// ---------------------------------------------------------------------------
describe('getSpecialUtilityAbbreviation', () => {
  test('transparent -> TR', () => expect(getSpecialUtilityAbbreviation('transparent')).toBe('TR'));
  test('currentColor -> CC', () => expect(getSpecialUtilityAbbreviation('currentColor')).toBe('CC'));
  test('inherit -> IN', () => expect(getSpecialUtilityAbbreviation('inherit')).toBe('IN'));
  test('unknown -> empty', () => expect(getSpecialUtilityAbbreviation('auto')).toBe(''));
});

// ---------------------------------------------------------------------------
// getPlaceholderText
// ---------------------------------------------------------------------------
describe('getPlaceholderText', () => {
  test('hex format', () => expect(getPlaceholderText('hex')).toContain('#'));
  test('rgb format', () => expect(getPlaceholderText('rgb')).toContain('rgb'));
  test('hsl format', () => expect(getPlaceholderText('hsl')).toContain('hsl'));
  test('oklch format', () => expect(getPlaceholderText('oklch')).toContain('oklch'));
});

// ---------------------------------------------------------------------------
// isValidColorInput
// ---------------------------------------------------------------------------
describe('isValidColorInput', () => {
  test('valid hex', () => expect(isValidColorInput('#ff0000')).toBe(true));
  test('valid short hex', () => expect(isValidColorInput('#f00')).toBe(true));
  test('invalid string', () => expect(isValidColorInput('not-a-color')).toBe(false));
  test('empty string', () => expect(isValidColorInput('')).toBe(false));
});

// ---------------------------------------------------------------------------
// parseAndValidateColor
// ---------------------------------------------------------------------------
describe('parseAndValidateColor', () => {
  test('returns RGB for valid hex', () => {
    const rgb = parseAndValidateColor('#ff0000');
    expect(rgb).not.toBeNull();
    expect(rgb!.r).toBe(255);
    expect(rgb!.g).toBe(0);
    expect(rgb!.b).toBe(0);
  });

  test('throws for completely invalid input (color-2-name library throws)', () => {
    // The closest() call in parseAndValidateColor throws for truly invalid strings
    expect(() => parseAndValidateColor('garbage')).toThrow();
  });

  test('returns RGB for named color', () => {
    const rgb = parseAndValidateColor('red');
    expect(rgb).not.toBeNull();
    expect(rgb!.r).toBe(255);
  });
});

// ---------------------------------------------------------------------------
// Shade persistence regression: generate → edit → save → reload cycle
// ---------------------------------------------------------------------------
describe('shade persistence regression', () => {
  test('full cycle: generate, customize shade, regenerate preserves custom', () => {
    // Step 1: Generate initial shades
    const initial = gen('#3b82f6', 5);
    expect(initial).toHaveLength(5);

    // Step 2: User customizes shade at index 2
    const withCustom = initial.map((shade, idx) =>
      idx === 2 ? { ...shade, hex: '#ff00ff', isCustom: true } : shade
    );
    expect(withCustom[2].hex).toBe('#ff00ff');
    expect(withCustom[2].isCustom).toBe(true);

    // Step 3: User changes main color (triggers regeneration)
    const regenerated = gen('#ff0000', 5, withCustom);
    expect(regenerated).toHaveLength(5);

    // Custom shade should be preserved
    expect(regenerated[2].hex).toBe('#ff00ff');
    expect(regenerated[2].isCustom).toBe(true);

    // Non-custom shades should have new values
    expect(regenerated[0].isCustom).toBe(false);
    expect(regenerated[1].isCustom).toBe(false);
    expect(regenerated[3].isCustom).toBe(false);
    expect(regenerated[4].isCustom).toBe(false);
  });

  test('simulated save/reload: serialized shades restore correctly', () => {
    // Generate and customize
    const shades = gen('#3b82f6', 3);
    const customized = shades.map((shade, idx) =>
      idx === 1 ? { ...shade, hex: '#custom2', isCustom: true } : shade
    );

    // Simulate save: serialize to JSON
    const serialized = JSON.stringify(customized);

    // Simulate reload: deserialize
    const deserialized: ColorShade[] = JSON.parse(serialized);

    // Verify custom shade survived serialization
    expect(deserialized[1].hex).toBe('#custom2');
    expect(deserialized[1].isCustom).toBe(true);

    // Regenerate with deserialized data (simulating component mount)
    const afterReload = gen('#3b82f6', 3, deserialized);

    // Custom shade preserved after reload + regeneration
    expect(afterReload[1].hex).toBe('#custom2');
    expect(afterReload[1].isCustom).toBe(true);
  });

  test('resetting a custom shade by clearing isCustom', () => {
    const initial = gen('#3b82f6', 3);
    const originalHexAtIdx1 = initial[1].hex;

    // Customize
    const customized = initial.map((shade, idx) =>
      idx === 1 ? { ...shade, hex: '#999999', isCustom: true } : shade
    );

    // Reset custom flag
    const reset = customized.map((shade, idx) =>
      idx === 1 ? { ...shade, isCustom: false } : shade
    );

    // Regenerate — should overwrite the now non-custom shade
    const regenerated = gen('#3b82f6', 3, reset);
    expect(regenerated[1].isCustom).toBe(false);
    // The hex should be regenerated (same as original since same input params)
    expect(regenerated[1].hex).toBe(originalHexAtIdx1);
  });

  test('isEnabled and isDefault survive regeneration', () => {
    const initial = gen('#3b82f6', 3);

    // User disables shade 0 and sets shade 2 as default
    const modified = initial.map((shade, idx) => {
      if (idx === 0) return { ...shade, isEnabled: false };
      if (idx === 2) return { ...shade, isDefault: true };
      return shade;
    });

    // Regenerate with new main color
    const regenerated = gen('#00ff00', 3, modified);

    expect(regenerated[0].isEnabled).toBe(false);
    expect(regenerated[2].isDefault).toBe(true);
  });
});

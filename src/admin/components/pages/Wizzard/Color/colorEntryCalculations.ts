/**
 * Color Entry Calculations
 * Pure functions for color entry operations
 * No React dependencies - just data transformations
 */

import tinycolor from "tinycolor2";
import { closest } from "color-2-name";
import generateShades from "./generateShades";
import { parseColorInput, getColorDisplayString } from "./colorModelsConvert";
import type { ColorEntry as ColorEntryType, ColorShade } from "@/types/wizzard";

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Parse hex color to HSL
 */
export function parseHexToHsl(hex: string): HSL {
  try {
    const hslString = tinycolor(hex)
      .toHslString()
      .split("(")[1]
      .split(")")[0]
      .split(",")
      .map((e) => e.trim().split("%")[0]);
    return {
      h: Math.round(parseFloat(hslString[0])),
      s: Math.round(parseFloat(hslString[1])),
      l: Math.round(parseFloat(hslString[2])),
    };
  } catch (error) {
    const tinyHsl = tinycolor(hex).toHsl();
    return {
      h: Math.round(tinyHsl.h),
      s: Math.round(tinyHsl.s * 100),
      l: Math.round(tinyHsl.l * 100),
    };
  }
}

/**
 * Round RGB color values
 */
export function roundRgbColor(color: RGB): RGB {
  return {
    r: Math.round(color.r || 0),
    g: Math.round(color.g || 0),
    b: Math.round(color.b || 0),
    a: Math.round((color.a || 1) * 100) / 100,
  };
}

/**
 * Generate shades for a color
 * Preserves custom (manually edited) shade hex values
 */
export function generateColorShades(
  hexColor: string,
  shadesCount: number,
  minLightness: number,
  maxLightness: number,
  existingShades: ColorShade[] = []
): ColorShade[] {
  const generatedFromAlgo = generateShades(hexColor, shadesCount, minLightness, maxLightness);

  const result = generatedFromAlgo.map(
    (generatedHex, idx) => {
      const existingShade = existingShades[idx] || {};

      // Only preserve shades that are explicitly marked as custom (manually edited)
      // Non-custom shades should regenerate when main color changes
      const shouldPreserveCustomHex = existingShade.isCustom === true;
      const finalHex = shouldPreserveCustomHex && existingShade.hex ? existingShade.hex : generatedHex;

      return {
        name: `${(idx + 1) * 100}`,
        hex: finalHex,
        isEnabled: existingShade.isEnabled !== undefined ? existingShade.isEnabled : true,
        isDefault: existingShade.isDefault !== undefined ? existingShade.isDefault : false,
        isCustom: existingShade.isCustom || false,
      };
    }
  );

  return result;
}

/**
 * Create updated entry with new shades
 */
export function createUpdatedEntry(
  entry: ColorEntryType,
  newShades: ColorShade[],
  options: {
    minLightness: number;
    maxLightness: number;
    isLocked: boolean;
    colorFormat: 'hex' | 'rgb' | 'hsl' | 'oklch';
    colorName?: string;
    hexColor?: string;
  }
): Partial<ColorEntryType> {
  const newOriginalGeneratedColors = newShades.map((shade) => shade.hex);

  return {
    ...entry,
    shades: newShades,
    originalGeneratedColors: newOriginalGeneratedColors,
    minLightness: options.minLightness,
    maxLightness: options.maxLightness,
    isLocked: options.isLocked,
    colorFormat: options.colorFormat,
    isMainColorChange: true,
    ...(options.colorName && { name: options.colorName }),
    ...(options.hexColor && { hex: options.hexColor }),
  };
}

/**
 * Get color name from hex using closest match
 */
export function getColorNameFromHex(hexColor: string): string {
  return closest(hexColor).name || "Unknown";
}

/**
 * Validate color input string
 */
export function isValidColorInput(value: string): boolean {
  const parsedColor = parseColorInput(value);
  return parsedColor !== null && parsedColor.isValid();
}

/**
 * Parse and validate color input
 * Returns RGB if valid, null otherwise
 */
export function parseAndValidateColor(value: string): RGB | null {
  // Try parsing with enhanced parser
  const parsedColor = parseColorInput(value);
  if (parsedColor && parsedColor.isValid()) {
    return parsedColor.toRgb();
  }

  // Try color name lookup as fallback
  const nameColor = closest(value).hex;
  if (nameColor) {
    const color = tinycolor(nameColor);
    if (color.isValid()) {
      return color.toRgb();
    }
  }

  return null;
}

/**
 * Get placeholder text for color format
 */
export function getPlaceholderText(format: 'hex' | 'rgb' | 'hsl' | 'oklch'): string {
  switch (format) {
    case 'hex':
      return '#527C9D';
    case 'rgb':
      return 'rgb(82 124 157)';
    case 'hsl':
      return 'hsl(206deg 31% 47%)';
    case 'oklch':
      return 'oklch(0.57 0.12 206)';
    default:
      return '#527C9D';
  }
}

/**
 * Determine color source label
 */
export function getColorSourceLabel(entry: ColorEntryType): string | null {
  if (entry.isUtility) return 'Utility';
  if (entry.isFSE) return 'FSE';
  if (entry.isBricks) return 'Bricks';
  if (entry.isOxygen) return 'Oxygen';
  return null;
}

/**
 * Check if color is a special utility (transparent, currentColor, inherit)
 */
export function isSpecialUtilityColor(entry: ColorEntryType): boolean {
  return (
    !!entry.utilityValue &&
    ['transparent', 'currentColor', 'inherit'].includes(entry.utilityValue)
  );
}

/**
 * Check if color is system-locked (utility, FSE, Bricks, Oxygen)
 */
export function isSystemLockedColor(entry: ColorEntryType): boolean {
  return entry.locked === true;
}

/**
 * Get special utility abbreviation for display
 */
export function getSpecialUtilityAbbreviation(utilityValue: string): string {
  switch (utilityValue) {
    case 'transparent':
      return 'TR';
    case 'currentColor':
      return 'CC';
    case 'inherit':
      return 'IN';
    default:
      return '';
  }
}

// Re-export utilities that are already pure functions
export { getColorDisplayString, parseColorInput } from "./colorModelsConvert";

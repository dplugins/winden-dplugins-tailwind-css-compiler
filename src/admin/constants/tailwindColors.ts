/**
 * Tailwind v4 Default Color Palettes
 *
 * Source: shared/tailwind-colors.json (single source of truth)
 * Colors are in OKLCH color space with HEX approximations
 */

import tailwindColorsData from '../../../shared/tailwind-colors.json';

// Transform JSON structure to match existing API (extract OKLCH values only)
export const tailwindDefaultColors: Record<string, Record<string, string>> = Object.entries(
  tailwindColorsData
).reduce((acc, [colorName, shades]) => {
  acc[colorName] = Object.entries(shades).reduce((shadeAcc, [shadeName, values]) => {
    shadeAcc[shadeName] = values.oklch;
    return shadeAcc;
  }, {} as Record<string, string>);
  return acc;
}, {} as Record<string, Record<string, string>>);

/**
 * Array of all Tailwind default color names
 * In Tailwind's official documentation order
 */
export const tailwindColorNames = [
  // Gray scale colors
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  // Warm colors
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  // Green colors
  'green',
  'emerald',
  'teal',
  'cyan',
  // Blue colors
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  // Pink colors
  'fuchsia',
  'pink',
  'rose',
  // New v4 colors
  'mauve',
  'mist',
  'olive',
  'taupe',
];

/**
 * Get human-readable color name (capitalize first letter)
 */
export const formatColorName = (name: string): string => {
  return name.charAt(0).toUpperCase() + name.slice(1);
};

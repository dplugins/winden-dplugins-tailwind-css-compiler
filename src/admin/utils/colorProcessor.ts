/**
 * Color Processing Utilities
 *
 * Utilities for processing color entries from Wizzard state into Tailwind config format.
 */

import type { WizzardState, ColorEntry } from '@/types/wizzard';
import { tailwindDefaultColors } from '@/constants/tailwindColors';

/**
 * Process color entries with shades and utility colors
 *
 * Converts Wizzard color entries into Tailwind color config format.
 * Handles:
 * - Individual colors
 * - Color palettes with shades (50-950)
 * - Per-color shade enable/disable
 * - Per-color reverse shades
 * - Utility colors (transparent, current, white, black, etc.)
 *
 * @param state - Current Wizzard state
 * @returns Color configuration object for Tailwind
 *
 * @example
 * ```typescript
 * const colors = processColors(wizzardState);
 * // Returns: { primary: { DEFAULT: '#3b82f6', 500: '#3b82f6', ... }, transparent: 'transparent', ... }
 * ```
 */
export function processColors(state: WizzardState | null): Record<string, any> {
  if (!state?.colorsActive) {
    return {};
  }

  const colorsConfig: Record<string, any> = {};
  const colorEntries = state.colorEntries ?? [];

  // Process each color entry
  colorEntries.forEach((color: ColorEntry) => {
    if (!color.name) {
      return;
    }

    // Check if this specific color has shades enabled
    const enableShades = color.enableShades !== undefined ? color.enableShades : true;
    const reverseShades = color.reverseShades !== undefined ? color.reverseShades : false;

    if (!enableShades) {
      // If shades are disabled for this color, only include the main color
      colorsConfig[color.name] = color.hex;
    } else if (color.shades && color.shades.length > 0) {
      // If shades are enabled for this color, include all enabled shades
      const shadeMap = new Map<string, string>();

      color.shades.forEach((shade) => {
        if (shade.isEnabled) {
          shadeMap.set(
            shade.isDefault ? "DEFAULT" : shade.name,
            shade.hex
          );
        }
      });

      // Convert to plain object
      const shadeEntries = Object.fromEntries(shadeMap);

      // Apply reverse shades if enabled for this color
      if (reverseShades) {
        const reversedShades: Record<string, string> = {};
        Object.entries(shadeEntries).reverse().forEach(([shadeName, shadeHex]) => {
          reversedShades[shadeName] = shadeHex;
        });
        colorsConfig[color.name] = reversedShades;
      } else {
        colorsConfig[color.name] = shadeEntries;
      }
    }
  });

  // Include utility colors directly in colorsConfig if the checkbox is checked
  if (state.includeUtilityColors) {
    Object.assign(colorsConfig, {
      transparent: "transparent",
      current: "currentColor",
      white: "#fff",
      black: "#000",
      auto: "auto",
      inherit: "inherit",
    });
  }

  // Include selected Tailwind default colors
  if (state.includeTailwindColors && state.includeTailwindColors.length > 0) {
    state.includeTailwindColors.forEach((colorName) => {
      if (tailwindDefaultColors[colorName]) {
        colorsConfig[colorName] = tailwindDefaultColors[colorName];
      }
    });
  }

  return colorsConfig;
}

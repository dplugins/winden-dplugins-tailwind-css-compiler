/**
 * Builder Extensions Utilities
 *
 * Utilities for extracting builder-specific design tokens from page builders
 * (FSE/Gutenberg, Bricks, Oxygen, Hero) and integrating them into Tailwind config.
 */

import type { WizzardState } from '@/types/wizzard';

// Import dynamic data from builders
import {
  dynamicColorsFSE,
  dynamicColorsBricks,
  dynamicColorsOxygen,
} from '@/dynamicData/colors';

import {
  dynamicSpacingFSE,
  dynamicSpacingBricks,
  dynamicSpacingOxygen,
} from '@/dynamicData/spacing';

import {
  dynamicFontSizeFSE,
  dynamicFontSizeBricks,
  dynamicFontSizeOxygen,
} from '@/dynamicData/fontSize';

import {
  dynamicFontFamilyFSE,
  dynamicFontFamilyBricks,
  dynamicFontFamilyOxygen,
  dynamicFontHero,
} from '@/dynamicData/fontFamily';

import {
  dynamicScreensFSE,
  dynamicScreensBricks,
  dynamicScreensOxygen,
} from '@/dynamicData/screens';

import {
  dynamicBorderRadiusFSE,
  dynamicBorderRadiusBricks,
  dynamicBorderRadiusOxygen,
} from '@/dynamicData/borderRadius';

/**
 * Builder extensions for all design token categories
 */
export interface BuilderExtensions {
  colors: Record<string, any>;
  fontSizes: Record<string, any>;
  spacing: Record<string, any>;
  fontFamily: Record<string, any>;
  screens: Record<string, any>;
  borderRadius: Record<string, any>;
}

/**
 * Get all builder extensions based on enabled flags
 *
 * Extracts design tokens from enabled page builders and returns them
 * in a format ready for Tailwind config generation.
 *
 * @param state - Current Wizzard state with builder extension flags
 * @returns Object with all builder extensions by category
 *
 * @example
 * ```typescript
 * const builders = getBuilderExtensions(wizzardState);
 * // Returns: { colors: {...}, fontSizes: {...}, spacing: {...}, ... }
 * ```
 */
export function getBuilderExtensions(state: WizzardState | null): BuilderExtensions {
  if (!state) {
    return {
      colors: {},
      fontSizes: {},
      spacing: {},
      fontFamily: {},
      screens: {},
      borderRadius: {},
    };
  }

  return {
    colors: getColorExtensions(state),
    fontSizes: getFontSizeExtensions(state),
    spacing: getSpacingExtensions(state),
    fontFamily: getFontFamilyExtensions(state),
    screens: getScreenExtensions(state),
    borderRadius: getBorderRadiusExtensions(state),
  };
}

/**
 * Get color extensions from enabled builders
 */
function getColorExtensions(state: WizzardState): Record<string, any> {
  let colors: Record<string, any> = {};

  if (state.extendColorsFSE) {
    colors = { ...colors, ...dynamicColorsFSE };
  }
  if (state.extendColorsBricks) {
    colors = { ...colors, ...dynamicColorsBricks };
  }
  if (state.extendColorsOxygen) {
    colors = { ...colors, ...dynamicColorsOxygen };
  }

  return colors;
}

/**
 * Get font size extensions from enabled builders
 */
function getFontSizeExtensions(state: WizzardState): Record<string, any> {
  let fontSizes: Record<string, any> = {};

  if (state.extendFontSizesFSE) {
    fontSizes = { ...fontSizes, ...dynamicFontSizeFSE };
  }
  if (state.extendFontSizesBricks) {
    fontSizes = { ...fontSizes, ...dynamicFontSizeBricks };
  }
  if (state.extendFontSizesOxygen) {
    fontSizes = { ...fontSizes, ...dynamicFontSizeOxygen };
  }

  return fontSizes;
}

/**
 * Get spacing extensions from enabled builders
 */
function getSpacingExtensions(state: WizzardState): Record<string, any> {
  let spacing: Record<string, any> = {};

  if (state.extendSpacingFSE) {
    spacing = { ...spacing, ...dynamicSpacingFSE };
  }
  if (state.extendSpacingBricks) {
    spacing = { ...spacing, ...dynamicSpacingBricks };
  }
  if (state.extendSpacingOxygen) {
    spacing = { ...spacing, ...dynamicSpacingOxygen };
  }

  return spacing;
}

/**
 * Get font family extensions from enabled builders
 */
function getFontFamilyExtensions(state: WizzardState): Record<string, any> {
  let fontFamily: Record<string, any> = {};

  if (state.extendFontFamilyFSE) {
    fontFamily = { ...fontFamily, ...dynamicFontFamilyFSE };
  }
  if (state.extendFontFamilyBricks) {
    fontFamily = { ...fontFamily, ...dynamicFontFamilyBricks };
  }
  if (state.extendFontFamilyOxygen) {
    fontFamily = { ...fontFamily, ...dynamicFontFamilyOxygen };
  }
  if (state.extendFontHero) {
    fontFamily = { ...fontFamily, ...dynamicFontHero };
  }

  return fontFamily;
}

/**
 * Get screen (breakpoint) extensions from enabled builders
 */
function getScreenExtensions(state: WizzardState): Record<string, any> {
  let screens: Record<string, any> = {};

  if (state.extendScreensFSE) {
    screens = { ...screens, ...dynamicScreensFSE };
  }
  if (state.extendScreensBricks) {
    screens = { ...screens, ...dynamicScreensBricks };
  }
  if (state.extendScreensOxygen) {
    screens = { ...screens, ...dynamicScreensOxygen };
  }

  return screens;
}

/**
 * Get border radius extensions from enabled builders
 */
function getBorderRadiusExtensions(state: WizzardState): Record<string, any> {
  let borderRadius: Record<string, any> = {};

  if (state.extendBorderRadiusFSE) {
    borderRadius = { ...borderRadius, ...dynamicBorderRadiusFSE };
  }
  if (state.extendBorderRadiusBricks) {
    borderRadius = { ...borderRadius, ...dynamicBorderRadiusBricks };
  }
  if (state.extendBorderRadiusOxygen) {
    borderRadius = { ...borderRadius, ...dynamicBorderRadiusOxygen };
  }

  return borderRadius;
}

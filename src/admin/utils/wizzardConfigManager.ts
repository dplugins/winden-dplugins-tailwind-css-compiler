/**
 * Wizzard Config Manager
 *
 * Central utility for generating Tailwind configuration from Wizzard state.
 * Consolidates config generation logic for better testing and maintainability.
 */

import type { WizzardState, ManualStepValue } from '@/types/wizzard';
import type { ClampsState } from './clampCalculations';
import { processColors } from './colorProcessor';
import { getBuilderExtensions } from './builderExtensions';
import generateTailwindConfig from '@pages/Wizzard/utils/configGenerator';

/**
 * Parameters for config generation
 */
export interface GenerateConfigParams {
  wizzardState: WizzardState | null;
  clampsFontSize: ClampsState;
  clampsSpacing: ClampsState;
  clampsBorderRadius: ClampsState;
}

/**
 * Convert manual values to clamps format for config generation
 *
 * In manual mode:
 * - Fixed: Use the single value directly
 * - Fluid: Generate clamp() using minValue, maxValue, and screen sizes
 */
function convertManualValuesToClamps(
  manualValues: { [key: string]: ManualStepValue },
  isFixed: boolean,
  minScreenSize: number = 320,
  maxScreenSize: number = 1920,
  useRem: boolean = false,
  remSize: number = 16,
  decimalPlaces: number = 2
): ClampsState {
  const result: ClampsState = {};
  const unit = useRem ? 'rem' : 'px';

  Object.entries(manualValues).forEach(([step, manualValue]) => {
    if (!manualValue.enabled) {
      result[step] = {
        enabled: false,
        value: '',
        fluidClamp: '',
        minBase: '',
        maxBase: '',
      };
      return;
    }

    if (isFixed) {
      // Fixed mode: use the single value directly (no clamp)
      let value = manualValue.value || '';

      // Ensure the value has a unit
      // If it's just a number, convert based on useRem setting
      if (value && !isNaN(parseFloat(value)) && !/[a-zA-Z%]/.test(value)) {
        const numValue = parseFloat(value);
        if (useRem) {
          value = `${(numValue / remSize).toFixed(decimalPlaces)}rem`;
        } else {
          value = `${numValue}px`;
        }
      }

      result[step] = {
        enabled: true,
        value: value,
        fluidClamp: '',
        minBase: value,
        maxBase: '',
      };
    } else {
      // Fluid mode: generate clamp() from minValue and maxValue
      const minValue = manualValue.minValue || '16';
      const maxValue = manualValue.maxValue || '16';

      // Parse numeric values (these are always in pixels from the UI)
      const minNum = parseFloat(minValue);
      const maxNum = parseFloat(maxValue);

      if (isNaN(minNum) || isNaN(maxNum)) {
        // If values aren't numeric, just use them as-is
        result[step] = {
          enabled: true,
          value: minValue,
          fluidClamp: '',
          minBase: minValue,
          maxBase: maxValue,
        };
        return;
      }

      // Calculate slope using pixel values (minNum/maxNum are in px)
      const slope = (maxNum - minNum) / (maxScreenSize - minScreenSize);
      const slopeVi = slope * 100;
      const intercept = minNum - slope * minScreenSize;

      // Convert to display units (rem or px) for output
      const minDisplay = useRem ? (minNum / remSize).toFixed(decimalPlaces) : minNum.toFixed(decimalPlaces);
      const maxDisplay = useRem ? (maxNum / remSize).toFixed(decimalPlaces) : maxNum.toFixed(decimalPlaces);
      const interceptDisplay = useRem ? (intercept / remSize).toFixed(decimalPlaces) : intercept.toFixed(decimalPlaces);

      // Generate clamp() CSS with correct format: clamp(min, slope + intercept, max)
      const clampValue = `clamp(${minDisplay}${unit}, ${slopeVi.toFixed(2)}vi + ${interceptDisplay}${unit}, ${maxDisplay}${unit})`;

      result[step] = {
        enabled: true,
        value: clampValue,
        fluidClamp: clampValue,
        minBase: `${minNum}px`,
        maxBase: `${maxNum}px`,
      };
    }
  });

  return result;
}

/**
 * Generate Tailwind @theme configuration from Wizzard state
 *
 * This is a pure function that takes Wizzard state and clamp calculations
 * and produces a Tailwind configuration string with @theme directive.
 *
 * @param params - Config generation parameters
 * @returns CSS string with @theme directive
 *
 * @example
 * ```typescript
 * const config = generateWizzardConfig({
 *   wizzardState: localWizzardState,
 *   clampsFontSize: fontSize.clamps,
 *   clampsSpacing: spacing.clamps,
 *   clampsBorderRadius: borderRadius.clamps,
 * });
 * // Returns: "@theme { --color-primary: #3b82f6; ... }"
 * ```
 */
export function generateWizzardConfig(params: GenerateConfigParams): string {
  const { wizzardState, clampsFontSize, clampsSpacing, clampsBorderRadius } = params;

  if (!wizzardState) {
    return '';
  }

  // Process colors with shades and utility colors
  const colorsConfig = processColors(wizzardState);

  // Get builder extensions for all design token categories
  const builders = getBuilderExtensions(wizzardState);

  // Build font sizes config
  // In manual mode, use manualValues instead of calculated clamps
  const fontSizesConfig = wizzardState.fontSizesActive
    ? (wizzardState.fontSize?.manualMode
        ? convertManualValuesToClamps(
            wizzardState.fontSize.manualValues || {},
            wizzardState.fontSize.disableFluid ?? false,
            wizzardState.fontSize.minScreenSize ?? 320,
            wizzardState.fontSize.maxScreenSize ?? 1920,
            wizzardState.fontSize.useRem ?? false,
            wizzardState.fontSize.remSize ?? 16,
            wizzardState.fontSize.decimalPlaces ?? 2
          )
        : clampsFontSize)
    : {};

  // Build spacing config
  // In manual mode, use manualValues instead of calculated clamps
  const spacingConfig = wizzardState.spacesActive
    ? (wizzardState.spacing?.manualMode
        ? convertManualValuesToClamps(
            wizzardState.spacing.manualValues || {},
            wizzardState.spacing.disableFluid ?? false,
            wizzardState.spacing.minScreenSize ?? 320,
            wizzardState.spacing.maxScreenSize ?? 1920,
            wizzardState.spacing.useRem ?? false,
            wizzardState.spacing.remSize ?? 16,
            wizzardState.spacing.decimalPlaces ?? 2
          )
        : clampsSpacing)
    : {};

  // Build border radius config
  // In manual mode, use manualValues instead of calculated clamps
  const borderRadiusConfig = wizzardState.borderRadiusActive
    ? (wizzardState.borderRadius?.manualMode
        ? convertManualValuesToClamps(
            wizzardState.borderRadius.manualValues || {},
            wizzardState.borderRadius.disableFluid ?? false,
            wizzardState.borderRadius.minScreenSize ?? 320,
            wizzardState.borderRadius.maxScreenSize ?? 1920,
            wizzardState.borderRadius.useRem ?? false,
            wizzardState.borderRadius.remSize ?? 16,
            wizzardState.borderRadius.decimalPlaces ?? 2
          )
        : clampsBorderRadius)
    : {};

  // Generate final config using the existing configGenerator
  const config = generateTailwindConfig({
    // Breakpoints
    breakpoints: wizzardState.breakpointsActive ? wizzardState.breakpoints : [],
    extendBreakpoints: wizzardState.extendBreakpoints ?? false,

    // Font Family
    fontFamilies: wizzardState.fontFamilyActive ? wizzardState.fontFamily : [],
    extendFontFamily: wizzardState.extendFontFamily ?? false,

    // Colors
    colors: colorsConfig,
    extendColors: wizzardState.extendColors ?? false,

    // Spacing
    spacing: spacingConfig,
    extendSpacing: wizzardState.spacing?.extend ?? false,

    // Font Sizes
    fontSizes: fontSizesConfig,
    extendFontSizes: wizzardState.fontSize?.extend ?? false,

    // Border Radius
    borderRadius: borderRadiusConfig,
    extendBorderRadius: wizzardState.borderRadius?.extend ?? false,

    // Feature activation flags
    colorsActive: wizzardState.colorsActive,
    fontSizesActive: wizzardState.fontSizesActive,
    fontFamilyActive: wizzardState.fontFamilyActive,
    spacesActive: wizzardState.spacesActive,
    breakpointsActive: wizzardState.breakpointsActive,
    borderRadiusActive: wizzardState.borderRadiusActive,

    // Builder extensions
    colorsBuilders: builders.colors,
    fontSizesBuilders: builders.fontSizes,
    spacingBuilders: builders.spacing,
    fontFamilyBuilders: builders.fontFamily,
    screensBuilders: builders.screens,
    borderRadiusBuilders: builders.borderRadius,

    // Other settings
    localWizzardState: wizzardState,
    reverseShades: wizzardState.reverseShades ?? false,
  });

  return config;
}

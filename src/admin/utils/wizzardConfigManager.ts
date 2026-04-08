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
 * Recalculate clamps for a state category (fontSize, spacing, borderRadius)
 * This is needed when generating config on-demand without the Wizzard component mounted
 *
 * @param category - The state category (fontSize, spacing, borderRadius)
 * @param wizzardState - Current Wizzard state
 * @returns Clamps for the category
 */
function recalculateClamps(
  category: 'fontSize' | 'spacing' | 'borderRadius',
  wizzardState: WizzardState | null
): ClampsState {
  if (!wizzardState || !wizzardState[category]) {
    return {};
  }

  const state = wizzardState[category];
  if (!state) {
    return {};
  }

  // If manual mode, convert manual values to clamps
  if (state.manualMode) {
    return convertManualValuesToClamps(
      state.manualValues || {},
      state.disableFluid ?? false,
      state.minScreenSize ?? 320,
      state.maxScreenSize ?? 1920,
      state.useRem ?? false,
      state.remSize ?? 16,
      state.decimalPlaces ?? 2
    );
  }

  // Otherwise, calculate clamps from scale settings
  // This is a simplified version of useClampCalculator logic
  const result: ClampsState = {};
  const steps = state.steps || [];

  steps.forEach((step) => {
    // Use step values if available, otherwise calculate
    const minValue = state.minBaseSize || 16;
    const maxValue = state.maxBaseSize || 19;

    if (state.disableFluid) {
      result[step] = {
        enabled: true,
        value: `${minValue}px`,
        fluidClamp: '',
        minBase: `${minValue}px`,
        maxBase: '',
      };
    } else {
      // Generate basic clamp (simplified calculation)
      const slope = (maxValue - minValue) / ((state.maxScreenSize || 1200) - (state.minScreenSize || 320));
      const slopeVi = slope * 100;
      const intercept = minValue - slope * (state.minScreenSize || 320);

      const clampValue = `clamp(${minValue}px, ${slopeVi.toFixed(2)}vi + ${intercept.toFixed(2)}px, ${maxValue}px)`;

      result[step] = {
        enabled: true,
        value: clampValue,
        fluidClamp: clampValue,
        minBase: `${minValue}px`,
        maxBase: `${maxValue}px`,
      };
    }
  });

  return result;
}

/**
 * Generate Tailwind @theme configuration from Wizzard state with on-demand clamp calculation
 *
 * This function can be called without the Wizzard component being mounted.
 * It will recalculate clamps from the state if they're not provided.
 *
 * @param wizzardState - Current Wizzard state
 * @param providedClamps - Optional pre-calculated clamps (if available from mounted Wizzard)
 * @returns CSS string with @theme directive
 *
 * @example
 * ```typescript
 * // With pre-calculated clamps (when Wizzard is mounted)
 * const config = generateWizzardConfigWithClamps(localWizzardState, {
 *   clampsFontSize: fontSize.clamps,
 *   clampsSpacing: spacing.clamps,
 *   clampsBorderRadius: borderRadius.clamps,
 * });
 *
 * // Without clamps (when Wizzard is not mounted) - will recalculate
 * const config = generateWizzardConfigWithClamps(localWizzardState);
 * ```
 */
export function generateWizzardConfigWithClamps(
  wizzardState: WizzardState | null,
  providedClamps?: {
    clampsFontSize?: ClampsState;
    clampsSpacing?: ClampsState;
    clampsBorderRadius?: ClampsState;
  }
): string {
  if (!wizzardState) {
    return '';
  }

  // Use provided clamps if available, otherwise recalculate
  const clampsFontSize = providedClamps?.clampsFontSize || recalculateClamps('fontSize', wizzardState);
  const clampsSpacing = providedClamps?.clampsSpacing || recalculateClamps('spacing', wizzardState);
  const clampsBorderRadius = providedClamps?.clampsBorderRadius || recalculateClamps('borderRadius', wizzardState);

  return generateWizzardConfig({
    wizzardState,
    clampsFontSize,
    clampsSpacing,
    clampsBorderRadius,
  });
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

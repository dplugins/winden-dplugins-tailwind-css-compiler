/**
 * Clamp Calculation Utilities
 *
 * Utilities for calculating fluid typography and spacing clamp values
 * used by fontSize, spacing, and borderRadius features in Wizzard.
 */

/**
 * Calculate fluid typography/spacing clamp value
 *
 * Generates a CSS clamp() function for fluid scaling between min and max screen sizes.
 *
 * @param minBase - Minimum base size value
 * @param maxBase - Maximum base size value
 * @param minScreen - Minimum screen width
 * @param maxScreen - Maximum screen width
 * @param useRem - Whether to use rem units (true) or px (false)
 * @param remSize - Base rem size (typically 16)
 * @param decimalPlaces - Number of decimal places for precision
 * @returns CSS clamp() string
 *
 * @example
 * ```typescript
 * const clamp = calculateClampValue(16, 24, 320, 1920, true, 16, 2);
 * // Returns: "clamp(1.00rem, 0.79rem + 1.05vi, 1.50rem)"
 * ```
 */
export function calculateClampValue(
  minBase: number,
  maxBase: number,
  minScreen: number,
  maxScreen: number,
  useRem: boolean,
  remSize: number,
  decimalPlaces: number
): string {
  const unit = useRem ? 'rem' : 'px';

  // All calculations done in PIXELS first (minBase/maxBase are in px)
  const slope = (maxBase - minBase) / (maxScreen - minScreen);  // px/px = unitless ratio
  const slopeVi = slope * 100;  // Convert to percentage for vi unit
  const intercept = minBase - slope * minScreen;  // Intercept in pixels

  // Convert to display units (rem or px) only for output
  const minSize = useRem ? minBase / remSize : minBase;
  const maxSize = useRem ? maxBase / remSize : maxBase;
  const interceptDisplay = useRem ? intercept / remSize : intercept;

  // Format: clamp(min, slopeVi + intercept, max)
  // Note: fluid-type-scale.com uses format "slopeVi + intercept" not "intercept + slopeVi"
  const min = minSize.toFixed(decimalPlaces) + unit;
  const max = maxSize.toFixed(decimalPlaces) + unit;
  const preferred = `${slopeVi.toFixed(2)}vi + ${interceptDisplay.toFixed(decimalPlaces)}${unit}`;

  return `clamp(${min}, ${preferred}, ${max})`;
}

/**
 * Clamp state for a single step
 */
export interface ClampState {
  enabled: boolean;
  value: string;
  fluidClamp: string;
  minBase: string;
  maxBase: string;
}

/**
 * Collection of clamp states keyed by step name
 */
export interface ClampsState {
  [step: string]: ClampState;
}

/**
 * Feature configuration for clamp calculations
 */
export interface FeatureConfig {
  steps: string[];
  baseStep?: string;
  minBaseSize: number;
  maxBaseSize: number;
  minScaleRatio: number;
  maxScaleRatio: number;
  minScreenSize: number;
  maxScreenSize: number;
  useRem: boolean;
  remSize: number;
  decimalPlaces: number;
  disableFluid?: boolean;
  overrides?: ClampsState;
}

/**
 * Calculate clamps for all steps in a feature
 *
 * @param config - Feature configuration
 * @returns Object with clamp values for each step
 *
 * @example
 * ```typescript
 * const clamps = calculateClampsForFeature({
 *   steps: ['xs', 'sm', 'base', 'lg', 'xl'],
 *   baseStep: 'base',
 *   minBaseSize: 16,
 *   maxBaseSize: 20,
 *   minScaleRatio: 1.2,
 *   maxScaleRatio: 1.25,
 *   minScreenSize: 320,
 *   maxScreenSize: 1920,
 *   useRem: true,
 *   remSize: 16,
 *   decimalPlaces: 2
 * });
 * ```
 */
export function calculateClampsForFeature(config: FeatureConfig): ClampsState {
  const { steps, baseStep = 'base', minBaseSize, maxBaseSize, minScaleRatio, maxScaleRatio } = config;
  const { minScreenSize, maxScreenSize, useRem, remSize, decimalPlaces, disableFluid = false } = config;

  // Calculate the base step index
  const baseIndex = steps.indexOf(baseStep);
  const baseStepIndex = baseIndex >= 0 ? baseIndex : Math.floor(steps.length / 2);

  return steps.reduce((acc: ClampsState, step: string, index: number) => {
    // Calculate min and max base values for each step
    const stepDifference = index - baseStepIndex;
    const minBase = minBaseSize * Math.pow(minScaleRatio, stepDifference);
    const maxBase = maxBaseSize * Math.pow(maxScaleRatio, stepDifference);

    let finalValue: string;
    let fluidClamp: string;

    if (disableFluid) {
      // Fixed mode: use only the minBase value with proper unit
      const size = useRem ? minBase / remSize : minBase;
      const unit = useRem ? 'rem' : 'px';
      finalValue = `${size.toFixed(decimalPlaces)}${unit}`;
      fluidClamp = '';
    } else {
      // Fluid mode: calculate clamp value
      const clampValue = calculateClampValue(
        minBase,
        maxBase,
        minScreenSize,
        maxScreenSize,
        useRem,
        remSize,
        decimalPlaces
      );
      finalValue = clampValue;
      fluidClamp = clampValue;
    }

    acc[step] = {
      enabled: true,
      value: finalValue,
      fluidClamp: fluidClamp,
      minBase: minBase.toFixed(decimalPlaces || 2),
      maxBase: maxBase.toFixed(decimalPlaces || 2),
    };

    return acc;
  }, {});
}

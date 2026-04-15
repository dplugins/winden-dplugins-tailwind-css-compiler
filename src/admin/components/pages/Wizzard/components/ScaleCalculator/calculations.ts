/**
 * Scale Calculations
 * Pure functions for all scale-related calculations
 * No React dependencies - just math and data transformations
 */

import type { ClampOverride, ClampInfo, MinMaxValue, ScaleState } from "./types";
import { calculateClampValue } from "@/utils/clampCalculations";

/**
 * Round number to specified decimal places
 */
export function roundNumber(number: number, decimalPlaces: number = 2): string {
  const factor = Math.pow(10, decimalPlaces);
  const rounded = Math.round(number * factor) / factor;
  return Number.isInteger(rounded)
    ? rounded.toFixed(0)
    : rounded.toFixed(decimalPlaces);
}

/**
 * Calculate base size for a step using modular scale
 * @param baseSize - Base size in pixels
 * @param ratio - Scale ratio (e.g., 1.25 for Major Third)
 * @param stepIndex - Index of the current step
 * @param baseIndex - Index of the base step (where ratio = 1)
 */
export function calculateBaseSize(
  baseSize: number,
  ratio: number,
  stepIndex: number,
  baseIndex: number
): number {
  const stepDifference = stepIndex - baseIndex;
  return baseSize * Math.pow(ratio, stepDifference);
}

/**
 * Calculate fluid clamp CSS function
 * @param minSize - Minimum size in pixels
 * @param maxSize - Maximum size in pixels
 * @param minScreen - Minimum screen size in pixels
 * @param maxScreen - Maximum screen size in pixels
 * @param useRem - Whether to output in rem units
 * @param remSize - Base rem size (default 16)
 * @param decimalPlaces - Decimal places for rounding
 */
export function calculateFluidClamp(
  minSize: number,
  maxSize: number,
  minScreen: number,
  maxScreen: number,
  useRem: boolean = false,
  remSize: number = 16,
  decimalPlaces: number = 2
): string {
  return calculateClampValue(minSize, maxSize, minScreen, maxScreen, useRem, remSize, decimalPlaces);
}

/**
 * Calculate fixed value (non-fluid)
 */
export function calculateFixedValue(
  value: number,
  useRem: boolean = false,
  remSize: number = 16,
  decimalPlaces: number = 2
): string {
  if (useRem) {
    return `${roundNumber(value / remSize, decimalPlaces)}rem`;
  }
  return `${roundNumber(value, decimalPlaces)}px`;
}

/**
 * Append unit to a value for display
 */
export function appendUnit(value: string | number | undefined | null): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "string" && /[a-zA-Z%]/.test(value)) {
    return value;
  }
  return `${value}px`;
}

/**
 * Parse steps string into array
 */
export function parseSteps(input: string): string[] {
  const trimmed = input.replace(/,\s*$/, "");
  return trimmed.split(",").map((step) => step.trim()).filter(Boolean);
}

/**
 * Initialize clamp overrides for new steps
 */
export function initializeClampOverrides(
  steps: string[],
  existingOverrides: Record<string, ClampOverride> = {}
): Record<string, ClampOverride> {
  const overrides: Record<string, ClampOverride> = {};

  steps.forEach((step) => {
    overrides[step] = {
      enabled: existingOverrides?.[step]?.enabled ?? true,
      value: existingOverrides?.[step]?.value || "",
      fluidClamp: existingOverrides?.[step]?.fluidClamp || "",
      minBase: existingOverrides?.[step]?.minBase || "",
      maxBase: existingOverrides?.[step]?.maxBase || "",
    };
  });

  return overrides;
}

/**
 * Calculate all clamps for all steps
 * This is the main calculation function that produces all values
 */
export function calculateAllClamps(
  state: ScaleState,
  clampOverrides: Record<string, ClampOverride>
): {
  clamps: Record<string, ClampInfo>;
  stepValues: string[];
  minMaxValues: MinMaxValue[];
} {
  const clamps: Record<string, ClampInfo> = {};
  const steps = state?.steps || [];
  const foundIndex = steps.indexOf(state?.baseStep || "");
  const baseIndex = foundIndex >= 0 ? foundIndex : Math.floor(steps.length / 2);
  const decimalPlaces = state?.decimalPlaces ?? 2;

  steps.forEach((step, index) => {
    // Calculate the default min base value
    const calculatedMinBase = roundNumber(
      calculateBaseSize(
        state?.minBaseSize || 16,
        state?.minScaleRatio || 1,
        index,
        baseIndex
      ),
      decimalPlaces
    );

    // Check if user has customized min value
    const hasCustomMin = clampOverrides?.[step]?.minBase &&
                        clampOverrides[step].minBase !== "" &&
                        clampOverrides[step].minBase !== calculatedMinBase;

    const minBase = hasCustomMin ? clampOverrides[step].minBase : calculatedMinBase;

    let maxBase: string = "";
    let defaultClamp: string = "";
    let fluidClamp: string = "";
    let hasCustomMax = false;

    if (!state?.disableFluid) {
      // Fluid mode: calculate max and clamp
      const calculatedMaxBase = roundNumber(
        calculateBaseSize(
          state?.maxBaseSize || 16,
          state?.maxScaleRatio || 1,
          index,
          baseIndex
        ),
        decimalPlaces
      );

      hasCustomMax = clampOverrides?.[step]?.maxBase &&
                    clampOverrides[step].maxBase !== "" &&
                    clampOverrides[step].maxBase !== calculatedMaxBase;

      maxBase = hasCustomMax ? clampOverrides[step].maxBase : calculatedMaxBase;

      // Generate clamp from min/max values
      defaultClamp = calculateFluidClamp(
        parseFloat(minBase),
        parseFloat(maxBase),
        state?.minScreenSize || 320,
        state?.maxScreenSize || 1920,
        state?.useRem,
        state?.remSize || 16,
        decimalPlaces
      );

      // If min/max are customized, use recalculated clamp
      // Otherwise use custom value override if provided
      if (hasCustomMin || hasCustomMax) {
        fluidClamp = defaultClamp;
      } else {
        fluidClamp = clampOverrides?.[step]?.value || defaultClamp;
      }
    } else {
      // Fixed mode: just use min value
      defaultClamp = calculateFixedValue(
        parseFloat(minBase),
        state?.useRem,
        state?.remSize || 16,
        decimalPlaces
      );
      fluidClamp = defaultClamp;
    }

    clamps[step] = {
      enabled: clampOverrides?.[step]?.enabled ?? true,
      value: (hasCustomMin || hasCustomMax) ? defaultClamp : (clampOverrides?.[step]?.value || defaultClamp),
      fluidClamp: fluidClamp,
      minBase: minBase,
      maxBase: maxBase,
      hasCustomMin: hasCustomMin,
      hasCustomMax: hasCustomMax,
    };
  });

  // Extract step values and min/max for parent state
  const stepValues = Object.keys(clamps).map((key) => clamps[key]?.fluidClamp);
  const minMaxValues: MinMaxValue[] = Object.keys(clamps).map((key) => ({
    min: clamps[key]?.minBase ? `${clamps[key]?.minBase}px` : null,
    max: clamps[key]?.maxBase ? `${clamps[key]?.maxBase}px` : null,
  }));

  return { clamps, stepValues, minMaxValues };
}

/**
 * Update a single clamp override field
 */
export function updateClampOverride(
  overrides: Record<string, ClampOverride>,
  step: string,
  field: keyof ClampOverride,
  value: string | boolean
): Record<string, ClampOverride> {
  return {
    ...overrides,
    [step]: {
      ...overrides?.[step],
      [field]: value,
    },
  };
}

/**
 * Clear a clamp override field (reset to empty)
 */
export function clearClampOverrideField(
  overrides: Record<string, ClampOverride>,
  step: string,
  field: keyof ClampOverride
): Record<string, ClampOverride> {
  return {
    ...overrides,
    [step]: {
      ...overrides?.[step],
      [field]: "",
    },
  };
}

/**
 * Get display values for a step (for previews)
 */
export function getStepDisplayValues(
  step: string,
  state: ScaleState,
  clamps: Record<string, ClampInfo>
): { minValue: string | null; maxValue: string | null } {
  if (state?.manualMode) {
    return {
      minValue: appendUnit(state?.manualValues?.[step]?.minValue || state?.manualValues?.[step]?.value),
      maxValue: appendUnit(state?.manualValues?.[step]?.maxValue),
    };
  }

  return {
    minValue: appendUnit(clamps[step]?.minBase),
    maxValue: appendUnit(clamps[step]?.maxBase),
  };
}

/**
 * Scale Calculator Constants
 * All constants for scale calculations in one place
 */

import type { ScaleState } from "./types";

/**
 * Predefined scale ratio options for typography and spacing calculations
 * Includes common ratios from 1 to 4, plus "Custom" option
 */
export const SCALE_OPTIONS: (number | string)[] = [
  1,
  1.067,
  1.125,
  1.2,
  1.25,
  1.333,
  1.414,
  1.5,
  1.618,
  1.667,
  1.778,
  1.875,
  2,
  2.5,
  3,
  3.5,
  4,
  "Custom",
];

/**
 * Common scale ratios with descriptive names
 * Used for documentation and UI labels
 */
export const SCALE_RATIOS = [
  { value: 1.067, label: "Minor Second (1.067)" },
  { value: 1.125, label: "Major Second (1.125)" },
  { value: 1.2, label: "Minor Third (1.2)" },
  { value: 1.25, label: "Major Third (1.25)" },
  { value: 1.333, label: "Perfect Fourth (1.333)" },
  { value: 1.414, label: "Augmented Fourth (1.414)" },
  { value: 1.5, label: "Perfect Fifth (1.5)" },
  { value: 1.618, label: "Golden Ratio (1.618)" },
] as const;

/**
 * Default step names for scales
 */
export const DEFAULT_STEPS = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"] as const;

/**
 * Default scale step names as comma-separated string
 * Used for input field default values
 */
export const DEFAULT_SCALE_NAMES = "xs, sm, base, md, lg, giga, mega";

/**
 * Default scale state values
 */
export const DEFAULT_SCALE_STATE: Partial<ScaleState> = {
  steps: [...DEFAULT_STEPS],
  baseStep: "base",
  minBaseSize: 16,
  maxBaseSize: 20,
  minScaleRatio: 1.2,
  maxScaleRatio: 1.25,
  minScreenSize: 320,
  maxScreenSize: 1920,
  useRem: true,
  remSize: 16,
  decimalPlaces: 2,
  disableFluid: false,
  extend: false,
  manualMode: false,
};

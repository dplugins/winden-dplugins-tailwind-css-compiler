/**
 * Scale Calculator Constants
 * Component-local constants for scale calculations.
 */

import { DEFAULT_WINDEN_STEPS, DEFAULT_WINDEN_STEPS_STRING } from "@/const/wizzard";

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
 * Default Winden step names — re-exported from central constants for convenience.
 * @see src/admin/const/wizzard.ts
 */
export { DEFAULT_WINDEN_STEPS, DEFAULT_WINDEN_STEPS_STRING };

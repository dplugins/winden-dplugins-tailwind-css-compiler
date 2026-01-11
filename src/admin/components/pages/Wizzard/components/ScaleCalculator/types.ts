/**
 * Type definitions for Scale Calculator components
 */

export interface ClampOverride {
  enabled: boolean;
  value: string;
  fluidClamp: string;
  minBase: string;
  maxBase: string;
}

export interface ClampInfo extends ClampOverride {
  hasCustomMin?: boolean;
  hasCustomMax?: boolean;
}

export interface MinMaxValue {
  min: string | null;
  max: string | null;
}

export interface ManualValue {
  enabled?: boolean;
  value?: string;
  minValue?: string;
  maxValue?: string;
}

export interface ScaleState {
  steps?: string[];
  overrides?: Record<string, ClampOverride>;
  disableFluid?: boolean;
  useRem?: boolean;
  remSize?: number;
  minBaseSize?: number;
  minScaleRatio?: number;
  minScreenSize?: number;
  maxBaseSize?: number;
  maxScaleRatio?: number;
  maxScreenSize?: number;
  baseStep?: string;
  decimalPlaces?: number;
  extend?: boolean;
  manualMode?: boolean;
  manualValues?: Record<string, ManualValue>;
  stepValues?: string[];
  minMaxValues?: MinMaxValue[];
}

/**
 * Valid value types for scale state updates
 */
export type ScaleStateValue =
  | string
  | string[]
  | number
  | boolean
  | Record<string, ClampOverride>
  | Record<string, ManualValue>
  | MinMaxValue[]
  | undefined;

export interface StateUpdate {
  key: string;
  value: ScaleStateValue;
}

export interface ScaleCalculatorProps {
  label: string;
  font?: boolean;
  spacing?: boolean;
  borderRadius?: boolean;
  state: ScaleState;
  updateState: (key: string, value: ScaleStateValue) => void;
  updateStates: (updates: StateUpdate[]) => void;
  clampOverrides: Record<string, ClampOverride>;
  setClampOverrides: (overrides: Record<string, ClampOverride> | ((prev: Record<string, ClampOverride>) => Record<string, ClampOverride>)) => void;
  clamps: Record<string, ClampInfo>;
  setClamps: (clamps: Record<string, ClampInfo> | ((prev: Record<string, ClampInfo>) => Record<string, ClampInfo>)) => void;
}

// Re-export WizzardState type for convenience
export type { WizzardState } from "@/types/wizzard";

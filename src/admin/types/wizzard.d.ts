// Breakpoints
interface BreakpointEntry {
  name: string;
  value: number;
}

// Font Family
interface FontFamilyEntry {
  name: string;
  value: string[];
}

// Colors
interface ColorShade {
  name: string;
  hex: string;
  isEnabled: boolean;
  isDefault: boolean;
  isCustom?: boolean;
}

interface ShadeCurvePoint {
  t: number;
  value: number;
}

interface ShadeCurveHandles {
  startValue: number;
  leftHandle1: ShadeCurvePoint;
  leftHandle2: ShadeCurvePoint;
  rightHandle1: ShadeCurvePoint;
  rightHandle2: ShadeCurvePoint;
  endValue: number;
}

interface ColorEntry {
  id: number;
  name: string;
  hex: string;
  colorFormat: 'hex' | 'rgb' | 'hsl' | 'oklch';
  shades: ColorShade[];
  baseIndex?: number;
  lightnessCurve?: ShadeCurveHandles;
  saturationCurve?: ShadeCurveHandles;
  hueCurve?: ShadeCurveHandles;
  isLocked?: boolean;
  enableShades?: boolean;
  reverseShades?: boolean;
  originalGeneratedColors?: string[];
  isMainColorChange?: boolean;
  // Builder/utility source flags (set at runtime for display colors)
  utilityValue?: string;
  locked?: boolean;
  isUtility?: boolean;
  isTailwind?: boolean;
  isFSE?: boolean;
  isBricks?: boolean;
  isOxygen?: boolean;
}

// Scale State (for spacing, fontSize, borderRadius)
interface StepOverride {
  enabled: boolean;
  value: string;
  fluidClamp: string;
  minBase: string;
  maxBase: string;
}

interface ManualStepValue {
  enabled: boolean;
  value?: string;      // For fixed mode (single value)
  minValue?: string;   // For fluid mode
  maxValue?: string;   // For fluid mode
}

interface SpaceAndFontSizeState {
  extend: boolean;
  disableFluid: boolean;
  useRem: boolean;
  remSize: number;
  minBaseSize: number;
  minScaleRatio: number;
  minScreenSize: number;
  maxBaseSize: number;
  maxScaleRatio: number;
  maxScreenSize: number;
  steps: string[];
  stepValues: number[];
  minMaxValues: [number, number][];
  baseStep: string;
  decimalPlaces: number;
  overrides: {
    [key: string]: StepOverride;
  };
  manualMode?: boolean;  // false = Wizard, true = Manual
  manualValues?: {
    [key: string]: ManualStepValue;
  };
}

// Main Wizzard State
interface WizzardState {
  // General
  activeTab?: number;
  configCode: string;
  stateName?: string;

  // Breakpoints
  breakpoints: BreakpointEntry[];
  breakpointsActive: boolean;
  extendBreakpoints: boolean;
  desktopFirst: boolean;
  extendScreensFSE?: boolean;
  extendScreensBricks?: boolean;
  extendScreensOxygen?: boolean;

  // Font Family
  fontFamily: FontFamilyEntry[];
  fontFamilyActive: boolean;
  extendFontFamily: boolean;
  extendFontFamilyFSE?: boolean;
  extendFontFamilyBricks?: boolean;
  extendFontFamilyOxygen?: boolean;
  extendFontHero?: boolean;

  // Colors
  colorEntries: ColorEntry[];
  colorsActive: boolean;
  extendColors: boolean;
  includeUtilityColors: boolean;
  includeTailwindColors?: string[]; // Array of selected Tailwind color names (e.g., ['emerald', 'blue'])
  extendColorsFSE?: boolean;
  extendColorsBricks?: boolean;
  extendColorsOxygen?: boolean;

  // Font Sizes
  fontSize: SpaceAndFontSizeState;
  fontSizesActive: boolean;
  extendFontSizesFSE?: boolean;
  extendFontSizesBricks?: boolean;
  extendFontSizesOxygen?: boolean;

  // Spacing
  spacing: SpaceAndFontSizeState;
  spacesActive: boolean;
  extendSpacingFSE?: boolean;
  extendSpacingBricks?: boolean;
  extendSpacingOxygen?: boolean;

  // Border Radius
  borderRadius: SpaceAndFontSizeState;
  borderRadiusActive: boolean;
  extendBorderRadius: boolean;
}

// Context Type
type WizzardContextType = {
  localWizzardState: WizzardState;
  setLocalWizzardState: (state: WizzardState | ((prev: WizzardState) => WizzardState)) => void;
};

// API Response Types
interface WizzardContentResponse {
  success: boolean;
  data: {
    javascript: string; // base64 encoded
    scss: string; // base64 encoded
    wizzard: WizzardState | null;
  };
}

interface WizzardStateResponse {
  success: boolean;
  data: WizzardState | null;
}

// Export all types
export type {
  BreakpointEntry,
  FontFamilyEntry,
  ColorShade,
  ShadeCurvePoint,
  ShadeCurveHandles,
  ColorEntry,
  StepOverride,
  ManualStepValue,
  SpaceAndFontSizeState,
  WizzardState,
  WizzardContextType,
  WizzardContentResponse,
  WizzardStateResponse,
};

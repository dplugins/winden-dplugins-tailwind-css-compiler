import { createContext, useState, ReactNode, Dispatch, SetStateAction } from "react";
import type { WizzardState, WizzardContextType } from "@/types/wizzard";

export const WizzardContext = createContext<WizzardContextType | null>(null);

export const defaultWizzardState: WizzardState = {
  // General settings
  activeTab: 5,
  configCode: "",
  stateName: "",

  // Breakpoints configuration
  breakpointsActive: false,
  breakpoints: [],
  extendBreakpoints: true,
  extendScreensFSE: false,
  extendScreensBricks: false,
  extendScreensOxygen: false,
  desktopFirst: false,

  // Font family configuration
  fontFamilyActive: false,
  fontFamily: [],
  extendFontFamily: true,
  extendFontFamilyFSE: false,
  extendFontFamilyBricks: false,
  extendFontFamilyOxygen: false,
  extendFontHero: false,

  // Colors configuration
  colorsActive: false,
  colorEntries: [],
  extendColors: true,
  includeUtilityColors: false,
  includeTailwindColors: [],
  extendColorsFSE: false,
  extendColorsBricks: false,
  extendColorsOxygen: false,

  // Spacing configuration
  spacesActive: false,
  spacing: {
    extend: true,
    disableFluid: false,
    useRem: false,
    remSize: 16,
    minBaseSize: 16,
    minScaleRatio: 1.2,
    minScreenSize: 320,
    maxBaseSize: 19,
    maxScaleRatio: 1.5,
    maxScreenSize: 1200,
    steps: ["xs", "sm", "base", "md", "lg", "giga", "mega"],
    stepValues: [],
    minMaxValues: [],
    baseStep: "base",
    decimalPlaces: 2,
    overrides: {},
    manualMode: false,
    manualValues: {},
  },
  extendSpacingFSE: false,
  extendSpacingBricks: false,
  extendSpacingOxygen: false,

  // Font size configuration
  fontSizesActive: false,
  fontSize: {
    extend: true,
    disableFluid: false,
    useRem: false,
    remSize: 16,
    minBaseSize: 16,
    minScaleRatio: 1.2,
    minScreenSize: 320,
    maxBaseSize: 19,
    maxScaleRatio: 1.5,
    maxScreenSize: 1200,
    steps: ["xs", "sm", "base", "md", "lg", "giga", "mega"],
    stepValues: [],
    minMaxValues: [],
    baseStep: "base",
    decimalPlaces: 2,
    overrides: {},
    manualMode: false,
    manualValues: {},
  },
  extendFontSizesFSE: false,
  extendFontSizesBricks: false,
  extendFontSizesOxygen: false,

  // Border radius configuration
  borderRadiusActive: false,
  borderRadius: {
    extend: true,
    disableFluid: false,
    useRem: false,
    remSize: 16,
    minBaseSize: 16,
    minScaleRatio: 1.2,
    minScreenSize: 320,
    maxBaseSize: 19,
    maxScaleRatio: 1.5,
    maxScreenSize: 1200,
    steps: ["xs", "sm", "base", "md", "lg", "giga", "mega"],
    stepValues: [],
    minMaxValues: [],
    baseStep: "base",
    decimalPlaces: 2,
    overrides: {},
    manualMode: false,
    manualValues: {},
  },
  extendBorderRadiusFSE: false,
  extendBorderRadiusBricks: false,
  extendBorderRadiusOxygen: false,
};

const WizzardProvider = ({ children }: { children: ReactNode }) => {
  const [localWizzardState, setLocalWizzardState] = useState<WizzardState>({
    ...defaultWizzardState,
  });

  return (
    <WizzardContext.Provider
      value={{ localWizzardState, setLocalWizzardState }}
    >
      {children}
    </WizzardContext.Provider>
  );
};

export default WizzardProvider;

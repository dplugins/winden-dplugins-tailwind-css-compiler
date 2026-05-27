import type { ColorEntry } from "@/types/wizzard";
import { generateColorShades } from "./colorEntryCalculations";
import { createDefaultCurveHandles, getShadeBaseIndexForColor } from "./shadeCurves";

/**
 * Generate a unique ID for color entries
 * Combines timestamp with random number to prevent duplicates
 */
let idCounter = 0;
function generateUniqueId(): number {
  idCounter++;
  return Date.now() * 1000 + idCounter + Math.floor(Math.random() * 1000);
}

/**
 * Color preset factory function type
 */
type ColorPresetFunction = (
  colorEntries: ColorEntry[],
  setColorEntries: (entries: ColorEntry[]) => void
) => void;

function buildPresetEntry(name: string, hex: string, isLocked: boolean): ColorEntry {
  const baseIndex = getShadeBaseIndexForColor(hex, 11);
  const lightnessCurve = createDefaultCurveHandles(11, baseIndex);
  const saturationCurve = createDefaultCurveHandles(11, baseIndex);
  const hueCurve = createDefaultCurveHandles(11, baseIndex);
  return {
    id: generateUniqueId(),
    name,
    hex,
    colorFormat: "hex",
    baseIndex,
    lightnessCurve,
    saturationCurve,
    hueCurve,
    shades: generateColorShades(hex, 11, baseIndex, lightnessCurve, saturationCurve, hueCurve),
    isLocked,
    enableShades: true,
    reverseShades: false,
  };
}

/**
 * Predefined color palettes
 */
export const colorPresets: Record<string, ColorPresetFunction> = {
  tahiti: createColorPreset("Primary", "#06b6d4", true),
  grey: createColorPreset("Neutrals", "#696969", true),
  orange: createColorPreset("Secondary", "#FFA500", true),
  /**
   * Load all preset colors at once (Neutrals, Primary, Secondary)
   */
  all: (colorEntries: ColorEntry[], setColorEntries: (entries: ColorEntry[]) => void) => {
    setColorEntries([
      ...colorEntries,
      buildPresetEntry("Neutrals", "#696969", true),
      buildPresetEntry("Primary", "#06b6d4", true),
      buildPresetEntry("Secondary", "#FFA500", true),
    ]);
  },
};

/**
 * Creates a color preset function that adds a new color entry
 */
function createColorPreset(
  name: string,
  hex: string,
  isLocked: boolean = false
): ColorPresetFunction {
  return (colorEntries: ColorEntry[], setColorEntries: (entries: ColorEntry[]) => void) => {
    setColorEntries([...colorEntries, buildPresetEntry(name, hex, isLocked)]);
  };
}

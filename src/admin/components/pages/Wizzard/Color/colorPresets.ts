import type { ColorEntry } from "@/types/wizzard";

/**
 * Color preset factory function type
 */
type ColorPresetFunction = (
  colorEntries: ColorEntry[],
  setColorEntries: (entries: ColorEntry[]) => void
) => void;

/**
 * Predefined color palettes
 */
export const colorPresets: Record<string, ColorPresetFunction> = {
  tahiti: createColorPreset("Primary", "#06b6d4", [
    "#e6fbfe",
    "#b5f2fd",
    "#83eafb",
    "#51e2fa",
    "#20d9f9",
    "#06c0df",
    "#0595ae",
    "#046a7c",
    "#02404a",
    "#011519",
  ], true),
  grey: createColorPreset("Neutrals", "#696969", [
    "#f2f2f2",
    "#d9d9d9",
    "#bfbfbf",
    "#a6a6a6",
    "#8c8c8c",
    "#737373",
    "#595959",
    "#404040",
    "#262626",
    "#0d0d0d",
  ], true),
  orange: createColorPreset("Secondary", "#FFA500", [
    "#fff6e5",
    "#ffe4b3",
    "#ffd280",
    "#ffc04d",
    "#ffae1a",
    "#e69500",
    "#b37300",
    "#805300",
    "#4d3200",
    "#1a1100",
  ], true),
  /**
   * Load all preset colors at once (Neutrals, Primary, Secondary)
   */
  all: (colorEntries: ColorEntry[], setColorEntries: (entries: ColorEntry[]) => void) => {
    setColorEntries([
      ...colorEntries,
      // Neutrals
      {
        id: Date.now(),
        name: "Neutrals",
        hex: "#696969",
        minLightness: 5,
        maxLightness: 95,
        colorFormat: "hex",
        shades: [
          "#f2f2f2",
          "#d9d9d9",
          "#bfbfbf",
          "#a6a6a6",
          "#8c8c8c",
          "#737373",
          "#595959",
          "#404040",
          "#262626",
          "#0d0d0d",
        ].map((hex, index) => ({
          name: `${(index + 1) * 100}`,
          hex: hex,
          isEnabled: true,
          isDefault: false,
        })),
        isLocked: true,
        enableShades: true,
        reverseShades: false,
      },
      // Primary
      {
        id: Date.now() + 1,
        name: "Primary",
        hex: "#06b6d4",
        minLightness: 5,
        maxLightness: 95,
        colorFormat: "hex",
        shades: [
          "#e6fbfe",
          "#b5f2fd",
          "#83eafb",
          "#51e2fa",
          "#20d9f9",
          "#06c0df",
          "#0595ae",
          "#046a7c",
          "#02404a",
          "#011519",
        ].map((hex, index) => ({
          name: `${(index + 1) * 100}`,
          hex: hex,
          isEnabled: true,
          isDefault: false,
        })),
        isLocked: true,
        enableShades: true,
        reverseShades: false,
      },
      // Secondary
      {
        id: Date.now() + 2,
        name: "Secondary",
        hex: "#FFA500",
        minLightness: 5,
        maxLightness: 95,
        colorFormat: "hex",
        shades: [
          "#fff6e5",
          "#ffe4b3",
          "#ffd280",
          "#ffc04d",
          "#ffae1a",
          "#e69500",
          "#b37300",
          "#805300",
          "#4d3200",
          "#1a1100",
        ].map((hex, index) => ({
          name: `${(index + 1) * 100}`,
          hex: hex,
          isEnabled: true,
          isDefault: false,
        })),
        isLocked: true,
        enableShades: true,
        reverseShades: false,
      },
    ]);
  },
};

/**
 * Creates a color preset function that adds a new color entry with predefined shades
 * @param name - Display name for the color
 * @param hex - Main hex color value
 * @param shadesHex - Array of hex values for color shades
 * @param isLocked - Whether the color name should be locked (default: false)
 * @returns Function that adds the color preset to color entries
 */
function createColorPreset(
  name: string,
  hex: string,
  shadesHex: string[],
  isLocked: boolean = false
): ColorPresetFunction {
  return (colorEntries: ColorEntry[], setColorEntries: (entries: ColorEntry[]) => void) => {
    setColorEntries([
      ...colorEntries,
      {
        id: Date.now(),
        name: name,
        hex: hex,
        minLightness: 5,
        maxLightness: 95,
        colorFormat: "hex",
        shades: shadesHex.map((hex, index) => ({
          name: `${(index + 1) * 100}`,
          hex: hex,
          isEnabled: true,
          isDefault: false,
        })),
        isLocked: isLocked,
        enableShades: true,
        reverseShades: false,
      },
    ]);
  };
}

import type { WizzardState } from "@/types/wizzard";

interface FontFamily {
  name: string;
  value: string;
}

interface Breakpoint {
  name: string;
  value: number;
}

interface EnabledValue {
  enabled: boolean;
  value: string;
}

interface ConfigOptions {
  breakpoints?: Breakpoint[];
  extendBreakpoints?: boolean;
  fontFamilies?: FontFamily[];
  extendFontFamily?: boolean;
  colors?: Record<string, string | Record<string, string>>;
  extendColors?: boolean;
  spacing?: Record<string, EnabledValue>;
  extendSpacing?: boolean;
  fontSizes?: Record<string, EnabledValue>;
  extendFontSizes?: boolean;
  borderRadius?: Record<string, EnabledValue>;
  extendBorderRadius?: boolean;
  colorsActive?: boolean;
  fontSizesActive?: boolean;
  fontFamilyActive?: boolean;
  spacesActive?: boolean;
  breakpointsActive?: boolean;
  borderRadiusActive?: boolean;
  colorsBuilders?: Record<string, string>;
  fontSizesBuilders?: Record<string, string>;
  spacingBuilders?: Record<string, string>;
  fontFamilyBuilders?: Record<string, string>;
  screensBuilders?: Record<string, string>;
  borderRadiusBuilders?: Record<string, string>;
  localWizzardState?: WizzardState;
  reverseShades?: boolean;
}

/**
 * Generates Tailwind CSS v4 configuration in @theme format
 * @param options - Configuration options from the wizard state
 * @returns CSS string with @theme configuration
 */
const generateTailwindConfig = ({
  breakpoints = [],
  extendBreakpoints = true,
  fontFamilies = [],
  extendFontFamily = true,
  colors = {},
  extendColors = true,
  spacing = {},
  extendSpacing = true,
  fontSizes = {},
  extendFontSizes = true,
  borderRadius = {},
  extendBorderRadius = true,
  // Off unless asked for, and extending unless told otherwise — the same way
  // `defaultWizzardState` reads. These were the other way round, so a caller
  // that left them out asked for every Tailwind default to be replaced by
  // nothing.
  colorsActive = false,
  fontSizesActive = false,
  fontFamilyActive = false,
  spacesActive = false,
  breakpointsActive = false,
  borderRadiusActive = false,
  colorsBuilders = {},
  fontSizesBuilders = {},
  spacingBuilders = {},
  fontFamilyBuilders = {},
  screensBuilders = {},
  borderRadiusBuilders = {},
  localWizzardState,
  reverseShades = false,
}: ConfigOptions): string => {
  // Utility spaces for spacing
  const utilitySpaces: Record<string, string> = {
    "0": "0",
    "px": "1px",
    "auto": "auto",
    "full": "100%",
    "screen": "100vh",
    "svw": "100svw",
    "lvw": "100lvw",
    "dvw": "100dvw",
    "min": "min-content",
    "max": "max-content",
    "fit": "fit-content"
  };

  /**
   * Escape CSS identifiers safely
   * CSS custom properties allow almost any character, so we just normalize
   */
  const escapeCssIdentifier = (value: string, fallback: string = "value"): string => {
    if (!value) return fallback;
    const normalized = String(value).trim().toLowerCase()
      .replace(/#/g, "")           // Remove hash symbols
      .replace(/\s+/g, "-")        // Replace spaces with hyphens
      .replace(/^-+|-+$/g, "");    // Remove leading/trailing hyphens
    return normalized || fallback;
  };

  /**
   * Process colors with optional reverse shades
   */
  const processColors = (
    colors: Record<string, string | Record<string, string>>,
    reverseShades: boolean
  ): Record<string, string | Record<string, string>> => {
    const result: Record<string, string | Record<string, string>> = {};
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === "object" && reverseShades) {
        const entries = Object.entries(value);
        result[key] = Object.fromEntries(entries.reverse());
      } else {
        result[key] = value;
      }
    });
    return result;
  };

  /**
   * Filter enabled items and extract values (used in v4 config generation)
   */
  const getEnabledValues = (obj: Record<string, EnabledValue>): Record<string, string> =>
    Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v.enabled)
        .map(([k, v]) => [k, v.value])
    );

  // ============================================================
  // Tailwind v4 Config Generation (CSS @theme format only)
  // ============================================================

  // Check if any tab is active
  const hasActiveTab = colorsActive || fontSizesActive || fontFamilyActive || spacesActive || borderRadiusActive || breakpointsActive;

  // If no tabs are active, return minimal @theme block
  // This is important because an empty @theme {} is better than falling back to @config directive
  // which might load JavaScript-format configs that cause compilation errors
  if (!hasActiveTab) {
    return '@theme {\n\n}';
  }

  let tw4Config = `@theme {\n`;
  const sections: string[] = [];

  /**
   * Add CSS variable to a section
   */
  const createSection = (vars: string[]): string => {
    return vars.filter(v => v).join('\n');
  };

  /**
   * A wildcard reset with nothing to put back is only destruction.
   *
   * `--color-*: initial` tells Tailwind to forget its palette, which is what
   * "replace rather than extend" means — but replacing it with nothing leaves
   * a theme with no colours at all. Measured on a site in exactly that state:
   * the Style Guide showed no colours, no font families and no font sizes,
   * `bg-red-500` compiled to nothing, and `p-4` produced no padding, because
   * `--spacing-*: initial` had removed the scale those utilities are built
   * from. Font weights were the only survivors, `--font-weight-*` being a
   * namespace of its own.
   *
   * So a section that is nothing but its reset is dropped and the defaults
   * stay. Someone who genuinely wants an empty namespace can still write the
   * wildcard in the Style tab, where it reads as the deliberate act it is.
   */
  const withoutEmptyReset = (vars: string[]): string[] => {
    const values = vars.filter((line) => line.trim() && !line.includes('-*: initial;'));
    return values.length > 0 ? vars : [];
  };

  // Colors
  if (colorsActive) {
    const colorVars: string[] = [];

    // Reset all default colors when not extending (Tailwind v4 wildcard syntax)
    if (!extendColors) {
      colorVars.push(`    --color-*: initial;`);
    }

    const processedColors = processColors(colors, reverseShades);
    Object.entries(processedColors).forEach(([key, value]) => {
      const normalizedKey = escapeCssIdentifier(key, "color");

      if (typeof value === "string") {
        colorVars.push(`    --color-${normalizedKey}: ${String(value).toLowerCase()};`);
      } else if (typeof value === "object") {
        Object.entries(value).forEach(([shade, color]) => {
          if (shade === "DEFAULT") {
            colorVars.push(`    --color-${normalizedKey}: ${String(color).toLowerCase()};`);
          } else {
            colorVars.push(`    --color-${normalizedKey}-${escapeCssIdentifier(shade, "shade")}: ${String(color).toLowerCase()};`);
          }
        });
      }
    });

    Object.entries(colorsBuilders).forEach(([key, value]) => {
      colorVars.push(`    --color-${escapeCssIdentifier(key, "color")}: ${String(value).toLowerCase()};`);
    });

    if (colorVars.length > 0) {
      sections.push(createSection(withoutEmptyReset(colorVars)));
    }
  }

  // Font Sizes
  if (fontSizesActive) {
    const fontSizeVars: string[] = [];

    // Reset all default font sizes when not extending (Tailwind v4 wildcard syntax)
    if (!extendFontSizes) {
      fontSizeVars.push(`    --text-*: initial;`);
    }

    // Use steps array order if available, otherwise fall back to Object.entries
    const fontSizeSteps = localWizzardState?.fontSize?.steps || [];
    if (fontSizeSteps.length > 0) {
      fontSizeSteps.forEach((step: string) => {
        const obj = fontSizes[step];
        if (obj?.value) {
          fontSizeVars.push(`    --text-${escapeCssIdentifier(step, "text")}: ${String(obj.value).toLowerCase()};`);
        }
      });
    } else {
      Object.entries(fontSizes).forEach(([key, obj]) => {
        if (obj?.value) {
          fontSizeVars.push(`    --text-${escapeCssIdentifier(key, "text")}: ${String(obj.value).toLowerCase()};`);
        }
      });
    }

    Object.entries(fontSizesBuilders).forEach(([key, value]) => {
      fontSizeVars.push(`    --text-${escapeCssIdentifier(key, "text")}: ${String(value).toLowerCase()};`);
    });

    if (fontSizeVars.length > 0) {
      sections.push(createSection(withoutEmptyReset(fontSizeVars)));
    }
  }

  // Font Families
  if (fontFamilyActive) {
    const fontFamilyVars: string[] = [];

    // Reset all default font families when not extending (Tailwind v4 wildcard syntax)
    if (!extendFontFamily) {
      fontFamilyVars.push(`    --font-*: initial;`);
    }

    fontFamilies.forEach(({ name, value }) => {
      fontFamilyVars.push(`    --font-${escapeCssIdentifier(name, "font")}: ${String(value).toLowerCase()};`);
    });

    Object.entries(fontFamilyBuilders).forEach(([key, value]) => {
      fontFamilyVars.push(`    --font-${escapeCssIdentifier(key, "font")}: ${String(value).toLowerCase()};`);
    });

    if (fontFamilyVars.length > 0) {
      sections.push(createSection(withoutEmptyReset(fontFamilyVars)));
    }
  }

  // Spacing
  if (spacesActive) {
    const spacingVars: string[] = [];

    // Reset all default spacing when not extending (Tailwind v4 wildcard syntax)
    if (!extendSpacing) {
      spacingVars.push(`    --spacing-*: initial;`);
    }

    if (localWizzardState?.includeUtilitySizes) {
      Object.entries(utilitySpaces).forEach(([key, value]) => {
        spacingVars.push(`    --spacing-${escapeCssIdentifier(key, "spacing")}: ${String(value).toLowerCase()};`);
      });
    }

    // Use steps array order if available, otherwise fall back to Object.entries
    const spacingSteps = localWizzardState?.spacing?.steps || [];
    if (spacingSteps.length > 0) {
      spacingSteps.forEach((step: string) => {
        const obj = spacing[step];
        if (obj?.value) {
          spacingVars.push(`    --spacing-${escapeCssIdentifier(step, "spacing")}: ${String(obj.value).toLowerCase()};`);
        }
      });
    } else {
      Object.entries(spacing).forEach(([key, obj]) => {
        if (obj?.value) {
          spacingVars.push(`    --spacing-${escapeCssIdentifier(key, "spacing")}: ${String(obj.value).toLowerCase()};`);
        }
      });
    }

    Object.entries(spacingBuilders).forEach(([key, value]) => {
      spacingVars.push(`    --spacing-${escapeCssIdentifier(key, "spacing")}: ${String(value).toLowerCase()};`);
    });

    if (spacingVars.length > 0) {
      sections.push(createSection(withoutEmptyReset(spacingVars)));
    }
  }

  // Border Radius
  if (borderRadiusActive) {
    const radiusVars: string[] = [];

    // Reset all default border radius when not extending (Tailwind v4 wildcard syntax)
    if (!extendBorderRadius) {
      radiusVars.push(`    --radius-*: initial;`);
    }

    // Add utility border radius values when enabled
    if (localWizzardState?.includeUtilitySizes) {
      radiusVars.push(`    --radius-full: calc(infinity * 1px);`);
      radiusVars.push(`    --radius-none: 0;`);
    }

    // Use steps array order if available, otherwise fall back to Object.entries
    const borderRadiusSteps = localWizzardState?.borderRadius?.steps || [];
    if (borderRadiusSteps.length > 0) {
      borderRadiusSteps.forEach((step: string) => {
        const obj = borderRadius[step];
        if (obj?.enabled && obj?.value) {
          radiusVars.push(`    --radius-${escapeCssIdentifier(step, "radius")}: ${String(obj.value).toLowerCase()};`);
        }
      });
    } else {
      Object.entries(borderRadius).forEach(([key, obj]) => {
        if (obj?.enabled && obj?.value) {
          radiusVars.push(`    --radius-${escapeCssIdentifier(key, "radius")}: ${String(obj.value).toLowerCase()};`);
        }
      });
    }

    Object.entries(borderRadiusBuilders).forEach(([key, value]) => {
      radiusVars.push(`    --radius-${escapeCssIdentifier(key, "radius")}: ${String(value).toLowerCase()};`);
    });

    if (radiusVars.length > 0) {
      sections.push(createSection(withoutEmptyReset(radiusVars)));
    }
  }

  // Breakpoints
  if (breakpointsActive) {
    const breakpointVars: string[] = [];

    // Reset all default breakpoints when not extending (Tailwind v4 wildcard syntax)
    if (!extendBreakpoints) {
      breakpointVars.push(`    --breakpoint-*: initial;`);
    }

    breakpoints.forEach(({ name, value }) => {
      breakpointVars.push(`    --breakpoint-${escapeCssIdentifier(name, "breakpoint")}: ${value}px;`);
    });

    Object.entries(screensBuilders).forEach(([key, value]) => {
      breakpointVars.push(`    --breakpoint-${escapeCssIdentifier(key, "breakpoint")}: ${String(value).toLowerCase()};`);
    });

    if (breakpointVars.length > 0) {
      sections.push(createSection(withoutEmptyReset(breakpointVars)));
    }
  }

  // Join all sections with a blank line between each
  tw4Config += '\n' + sections.join('\n\n') + '\n\n}';
  return tw4Config;
};

export default generateTailwindConfig;

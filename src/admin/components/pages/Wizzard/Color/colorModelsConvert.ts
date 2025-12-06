import { hexToRgba, rgbaToHsva, hsvaToRgba } from '@uiw/color-convert';
import tinycolor from "tinycolor2";

interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface OKLCH {
  L: number;
  C: number;
  H: number;
}

interface OKLAB {
  L: number;
  a: number;
  b: number;
}

/**
 * Helper function to round numbers to specified decimal places
 */
const roundToDecimal = (num: number, decimals: number = 2): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Round HSL values to integers
 */
const roundHslValues = (hsl: HSL): HSL => {
  return {
    h: Math.round(hsl.h),
    s: Math.round(hsl.s),
    l: Math.round(hsl.l),
  };
};

/**
 * Enhanced color parser that supports multiple formats
 * @param input - Color string in various formats (hex, rgb, hsl, oklch)
 * @returns Normalized tinycolor instance or null if invalid
 */
export const parseColorInput = (input: string): tinycolor.Instance | null => {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmedInput = input.trim();

  // Try direct tinycolor parsing first (handles most common formats)
  let color = tinycolor(trimmedInput);
  if (color.isValid()) {
    return normalizeColor(color);
  }

  // Handle 6-character hex without #
  if (/^[0-9A-Fa-f]{6}$/.test(trimmedInput)) {
    color = tinycolor(`#${trimmedInput}`);
    if (color.isValid()) {
      return normalizeColor(color);
    }
  }

  // Enhanced RGB parsing - handle space-separated values
  const rgbSpaceMatch = trimmedInput.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\)$/i);
  if (rgbSpaceMatch) {
    const [, r, g, b] = rgbSpaceMatch;
    color = tinycolor(`rgb(${r}, ${g}, ${b})`);
    if (color.isValid()) {
      return normalizeColor(color);
    }
  }

  // Enhanced HSL parsing - handle deg units and space separation
  const hslMatch = trimmedInput.match(/^hsl\(\s*([0-9.]+)(?:deg)?\s*[\s,]\s*([0-9.]+)%?\s*[\s,]\s*([0-9.]+)%?\s*\)$/i);
  if (hslMatch) {
    const [, h, s, l] = hslMatch;
    // Convert percentages to fractions for tinycolor (S and L should be 0-1, not 0-100)
    color = tinycolor({ h: parseFloat(h), s: parseFloat(s) / 100, l: parseFloat(l) / 100 });
    if (color.isValid()) {
      return normalizeColor(color);
    }
  }

  // OKLCH parsing (convert to RGB)
  const oklchMatch = trimmedInput.match(/^oklch\(\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*\)$/i);
  if (oklchMatch) {
    const L = parseFloat(oklchMatch[1]);
    const C = parseFloat(oklchMatch[2]);
    const H = parseFloat(oklchMatch[3]);

    try {
      // Validate OKLCH values are in reasonable ranges
      if (L < 0 || L > 1 || C < 0 || H < 0 || H >= 360) {
        console.warn('OKLCH values out of range:', { L, C, H });
        return null;
      }

      const rgb = oklchToRgb(L, C, H);
      // Validate RGB output
      if (!rgb || rgb.r < 0 || rgb.r > 255 || rgb.g < 0 || rgb.g > 255 || rgb.b < 0 || rgb.b > 255) {
        console.warn('Invalid RGB output from OKLCH:', rgb);
        return null;
      }

      color = tinycolor(rgb);
      if (color.isValid()) {
        return normalizeColor(color);
      }
    } catch (error) {
      console.warn('Failed to parse OKLCH color:', error);
    }
  }

  return null;
};

/**
 * Helper function to normalize color values and prevent long decimals
 */
const normalizeColor = (tinyColor: tinycolor.Instance): tinycolor.Instance => {
  const rgb = tinyColor.toRgb();
  const normalized = tinycolor({
    r: Math.round(rgb.r),
    g: Math.round(rgb.g),
    b: Math.round(rgb.b),
    a: roundToDecimal(rgb.a, 2)
  });
  return normalized;
};

/**
 * Convert OKLCH to RGB
 */
const oklchToRgb = (L: number, C: number, H: number): RGB => {
  // Convert OKLCH to OKLAB
  const hRad = H * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // Convert OKLAB to RGB
  return oklabToRgb(L, a, b);
};

/**
 * Convert OKLAB to RGB
 * Based on the OKLAB specification
 */
const oklabToRgb = (L: number, a: number, b: number): RGB => {
  // Convert OKLAB to linear RGB
  const l = L + 0.3963377774 * a + 0.2158037573 * b;
  const m = L - 0.1055613458 * a - 0.0638541728 * b;
  const s = L - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;

  const lr = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Convert linear RGB to sRGB
  const linearToSrgb = (c: number): number => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    }
    return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(linearToSrgb(lr) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(linearToSrgb(lg) * 255)));
  const b_rgb = Math.max(0, Math.min(255, Math.round(linearToSrgb(lb) * 255)));

  return { r, g, b: b_rgb };
};

/**
 * Get display string for current color in specified format
 */
export const getColorDisplayString = (color: string, format: string): string => {
  const tinyColor = tinycolor(color);

  switch (format.toLowerCase()) {
    case 'hex':
      return tinyColor.toHexString();
    case 'rgb':
      const rgb = tinyColor.toRgb();
      return `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)})`;
    case 'hsl':
      const hsl = tinyColor.toHsl();
      return `hsl(${Math.round(hsl.h)}deg ${Math.round(hsl.s * 100)}% ${Math.round(hsl.l * 100)}%)`;
    case 'oklch':
      return rgbToOklch(tinyColor.toRgb());
    default:
      return tinyColor.toHexString();
  }
};

/**
 * Convert RGB to OKLCH for display
 */
const rgbToOklch = (rgb: RGB): string => {
  // First convert RGB to OKLAB
  const oklab = rgbToOklab(rgb);

  // Then convert OKLAB to OKLCH
  const C = Math.sqrt(oklab.a * oklab.a + oklab.b * oklab.b);
  let H = Math.atan2(oklab.b, oklab.a) * 180 / Math.PI;
  if (H < 0) H += 360;

  return `oklch(${roundToDecimal(oklab.L, 2)} ${roundToDecimal(C, 2)} ${roundToDecimal(H, 1)})`;
};

/**
 * Convert RGB to OKLAB for display
 */
const rgbToOklab = (rgb: RGB): OKLAB => {
  // Convert sRGB to linear RGB
  const srgbToLinear = (c: number): number => {
    c = c / 255;
    if (c <= 0.04045) {
      return c / 12.92;
    }
    return Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const lr = srgbToLinear(rgb.r);
  const lg = srgbToLinear(rgb.g);
  const lb = srgbToLinear(rgb.b);

  // Convert linear RGB to OKLAB
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_cbrt = Math.sign(l) * Math.pow(Math.abs(l), 1/3);
  const m_cbrt = Math.sign(m) * Math.pow(Math.abs(m), 1/3);
  const s_cbrt = Math.sign(s) * Math.pow(Math.abs(s), 1/3);

  const L = 0.2104542553 * l_cbrt + 0.7936177850 * m_cbrt - 0.0040720468 * s_cbrt;
  const a = 1.9779984951 * l_cbrt - 2.4285922050 * m_cbrt + 0.4505937099 * s_cbrt;
  const b = 0.0259040371 * l_cbrt + 0.7827717662 * m_cbrt - 0.8086757660 * s_cbrt;

  return { L, a, b };
};

/**
 * Handle color mode change from hex input
 */
export const colorModeChange = (
  newColor: string | { hex?: string; color?: string },
  setColor: (color: RGB) => void,
  setHsl: (hsl: HSL) => void
): void => {
  let hex: string;
  if (typeof newColor === 'string') {
    hex = newColor;
  } else if (newColor && newColor.hex) {
    hex = newColor.hex;
  } else if (newColor && (newColor as any).color) {
    hex = (newColor as any).color;
  } else {
    throw new Error('Invalid color format');
  }

  const rgba = hexToRgba(hex);
  setColor(rgba);
  const hsva = rgbaToHsva(rgba);
  setHsl(roundHslValues({
    h: roundToDecimal(hsva.h, 0),
    s: roundToDecimal(hsva.s, 0),
    l: roundToDecimal(hsva.v, 0),
  }));
};

/**
 * Handle color mode change from RGB input
 */
export const colorModeChangeRGB = (
  newColor: RGB,
  setColor: (color: RGB) => void,
  setHsl: (hsl: HSL) => void
): void => {
  setColor(newColor);
  const hsva = rgbaToHsva(newColor);
  setHsl(roundHslValues({
    h: roundToDecimal(hsva.h, 0),
    s: roundToDecimal(hsva.s, 0),
    l: roundToDecimal(hsva.v, 0),
  }));
};

/**
 * Handle HSL change and update color
 */
export const handleHslChange = (
  newHsl: HSL,
  setHsl: (hsl: HSL) => void,
  setColor: (color: RGB) => void
): void => {
  const roundedHsl = {
    h: roundToDecimal(newHsl.h, 0),
    s: roundToDecimal(newHsl.s, 0),
    l: roundToDecimal(newHsl.l, 0),
  };
  setHsl(roundedHsl);
  const rgba = hsvaToRgba({
    h: roundedHsl.h,
    s: roundedHsl.s,
    v: roundedHsl.l,
    a: 1,
  });
  setColor({
    r: Math.round(rgba.r),
    g: Math.round(rgba.g),
    b: Math.round(rgba.b),
    a: roundToDecimal(rgba.a, 2),
  });
};

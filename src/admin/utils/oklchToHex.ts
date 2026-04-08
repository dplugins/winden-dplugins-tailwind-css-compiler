/**
 * Convert OKLCH color string to HEX
 *
 * OKLCH format: oklch(L% C H)
 * - L (Lightness): 0-100%
 * - C (Chroma): 0-0.4
 * - H (Hue): 0-360 degrees
 *
 * @param oklch - OKLCH string like "oklch(76.9% 0.188 70.08)"
 * @returns HEX color string like "#fbbf24"
 */
export function oklchToHex(oklch: string): string {
  // Parse OKLCH string
  const match = oklch.match(/oklch\(([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\)/);

  if (!match) {
    console.warn('[oklchToHex] Invalid OKLCH format:', oklch);
    return '#000000';
  }

  const L = parseFloat(match[1]) / 100; // Convert to 0-1 range
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);

  // Convert OKLCH to RGB
  // First convert to OKLab
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);

  // OKLab to Linear RGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b_val = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Apply gamma correction (sRGB)
  const toSRGB = (val: number): number => {
    if (val <= 0.0031308) {
      return 12.92 * val;
    }
    return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
  };

  r = toSRGB(r);
  g = toSRGB(g);
  b_val = toSRGB(b_val);

  // Clamp to 0-255 range
  const clamp = (val: number): number => Math.max(0, Math.min(255, Math.round(val * 255)));

  const rInt = clamp(r);
  const gInt = clamp(g);
  const bInt = clamp(b_val);

  // Convert to hex
  const toHex = (val: number): string => val.toString(16).padStart(2, '0');

  return `#${toHex(rInt)}${toHex(gInt)}${toHex(bInt)}`;
}

/**
 * Convert Tailwind color object (OKLCH values) to HEX values
 *
 * @param tailwindColor - Object with shade keys and OKLCH values
 * @returns Object with same keys but HEX values
 */
export function convertTailwindColorToHex(tailwindColor: Record<string, string>): Record<string, string> {
  const hexColors: Record<string, string> = {};

  for (const [shade, oklch] of Object.entries(tailwindColor)) {
    hexColors[shade] = oklchToHex(oklch);
  }

  return hexColors;
}

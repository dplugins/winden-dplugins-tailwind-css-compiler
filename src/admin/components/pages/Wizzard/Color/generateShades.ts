import tinycolor from "tinycolor2";

/**
 * Generates color shades between min and max lightness values
 * @param color - Base color (hex, rgb, hsl, etc.)
 * @param steps - Number of shades to generate
 * @param minLightness - Minimum lightness value (0-100)
 * @param maxLightness - Maximum lightness value (0-100)
 * @returns Array of hex color strings representing the shades
 */
const generateShades = (
  color: string,
  steps: number,
  minLightness: number,
  maxLightness: number
): string[] => {
  const baseColor = tinycolor(color);
  const baseHsl = baseColor.toHsl();
  // Convert the base lightness to a percentage (0-100)
  const targetLightness = baseHsl.l * 100;

  // Build an array of shade objects with the computed lightness information.
  interface ShadeObject {
    hex: string;
    computedLightness: number;
  }

  const shadeObjects: ShadeObject[] = [];
  for (let i = 0; i < steps; i++) {
    const factor = i / (steps - 1);
    const computedLightness = minLightness + factor * (maxLightness - minLightness);
    const shadeHex = tinycolor({
      h: baseHsl.h,
      s: baseHsl.s,
      l: computedLightness / 100,
    }).toHexString();
    shadeObjects.push({ hex: shadeHex, computedLightness });
  }

  // Find the index of the shade whose computed lightness is closest to the base color.
  let closestIndex = 0;
  let minDifference = Infinity;
  shadeObjects.forEach((shadeObj, index) => {
    const diff = Math.abs(shadeObj.computedLightness - targetLightness);
    if (diff < minDifference) {
      minDifference = diff;
      closestIndex = index;
    }
  });

  // Override the closest shade with the original base color.
  shadeObjects[closestIndex].hex = baseColor.toHexString();

  // If you wish to match the previous ordering (which used unshift to reverse the order),
  // you can reverse the array before returning.
  const shadesHexArray = shadeObjects.map((shadeObj) => shadeObj.hex);
  return shadesHexArray.reverse();
};

export default generateShades;

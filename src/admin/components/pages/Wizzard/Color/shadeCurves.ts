/**
 * Cubic-bezier shade curve math + color helpers.
 *
 * Ported from https://github.com/krstivoja/winden-tokens
 * (src/ui/utils/shades.ts + color.ts). Three independent curves
 * (lightness/saturation/hue) adjust a base color into a shade ramp.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface ShadeCurvePoint {
  t: number;
  value: number;
}

export interface ShadeCurveHandles {
  startValue: number;
  leftHandle1: ShadeCurvePoint;
  leftHandle2: ShadeCurvePoint;
  rightHandle1: ShadeCurvePoint;
  rightHandle2: ShadeCurvePoint;
  endValue: number;
}

export type CurveProperty = "lightness" | "saturation" | "hue";

export const DEFAULT_SHADE_LIGHT_VALUE = 5;
export const DEFAULT_SHADE_DARK_VALUE = 90;

const CURVE_MIN_HANDLE_GAP = 0.02;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------- Color conversion helpers ----------

export function hexToRgbObj(hex: string): RGB {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function rgbObjToHex(rgb: RGB): string {
  return (
    "#" +
    [rgb.r, rgb.g, rgb.b]
      .map((x) => Math.round(x).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function parseColorToRgb(color: string): RGB | null {
  if (!color) return null;
  if (color.startsWith("#")) return hexToRgbObj(color);
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
  }
  return null;
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h, s: s * 100, v: v * 100 };
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  s /= 100;
  v /= 100;
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r: number, g: number, b: number;
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function rgbToHslL(r: number, g: number, b: number): number {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return Math.round(((max + min) / 2) * 100);
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hh >= 0 && hh < 1) { r = c; g = x; }
  else if (hh < 2) { r = x; g = c; }
  else if (hh < 3) { g = c; b = x; }
  else if (hh < 4) { g = x; b = c; }
  else if (hh < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = lN - c / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function lightnessToColor(baseRgb: RGB, lightness: number): string {
  if (lightness <= 50) {
    const t = lightness / 50;
    return rgbObjToHex({
      r: Math.round(255 + (baseRgb.r - 255) * t),
      g: Math.round(255 + (baseRgb.g - 255) * t),
      b: Math.round(255 + (baseRgb.b - 255) * t),
    });
  }
  const t = (lightness - 50) / 50;
  return rgbObjToHex({
    r: Math.round(baseRgb.r * (1 - t)),
    g: Math.round(baseRgb.g * (1 - t)),
    b: Math.round(baseRgb.b * (1 - t)),
  });
}

// ---------- Curve math ----------

function cubicBezierAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function cubicBezierDerivative(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2);
}

function solveBezierTForRangeX(x: number, x0: number, x1: number, x2: number, x3: number): number {
  if (Math.abs(x3 - x0) < 1e-6) return 0;
  let t = clamp((x - x0) / (x3 - x0), 0, 1);
  for (let i = 0; i < 6; i++) {
    const xAt = cubicBezierAt(x0, x1, x2, x3, t);
    const dx = xAt - x;
    if (Math.abs(dx) < 1e-4) break;
    const derivative = cubicBezierDerivative(x0, x1, x2, x3, t);
    if (Math.abs(derivative) < 1e-6) break;
    t = clamp(t - dx / derivative, 0, 1);
  }
  return t;
}

function isModernCurveHandles(value: unknown): value is ShadeCurveHandles {
  const candidate = value as Partial<ShadeCurveHandles> | null;
  return (
    !!candidate &&
    typeof candidate.startValue === "number" &&
    typeof candidate.endValue === "number" &&
    !!candidate.leftHandle1 &&
    !!candidate.leftHandle2 &&
    !!candidate.rightHandle1 &&
    !!candidate.rightHandle2
  );
}

// ---------- Shade naming ----------

export function getShadeNames(count: number): string[] {
  if (count === 5) return ["100", "300", "500", "700", "900"];
  if (count === 10) return ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
  if (count === 11) return ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const value = Math.round(50 + (i / (count - 1)) * 900);
    names.push(String(value));
  }
  return names;
}

export function getShadeBaseIndex(count: number): number {
  const names = getShadeNames(count);
  const explicitBaseIndex = names.indexOf("500");
  if (explicitBaseIndex >= 0) return explicitBaseIndex;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  names.forEach((name, index) => {
    const distance = Math.abs(parseInt(name, 10) - 500);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  return closestIndex;
}

export function normalizeShadeBaseIndex(baseIndex: number | undefined, count: number): number {
  if (count <= 1) return 0;
  if (typeof baseIndex !== "number" || Number.isNaN(baseIndex)) {
    return getShadeBaseIndex(count);
  }
  return clamp(Math.round(baseIndex), 0, count - 1);
}

export function remapShadeBaseIndex(baseIndex: number, previousCount: number, nextCount: number): number {
  if (nextCount <= 1) return 0;
  if (previousCount <= 1) return normalizeShadeBaseIndex(undefined, nextCount);
  const ratio = clamp(baseIndex / (previousCount - 1), 0, 1);
  return normalizeShadeBaseIndex(Math.round(ratio * (nextCount - 1)), nextCount);
}

export function getShadeBaseT(count: number, baseIndex: number): number {
  if (count <= 1) return 0;
  return normalizeShadeBaseIndex(baseIndex, count) / (count - 1);
}

export function getShadeBaseIndexForColor(baseColor: string, count: number): number {
  const rgb = parseColorToRgb(baseColor);
  if (!rgb) return getShadeBaseIndex(count);
  const l = rgbToHslL(rgb.r, rgb.g, rgb.b);
  const darkness = 1 - clamp(l / 100, 0, 1);
  return normalizeShadeBaseIndex(Math.round(darkness * (count - 1)), count);
}

// ---------- Curve construction / normalization ----------

function clampOrderedHandles(
  first: ShadeCurvePoint,
  second: ShadeCurvePoint,
  startT: number,
  endT: number
): [ShadeCurvePoint, ShadeCurvePoint] {
  const segmentSize = Math.max(0, endT - startT);
  if (segmentSize < 1e-6) {
    return [
      { t: startT, value: first.value },
      { t: endT, value: second.value },
    ];
  }
  const endpointGap = Math.min(CURVE_MIN_HANDLE_GAP, segmentSize / 4);
  const minGap = Math.min(CURVE_MIN_HANDLE_GAP, segmentSize / 4);
  const minFirstT = startT + endpointGap;
  const maxSecondT = endT - endpointGap;
  const firstT = clamp(first.t, minFirstT, maxSecondT - minGap);
  const secondT = clamp(second.t, firstT + minGap, maxSecondT);
  return [
    { t: firstT, value: first.value },
    { t: secondT, value: second.value },
  ];
}

export function createDefaultCurveHandles(count = 11, baseIndex = getShadeBaseIndex(count)): ShadeCurveHandles {
  const baseT = getShadeBaseT(count, baseIndex);
  const leftSpan = Math.max(baseT, 0);
  const rightSpan = Math.max(1 - baseT, 0);
  return {
    startValue: 0,
    leftHandle1: { t: baseT - leftSpan * 0.66, value: 0 },
    leftHandle2: { t: baseT - leftSpan * 0.33, value: 0 },
    rightHandle1: { t: baseT + rightSpan * 0.33, value: 0 },
    rightHandle2: { t: baseT + rightSpan * 0.66, value: 0 },
    endValue: 0,
  };
}

export function normalizeCurveHandles(
  value: unknown,
  count: number,
  baseIndex: number
): ShadeCurveHandles {
  const normalizedBaseIndex = normalizeShadeBaseIndex(baseIndex, count);
  const baseT = getShadeBaseT(count, normalizedBaseIndex);
  if (isModernCurveHandles(value)) {
    const [leftHandle1, leftHandle2] = clampOrderedHandles(value.leftHandle1, value.leftHandle2, 0, baseT);
    const [rightHandle1, rightHandle2] = clampOrderedHandles(value.rightHandle1, value.rightHandle2, baseT, 1);
    return {
      startValue: value.startValue,
      leftHandle1,
      leftHandle2,
      rightHandle1,
      rightHandle2,
      endValue: value.endValue,
    };
  }
  return normalizeCurveHandles(
    createDefaultCurveHandles(count, normalizedBaseIndex),
    count,
    normalizedBaseIndex
  );
}

export function isDefaultCurve(curve: ShadeCurveHandles, count: number, baseIndex: number): boolean {
  const defaults = createDefaultCurveHandles(count, baseIndex);
  return (
    curve.startValue === defaults.startValue &&
    curve.leftHandle1.t === defaults.leftHandle1.t &&
    curve.leftHandle1.value === defaults.leftHandle1.value &&
    curve.leftHandle2.t === defaults.leftHandle2.t &&
    curve.leftHandle2.value === defaults.leftHandle2.value &&
    curve.rightHandle1.t === defaults.rightHandle1.t &&
    curve.rightHandle1.value === defaults.rightHandle1.value &&
    curve.rightHandle2.t === defaults.rightHandle2.t &&
    curve.rightHandle2.value === defaults.rightHandle2.value &&
    curve.endValue === defaults.endValue
  );
}

// ---------- Curve evaluation ----------

function evaluateCurveAtT(handles: ShadeCurveHandles, t: number, count: number, baseIndex: number): number {
  const baseT = getShadeBaseT(count, baseIndex);
  const clampedT = clamp(t, 0, 1);
  if (baseT <= 0 || clampedT <= baseT) {
    const u = solveBezierTForRangeX(clampedT, 0, handles.leftHandle1.t, handles.leftHandle2.t, baseT);
    return cubicBezierAt(handles.startValue, handles.leftHandle1.value, handles.leftHandle2.value, 0, u);
  }
  const u = solveBezierTForRangeX(clampedT, baseT, handles.rightHandle1.t, handles.rightHandle2.t, 1);
  return cubicBezierAt(0, handles.rightHandle1.value, handles.rightHandle2.value, handles.endValue, u);
}

export function evaluateCurveAtNodes(handles: ShadeCurveHandles, count: number, baseIndex: number): number[] {
  const normalizedHandles = normalizeCurveHandles(handles, count, baseIndex);
  const normalizedBaseIndex = normalizeShadeBaseIndex(baseIndex, count);
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    values.push(i === normalizedBaseIndex ? 0 : evaluateCurveAtT(normalizedHandles, t, count, baseIndex));
  }
  return values;
}

export function getBaseShadeToneAtT(
  t: number,
  count: number,
  baseIndex: number,
  lightValue = DEFAULT_SHADE_LIGHT_VALUE,
  darkValue = DEFAULT_SHADE_DARK_VALUE
): number {
  if (count <= 1) return 50;
  const baseT = getShadeBaseT(count, baseIndex);
  const clampedT = clamp(t, 0, 1);
  if (clampedT <= baseT) {
    const localT = baseT === 0 ? 0 : clampedT / baseT;
    return lightValue + (50 - lightValue) * localT;
  }
  const localT = baseT === 1 ? 0 : (clampedT - baseT) / (1 - baseT);
  return 50 + (darkValue - 50) * localT;
}

// ---------- Shade generation ----------

export function generateShadeHexList(
  baseColor: string,
  shadeCount: number,
  baseIndex: number,
  lightnessCurve: ShadeCurveHandles,
  saturationCurve: ShadeCurveHandles,
  hueCurve: ShadeCurveHandles,
  lightValue = DEFAULT_SHADE_LIGHT_VALUE,
  darkValue = DEFAULT_SHADE_DARK_VALUE
): string[] {
  const rgb = parseColorToRgb(baseColor);
  if (!rgb) return [];

  const normalizedBaseIndex = normalizeShadeBaseIndex(baseIndex, shadeCount);
  const lightAdj = evaluateCurveAtNodes(lightnessCurve, shadeCount, normalizedBaseIndex);
  const satAdj = evaluateCurveAtNodes(saturationCurve, shadeCount, normalizedBaseIndex);
  const hueAdj = evaluateCurveAtNodes(hueCurve, shadeCount, normalizedBaseIndex);

  const baseHsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const shades: string[] = [];
  for (let i = 0; i < shadeCount; i++) {
    const t = shadeCount > 1 ? i / (shadeCount - 1) : 0;
    const baseLightness = getBaseShadeToneAtT(t, shadeCount, normalizedBaseIndex, lightValue, darkValue);
    const toneLightness = clamp(baseLightness + (lightAdj[i] || 0), 0, 100);
    // Internal tone: 0 = white, 100 = black. HSL L: 100 = white, 0 = black.
    const hslL = 100 - toneLightness;
    const saturation = clamp(baseHsl.s + (satAdj[i] || 0), 0, 100);
    const hue = (baseHsl.h + (hueAdj[i] || 0) + 360) % 360;
    shades.push(rgbObjToHex(hslToRgb(hue, saturation, hslL)));
  }

  if (shades[normalizedBaseIndex]) {
    shades[normalizedBaseIndex] = rgbObjToHex(rgb);
  }

  return shades;
}

import { object, string, array, boolean, number, mixed } from 'yup';

/**
 * Yup schema for fluid scale configuration
 */
const fluidSchema = object().shape({
  extend: boolean().optional(),
  disableFluid: boolean().optional(),
  useRem: boolean().optional(),
  remSize: number().optional(),
  minBaseSize: number().optional(),
  minScaleRatio: number().optional(),
  minScreenSize: number().optional(),
  maxBaseSize: number().optional(),
  maxScaleRatio: number().optional(),
  maxScreenSize: number().optional(),
  steps: array().of(string()).optional(),
  baseStep: string().optional(),
  decimalPlaces: number().optional(),
  stepValues: array().of(string()).optional(),
  minMaxValues: array().of(
    object().shape({
      min: string().optional().nullable(),
      max: string().optional().nullable()
    })
  ).optional(),
  overrides: mixed().optional(), // Can be array or object
  manualMode: boolean().optional(), // Manual override mode
  manualValues: mixed().optional() // Manual values object
}).required().strict(true).noUnknown();

/**
 * Yup schema for color shade
 */
const colorShadeSchema = object().shape({
  name: string().required(),
  hex: string().required(),
  isEnabled: boolean().required(),
  isDefault: boolean().required(),
}).strict(true).noUnknown();

/**
 * Yup schema for color entry
 */
const colorEntrySchema = object().shape({
  id: mixed()
    .test('is-string-or-number', 'ID must be a string or a number', (value) => {
      return typeof value === 'string' || typeof value === 'number';
    })
    .required('ID is required'),
  name: string().required(),
  hex: string().optional(),
  isLocked: boolean().optional(),
  maxLightness: number().optional(),
  minLightness: number().optional(),
  colorFormat: string().optional(),
  enableShades: boolean().optional(),
  reverseShades: boolean().optional(),
  originalGeneratedColors: array().of(string()).optional(),
  isMainColorChange: boolean().optional(),
  shades: array().of(colorShadeSchema).required(),
}).strict(true).noUnknown();

/**
 * Color schema configuration
 */
const colorSchema = {
  colorEntries: array().of(colorEntrySchema).optional(),
  extendColors: boolean().required(),
  colorsActive: boolean().required(),
  includeUtilityColors: boolean().required(),
};

/**
 * Yup schema for breakpoint entry
 */
const breakpointSchema = object().shape({
  id: string().required(),
  name: string().optional(),
  value: mixed().optional(),
}).strict(true).noUnknown();

/**
 * Complete wizard state validation schema
 */
export const wizardSchema = object().shape({
  // Basic Configuration
  activeTab: boolean().optional(),
  configCode: string().required(),
  stateName: string().optional(),

  // Breakpoints Configuration
  breakpoints: array().of(breakpointSchema).required(),
  extendBreakpoints: boolean().required(),
  breakpointsActive: boolean().required(),
  desktopFirst: boolean().required(),
  extendScreensFSE: boolean().optional(),
  extendScreensBricks: boolean().optional(),
  extendScreensOxygen: boolean().optional(),

  // Font Family Configuration
  fontFamily: array().of(mixed()).required(),
  extendFontFamily: boolean().required(),
  fontFamilyActive: boolean().required(),
  extendFontFamilyFSE: boolean().optional(),
  extendFontFamilyBricks: boolean().optional(),
  extendFontFamilyOxygen: boolean().optional(),
  extendFontHero: boolean().optional(),

  // Color Configuration
  ...colorSchema,
  extendColorsFSE: boolean().optional(),
  extendColorsBricks: boolean().optional(),
  extendColorsOxygen: boolean().optional(),

  // Font Size Configuration
  fontSizesActive: boolean().required(),
  fontSize: fluidSchema,
  extendFontSizesFSE: boolean().optional(),
  extendFontSizesBricks: boolean().optional(),
  extendFontSizesOxygen: boolean().optional(),

  // Spacing Configuration
  spacesActive: boolean().required(),
  spacing: fluidSchema,
  extendSpacingFSE: boolean().optional(),
  extendSpacingBricks: boolean().optional(),
  extendSpacingOxygen: boolean().optional(),

  // Border Radius Configuration
  borderRadius: fluidSchema,
  borderRadiusActive: boolean().required(),
  extendBorderRadiusFSE: boolean().optional(),
  extendBorderRadiusBricks: boolean().optional(),
  extendBorderRadiusOxygen: boolean().optional(),

  // Utility Sizes Configuration
  includeUtilitySizes: boolean().optional(), // Include default utility sizes (0, px, auto, etc.)
}).strict(true).noUnknown();

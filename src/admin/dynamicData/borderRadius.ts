/**
 * Safely parse JSON data from window object
 * @param data - JSON string to parse
 * @param key - Key to extract from parsed object
 * @returns Parsed object or empty object on error
 */
const safeParse = (data: string | undefined, key: string): Record<string, any> => {
  try {
    return data ? (JSON.parse(data)?.[key] ?? {}) : {};
  } catch (e) {
    console.warn(`Failed to parse theme data for ${key}:`, e);
    return {};
  }
};

/**
 * Dynamic border radius from Full Site Editing (FSE) theme
 */
export const dynamicBorderRadiusFSE = safeParse((window as any)?.fseThemeData, 'borderRadius');

/**
 * Dynamic border radius from Bricks builder theme
 */
export const dynamicBorderRadiusBricks = safeParse((window as any)?.bricksThemeData, 'borderRadius');

/**
 * Dynamic border radius from Oxygen builder theme
 */
export const dynamicBorderRadiusOxygen = safeParse((window as any)?.oxygenThemeData, 'borderRadius');

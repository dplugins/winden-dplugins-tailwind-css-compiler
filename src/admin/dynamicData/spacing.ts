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
 * Dynamic spacing from Full Site Editing (FSE) theme
 */
export const dynamicSpacingFSE = safeParse((window as any)?.fseThemeData, 'spacing');

/**
 * Dynamic spacing from Bricks builder theme
 */
export const dynamicSpacingBricks = safeParse((window as any)?.bricksThemeData, 'spacing');

/**
 * Dynamic spacing from Oxygen builder theme
 */
export const dynamicSpacingOxygen = safeParse((window as any)?.oxygenThemeData, 'spacing');

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
 * Dynamic colors from Full Site Editing (FSE) theme
 */
export const dynamicColorsFSE = safeParse((window as any)?.fseThemeData, 'colors');

/**
 * Dynamic color groups from FSE theme
 */
export const dynamicColorGroupsFSE = safeParse((window as any)?.fseThemeData, 'colorGroups');

/**
 * Dynamic colors from Bricks builder theme
 */
export const dynamicColorsBricks = safeParse((window as any)?.bricksThemeData, 'colors');

/**
 * Dynamic colors from Oxygen builder theme
 */
export const dynamicColorsOxygen = safeParse((window as any)?.oxygenThemeData, 'colors');

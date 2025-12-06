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
 * Dynamic font sizes from Full Site Editing (FSE) theme
 */
export const dynamicFontSizeFSE = safeParse((window as any)?.fseThemeData, 'fontSizes');

/**
 * Dynamic font sizes from Bricks builder theme
 */
export const dynamicFontSizeBricks = safeParse((window as any)?.bricksThemeData, 'fontSizes');

/**
 * Dynamic font sizes from Oxygen builder theme
 */
export const dynamicFontSizeOxygen = safeParse((window as any)?.oxygenThemeData, 'fontSizes');

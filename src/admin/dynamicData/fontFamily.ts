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
 * Dynamic font families from Full Site Editing (FSE) theme
 */
export const dynamicFontFamilyFSE = safeParse((window as any)?.fseThemeData, 'fontFamilies');

/**
 * Dynamic font families from Bricks builder theme
 */
export const dynamicFontFamilyBricks = safeParse((window as any)?.bricksThemeData, 'fontFamilies');

/**
 * Dynamic font families from Oxygen builder theme
 */
export const dynamicFontFamilyOxygen = safeParse((window as any)?.oxygenThemeData, 'fontFamilies');

/**
 * Dynamic font families from Font Hero plugin
 */
export const dynamicFontHero = safeParse((window as any)?.fontHeroData, '');

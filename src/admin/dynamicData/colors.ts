import '@/types/global.d.ts';

/**
 * Decode HTML entities in a string
 * @param str - String with HTML entities
 * @returns Decoded string
 */
const decodeHtmlEntities = (str: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
};

/**
 * Safely parse JSON data from window object
 * @param data - JSON string to parse (may contain HTML entities or be a plain array)
 * @param key - Key to extract from parsed object
 * @returns Parsed object or empty object on error
 */
const safeParse = (data: string | any, key: string): Record<string, any> => {
  try {
    // Handle plain JavaScript arrays (when builders aren't active)
    if (Array.isArray(data)) {
      return {};
    }

    // Return empty object if data is missing, empty, or just whitespace
    if (!data || (typeof data === 'string' && !data.trim())) {
      return {};
    }

    // If data is already an object, use it directly
    if (typeof data === 'object' && data !== null) {
      return data[key] ?? {};
    }

    // Decode HTML entities before parsing JSON
    const decodedData = decodeHtmlEntities(data);
    return JSON.parse(decodedData)?.[key] ?? {};
  } catch (e) {
    // Silently return empty object - warnings are not needed for missing/invalid builder data
    return {};
  }
};

/**
 * Dynamic colors from Full Site Editing (FSE) theme
 */
export const dynamicColorsFSE = safeParse(window.fseThemeData, 'colors');

/**
 * Dynamic color groups from FSE theme
 */
export const dynamicColorGroupsFSE = safeParse(window.fseThemeData, 'colorGroups');

/**
 * Dynamic colors from Bricks builder theme
 */
export const dynamicColorsBricks = safeParse(window.bricksThemeData, 'colors');

/**
 * Dynamic colors from Oxygen builder theme
 */
export const dynamicColorsOxygen = safeParse(window.oxygenThemeData, 'colors');

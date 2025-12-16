/**
 * Default Full Site Editing (FSE) screen breakpoints
 */
const defaultFSEScreens: Record<string, string> = {
  "xhuge": "1920px",
  "huge": "1440px",
  "wide": "1280px",
  "xlarge": "1080px",
  "large": "960px",
  "medium": "782px",
  "small": "600px",
  "mobile": "480px",
  "zoomed-in": "280px"
};

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
 * Dynamic screens from FSE theme, falls back to default if empty
 */
const parsedScreensFSE = safeParse((window as any)?.fseThemeData, 'screens');
export const dynamicScreensFSE = Object.keys(parsedScreensFSE).length > 0 ? parsedScreensFSE : defaultFSEScreens;

/**
 * Dynamic screens from Bricks builder theme
 */
export const dynamicScreensBricks = safeParse((window as any)?.bricksThemeData, 'screens');

/**
 * Dynamic screens from Oxygen builder theme
 */
export const dynamicScreensOxygen = safeParse((window as any)?.oxygenThemeData, 'screens');

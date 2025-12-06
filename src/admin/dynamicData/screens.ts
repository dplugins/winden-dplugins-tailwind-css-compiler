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

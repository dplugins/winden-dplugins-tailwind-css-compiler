import type { WizzardState } from '@/types/wizzard';

declare global {
  interface Window {
    tailwindify?: (
      classes: string[],
      css: string,
      config: string,
      preprocessor: string
    ) => Promise<{ css?: string; error?: { message: string } }>;
    uploadUrl?: string;
    websiteUrl?: string;
    nonce?: string;
  }
}

interface CacheError {
  title: string;
  message: string;
}

interface CachePayload {
  styles?: string;
  status?: 'completed' | 'failed';
  errors?: string;
}

/**
 * Fetch classes from WordPress backend
 * @param setCacheInProgress - Callback to update cache progress state
 * @param handleFetchedClasses - Callback to handle fetched classes
 */
export const fetchClasses = async (
  setCacheInProgress: (inProgress: boolean) => void,
  handleFetchedClasses: (classes: string[]) => void
): Promise<void> => {
  try {
    const response = await fetch(`${window.ajaxUrl || window.websiteUrl + '/wp-admin/admin-ajax.php'}?action=winden_get_classes`);
    const data = await response.json();

    if (data.success) {
      handleFetchedClasses(data.data.classes);
    }
  } catch (error) {
    console.error('[FETCH] Error fetching classes:', error);
  }
};

/**
 * Process fetched classes and generate cache
 * @param classes - Array of CSS classes
 * @param scriptLoaded - Whether the Tailwind script is loaded
 * @param scssContent - SCSS/CSS content
 * @param jsContent - JavaScript config content
 * @param setCacheInProgress - Callback to update cache progress state
 * @param fetchCacheStatus - Callback to fetch cache status
 * @param setCacheStatus - Callback to set cache status
 * @param wizzardContentRef - Reference to wizard content
 * @param wizzardContent - Wizard content state
 * @param css_preprocessor - CSS preprocessor type
 * @param tailwind_version - Tailwind version
 */
export const handleFetchedClasses = async (
  classes: string[] | string | Record<string, any> | null,
  scriptLoaded: boolean,
  scssContent: string,
  jsContent: string,
  setCacheInProgress: (inProgress: boolean) => void,
  fetchCacheStatus: (setCacheStatus: (status: any) => void) => void,
  setCacheStatus: (status: any) => void,
  wizzardContentRef: React.MutableRefObject<WizzardState | null>,
  wizzardContent: WizzardState | null,
  css_preprocessor: string = 'css',
  tailwind_version: string = 'v4'
): Promise<void> => {
  if (scriptLoaded) {

    setCacheInProgress(true);

    const errors: CacheError[] = [];
    const payload: CachePayload = {};

    try {
      if (typeof window.tailwindify === 'function') {
        const response = await fetch(`${window.uploadUrl}/winden/tailwind.config.js?_t=${Date.now()}`);
        const getConfigFile = await response.text();
        const getConfigFileString = `${getConfigFile}`;

        // Always use v4 - get wizard content
        let wizardThemeContent = '';
        if (wizzardContentRef?.current?.configCode) {
          wizardThemeContent = wizzardContentRef.current.configCode;
        } else if (wizzardContent && wizzardContent.configCode) {
          wizardThemeContent = wizzardContent.configCode;
        }

        // Check if config file has theme.extend (old format that causes issues)
        const hasThemeExtend = getConfigFile.includes('theme:') &&
                              (getConfigFile.includes('extend:') || getConfigFile.includes('extend {'));

        // Build custom_css block with migration-safe logic:
        let customCss = '';

        if (wizardThemeContent) {
          // User has Wizzard config - use @theme CSS (modern approach)
          customCss = wizardThemeContent;

          // Only include @config if it doesn't have theme settings (safe for plugins/corePlugins)
          if (!hasThemeExtend) {
            customCss = '@config "' + window.uploadUrl + '/winden/tailwind.config.js";\n\n' + customCss;
          }
          // Skip @config if theme.extend exists to prevent conflicts
        } else {
          // No Wizzard content - fallback to @config directive
          customCss = '@config "' + window.uploadUrl + '/winden/tailwind.config.js";';
        }


        // Build the merged content matching browser compilation logic
        // Browser does: style.css + custom_css
        let mergedScssContent = '';

        if (scssContent && scssContent.trim()) {
          // Use user's style tab content
          mergedScssContent = scssContent;
        } else {
          // No style tab content - use default minimal imports
          mergedScssContent = '@layer theme, base, components, utilities;\n\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n\n';
        }

        // APPEND custom_css (same as browser compilation)
        // Add newlines to ensure @config doesn't get concatenated with previous CSS
        mergedScssContent += '\n\n' + customCss;

        // Use merged content for compilation
        scssContent = mergedScssContent;

        // Ensure classes is a proper array
        let classesArray: string[];
        if (!Array.isArray(classes)) {
          if (typeof classes === 'object' && classes !== null) {
            classesArray = Object.values(classes);
          } else if (typeof classes === 'string') {
            classesArray = classes.split(/[\s,]+/).filter(c => c);
          } else {
            classesArray = [];
          }
        } else {
          classesArray = classes;
        }

        // Ensure it's a real array with only strings
        classesArray = Array.from(classesArray).filter(c => typeof c === 'string' && c.length > 0);

        const tw = await window.tailwindify(classesArray, scssContent, getConfigFileString, css_preprocessor);

        if ('error' in tw) {
          console.error('[ClassFetcher] Compilation error:', tw.error);
          const errorMessage = tw.error.message || 'Compilation failed';
          errors.push({
            title: 'Compilation Error',
            message: errorMessage
          });
          payload.status = 'failed';
        } else if (tw.css) {

          payload.styles = tw.css;
          payload.status = 'completed';
        } else {
          console.error('[ClassFetcher] No CSS in result:', tw);
          errors.push({
            title: 'Error in Cache',
            message: 'No CSS was generated'
          });
          payload.status = 'failed';
        }
      }
    } catch (error: any) {
      console.error('[ClassFetcher] Compilation error:', error);

      const errorMessage = error?.message || error?.toString() || 'Unknown compilation error';

      errors.push({
        title: 'Compilation Error',
        message: errorMessage
      });
      payload.status = 'failed';
    }

    if (errors?.length) {
      payload.errors = JSON.stringify(errors);
      payload.status = 'failed';
    }

    try {
      const response = await fetch(`${window.ajaxUrl || window.websiteUrl + '/wp-admin/admin-ajax.php'}?action=winden_save_cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...payload, '_nonce': window.nonce }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('[CACHE] Error saving cache:', result.data);
      }

      // Small delay to ensure database has been updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refetch cache status after successful save
      await fetchCacheStatus(setCacheStatus);
    } catch (error) {
      console.error('[CACHE] Error saving cache:', error);

      // Small delay to ensure database has been updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refetch even on error to show the failed status
      await fetchCacheStatus(setCacheStatus);
    } finally {
      setCacheInProgress(false);
    }
  }
};

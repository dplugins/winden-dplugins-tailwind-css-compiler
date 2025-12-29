import { DEFAULT_CSS_CONTENT_V4, DEFAULT_CSS_CONTENT, DEFAULT_JS_CONTENT } from '../const/contentDefaults';
import { fetchSettings } from '@functions/Settings';
import type { WizzardState } from '@/types/wizzard';

declare global {
  interface Window {
    uploadUrl?: string;
    websiteUrl?: string;
    ajaxUrl?: string;
  }
}

/**
 * Set default content for JS and SCSS
 * @param setJsContent - Callback to set JS content
 * @param setScssContent - Callback to set SCSS content
 * @param settingsRes - Settings object
 */
const setDefaultContent = (
  setJsContent: (content: string) => void,
  setScssContent: (content: string) => void,
  settingsRes: Record<string, any>
): void => {
  setJsContent(DEFAULT_JS_CONTENT);
  setScssContent(DEFAULT_CSS_CONTENT); // Always use v4 default
};

let cachedJsContent: string | null = null;
let cachedScssContent: string | null = null; // Cache for SCSS content
let cachedCssContent: string | null = null; // Cache for CSS content
let cachedWizzardContent: WizzardState | null = null; // Cache for wizzard content

/**
 * Fetch content from WordPress database and files
 * @param setJsContent - Callback to set JS content
 * @param setScssContent - Callback to set SCSS content
 * @param setWizzardContent - Callback to set Wizzard content
 * @param callback - Optional callback after fetch completes
 */
export const fetchContent = async (
  setJsContent: (content: string) => void,
  setScssContent: (content: string) => void,
  setWizzardContent: (content: WizzardState | null) => void,
  callback: (() => void) | null = null
): Promise<void> => {
  const settingsRes = await fetchSettings(() => { }, true);

  try {
    // Fetch all content from database
    const dbResponse = await fetch(`${window.ajaxUrl || window.websiteUrl + '/wp-admin/admin-ajax.php'}?action=winden_get_content`);
    const dbData = await dbResponse.json();

    if (dbData.success) {
      const decodedWizzard = dbData.data.wizzard;
      setWizzardContent(decodedWizzard || null);

      /**
       * Fetch file content or use database content as fallback
       * @param fileUrl - URL of the file to fetch
       * @param dbContent - Base64 encoded database content
       * @param defaultContent - Default content to use if both fail
       * @param setContent - Callback to set the content
       */
      const fetchFileOrUseDB = async (
        fileUrl: string,
        dbContent: string,
        defaultContent: string,
        setContent: (content: string) => void
      ): Promise<void> => {
        try {
          const fileResponse = await fetch(fileUrl);
          if (fileResponse.ok) {
            const fileContent = await fileResponse.text();
            setContent(fileContent || defaultContent);
          } else {
            const decodedContent = atob(dbContent);
            setContent(decodedContent || defaultContent);
          }
        } catch (error) {
          console.error(`Error fetching content:`, error);
          const decodedContent = atob(dbContent);
          setContent(decodedContent || defaultContent);
        }
      };

      // Fetch JS content (Config Tab)
      await fetchFileOrUseDB(
        `${window.uploadUrl}/winden/tailwind.config.js?_t=${Date.now()}`,
        dbData.data.javascript,
        DEFAULT_JS_CONTENT,
        setJsContent
      );

      // Fetch SCSS content (Style Tab)
      await fetchFileOrUseDB(
        `${window.uploadUrl}/winden/style-tab.css?_t=${Date.now()}`,
        dbData.data.scss,
        DEFAULT_CSS_CONTENT, // Always use v4 default
        setScssContent
      );

      // Update cached content
      cachedJsContent = atob(dbData.data.javascript);
      cachedScssContent = atob(dbData.data.scss);
      cachedWizzardContent = decodedWizzard;
    } else {
      // console.error('Error fetching content:', dbData.data);
      setDefaultContent(setJsContent, setScssContent, settingsRes);
    }
  } catch (error) {
    // console.error('Error fetching content:', error);
    setDefaultContent(setJsContent, setScssContent, settingsRes);
  } finally {
    if (typeof callback === "function") {
      callback();
    }
  }
};

/**
 * Fetch wizard state from WordPress
 * @returns Wizard state data or empty array on error
 */
export const fetchWizzardState = async (): Promise<WizzardState | []> => {
  try {
    const response = await fetch(`${window.ajaxUrl || window.websiteUrl + '/wp-admin/admin-ajax.php'}?action=winden_get_wizzard_state`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      // console.error('Error fetching wizzard state: ', data.data);
      return [];
    }
  } catch (error) {
    // console.error('Error fetching wizzard state: ', error);
    return [];
  }
};

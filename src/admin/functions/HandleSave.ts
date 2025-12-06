import { DEFAULT_CSS_CONTENT, DEFAULT_CSS_CONTENT_V4, DEFAULT_JS_CONTENT } from "../const/contentDefaults";
import { fetchSettings } from '@functions/Settings';
import type { WizzardState } from '@/types/wizzard';
import { windenBroadcast } from '@/utils/broadcastChannel';

declare global {
  interface Window {
    tailwindV4BundleCSS?: (css: string) => Promise<string>;
    nonce?: string;
    websiteUrl?: string;
  }
  const Sass: {
    compile: (source: string, callback: (result: { status: number; text: string; formatted: string }) => void) => void;
  };
}

/**
 * Unicode-safe base64 encoding
 */
const utf8ToBase64 = (str: string): string => {
  try {
    // Convert string to UTF-8 bytes, then to base64
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error('Error encoding to base64:', e);
    // Fallback: try regular btoa
    return btoa(str);
  }
};

/**
 * Main save handler for JS, SCSS, and Wizzard content
 * @param jsContentRef - Reference to JS content
 * @param scssContentRef - Reference to SCSS content
 * @param wizzardContentRef - Reference to Wizzard state
 * @param settings - Optional settings object
 */
export const handleSave = async (
  jsContentRef: React.MutableRefObject<string>,
  scssContentRef: React.MutableRefObject<string>,
  wizzardContentRef: React.MutableRefObject<WizzardState | null>,
  settings?: Record<string, any>
): Promise<void> => {
  const saveStartTime = performance.now();
  // console.log('[SAVE] Save button pressed at:', new Date().toISOString());

  let cssContent = '';

  // Compile the SCSS content into CSS
  const compileSass = async (_cssContent: string | null = null): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Using the Sass.js browser-based compiler
      Sass.compile(_cssContent ?? scssContentRef.current, (result) => {
        if (result.status === 0) {
          cssContent = result.text; // SCSS compiled successfully to CSS
          resolve(cssContent);
        } else {
          console.error('Error compiling SCSS:', result.formatted);
          reject(new Error(result.formatted));
        }
      });
    });
  };

  try {
    let settingsRes: Record<string, any> = {};
    if (settings) {
      settingsRes = settings;
    } else {
      settingsRes = await fetchSettings(() => { }, true);
    }

    // Always use Tailwind v4 bundling
    if (typeof window.tailwindV4BundleCSS === 'function' && scssContentRef?.current?.length) {
      const bundleStartTime = performance.now();
      // console.log('[SAVE] Starting Tailwind v4 CSS bundling...');

      // Include Wizard theme configuration in Tailwind v4 compilation
      const wizzardConfig = wizzardContentRef?.current;
      let combinedCSS = scssContentRef.current;

      if (wizzardConfig?.configCode && wizzardConfig.configCode.trim().length > 0) {
        // Insert @theme block before @layer/@import statements
        const layerRegex = /(@layer[^;]*;|@import[^;]*;)/;
        const match = combinedCSS.match(layerRegex);

        if (match) {
          const insertIndex = combinedCSS.indexOf(match[0]);
          combinedCSS = combinedCSS.slice(0, insertIndex) +
            wizzardConfig.configCode + '\n\n' +
            combinedCSS.slice(insertIndex);
        } else {
          combinedCSS = wizzardConfig.configCode + '\n\n' + combinedCSS;
        }
      }

      // IMPORTANT: Skip bundleCSS step - it uses PostCSS which doesn't understand SCSS
      // The main compiler (tailwindify) handles both SCSS preprocessing and @import bundling
      // bundleCSS only handles @import statements, and the main compiler does this better
      // cssContent = await window.tailwindV4BundleCSS(combinedCSS);
      cssContent = combinedCSS; // Pass through directly - let the compiler handle everything

      const bundleEndTime = performance.now();
      // console.log(`[SAVE] Tailwind v4 bundling skipped - compiler will handle it in ${(bundleEndTime - bundleStartTime).toFixed(2)}ms`);
    }

    const isJsEmpty = jsContentRef?.current?.length < 1;

    // Check if SCSS is truly empty (not just tab marker comments)
    const scssWithoutComments = scssContentRef?.current?.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '').trim();
    const isScssEmpty = scssWithoutComments.length < 1;

    const data = {
      javascript: utf8ToBase64(JSON.stringify(isJsEmpty ? DEFAULT_JS_CONTENT : jsContentRef.current)),
      scss: utf8ToBase64(JSON.stringify(isScssEmpty ? DEFAULT_CSS_CONTENT : scssContentRef.current)),
      wizzard: utf8ToBase64(JSON.stringify(wizzardContentRef.current)),
      css: utf8ToBase64(cssContent),
    };

    const jsonData = JSON.stringify({ ...data, '_nonce': window.nonce });

    const dbSaveStartTime = performance.now();
    // console.log('[SAVE] Sending data to database...');

    const response = await fetch(`${window.websiteUrl}/wp-admin/admin-ajax.php?action=save_winden_content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonData,
    });

    const result = await response.json();
    const dbSaveEndTime = performance.now();
    // console.log(`[SAVE] Database save completed in ${(dbSaveEndTime - dbSaveStartTime).toFixed(2)}ms`);

    if (result.success) {
      // Broadcast changes to all open tabs (admin, editors, frontend)
      windenBroadcast.postMessage({
        type: 'CONTENT_SAVED',
        timestamp: Date.now(),
        data: {
          javascript: data.javascript,
          scss: data.scss,
          wizzard: data.wizzard,
          css: data.css,
        },
      });

      const currentTab = localStorage.getItem('activeTab');
      if ((currentTab === 'style' && isScssEmpty) || (currentTab === 'javascript' && isJsEmpty)) {
        window.location.reload();
      }

      const saveEndTime = performance.now();
      const totalTime = (saveEndTime - saveStartTime).toFixed(2);
      // console.log(`[SAVE] ✅ Total save process completed in ${totalTime}ms`);
    } else {
      console.error('Error saving content:', result.data);
      const saveEndTime = performance.now();
      // console.log(`[SAVE] ❌ Save failed after ${(saveEndTime - saveStartTime).toFixed(2)}ms`);
    }
  } catch (error) {
    console.error('Error saving content:', error);
    const saveEndTime = performance.now();
    // console.log(`[SAVE] ❌ Save error after ${(saveEndTime - saveStartTime).toFixed(2)}ms`);
  }
};

/**
 * Update only the Wizzard state in the database
 * @param wizzardData - Wizzard state or array of states to save
 * @param callback - Optional callback after save
 */
export const handleWizzardStateUpdate = async (
  wizzardData: WizzardState | WizzardState[],
  callback: (() => void) | null = null
): Promise<void> => {
  try {
    const data = {
      wizzard: btoa(JSON.stringify(wizzardData))
    };

    const jsonData = JSON.stringify({ ...data, '_nonce': window.nonce });

    const response = await fetch(`${window.websiteUrl}/wp-admin/admin-ajax.php?action=update_winden_wizzard_state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonData,
    });

    const result = await response.json();

    if (result.success) {
      // console.log('Wizzard state updated successfully!');

      // Broadcast Wizzard update to other tabs
      windenBroadcast.postMessage({
        type: 'WIZZARD_UPDATED',
        timestamp: Date.now(),
        data: {
          wizzard: data.wizzard,
        },
      });

      if (typeof callback === 'function') {
        callback();
      }
    } else {
      console.error('Error updating wizzard state: ', result.data);
    }
  } catch (error) {
    console.error('Error updating wizzard state: ', error);
  }
};

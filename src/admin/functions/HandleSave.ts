import { DEFAULT_CSS_CONTENT, DEFAULT_CSS_CONTENT_V4, DEFAULT_JS_CONTENT, MINIMAL_BASE_CSS } from "../const/contentDefaults";
import { fetchSettings } from '@functions/Settings';
import type { WizzardState } from '@/types/wizzard';
import { windenBroadcast } from '@/utils/broadcastChannel';
import { buildAjaxUrl } from '@/utils/ajaxUrl';
import { log } from '@/utils/logger';

/**
 * Tracks the last-known server timestamp for stale-write detection.
 * Updated on successful save and initial fetch.
 */
let _serverUpdatedAt: string | null = null;
let _advancedBySave = false;

/**
 * Prime the stale-write guard from the initial content fetch.
 * No-op if a save has already advanced the value: Nav's auto-fix
 * branch can fire an auto-save in parallel with the initial fetch,
 * and the fetch's response carries the *pre-auto-save* timestamp.
 * Letting the fetch overwrite the save's fresher value caused every
 * subsequent manual save to be rejected as stale.
 */
export function setServerUpdatedAt(ts: string | null) {
  if (_advancedBySave) return;
  _serverUpdatedAt = ts;
}

export function getServerUpdatedAt(): string | null {
  return _serverUpdatedAt;
}

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
    log.error('Save', 'Base64 encoding failed, using fallback', { error: String(e) });
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
  log.info('Save', 'Save started');

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
          log.error('Save', 'SCSS compilation failed', { formatted: result.formatted });
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

    // Style tab can be hidden via Settings → editor_tabs. When hidden, the
    // user's saved scss is preserved in the DB but compile uses a minimum
    // baseline that skips preflight, so Gutenberg's own reset survives.
    // Re-enabling the Style tab restores the user's original content.
    const styleTabVisible = !Array.isArray(settingsRes?.editor_tabs)
      || settingsRes.editor_tabs.find((t: any) => t?.value === 'style')?.visible !== false;
    const effectiveScss = styleTabVisible ? scssContentRef.current : MINIMAL_BASE_CSS;

    // Always use Tailwind v4 bundling
    if (typeof window.tailwindV4BundleCSS === 'function' && effectiveScss?.length) {
      const bundleStartTime = performance.now();
      log.debug('Save', 'Preparing CSS bundle', { styleTabVisible });

      // Include Wizard theme configuration in Tailwind v4 compilation
      const wizzardConfig = wizzardContentRef?.current;
      let combinedCSS = effectiveScss;

      if (wizzardConfig?.configCode && wizzardConfig.configCode.trim().length > 0) {
        // Insert @theme block AFTER @layer and @import statements (Tailwind v4 requirement)
        // @theme must come after @import "tailwindcss/theme.css" to extend (not replace) defaults
        const lastImportRegex = /@import[^;]*;/g;
        let lastImportMatch;
        let lastImportEnd = -1;

        // Find the position after the last @import statement
        while ((lastImportMatch = lastImportRegex.exec(combinedCSS)) !== null) {
          lastImportEnd = lastImportMatch.index + lastImportMatch[0].length;
        }

        if (lastImportEnd > -1) {
          // Insert @theme after all imports
          combinedCSS = combinedCSS.slice(0, lastImportEnd) +
            '\n\n' + wizzardConfig.configCode +
            combinedCSS.slice(lastImportEnd);
        } else {
          // No imports found - check for @layer
          const layerMatch = combinedCSS.match(/@layer[^;]*;/);
          if (layerMatch) {
            const layerEnd = combinedCSS.indexOf(layerMatch[0]) + layerMatch[0].length;
            combinedCSS = combinedCSS.slice(0, layerEnd) +
              '\n\n' + wizzardConfig.configCode +
              combinedCSS.slice(layerEnd);
          } else {
            // No @layer or @import - prepend @theme
            combinedCSS = wizzardConfig.configCode + '\n\n' + combinedCSS;
          }
        }
      }

      // IMPORTANT: Skip bundleCSS step - it uses PostCSS which doesn't understand SCSS
      // The main compiler (tailwindify) handles both SCSS preprocessing and @import bundling
      // bundleCSS only handles @import statements, and the main compiler does this better
      // cssContent = await window.tailwindV4BundleCSS(combinedCSS);
      cssContent = combinedCSS; // Pass through directly - let the compiler handle everything

      const bundleEndTime = performance.now();
      log.debug('Save', 'CSS bundle ready', {
        durationMs: +(bundleEndTime - bundleStartTime).toFixed(2),
        hasWizzardConfig: !!(wizzardConfig?.configCode),
        cssLength: combinedCSS.length,
      });
    }

    const isJsEmpty = jsContentRef?.current?.length < 1;

    // Check if SCSS is truly empty (not just tab marker comments)
    const scssWithoutComments = scssContentRef?.current?.replace(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g, '').trim();
    const isScssEmpty = scssWithoutComments.length < 1;

    // User's scss stays in the DB untouched so re-enabling the Style tab
    // restores their content. The PHP save handler reads editor_tabs and
    // swaps MINIMAL_BASE_CSS into input.css (the compile pipeline's source
    // of truth) when the tab is hidden.
    const data: Record<string, string> = {
      javascript: utf8ToBase64(JSON.stringify(isJsEmpty ? DEFAULT_JS_CONTENT : jsContentRef.current)),
      scss: utf8ToBase64(JSON.stringify(isScssEmpty ? DEFAULT_CSS_CONTENT : scssContentRef.current)),
      wizzard: utf8ToBase64(JSON.stringify(wizzardContentRef.current)),
      css: utf8ToBase64(cssContent),
    };

    // Stale-write detection: send the last-known server timestamp
    if (_serverUpdatedAt) {
      data.expected_updated_at = _serverUpdatedAt;
    }

    const jsonData = JSON.stringify({ ...data, '_nonce': window.nonce });

    const dbSaveStartTime = performance.now();
    log.debug('Save', 'Sending to database', {
      jsEmpty: isJsEmpty,
      scssEmpty: isScssEmpty,
      hasStaleGuard: !!_serverUpdatedAt,
    });

    const response = await fetch(buildAjaxUrl('winden_save_content'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonData,
    });

    const result = await response.json();
    const dbSaveEndTime = performance.now();
    log.debug('Save', 'Database response received', {
      durationMs: +(dbSaveEndTime - dbSaveStartTime).toFixed(2),
      success: result.success,
    });

    if (result.success) {
      // Track the new server timestamp for stale-write detection.
      // Flag _advancedBySave so a late-arriving fetch (raced by Nav's
      // auto-fix auto-save) cannot downgrade this fresher value.
      if (result.data?.updated_at) {
        _serverUpdatedAt = result.data.updated_at;
        _advancedBySave = true;
      }

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
      log.info('Save', 'Save completed', {
        durationMs: +(saveEndTime - saveStartTime).toFixed(2),
        updatedAt: result.data?.updated_at,
      });

      // Reset the unsaved-changes guard baseline (#13). Fired here
      // rather than inside useUnsavedChangesGuard so the moment of
      // truth is "server accepted" — not "save was attempted".
      window.dispatchEvent(new CustomEvent('winden:save-success'));

      // Trigger Style Guide refresh after successful save
      if (typeof window.refreshStyleGuide === 'function') {
        window.refreshStyleGuide();
      }
    } else {
      // Handle stale-write conflict
      if (result.data?.code === 'STALE_SAVE') {
        log.warn('Save', 'Stale write detected — another save occurred since last load', {
          serverUpdatedAt: result.data.server_updated_at,
        });
        if (result.data.server_updated_at) {
          _serverUpdatedAt = result.data.server_updated_at;
          _advancedBySave = true;
        }
        // Dispatch a custom event the StaleSaveBanner listens for —
        // non-blocking, gives the user two real recovery actions
        // (Reload, Copy changes) instead of a modal alert that drops
        // their work on the floor. See #4.
        window.dispatchEvent(new CustomEvent('winden:stale-write', {
          detail: {
            pending: {
              javascript: jsContentRef?.current ?? '',
              scss: scssContentRef?.current ?? '',
              wizzard: wizzardContentRef?.current ?? null,
              serverUpdatedAt: result.data.server_updated_at ?? null,
              clientUpdatedAt: _serverUpdatedAt,
              capturedAt: new Date().toISOString(),
            },
          },
        }));
      } else {
        log.error('Save', 'Save failed', { response: result.data });
      }
      const saveEndTime = performance.now();
      log.warn('Save', 'Save unsuccessful', {
        durationMs: +(saveEndTime - saveStartTime).toFixed(2),
      });
    }
  } catch (error) {
    const saveEndTime = performance.now();
    log.error('Save', 'Save threw an exception', {
      durationMs: +(saveEndTime - saveStartTime).toFixed(2),
      error: error instanceof Error ? error.message : String(error),
    });
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

    const response = await fetch(buildAjaxUrl('winden_update_wizzard_state'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonData,
    });

    const result = await response.json();

    if (result.success) {
      // Broadcast Wizzard update to other tabs
      windenBroadcast.postMessage({
        type: 'WIZZARD_UPDATED',
        timestamp: Date.now(),
        data: {
          wizzard: data.wizzard,
        },
      });

      // Trigger Style Guide refresh after Wizzard update
      if (typeof window.refreshStyleGuide === 'function') {
        window.refreshStyleGuide();
      }

      if (typeof callback === 'function') {
        callback();
      }
    } else {
      log.error('WizzardSave', 'Wizzard state update failed', { response: result.data });
    }
  } catch (error) {
    log.error('WizzardSave', 'Wizzard state update threw an exception', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

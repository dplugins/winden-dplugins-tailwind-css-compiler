/**
 * Global Window type declarations for Winden
 *
 * Eliminates the need for `(window as any)` casts throughout the codebase.
 * All window properties used by Winden are declared here.
 */

import type { StyleTab } from './styleTabs';

// ============================================
// Theme Data Types (from page builders)
// ============================================

/**
 * Theme data structure from FSE/Bricks/Oxygen
 */
interface ThemeData {
  colors?: Record<string, string> | Array<{ name: string; color: string }>;
  colorGroups?: Array<{ name: string; colors: Array<{ name: string; color: string }> }>;
  screens?: Record<string, string> | Array<{ name: string; value: string }>;
  fontSizes?: Record<string, string> | Array<{ name: string; size: string }>;
  fontFamilies?: Record<string, string> | Array<{ name: string; fontFamily: string }>;
  spacing?: Record<string, string> | Array<{ name: string; value: string }>;
  borderRadius?: Record<string, string> | Array<{ name: string; value: string }>;
}

/**
 * Font Hero data structure
 */
interface FontHeroData {
  fonts?: Array<{ family: string; variants: string[] }>;
}

// ============================================
// Monaco Editor Types
// ============================================

interface MonacoEnvironment {
  getWorkerUrl: (moduleId: string, label: string) => string;
}

// ============================================
// Winden Editor State
// ============================================

interface WindenEditorState {
  javascript?: string;
  scss?: string;
  wizzard?: unknown;
  compiled_scss?: string;
}

// ============================================
// Winden Data (from wp_localize_script)
// ============================================

interface WindenData {
  buildUrl?: string;
  ajaxUrl?: string;
  nonce?: string;
  pluginUrl?: string;
  uploadUrl?: string;
  websiteUrl?: string;
}

// ============================================
// Global Window Interface Extension
// ============================================

declare global {
  interface Window {
    // Monaco Editor
    MonacoEnvironment?: MonacoEnvironment;

    // WordPress AJAX (set via wp_localize_script)
    ajaxUrl?: string;
    websiteUrl?: string;
    uploadUrl?: string;
    pluginUrl?: string;
    nonce?: string;

    // Winden localized data
    windenData?: WindenData;

    // Tailwind compiler functions
    tailwindify?: (
      classes: string[],
      css: string,
      config: string,
      preprocessor: string
    ) => Promise<{ css?: string; error?: { message: string } }>;

    tailwindifyClasses?: (
      css: string,
      configContent?: string
    ) => Promise<string[]>;

    tailwindV4BundleCSS?: (css: string) => Promise<string>;

    // Winden internal state
    windenAutoCompile?: {
      ajaxUrl?: string;
      nonce?: string;
    };

    winden_editor?: WindenEditorState;

    windenStyleTabs?: StyleTab[] | {
      tabs: StyleTab[];
      combinedContent: string;
    };

    // Tailwind version setting
    settings_tailwind_version?: string;

    // Wizzard functions
    autoExtractBreakpoints?: () => void;

    // Style Guide refresh function
    refreshStyleGuide?: () => void;

    // Style Guide configuration extractor
    extractStyleGuideConfig?: (
      jsContent: string,
      wizardContent: string,
      stylesContent: string
    ) => Promise<{
      success: boolean;
      config: {
        theme?: Record<string, any>;
      };
    }>;

    // Theme data from page builders (set via wp_localize_script)
    fseThemeData?: ThemeData | string;
    bricksThemeData?: ThemeData | string;
    oxygenThemeData?: ThemeData | string;

    // Font Hero integration
    fontHeroData?: FontHeroData | string;
  }
}

// Ensure this file is treated as a module
export {};

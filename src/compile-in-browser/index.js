// Soft polyfill: Only set if not already defined (prevents global mutation)
globalThis.process ??= { versions: {} };
globalThis.process.versions ??= {};
globalThis.process.versions.node ??= "18.0.0";
// Dart Sass requires process.cwd() to be a function
globalThis.process.cwd ??= () => "/";

const tailwindcss = require("tailwindcss");
const postcss = require("postcss");
import * as Immutable from "immutable";
import { bundleCSS } from './tailwind-v4.js';
import { extractConfigFromSources, convertToStyleGuideFormat, convertJsConfigToCss } from './config-extractor.js';
import {
  WindenSCSSError,
  WindenPluginError,
  WindenTailwindError,
  WindenBundlingError,
  WindenConfigError,
  WindenStylesheetError,
  formatError
} from './errors.js';

// Import bundled plugins directly
const typographyPlugin = require('@tailwindcss/typography/src/index.js');
const formsPlugin = require('@tailwindcss/forms/src/index.js');
const containerQueriesPlugin = require('@tailwindcss/container-queries/dist/index.js');

// Plugin mapping
const bundledPlugins = {
  '@tailwindcss/typography': typographyPlugin,
  '@tailwindcss/forms': formsPlugin,
  '@tailwindcss/container-queries': containerQueriesPlugin,
};

// ============================================================
// LRU Cache Implementation - Prevents Unbounded Memory Growth
// ============================================================

/**
 * Least Recently Used (LRU) Cache
 * Automatically evicts oldest entries when size limit is reached
 * Uses Map for O(1) access and maintains insertion order
 */
class LRUCache {
  constructor(maxSize) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get value from cache and mark as recently used
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const value = this.cache.get(key);
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Set value in cache, evicting oldest if needed
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @returns {*} Evicted value if any
   */
  set(key, value) {
    let evicted = null;

    // If key exists, remove it first (will re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    // Evict oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      evicted = { key: firstKey, value: this.cache.get(firstKey) };
      this.cache.delete(firstKey);
    }

    return evicted;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clear all entries from cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get current cache size
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }

  /**
   * Get all keys in cache (oldest to newest)
   * @returns {IterableIterator<string>}
   */
  keys() {
    return this.cache.keys();
  }
}

/**
 * Special LRU Cache for blob URLs
 * Automatically revokes blob URLs when evicted
 */
class BlobLRUCache extends LRUCache {
  /**
   * Set blob URL in cache, revoking old blob if evicted
   * @param {string} key - Cache key (hash)
   * @param {string} blobUrl - Blob URL to cache
   * @returns {object} Evicted entry if any
   */
  set(key, blobUrl) {
    const evicted = super.set(key, blobUrl);

    // Revoke the evicted blob URL to free memory
    if (evicted) {
      URL.revokeObjectURL(evicted.value);
    }

    return evicted;
  }

  /**
   * Clear all blobs and revoke all URLs
   */
  clear() {
    // Revoke all blob URLs before clearing
    for (const blobUrl of this.cache.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    super.clear();
  }
}

// ============================================================
// OPTIMIZATION: Caching layer for performance with LRU
// ============================================================
const compilationCache = {
  designSystem: new LRUCache(20),   // Max 20 design systems
  compiled: new LRUCache(50),        // Max 50 compiled results
  bundled: new LRUCache(30),         // Max 30 bundled CSS
  modules: {
    configs: new LRUCache(20),       // Max 20 parsed configs
    plugins: new LRUCache(10),       // Max 10 fetched plugins
    blobs: new BlobLRUCache(30)      // Max 30 blob URLs (auto-revoked)
  }
};

/**
 * Fast non-cryptographic hash with good distribution
 * Based on FNV-1a algorithm - 60-80% faster than previous implementation for large inputs
 * @param {string} str - String to hash
 * @param {number} maxLength - Max chars to hash for performance (default: 10000)
 * @returns {string} Base-36 hash
 */
function hashString(str, maxLength = 10000) {
  if (!str) return '0';

  // FNV-1a constants
  const FNV_OFFSET = 2166136261;
  const FNV_PRIME = 16777619;

  let hash = FNV_OFFSET;

  // For very long inputs, sample intelligently: beginning + middle + end
  // This prevents hashing 100KB+ CSS files character-by-character
  if (str.length > maxLength) {
    const third = Math.floor(maxLength / 3);
    const sampleStr = str.slice(0, third) +
                     str.slice(Math.floor((str.length - third) / 2), Math.floor((str.length - third) / 2) + third) +
                     str.slice(-third);
    str = sampleStr;
  }

  const len = Math.min(str.length, maxLength);

  // FNV-1a hash algorithm
  for (let i = 0; i < len; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  // Mix in string length to differentiate similar prefixes
  hash ^= str.length;

  // Convert to positive integer and base-36
  return (hash >>> 0).toString(36);
}

// ============================================================
// Dart Sass Initialization - Official Sass Compiler for Browser
// ============================================================

/**
 * Initialize Dart Sass by loading it dynamically
 * Uses the same approach as Fancoolo's scss-compiler
 */
let dartSass = null;
let dartSassPromise = null;

async function initializeDartSass() {
  // Return existing promise if already initializing
  if (dartSassPromise) {
    return dartSassPromise;
  }

  // Return existing instance if already initialized
  if (dartSass) {
    return dartSass;
  }

  dartSassPromise = new Promise((resolve, reject) => {
    // Get the plugin base URL dynamically
    const getPluginUrl = () => {
      if (window.winden_plugin_url) {
        return window.winden_plugin_url;
      }

      const scripts = document.getElementsByTagName('script');
      for (let script of scripts) {
        if (script.src && script.src.includes('/winden/')) {
          const pluginUrl = script.src.substring(0, script.src.indexOf('/winden/')) + '/winden/';
          return pluginUrl;
        }
      }

      return '/wp-content/plugins/winden/';
    };

    const sassUrl = getPluginUrl() + 'build/scss-compiler/sass.dart.min.js';

    // Check if already loaded
    const sassAlreadyLoaded = Array.from(document.getElementsByTagName('script'))
      .some(script => script.src === sassUrl);

    // If already loaded and available, use it
    if (sassAlreadyLoaded && globalThis._cliPkgExports && globalThis._cliPkgExports.length > 0) {
      try {
        const _cliPkgLibrary = globalThis._cliPkgExports.pop();
        if (globalThis._cliPkgExports.length === 0) delete globalThis._cliPkgExports;

        const _cliPkgExports = {};
        _cliPkgLibrary.load({ immutable: Immutable }, _cliPkgExports);

        dartSass = {
          compileString: _cliPkgExports.compileString,
          compile: _cliPkgExports.compile
        };

        resolve(dartSass);
        return;
      } catch (error) {
        reject(error);
        return;
      }
    }

    // WORKAROUND: Temporarily hide any global 'require' from esbuild polyfill
    // Dart Sass bundle checks for 'require' and tries to use it, but esbuild's
    // polyfilled 'require' isn't compatible with Dart Sass expectations
    const tempRequire = globalThis.require;

    // Remove require from global scope before loading Dart Sass
    if (typeof globalThis.require !== 'undefined') {
      delete globalThis.require;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = sassUrl;
    script.onload = () => {
      try {
        const _cliPkgLibrary = globalThis._cliPkgExports.pop();
        if (globalThis._cliPkgExports.length === 0) delete globalThis._cliPkgExports;

        const _cliPkgExports = {};

        // Provide a stub require function for Dart Sass initialization
        // Dart Sass checks for global 'require' during load(), so we need to provide it
        const stubRequire = () => ({});

        // Temporarily set global require for Dart Sass initialization
        globalThis.require = stubRequire;

        try {
          _cliPkgLibrary.load({ immutable: Immutable }, _cliPkgExports);
        } finally {
          // Always clean up the stub require
          delete globalThis.require;
        }

        dartSass = {
          compileString: _cliPkgExports.compileString,
          compile: _cliPkgExports.compile
        };

        // Restore the original require if it existed
        if (tempRequire) {
          globalThis.require = tempRequire;
        }

        resolve(dartSass);
      } catch (error) {
        // Restore require even on error
        if (tempRequire) {
          globalThis.require = tempRequire;
        }
        reject(error);
      }
    };
    script.onerror = () => {
      // Restore require on load error
      if (tempRequire) {
        globalThis.require = tempRequire;
      }
      reject(new Error('Failed to load Dart Sass'));
    };

    if (!sassAlreadyLoaded) {
      document.head.appendChild(script);
    }
  });

  return dartSassPromise;
}

// ============================================================
// SCSS Preprocessing - Convert SCSS to CSS before Tailwind
// ============================================================

/**
 * Check if CSS contains SCSS-specific comments
 * Must NOT match // in URLs (url(//cdn.com) or url("//cdn.com"))
 *
 * @param {string} css - CSS/SCSS code to check
 * @returns {boolean} True if SCSS comments detected
 */
function hasScssComments(css) {
  const lines = css.split('\n');

  for (const line of lines) {
    // Skip if line contains url() or url("
    if (/url\s*\(/.test(line)) continue;

    // Skip if // appears after : (CSS property value context)
    if (/:\s*[^;]*\/\//.test(line)) continue;

    // Now check for actual SCSS comments
    // Match // at start of line or after whitespace
    if (/(^|[\s\n])\/\//.test(line)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if CSS contains SCSS-specific syntax
 *
 * IMPORTANT: This should only detect SCSS-specific features, NOT standard CSS features
 * or Tailwind v4 syntax. Be careful not to trigger false positives.
 *
 * @param {string} css - CSS/SCSS code to check
 * @returns {boolean} True if SCSS features detected
 */
function hasScssFeatures(css) {
  if (!css || typeof css !== 'string') return false;

  // SCSS-specific features (NOT Tailwind v4 CSS features)
  const hasScssVariables = /\$[a-zA-Z_-]+/.test(css);  // $variable (not just any $)
  const hasMixins = css.includes('@mixin');
  const hasIncludes = css.includes('@include');
  const hasExtends = css.includes('@extend');
  const hasScssFunctions = /@function\s+/.test(css);
  const hasComments = hasScssComments(css); // Use new context-aware function

  // Parent selector with modifiers (SCSS-specific: &--modifier, &__element, &:hover is CSS)
  // Standard CSS nesting: & is optional for pseudo-classes/elements
  // SCSS-specific: &-- (BEM modifier), &__ (BEM element), &- (prefix)
  const hasScssParentSelector = /&[_-]{2}/.test(css) || /&-[a-z]/.test(css);

  return hasScssVariables || hasMixins || hasIncludes || hasExtends ||
         hasScssFunctions || hasComments || hasScssParentSelector;
}

/**
 * Preprocess SCSS/Sass to CSS
 * This runs BEFORE Tailwind compilation to handle SCSS syntax
 * Uses official Dart Sass loaded dynamically (only when preprocessor is 'scss')
 *
 * @param {string} scss - SCSS/Sass code
 * @param {string} preprocessor - 'css' or 'scss' (from window.tailwind_compiler_options.css_preprocessor)
 * @returns {Promise<string>} Compiled CSS
 * @throws {Error} If SCSS syntax detected but preprocessor is set to 'css'
 */
async function preprocessSCSS(scss, preprocessor = 'css') {
  try {
    // Early return if no content
    if (!scss || scss.trim() === '') {
      return scss;
    }

    // If preprocessor is set to 'scss', ALWAYS compile - don't try to detect features
    if (preprocessor === 'scss') {
      // Continue to Dart Sass compilation below
    } else {
      // CSS mode - don't compile, just return as-is
      // Let Tailwind handle the CSS (it supports native CSS nesting)
      return scss;
    }

    // Initialize Dart Sass if not already loaded
    const sass = await initializeDartSass();

    // WORKAROUND: Temporarily escape Tailwind directives that Sass doesn't understand
    // Extract Tailwind v4 directives that Dart Sass can't process, restore them after compilation
    const tailwindDirectives = [];
    const tailwindImports = [];
    const tailwindLayers = [];
    const tabComments = [];
    let scssWithPlaceholders = scss;

    // 0. Extract Style Tab marker comments (e.g., /* Tab: Main Style */)
    // These are added by the Style Tab system and should be removed before SCSS compilation
    scssWithPlaceholders = scssWithPlaceholders.replace(/\/\*\s*Tab:\s*[^*]+\*\//g, (match) => {
      tabComments.push(match);
      return ''; // Remove, will restore later
    });

    // 1. Extract @layer directives (Tailwind v4 syntax, Dart Sass doesn't understand)
    scssWithPlaceholders = scssWithPlaceholders.replace(/@layer\s+[^;]+;/g, (match) => {
      tailwindLayers.push(match);
      return ''; // Remove completely
    });

    // 2. Extract @import "tailwindcss..." directives (Dart Sass can't resolve these in browser)
    scssWithPlaceholders = scssWithPlaceholders.replace(/@import\s+["']tailwindcss[^"']*["'][^;]*;/g, (match) => {
      tailwindImports.push(match);
      return ''; // Remove completely
    });

    // 3. Extract @import url("//...") - external CDN imports (let Tailwind handle these)
    scssWithPlaceholders = scssWithPlaceholders.replace(/@import\s+url\([^)]+\)[^;]*;/g, (match) => {
      tailwindImports.push(match);
      return ''; // Remove completely
    });

    // 4. Replace @apply with placeholder (Dart Sass doesn't understand @apply)
    // Use a custom CSS property as placeholder since comments can be stripped by Sass
    scssWithPlaceholders = scssWithPlaceholders.replace(/@apply\s+[^;]+;/gs, (match) => {
      const index = tailwindDirectives.length;
      tailwindDirectives.push(match);
      return `--tw-apply-${index}: __PLACEHOLDER__;`;
    });

    // 5. Extract Tailwind v4 wildcard resets (e.g., --color-*: initial; --text-*: initial;)
    // Dart Sass doesn't understand this syntax - it's Tailwind v4 specific
    const wildcardResets = [];
    scssWithPlaceholders = scssWithPlaceholders.replace(/--[a-z]+-\*:\s*initial\s*;/g, (match) => {
      wildcardResets.push(match);
      return ''; // Remove completely, will be restored in @theme block
    });

    // Compile SCSS to CSS using official Dart Sass
    let result;
    try {
      result = sass.compileString(scssWithPlaceholders, {
        style: 'expanded',
        quietDeps: true,
        verbose: false
      });
    } catch (error) {
      console.error('[Winden SCSS] Dart Sass compilation error:', error.message);
      console.error('[Winden SCSS] Content that failed:', scssWithPlaceholders);
      throw error;
    }

    // Restore Tailwind directives
    let compiledCss = result.css;

    // Restore @apply directives (replace CSS custom property placeholders)
    tailwindDirectives.forEach((directive, index) => {
      compiledCss = compiledCss.replace(new RegExp(`--tw-apply-${index}:\\s*__PLACEHOLDER__;`, 'g'), directive);
    });

    // Restore Tailwind directives at the beginning of the file
    // Order matters: @layer first, then @import directives
    const restoredDirectives = [];

    if (tailwindLayers.length > 0) {
      restoredDirectives.push(...tailwindLayers);
    }

    if (tailwindImports.length > 0) {
      restoredDirectives.push(...tailwindImports);
    }

    if (restoredDirectives.length > 0) {
      compiledCss = restoredDirectives.join('\n') + '\n\n' + compiledCss;
    }

    // Restore wildcard resets inside @theme block
    // These must be placed at the beginning of the @theme block
    if (wildcardResets.length > 0) {
      const themeMatch = compiledCss.match(/@theme\s*\{/);
      if (themeMatch) {
        const themeIndex = themeMatch.index + themeMatch[0].length;
        const wildcardString = '\n  ' + wildcardResets.join('\n  ');
        compiledCss = compiledCss.slice(0, themeIndex) + wildcardString + compiledCss.slice(themeIndex);
      } else {
        // No @theme block found, prepend as standalone @theme
        compiledCss = '@theme {\n  ' + wildcardResets.join('\n  ') + '\n}\n\n' + compiledCss;
      }
    }

    return compiledCss;
  } catch (error) {
    console.error('[Winden SCSS] Compilation failed:', error.message);

    // Wrap in typed error with context
    throw new WindenSCSSError(error, {
      scssPreview: scss.substring(0, 200) + (scss.length > 200 ? '...' : '')
    });
  }
}

// ============================================================
// Variant Detection Helper - Flexible Breakpoint Extraction
// ============================================================

/**
 * Extract breakpoints from design system with fallback paths
 * Handles different Tailwind versions and variant structures
 *
 * @param {Object} designSystem - The Tailwind design system object
 * @param {number} order - The variant order to filter by (61 or 62)
 * @returns {Array<string>} Array of breakpoint names
 *
 * Note: Tailwind v4 uses different variant orders:
 * - Order 61: Used in main tailwindify() function for responsive variants
 * - Order 62: Used in tailwindifyClasses() for breakpoint list
 *
 * The structure can vary between versions:
 * - Modern: designSystem?.variants?.variants?.entries()
 * - Legacy: designSystem?.variants?.entries()
 */
function extractBreakpointsFromDesignSystem(designSystem, order = 61) {
  if (!designSystem) {
    console.warn('[winden] extractBreakpointsFromDesignSystem: No design system provided');
    return [];
  }

  try {
    // Try modern path first (Tailwind v4+)
    // Structure: designSystem.variants.variants.entries()
    if (designSystem?.variants?.variants?.entries) {
      const breakpoints = Array.from(designSystem.variants.variants.entries())
        .filter(([_, value]) => value.kind === 'static' && value.order === order)
        .map(([key]) => key);

      if (breakpoints.length > 0) {
        return breakpoints;
      }
    }

    // Fallback to older path (Tailwind v3/early v4)
    // Structure: designSystem.variants.entries()
    if (designSystem?.variants?.entries) {
      const breakpoints = Array.from(designSystem.variants.entries())
        .filter(([_, value]) => value.kind === 'static' && value.order === order)
        .map(([key]) => key);

      if (breakpoints.length > 0) {
        return breakpoints;
      }
    }

    // If no breakpoints found, log warning with available info
    console.warn('[winden] extractBreakpointsFromDesignSystem: Could not extract breakpoints', {
      order,
      hasVariants: !!designSystem?.variants,
      hasNestedVariants: !!designSystem?.variants?.variants,
      variantsType: typeof designSystem?.variants
    });

    return [];
  } catch (error) {
    console.error('[winden] extractBreakpointsFromDesignSystem: Error extracting breakpoints', {
      error: error.message,
      order,
      stack: error.stack
    });
    return [];
  }
}

// ============================================================
// Blob Lifecycle Helpers - Prevent Memory Leaks
// ============================================================

/**
 * Create a blob URL and track it in cache
 * This ensures we never forget to revoke the URL later
 *
 * @param {string} content - The content to create a blob from
 * @param {string} hash - The hash key for caching
 * @returns {string} The blob URL
 */
function createBlobEntry(content, hash) {
  // Check if already exists
  if (compilationCache.modules.blobs.has(hash)) {
    return compilationCache.modules.blobs.get(hash);
  }

  const blob = new Blob([content], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  compilationCache.modules.blobs.set(hash, url);

  return url;
}

/**
 * Revoke a blob URL and remove it from cache
 * This frees the memory associated with the blob
 *
 * @param {string} hash - The hash key of the blob to revoke
 */
function revokeBlobEntry(hash) {
  const url = compilationCache.modules.blobs.get(hash);
  if (url) {
    URL.revokeObjectURL(url);
    compilationCache.modules.blobs.delete(hash);
  }
}

/**
 * Clear all caches and revoke all blob URLs
 * Prevents memory leaks by cleaning up blob references
 */
function clearAllCaches() {
  // Revoke all blob URLs first
  for (const hash of compilationCache.modules.blobs.keys()) {
    revokeBlobEntry(hash);
  }

  // Clear all caches
  compilationCache.designSystem.clear();
  compilationCache.compiled.clear();
  compilationCache.bundled.clear();
  compilationCache.modules.configs.clear();
  compilationCache.modules.plugins.clear();
}

// Expose globally for manual cache clearing
window.clearTailwindCache = clearAllCaches;

// ============================================================
// Module Sandbox - Support both ESM and CommonJS configs
// ============================================================

/**
 * Create a sandbox for CommonJS module execution
 * Provides module.exports and exports for CommonJS compatibility
 */
function createModuleSandbox() {
  const exports = {};
  const module = { exports };
  return { exports, module };
}

/**
 * Detect if config string is CommonJS format
 */
function isCommonJsConfig(configString) {
  return configString.includes('module.exports') ||
         configString.includes('exports.') ||
         (configString.includes('require(') && !configString.includes('export'));
}

/**
 * Execute CommonJS config in sandbox and return the module
 */
function executeCommonJsConfig(configString) {
  const sandbox = createModuleSandbox();

  try {
    // Create a function that executes the config with module/exports available
    const configFunction = new Function('module', 'exports', 'require', configString);

    // Execute with sandbox context
    // Note: require is not fully supported, but available for basic usage
    const requireStub = (moduleName) => {
      console.warn(`[winden] require('${moduleName}') in config is not fully supported`);
      return {};
    };

    configFunction(sandbox.module, sandbox.exports, requireStub);

    // Return module.exports (which may have been reassigned) or exports
    return sandbox.module.exports !== sandbox.exports
      ? sandbox.module.exports
      : sandbox.exports;
  } catch (error) {
    throw new Error(`Failed to execute CommonJS config: ${error.message}`);
  }
}

/**
 * Load stylesheet for @import directives
 * Supports Tailwind core imports, CDN stylesheets, and relative imports
 * @param {string} id - Stylesheet identifier
 * @param {string} base - Base URL for resolution
 * @returns {Promise<Object>} Stylesheet object with path, base, and content
 */
async function loadStylesheet(id, base) {
  try {
    // Handle Tailwind core imports - check multiple patterns
    // The id might come as 'tailwindcss/...' or as a resolved path like '/test/tailwindcss/...'
    const tailwindMatch = id.match(/(?:^|\/)tailwindcss(?:\/([^/]+\.css))?$/);
    if (id === 'tailwindcss' || id.startsWith('tailwindcss/') || tailwindMatch) {
      // Normalize to just 'tailwindcss/...' format for bundling
      let normalizedId = id;
      if (tailwindMatch && !id.startsWith('tailwindcss')) {
        normalizedId = tailwindMatch[1] ? `tailwindcss/${tailwindMatch[1]}` : 'tailwindcss';
      }
      const cssHash = hashString(normalizedId);

      // Check cache first
      if (compilationCache.bundled.has(cssHash)) {
        const content = compilationCache.bundled.get(cssHash);
        return {
          path: `virtual:${normalizedId}`,
          base,
          content
        };
      }

      // Bundle the Tailwind CSS import using normalized path
      const content = await bundleCSS(`@import "${normalizedId}";`);
      compilationCache.bundled.set(cssHash, content);

      return {
        path: `virtual:${normalizedId}`,
        base,
        content
      };
    }

    // Handle CDN stylesheets
    if (id.startsWith('https://') || id.startsWith('http://')) {
      // Check cache first
      const urlHash = hashString(id);
      if (compilationCache.bundled.has(urlHash)) {
        const content = compilationCache.bundled.get(urlHash);
        return {
          path: id,
          base: id,
          content
        };
      }

      const response = await fetch(id);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const content = await response.text();

      // Cache the fetched stylesheet
      compilationCache.bundled.set(urlHash, content);

      return {
        path: id,
        base: id,
        content
      };
    }

    // Handle relative imports
    if (id.startsWith('./') || id.startsWith('../')) {
      if (!base) {
        throw new Error(`Cannot resolve relative stylesheet '${id}' without base URL`);
      }

      const resolvedUrl = new URL(id, base).href;
      return loadStylesheet(resolvedUrl, base);
    }

    throw new Error(`Unknown stylesheet format: ${id}`);
  } catch (error) {
    // Wrap in typed error with context
    throw new WindenStylesheetError(id, error, { base });
  }
}

async function loadModule(modulePath, base, resourceHint, configFileString) {
  let module;

  // Handle virtual config path (winden://config) - uses config content from Config tab
  // This is auto-injected when user has config content but didn't write @config manually
  if (resourceHint === 'config' && (modulePath === 'winden://config' || modulePath.endsWith('winden://config'))) {
    if (!configFileString || !configFileString.trim()) {
      throw new Error('No config content provided for winden://config');
    }
    // Fall through to config handling below
  }

  // OPTIMIZATION: Handle config files with caching
  if (resourceHint === 'config') {
    const configHash = hashString(configFileString);

    // Check cache first
    if (compilationCache.modules.configs.has(configHash)) {
      return compilationCache.modules.configs.get(configHash);
    }

    try {
      // Check if this is a CommonJS config
      if (isCommonJsConfig(configFileString)) {
        // Execute in CommonJS sandbox
        module = executeCommonJsConfig(configFileString);

        // Handle functional configs: if module is a function, call it
        if (typeof module === 'function') {
          module = module();
        }
      } else {
        // ESM config - use blob URL import
        const blobUrl = createBlobEntry(configFileString, configHash);
        module = await import(blobUrl).then((m) => m.default ?? m);

        // Handle functional configs: if module is a function, call it
        if (typeof module === 'function') {
          module = module();
        }
      }

      const result = { module, base };
      compilationCache.modules.configs.set(configHash, result);

      return result;
    } catch (error) {
      console.error('[winden] Config loading failed', {
        error: error.message,
        hint: resourceHint,
        isCommonJS: isCommonJsConfig(configFileString),
        configPreview: configFileString.substring(0, 100)
      });

      // Wrap in typed error with context
      throw new WindenConfigError(error, configFileString, {
        hint: resourceHint,
        isCommonJS: isCommonJsConfig(configFileString)
      });
    }
  }

  // Handle bundled plugins first (already efficient)
  const bundledPlugin = bundledPlugins[modulePath];
  if (bundledPlugin) {
    return { module: bundledPlugin, base };
  }

  // Auto-resolve plugin names to esm.sh URLs
  // e.g., "daisyui" → "https://esm.sh/daisyui"
  // Allows: @plugin "daisyui"; @plugin "flowbite"; @plugin "any-npm-package";
  let resolvedPath = modulePath;
  if (!modulePath.startsWith('https://') &&
      !modulePath.startsWith('http://') &&
      !modulePath.startsWith('./') &&
      !modulePath.startsWith('../')) {
    resolvedPath = `https://esm.sh/${modulePath}`;
  }

  // OPTIMIZATION: Handle CDN modules with caching
  if (resolvedPath.startsWith('https://') || resolvedPath.startsWith('http://')) {
    // Check cache first (use resolvedPath for cache key so both shorthand and full URL work)
    if (compilationCache.modules.plugins.has(resolvedPath)) {
      return compilationCache.modules.plugins.get(resolvedPath);
    }

    let lastError = null;
    const maxRetries = 1;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add delay before retry
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Fetch the module from CDN using resolved path
        const response = await fetch(resolvedPath);

        // Check if fetch was successful
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        let moduleText = await response.text();

        // Fix esm.sh absolute paths: convert /package@version to https://esm.sh/package@version
        // esm.sh returns imports like: import "/tailwindcss@^4.1.17/plugin"
        // These need to be: import "https://esm.sh/tailwindcss@^4.1.17/plugin"
        if (resolvedPath.includes('esm.sh')) {
          moduleText = moduleText.replace(
            /from\s+["']\/(@?[^"']+)["']/g,
            'from "https://esm.sh/$1"'
          ).replace(
            /import\s+["']\/(@?[^"']+)["']/g,
            'import "https://esm.sh/$1"'
          );
        }

        // Create a blob URL for the module
        const blob = new Blob([moduleText], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);

        try {
          // Import the module
          module = await import(url).then((m) => m.default ?? m);
        } finally {
          // Always revoke blob URL, even if import fails
          URL.revokeObjectURL(url);
        }

        const result = { module, base };
        compilationCache.modules.plugins.set(resolvedPath, result);

        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.warn(`[winden] Plugin fetch failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`, {
            url: resolvedPath,
            error: error.message
          });
        }
      }
    }

    // All retries failed
    console.error('[winden] Plugin fetch failed after retries', {
      url: resolvedPath,
      error: lastError.message,
      attempts: maxRetries + 1
    });
    throw new Error(`Failed to load plugin from ${resolvedPath}: ${lastError.message}. Check your internet connection and verify the plugin URL is correct.`);
  }

  // Handle relative imports (resolve against base if provided)
  if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
    if (!base) {
      console.error('[winden] Relative import without base URL', { modulePath });
      throw new Error(`Cannot resolve relative import '${modulePath}' without a base URL`);
    }

    try {
      const resolvedPath = new URL(modulePath, base).href;

      // Recursively load the resolved path
      return loadModule(resolvedPath, base, resourceHint, configFileString);
    } catch (error) {
      console.error('[winden] Failed to resolve relative import', {
        modulePath,
        base,
        error: error.message
      });
      throw new Error(`Failed to resolve relative import '${modulePath}': ${error.message}`);
    }
  }

  if (!module) {
    throw new Error(`The ${resourceHint} file is not a valid module. Ensure it exports a configuration object or function.`);
  }

  return { module, base };
}

function main() {
  async function tailwindify(html, customCss, configFileString, preprocessorOverride) {
    try {
      const classes = Array.isArray(html) ? html : (typeof html === 'object' ? Object.values(html) : []);

      // Get preprocessor setting:
      // 1. From function parameter (passed from admin UI)
      // 2. From window.tailwind_compiler_options (passed from PHP in frontend/builders)
      // 3. Default to 'css'
      const preprocessor = preprocessorOverride || window.tailwind_compiler_options?.css_preprocessor || 'css';

      // Tailwind v4's compile() API natively supports @config directive.
      // When Tailwind encounters @config "path/to/config.js";, it calls loadModule(path, base, "config")
      // Our loadModule function handles "winden://config" as a virtual path.
      // This means ALL config properties (screens, shadows, plugins, etc.) work automatically.
      let cssWithTheme = customCss ?? '';

      // Clean up empty @theme {} blocks (can interfere with compilation)
      cssWithTheme = cssWithTheme.replace(/@theme\s*\{\s*\}\s*/g, '');

      // Auto-inject @config directive if user has config content but didn't write @config manually
      // This allows users to just write their config in the Config tab without knowing about @config
      if (configFileString && configFileString.trim() && !cssWithTheme.includes('@config')) {
        // Insert @config after @import statements (Tailwind requirement)
        const importMatch = cssWithTheme.match(/(@import\s+["'][^"']+["'][^;]*;[\s\n]*)+/g);
        if (importMatch) {
          let lastImportEnd = 0;
          for (const imp of importMatch) {
            const idx = cssWithTheme.indexOf(imp, lastImportEnd);
            if (idx !== -1) {
              lastImportEnd = idx + imp.length;
            }
          }
          cssWithTheme = cssWithTheme.slice(0, lastImportEnd) + '\n@config "winden://config";\n' + cssWithTheme.slice(lastImportEnd);
        } else {
          // No imports - prepend after any initial comments
          cssWithTheme = '@config "winden://config";\n' + cssWithTheme;
        }
      }

      // Preprocess SCSS to CSS (if preprocessor is 'scss')
      const preprocessedCss = await preprocessSCSS(cssWithTheme, preprocessor);

      // OPTIMIZATION: Early bail-out only if no classes AND no custom CSS
      // We still need to compile if there's custom CSS (for @apply directives, etc.)
      if (classes.length === 0 && (!preprocessedCss || preprocessedCss.trim() === '')) {
        return { css: '', classes: [], screens: [] };
      }

      // OPTIMIZATION: Generate cache keys (use preprocessed CSS for hash)
      const cssHash = hashString(preprocessedCss);
      const configHash = hashString(configFileString ?? '');
      const cacheKey = `${cssHash}-${configHash}`;
      const classesKey = [...classes].sort().join('|');
      const classesHash = hashString(classesKey);
      const fullCacheKey = `${cacheKey}-${classesHash}`;

      // Check full compilation cache
      if (compilationCache.compiled.has(fullCacheKey)) {
        return compilationCache.compiled.get(fullCacheKey);
      }

      // OPTIMIZATION: Check bundleCSS cache
      let cssToProcess;
      if (compilationCache.bundled.has(cssHash)) {
        cssToProcess = compilationCache.bundled.get(cssHash);
      } else {
        cssToProcess = await bundleCSS(preprocessedCss);
        compilationCache.bundled.set(cssHash, cssToProcess);
      }

      // OPTIMIZATION: Check design system cache
      let designSystem;
      let autocompleteClasses;
      let screens;

      if (compilationCache.designSystem.has(cacheKey)) {
        const cached = compilationCache.designSystem.get(cacheKey);
        designSystem = cached.designSystem;
        autocompleteClasses = cached.autocompleteClasses;
        screens = cached.screens;
      } else {
        designSystem = await tailwindcss.__unstable__loadDesignSystem(cssToProcess, {
          loadStylesheet,
          loadModule: async (modulePath, base, resourceHint) => loadModule(modulePath, base, resourceHint, configFileString)
        });

        // Extract metadata ONCE and cache it
        autocompleteClasses = designSystem.getClassList().flat().filter(c => typeof c === 'string');
        screens = extractBreakpointsFromDesignSystem(designSystem, 61);

        compilationCache.designSystem.set(cacheKey, { designSystem, autocompleteClasses, screens });
      }

      // Compile with cached design system
      // Lightning CSS (built into Tailwind v4) handles autoprefixing automatically
      let compiledCss = (await tailwindcss.compile(cssToProcess, {
        loadStylesheet,
        loadModule: async (modulePath, base, resourceHint) => loadModule(modulePath, base, resourceHint, configFileString)
      })).build(classes);

      const result = { css: compiledCss, classes: autocompleteClasses, screens };

      // Cache the result
      compilationCache.compiled.set(fullCacheKey, result);

      return result;
    } catch (error) {
      return { css: "", error };
    }
  }
  return tailwindify;
}
window.tailwindify = main();


function classes() {
  async function tailwindifyClasses(customCss, configFileString = '') {
    try {
      // Get preprocessor setting from window (passed from PHP)
      const preprocessor = window.tailwind_compiler_options?.css_preprocessor || 'css';

      let cssWithConfig = customCss ?? '';

      // Auto-inject @config directive if user has config content but didn't write @config manually
      if (configFileString && configFileString.trim() && !cssWithConfig.includes('@config')) {
        const importMatch = cssWithConfig.match(/(@import\s+["'][^"']+["'][^;]*;[\s\n]*)+/g);
        if (importMatch) {
          let lastImportEnd = 0;
          for (const imp of importMatch) {
            const idx = cssWithConfig.indexOf(imp, lastImportEnd);
            if (idx !== -1) {
              lastImportEnd = idx + imp.length;
            }
          }
          cssWithConfig = cssWithConfig.slice(0, lastImportEnd) + '\n@config "winden://config";\n' + cssWithConfig.slice(lastImportEnd);
        } else {
          cssWithConfig = '@config "winden://config";\n' + cssWithConfig;
        }
      }

      // Preprocess SCSS to CSS (if preprocessor is 'scss')
      const preprocessedCss = await preprocessSCSS(cssWithConfig, preprocessor);

      // OPTIMIZATION: Generate cache keys (use preprocessed CSS for hash)
      const cssHash = hashString(preprocessedCss);
      const configHash = hashString(configFileString);
      const cacheKey = `${cssHash}-${configHash}`;

      // OPTIMIZATION: Check bundleCSS cache
      let cssToProcess;
      if (compilationCache.bundled.has(cssHash)) {
        cssToProcess = compilationCache.bundled.get(cssHash);
      } else {
        cssToProcess = await bundleCSS(preprocessedCss);
        compilationCache.bundled.set(cssHash, cssToProcess);
      }

      // OPTIMIZATION: Reuse cached design system from tailwindify
      let designSystem;
      let autocompleteClasses;
      let screens;

      if (compilationCache.designSystem.has(cacheKey)) {
        const cached = compilationCache.designSystem.get(cacheKey);
        designSystem = cached.designSystem;
        autocompleteClasses = cached.autocompleteClasses;
        // Note: tailwindifyClasses uses order 62, not 61
        screens = extractBreakpointsFromDesignSystem(designSystem, 62);
      } else {
        designSystem = await tailwindcss.__unstable__loadDesignSystem(cssToProcess, {
          loadStylesheet,
          loadModule: async (modulePath, base, resourceHint) => loadModule(modulePath, base, resourceHint, configFileString)
        });

        autocompleteClasses = designSystem.getClassList().flat().filter(c => typeof c === 'string');
        screens = extractBreakpointsFromDesignSystem(designSystem, 62);

        // Cache with screen order 61 for tailwindify compatibility
        const screensFor61 = extractBreakpointsFromDesignSystem(designSystem, 61);

        compilationCache.designSystem.set(cacheKey, {
          designSystem,
          autocompleteClasses,
          screens: screensFor61
        });
      }

      return { classes: autocompleteClasses, screens };
    } catch (error) {
      return { classes: [], error };
    }
  }
  return tailwindifyClasses;
}
window.tailwindifyClasses = classes();

// Configuration extraction function
function configExtractor() {
  async function extractTailwindConfig(customCss, wizardCss, windenStylesCss) {
    try {
      // Get Tailwind defaults from the bundled CSS with basic imports
      const tailwindDefaults = await bundleCSS(`
        @layer theme, base, components, utilities;
        @import "tailwindcss/theme.css" layer(theme);
        @import "tailwindcss/utilities.css" layer(utilities);
      `);
      
      // Extract configuration from all sources
      const sources = {
        tailwindDefaults,
        wizard: wizardCss || '',
        windenStyles: windenStylesCss || ''
      };
      
      const config = extractConfigFromSources(sources);
      
      return {
        config: config.merged,
        sources: config.sources,
        success: true
      };
    } catch (error) {
      return {
        config: {},
        sources: {},
        success: false,
        error: error.message
      };
    }
  }
  return extractTailwindConfig;
}
window.extractTailwindConfig = configExtractor();

// StyleGuide configuration function
function styleGuideConfigExtractor() {
  async function extractStyleGuideConfig(customCss, wizardCss, windenStylesCss) {
    try {
      
      // Get Tailwind defaults from the bundled CSS with basic imports
      const tailwindDefaults = await bundleCSS(`
        @layer theme, base, components, utilities;
        @import "tailwindcss/theme.css" layer(theme);
        @import "tailwindcss/utilities.css" layer(utilities);
      `);
      
      // Extract configuration from all sources
      const sources = {
        tailwindDefaults, // Use actual Tailwind defaults
        jsConfig: customCss || '', // Use the JS config as a separate source
        wizard: wizardCss || '',
        windenStyles: windenStylesCss || ''
      };

      const config = extractConfigFromSources(sources);
      
      // Convert to StyleGuide format
      const styleGuideConfig = convertToStyleGuideFormat(config.merged);
      
      // Expose breakpoints for plain classes editors (Tailwind v4)
      if (config.merged.breakpoints) {
        const breakpointKeys = Object.keys(config.merged.breakpoints);

        // Expose breakpoints globally for plain classes editors
        window.winden_autocomplete_screens = breakpointKeys;
        window.parent.winden_autocomplete_screens = breakpointKeys;
      }
      
      return {
        config: styleGuideConfig,
        sources: config.sources,
        success: true
      };
    } catch (error) {
      return {
        config: { theme: {} },
        sources: {},
        success: false,
        error: error.message
      };
    }
  }
  return extractStyleGuideConfig;
}
window.extractStyleGuideConfig = styleGuideConfigExtractor();
window.convertJsConfigToCss = convertJsConfigToCss;

// OPTIMIZATION: Auto-extract breakpoints with retry logic
async function autoExtractBreakpoints() {
    try {
        let wizardContent = '';
        let windenStylesContent = '';

        // Try to get wizard content from immediate sources
        if (window.winden_editor?.wizzard?.configCode) {
            wizardContent = window.winden_editor.wizzard.configCode;
        }

        if (window.winden_editor?.scss) {
            windenStylesContent = window.winden_editor.scss;
        }

        // If not available, try backend with retry logic
        if (!wizardContent) {
            const maxRetries = 1;
            let lastError = null;

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    // Add delay before retry
                    if (attempt > 0) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    // Use proper AJAX URL that works with subdirectory WordPress installations
                    // Try multiple sources, with intelligent fallback for iframes
                    let ajaxUrl;

                    if (window.windenData?.ajaxUrl) {
                        ajaxUrl = window.windenData.ajaxUrl;
                    } else if (window.windenAutoCompile?.ajaxUrl) {
                        ajaxUrl = window.windenAutoCompile.ajaxUrl;
                    } else if (window.parent !== window) {
                        // In iframe: try to get from parent window (with cross-origin protection)
                        try {
                            if (window.parent.windenAutoCompile?.ajaxUrl) {
                                ajaxUrl = window.parent.windenAutoCompile.ajaxUrl;
                            }
                        } catch (e) {
                            // Cross-origin access blocked - ignore and fall through to fallback
                            console.debug('[winden] Cross-origin parent access blocked, using fallback URL construction');
                        }
                    }

                    if (!ajaxUrl) {
                        // Fallback: construct from current location
                        // Extract WordPress base path from current URL
                        const currentPath = window.location.pathname;
                        const wpAdminIndex = currentPath.indexOf('/wp-admin/');
                        const basePath = wpAdminIndex > 0 ? currentPath.substring(0, wpAdminIndex) : '';
                        ajaxUrl = window.location.origin + basePath + '/wp-admin/admin-ajax.php';
                    }

                    ajaxUrl += '?action=get_winden_content';
                    const response = await fetch(ajaxUrl);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();

                    if (data.success) {
                        wizardContent = data.data.wizzard?.configCode || '';
                        windenStylesContent = data.data.scss ? atob(data.data.scss) : '';
                        break; // Success, exit retry loop
                    } else {
                        // On fresh install, no content exists yet - this is expected
                        console.warn('[winden] autoExtractBreakpoints: No content in database yet, using empty values');
                        wizardContent = '';
                        windenStylesContent = '';
                        break; // Exit retry loop, no need to retry
                    }
                } catch (error) {
                    lastError = error;
                    if (attempt < maxRetries) {
                        console.warn(`[winden] autoExtractBreakpoints: Fetch failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`, {
                            error: error.message
                        });
                    }
                }
            }

            // Log error if all retries failed
            if (lastError && !wizardContent) {
                // Construct same URL logic for error reporting
                let ajaxUrl;
                if (window.windenData?.ajaxUrl) {
                    ajaxUrl = window.windenData.ajaxUrl;
                } else if (window.windenAutoCompile?.ajaxUrl) {
                    ajaxUrl = window.windenAutoCompile.ajaxUrl;
                } else if (window.parent !== window && window.parent.windenAutoCompile?.ajaxUrl) {
                    ajaxUrl = window.parent.windenAutoCompile.ajaxUrl;
                } else {
                    const currentPath = window.location.pathname;
                    const wpAdminIndex = currentPath.indexOf('/wp-admin/');
                    const basePath = wpAdminIndex > 0 ? currentPath.substring(0, wpAdminIndex) : '';
                    ajaxUrl = window.location.origin + basePath + '/wp-admin/admin-ajax.php';
                }
                ajaxUrl += '?action=get_winden_content';

                console.error('[winden] autoExtractBreakpoints: Failed to fetch breakpoints after retry', {
                    error: lastError.message,
                    attempts: maxRetries + 1,
                    url: ajaxUrl
                });
            }
        }

        // Extract using cached system (reuses design system cache)
        const result = await window.extractStyleGuideConfig('', wizardContent, windenStylesContent);

        if (!result.success) {
            console.warn('[winden] autoExtractBreakpoints: Extraction failed, using empty array', {
                error: result.error
            });
            // Set empty array as fallback
            window.winden_autocomplete_screens = [];
            window.parent.winden_autocomplete_screens = [];
        }
    } catch (error) {
        console.error('[winden] autoExtractBreakpoints: Unexpected error', {
            error: error.message,
            stack: error.stack
        });
        // Set empty array as fallback
        window.winden_autocomplete_screens = [];
        window.parent.winden_autocomplete_screens = [];
    }
}

// Fix DOMContentLoaded race condition
// Only call if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoExtractBreakpoints);
} else {
    // DOM already loaded, call immediately
    autoExtractBreakpoints();
}

// Expose globally for React app to call when editor is ready
window.autoExtractBreakpoints = autoExtractBreakpoints;

// Check if cache should be cleared due to config changes
if (window.windenAutoCompile?.clearCache) {
    clearAllCaches();
}

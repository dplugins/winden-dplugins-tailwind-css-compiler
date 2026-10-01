// Soft polyfill: Only set if not already defined (prevents global mutation)
globalThis.process ??= { versions: {} };
globalThis.process.versions ??= {};
globalThis.process.versions.node ??= "18.0.0";
// Dart Sass requires process.cwd() to be a function
globalThis.process.cwd ??= () => "/";

/**
 * Get the WordPress AJAX URL from available sources
 *
 * WordPress.org requirement: Never hardcode /wp-admin/admin-ajax.php
 * The URL must be provided via wp_localize_script in PHP using admin_url('admin-ajax.php')
 *
 * @returns {string|null} The AJAX URL or null if not available
 */
function getWindenAjaxUrl() {
  // Check all possible sources where PHP might have set the AJAX URL
  if (window.windenData?.ajaxUrl) {
    return window.windenData.ajaxUrl;
  }
  if (window.windenAutoCompile?.ajaxUrl) {
    return window.windenAutoCompile.ajaxUrl;
  }
  if (window.ajaxUrl) {
    return window.ajaxUrl;
  }
  if (window.ajaxurl) {
    // WordPress admin pages set this globally
    return window.ajaxurl;
  }

  // Try parent window (for iframes) with cross-origin protection
  if (window.parent !== window) {
    try {
      if (window.parent.windenAutoCompile?.ajaxUrl) {
        return window.parent.windenAutoCompile.ajaxUrl;
      }
      if (window.parent.windenData?.ajaxUrl) {
        return window.parent.windenData.ajaxUrl;
      }
      if (window.parent.ajaxUrl) {
        return window.parent.ajaxUrl;
      }
      if (window.parent.ajaxurl) {
        return window.parent.ajaxurl;
      }
    } catch (e) {
      // Cross-origin access blocked - this is expected for cross-origin iframes
      console.debug('[winden:compiler] Cross-origin parent access blocked');
    }
  }

  // No AJAX URL found - return null (caller must handle this case)
  return null;
}

const tailwindcss = require("tailwindcss");
import * as Immutable from "immutable";
import { resolveTailwindStylesheet } from './tailwind-v4.js';
import { extractThemeConfig, convertToStyleGuideFormat } from './config-extractor.js';
import { componentClassNames } from '../winden-classes/core/component-classes';
import {
  WindenCompilationError,
  WindenSCSSError,
  WindenPluginError,
  WindenTailwindError,
  WindenConfigError,
  WindenStylesheetError,
  formatError
} from './errors.js';

// Import bundled plugins directly
const typographyPlugin = require('@tailwindcss/typography/src/index.js');
const formsPlugin = require('@tailwindcss/forms/src/index.js');

/**
 * `@tailwindcss/container-queries` is a no-op on purpose. Container queries
 * are built into Tailwind v4 (`@container`, `@sm:`, `@min-[400px]:`,
 * `--container-*` in @theme, `theme.containers` in a JS config) — and the
 * v3-era plugin actively hurts: its own `containers` theme replaces the
 * `--container-*` namespace with the old list, so `max-w-2xs` / `max-w-3xs`
 * stop compiling. Sites that still declare the plugin keep compiling
 * (the id resolves), they just get the native behaviour.
 */
let warnedAboutContainerQueries = false;
const containerQueriesNoop = () => {
  if (!warnedAboutContainerQueries) {
    warnedAboutContainerQueries = true;
    console.info('[winden] `@plugin "@tailwindcss/container-queries"` does nothing in Tailwind v4 — container queries are built in. The line can be removed from the Style tab.');
  }
};

// Plugin mapping
const bundledPlugins = {
  '@tailwindcss/typography': typographyPlugin,
  '@tailwindcss/forms': formsPlugin,
  '@tailwindcss/container-queries': containerQueriesNoop,
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
  compiler: new LRUCache(20),        // Max 20 incremental compilers (see loadCompiler)
  compiled: new LRUCache(50),        // Max 50 compiled results
  preprocessed: new LRUCache(20),    // Max 20 Sass outputs, keyed by the exact input (see preprocessSCSS)
  bundled: new LRUCache(30),         // Max 30 fetched http(s) stylesheets
  modules: {
    configs: new LRUCache(20),       // Max 20 parsed configs
    plugins: new LRUCache(10),       // Max 10 fetched plugins
    blobs: new BlobLRUCache(30)      // Max 30 blob URLs (auto-revoked)
  }
};

// In-flight design-system loads, keyed by the same cacheKey the LRU cache
// uses. Sequential callers always hit the LRU cache. CONCURRENT callers
// (e.g. tailwindify() and tailwindifyClasses() firing on the same Wizzard
// update) would otherwise both miss and both compute. This Map ensures the
// second caller awaits the first caller's promise instead. See #16.
const inflightDesignSystemLoads = new Map();

/**
 * Load (or reuse) a Tailwind design system + extract its class list.
 * Three layers: LRU cache hit → in-flight promise hit → fresh compute.
 *
 * Returns `{ designSystem, autocompleteClasses, screens }`; `screens` is the
 * breakpoint list every entry point shares (see extractBreakpointsFromDesignSystem).
 */
async function loadDesignSystem(cacheKey, cssToProcess, configFileString) {
  // 1. Cache hit — return immediately.
  if (compilationCache.designSystem.has(cacheKey)) {
    return compilationCache.designSystem.get(cacheKey);
  }
  // 2. In-flight hit — reuse the running promise.
  if (inflightDesignSystemLoads.has(cacheKey)) {
    return inflightDesignSystemLoads.get(cacheKey);
  }
  // 3. Fresh compute — store the promise so concurrent callers reuse it.
  const promise = (async () => {
    try {
      const designSystem = await tailwindcss.__unstable__loadDesignSystem(cssToProcess, {
        loadStylesheet,
        loadModule: async (modulePath, base, resourceHint) => loadModule(modulePath, base, resourceHint, configFileString)
      });
      const autocompleteClasses = designSystem.getClassList().flat().filter(c => typeof c === 'string');
      const screens = extractBreakpointsFromDesignSystem(designSystem);
      const cached = { designSystem, autocompleteClasses, screens };
      compilationCache.designSystem.set(cacheKey, cached);
      return cached;
    } finally {
      inflightDesignSystemLoads.delete(cacheKey);
    }
  })();
  inflightDesignSystemLoads.set(cacheKey, promise);
  return promise;
}

// In-flight incremental compilers, same dedup contract as
// inflightDesignSystemLoads above.
const inflightCompilerLoads = new Map();

/**
 * Load (or reuse) an *incremental* Tailwind compiler for a given CSS/config
 * pair. `tailwindcss.compile()` parses the whole stylesheet (theme, plugins,
 * @config, @utility …) and returns an object whose `build(candidates)` is
 * meant to be called repeatedly: it accumulates every candidate it has seen
 * and short-circuits when nothing new arrives.
 *
 * Because it accumulates, the CSS from a cached compiler is a *superset* of
 * the current candidate set. That is exactly right for live preview in a
 * builder — a class removed from the DOM leaves harmless CSS behind until the
 * page reloads — and exactly wrong for output.css, which must shrink when
 * classes go away. Callers pick via `tailwindify(..., { incremental: true })`;
 * the default stays a fresh compile per call.
 */
async function loadCompiler(cacheKey, cssToProcess, configFileString) {
  if (compilationCache.compiler.has(cacheKey)) {
    return compilationCache.compiler.get(cacheKey);
  }
  if (inflightCompilerLoads.has(cacheKey)) {
    return inflightCompilerLoads.get(cacheKey);
  }
  const promise = (async () => {
    try {
      const compiler = await tailwindcss.compile(cssToProcess, {
        loadStylesheet,
        loadModule: async (modulePath, base, resourceHint) => loadModule(modulePath, base, resourceHint, configFileString)
      });
      compilationCache.compiler.set(cacheKey, compiler);
      return compiler;
    } finally {
      inflightCompilerLoads.delete(cacheKey);
    }
  })();
  inflightCompilerLoads.set(cacheKey, promise);
  return promise;
}

/**
 * Fast non-cryptographic hash with good distribution
 * Based on FNV-1a algorithm. Hashes the full string — sampling was
 * dropped because two inputs identical in the sampled regions but
 * different elsewhere collided and returned stale compiled CSS.
 * FNV on a 200 KB input completes in well under 10 ms.
 * @param {string} str - String to hash
 * @returns {string} Base-36 hash
 */
function hashString(str) {
  if (!str) return '0';

  const FNV_OFFSET = 2166136261;
  const FNV_PRIME = 16777619;

  let hash = FNV_OFFSET;
  const len = str.length;

  for (let i = 0; i < len; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  // Mix in length so empty-suffix differences still split the key.
  hash ^= len;

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
    // Safety net: if neither the reuse path nor the load path resolves
    // within 15 s, reject with a clear error so callers can fall back
    // (e.g. skip SCSS preprocessing) instead of hanging forever.
    // This protects against the multi-plugin race where another DPlugins
    // plugin (Fancoolo, etc.) loaded `sass.dart.min.js` first but the
    // shared `_cliPkgExports` global never becomes usable in Winden's
    // scope. See #41.
    const INIT_TIMEOUT_MS = 15000;
    const timeoutId = setTimeout(() => {
      reject(new Error(
        '[winden:scss] Dart Sass initialization timed out after 15 s. ' +
        'Another plugin may have loaded sass.dart.min.js but its ' +
        '_cliPkgExports never became available to Winden. SCSS ' +
        'preprocessing will be unavailable in this context.'
      ));
    }, INIT_TIMEOUT_MS);
    const safeResolve = (v) => { clearTimeout(timeoutId); resolve(v); };
    const safeReject = (e) => { clearTimeout(timeoutId); reject(e); };

    // Get the plugin base URL dynamically
    const getPluginUrl = () => {
      // First priority: Use the URL passed from PHP (most reliable)
      if (window.winden_plugin_url) {
        return window.winden_plugin_url;
      }

      // Second priority: Find the compiler script and extract plugin URL from it
      const scripts = document.getElementsByTagName('script');
      for (let script of scripts) {
        if (script.src && script.src.includes('tailwindcss-compiler.js')) {
          // Extract URL up to and including the plugin folder
          // e.g., ".../plugins/winden-dplugins/build/compiler/tailwindcss-compiler.js"
          //    -> ".../plugins/winden-dplugins/"
          const buildIndex = script.src.indexOf('/build/compiler/');
          if (buildIndex > 0) {
            return script.src.substring(0, buildIndex + 1);
          }
        }
      }

      // Fallback (should rarely be reached if PHP sets window.winden_plugin_url)
      return '/wp-content/plugins/winden/';
    };

    const sassUrl = getPluginUrl() + 'build/scss-compiler/sass.dart.min.js';

    // Check if ANY sass.dart.min.js is already loaded (from Winden, Fancoolo, or other plugins)
    // This prevents the "Identifier '_cliPkgExports' has already been declared" error
    const anySassLoaded = Array.from(document.getElementsByTagName('script'))
      .some(script => script.src && script.src.includes('sass.dart.min.js'));

    // Also check if the global _cliPkgExports exists (meaning Dart Sass was already initialized)
    const sassGlobalExists = globalThis._cliPkgExports && globalThis._cliPkgExports.length > 0;

    // Helper: pop `_cliPkgExports` and build the dartSass facade.
    const consumeCliPkgExports = () => {
      const _cliPkgLibrary = globalThis._cliPkgExports.pop();
      if (globalThis._cliPkgExports.length === 0) delete globalThis._cliPkgExports;
      const _cliPkgExports = {};
      _cliPkgLibrary.load({ immutable: Immutable }, _cliPkgExports);
      return {
        compileString: _cliPkgExports.compileString,
        compile: _cliPkgExports.compile,
      };
    };

    // If any Dart Sass is already loaded and available, use it
    if ((anySassLoaded || sassGlobalExists) && globalThis._cliPkgExports && globalThis._cliPkgExports.length > 0) {
      try {
        dartSass = consumeCliPkgExports();
        safeResolve(dartSass);
        return;
      } catch (error) {
        safeReject(error);
        return;
      }
    }

    // Race case (#41): another plugin (Fancoolo) added the sass.dart.min.js
    // <script> tag but Winden initializes before _cliPkgExports is populated
    // (or the other plugin consumed them). Poll the global every 100 ms
    // for up to 10 s. If it never appears, fall through to the load path
    // (and rely on the dedup logic at the bottom to skip re-appending).
    if (anySassLoaded) {
      let polled = 0;
      const POLL_INTERVAL_MS = 100;
      const MAX_POLLS = 100; // 10 s total
      const pollId = setInterval(() => {
        if (globalThis._cliPkgExports && globalThis._cliPkgExports.length > 0) {
          clearInterval(pollId);
          try {
            dartSass = consumeCliPkgExports();
            safeResolve(dartSass);
          } catch (error) {
            safeReject(error);
          }
          return;
        }
        if (++polled >= MAX_POLLS) {
          clearInterval(pollId);
          // Let the INIT_TIMEOUT_MS safety net (above) be the final
          // rejector — keeps a single error path for the caller.
        }
      }, POLL_INTERVAL_MS);
      return;
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

        safeResolve(dartSass);
      } catch (error) {
        // Restore require even on error
        if (tempRequire) {
          globalThis.require = tempRequire;
        }
        safeReject(error);
      }
    };
    script.onerror = () => {
      // Restore require on load error
      if (tempRequire) {
        globalThis.require = tempRequire;
      }
      safeReject(new Error('Failed to load Dart Sass'));
    };

    // Only load if no Dart Sass script has been loaded yet
    if (!anySassLoaded) {
      document.head.appendChild(script);
    }
  });

  return dartSassPromise;
}

// ============================================================
// SCSS Preprocessing - Convert SCSS to CSS before Tailwind
// ============================================================

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
  // Pure function of its input, and Dart Sass runs synchronously on the main
  // thread — 50–200 ms for an ordinary Style tab. The live watcher calls this
  // on every class change with the *same* stylesheet, so without this memo
  // SCSS mode paid Sass per keystroke while CSS mode paid nothing. Keyed by
  // the exact text rather than a hash: `hashString` samples long inputs and
  // a collision here would serve another stylesheet's output.
  if (preprocessor !== 'scss') return runPreprocessSCSS(scss, preprocessor);
  const cached = compilationCache.preprocessed.get(scss);
  if (cached !== undefined) return cached;
  const css = await runPreprocessSCSS(scss, preprocessor);
  compilationCache.preprocessed.set(scss, css);
  return css;
}

async function runPreprocessSCSS(scss, preprocessor = 'css') {
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

    // 2. Extract @theme blocks (Tailwind v4 syntax, Dart Sass doesn't understand @theme)
    const themeBlocks = [];
    let themeMatch;
    const themeRegex = /@theme\s*\{/g;
    // Find all @theme blocks with proper brace matching
    while ((themeMatch = themeRegex.exec(scssWithPlaceholders)) !== null) {
      const startIndex = themeMatch.index;
      let braceCount = 1;
      let endIndex = startIndex + themeMatch[0].length;
      while (braceCount > 0 && endIndex < scssWithPlaceholders.length) {
        if (scssWithPlaceholders[endIndex] === '{') braceCount++;
        if (scssWithPlaceholders[endIndex] === '}') braceCount--;
        endIndex++;
      }
      themeBlocks.push({
        content: scssWithPlaceholders.slice(startIndex, endIndex),
        start: startIndex,
        end: endIndex
      });
    }
    // Remove @theme blocks from end to start to preserve indices
    for (let i = themeBlocks.length - 1; i >= 0; i--) {
      const { start, end } = themeBlocks[i];
      scssWithPlaceholders = scssWithPlaceholders.slice(0, start) + scssWithPlaceholders.slice(end);
    }

    // 3. Extract @import "tailwindcss..." directives (Dart Sass can't resolve these in browser)
    scssWithPlaceholders = scssWithPlaceholders.replace(/@import\s+["']tailwindcss[^"']*["'][^;]*;/g, (match) => {
      tailwindImports.push(match);
      return ''; // Remove completely
    });

    // 4. Extract @import url("//...") - external CDN imports (let Tailwind handle these)
    scssWithPlaceholders = scssWithPlaceholders.replace(/@import\s+url\([^)]+\)[^;]*;/g, (match) => {
      tailwindImports.push(match);
      return ''; // Remove completely
    });

    // 5. Replace @apply with placeholder (Dart Sass doesn't understand @apply)
    // Use a custom CSS property as placeholder since comments can be stripped by Sass
    // Match @apply followed by class names, with optional semicolon (handles @apply before })
    scssWithPlaceholders = scssWithPlaceholders.replace(/@apply\s+[^;}\n]+;?/g, (match) => {
      const index = tailwindDirectives.length;
      tailwindDirectives.push(match);
      return `--tw-apply-${index}: __PLACEHOLDER__;`;
    });

    // 6. Extract Tailwind v4 wildcard resets (e.g., --color-*: initial; --text-*: initial;)
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
      console.error('[winden:scss] Dart Sass compilation error:', error.message);
      console.error('[winden:scss] Content that failed:', scssWithPlaceholders);
      throw error;
    }

    // Restore Tailwind directives
    let compiledCss = result.css;

    // Restore @apply directives (replace CSS custom property placeholders)
    tailwindDirectives.forEach((directive, index) => {
      compiledCss = compiledCss.replace(new RegExp(`--tw-apply-${index}:\\s*__PLACEHOLDER__;`, 'g'), directive);
    });

    // Restore Tailwind directives at the beginning of the file
    // Order for Tailwind v4: @layer first, then @import, then @theme blocks
    const restoredDirectives = [];

    if (tailwindLayers.length > 0) {
      restoredDirectives.push(...tailwindLayers);
    }

    if (tailwindImports.length > 0) {
      restoredDirectives.push(...tailwindImports);
    }

    // Restore @theme blocks (with wildcard resets injected if any)
    if (themeBlocks.length > 0) {
      // Inject wildcard resets into the first @theme block
      if (wildcardResets.length > 0) {
        const firstBlock = themeBlocks[0].content;
        const insertIdx = firstBlock.indexOf('{') + 1;
        const wildcardStr = '\n  ' + wildcardResets.join('\n  ');
        themeBlocks[0].content = firstBlock.slice(0, insertIdx) + wildcardStr + firstBlock.slice(insertIdx);
      }
      restoredDirectives.push(...themeBlocks.map(b => b.content));
    } else if (wildcardResets.length > 0) {
      // No @theme block found, create one for wildcard resets
      restoredDirectives.push('@theme {\n  ' + wildcardResets.join('\n  ') + '\n}');
    }

    if (restoredDirectives.length > 0) {
      compiledCss = restoredDirectives.join('\n') + '\n\n' + compiledCss;
    }

    return compiledCss;
  } catch (error) {
    console.error('[winden:scss] Compilation failed:', error.message);

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
 * Breakpoint names, read from the design system's theme.
 *
 * Responsive variants come from the `--breakpoint-*` namespace, so that is
 * the source of truth: Tailwind's defaults, a Wizzard `--breakpoint-tablet`,
 * and a legacy `@config` `theme.screens` all land there. Peeking at
 * `variants.variants` by internal order number is not an option — those
 * numbers move between releases (on 4.3.3, 61 is `contrast-more`).
 *
 * Legacy `theme.screens` can hold complex entries. Tailwind stores
 * `{ raw: 'print' }` as `--breakpoint-print-raw` and `{ min, max }` as
 * `--breakpoint-tab-min` / `-max`, while the variants are `print` and `tab`.
 * The suffix is stripped and the name kept only if `getVariants()` lists it.
 *
 * @param {Object} designSystem
 * @returns {string[]}
 */
function extractBreakpointsFromDesignSystem(designSystem) {
  if (!designSystem?.theme?.namespace) return [];

  const variantNames = new Set((designSystem.getVariants?.() ?? []).map((v) => v.name));
  const hasVariant = (name) => (variantNames.size === 0 ? true : variantNames.has(name));

  const names = [];
  for (const key of designSystem.theme.namespace('--breakpoint').keys()) {
    if (key === null || key === undefined) continue;
    const name = String(key).replace(/-(?:min|max|raw)$/, '');
    if (!names.includes(name) && hasVariant(name)) names.push(name);
  }
  return names;
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
  compilationCache.compiler.clear();
  compilationCache.compiled.clear();
  compilationCache.preprocessed.clear();
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
      console.warn(`[winden:compiler] require('${moduleName}') in config is not fully supported`);
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

// Cross-cutting depth guard for the loader pair. Tailwind drives both
// loadStylesheet and loadModule recursively when it resolves @import /
// @plugin / @config chains; an off-by-one user config (a.css → b.css →
// a.css) would otherwise spin without bound. Stack is shared across
// both functions so a chain that crosses module/stylesheet boundaries
// still counts toward the limit. See #18.
const MAX_IMPORT_DEPTH = 5;
const _importStack = [];

function _enforceImportDepth(id) {
  if (_importStack.length < MAX_IMPORT_DEPTH) return;
  const chain = [..._importStack, id];
  const err = new WindenCompilationError(
    `Import depth limit (${MAX_IMPORT_DEPTH}) exceeded — likely a circular @import or @plugin chain.`,
    'IMPORT_DEPTH_EXCEEDED',
    'bundling',
    {
      chain,
      depth: chain.length,
      suggestion: 'Check your CSS for circular @import or your config for circular @plugin references. The chain above lists the imports as they nested.',
    }
  );
  throw err;
}

/**
 * Load stylesheet for @import directives
 * Supports Tailwind core imports, CDN stylesheets, and relative imports
 * @param {string} id - Stylesheet identifier
 * @param {string} base - Base URL for resolution
 * @returns {Promise<Object>} Stylesheet object with path, base, and content
 */
/** Empty virtual stylesheet whose only job is to carry the `important` modifier. */
const IMPORTANT_IMPORT_ID = 'winden://important';
const IMPORTANT_IMPORT = `@import "${IMPORTANT_IMPORT_ID}" important;`;

async function loadStylesheet(id, base) {
  _enforceImportDepth(id);
  _importStack.push(id);
  try {
    if (id === IMPORTANT_IMPORT_ID) {
      return { path: id, base, content: '' };
    }

    // Tailwind's own stylesheets are inlined in the bundle; Tailwind resolves,
    // layers and applies import modifiers itself once it has the text.
    const own = resolveTailwindStylesheet(id, base);
    if (own) return own;

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

      // Fetch with a 10 s timeout + one retry. Without these, a slow / hung
      // CDN would block compilation indefinitely. See #17. Mirrors the retry
      // logic loadModule() uses for plugin fetches.
      const FETCH_TIMEOUT_MS = 10000;
      const MAX_RETRIES = 1;
      let response = null;
      let lastError = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort(new Error(`timed out after ${FETCH_TIMEOUT_MS} ms`));
        }, FETCH_TIMEOUT_MS);

        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, 500));
          const r = await fetch(id, { signal: controller.signal });
          if (!r.ok) {
            throw new Error(`HTTP ${r.status} ${r.statusText}`);
          }
          response = r;
          break;
        } catch (error) {
          lastError = error.name === 'AbortError'
            ? new Error(`Stylesheet fetch timed out after ${FETCH_TIMEOUT_MS} ms`)
            : error;
          if (attempt < MAX_RETRIES) {
            console.warn(`[winden:compiler] Stylesheet fetch failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying...`, {
              url: id,
              error: lastError.message,
            });
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }

      if (!response) {
        // All retries exhausted — outer catch wraps in WindenStylesheetError
        // which carries phase='bundling', the URL in details, and a
        // suggestion for the UI.
        throw lastError ?? new Error(`Stylesheet fetch failed: ${id}`);
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
    // Re-throw typed errors as-is so the depth-limit chain survives
    // formatError() at the top level. Plain errors get wrapped.
    if (error instanceof WindenCompilationError) throw error;
    throw new WindenStylesheetError(id, error, { base });
  } finally {
    _importStack.pop();
  }
}

async function loadModule(modulePath, base, resourceHint, configFileString) {
  _enforceImportDepth(modulePath);
  _importStack.push(modulePath);
  try {
    return await _loadModuleInner(modulePath, base, resourceHint, configFileString);
  } finally {
    _importStack.pop();
  }
}

async function _loadModuleInner(modulePath, base, resourceHint, configFileString) {
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
      console.error('[winden:compiler] Config loading failed', {
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

  // A plugin that throws does so deep inside Tailwind, where the message is a
  // minified variable name and the blame lands on the user's @theme. Wrapping
  // it means the package that failed is named instead: `dculus-ui` is a
  // component library, not a Tailwind plugin, and said only "g is not a
  // function" until this existed.
  const attributePlugin = (loaded, name) => {
    if (resourceHint !== 'plugin') return loaded;

    // A Tailwind plugin is callable, or an object carrying a handler. Anything
    // else is a package that was never a plugin — a component library, say —
    // and Tailwind's own message for that is "g is not a function", blamed on
    // the user's @theme.
    const callable = typeof loaded === 'function';
    const hasHandler = loaded && typeof loaded === 'object' && typeof loaded.handler === 'function';
    if (!callable && !hasHandler) {
        throw new WindenPluginError(name, new Error('its default export is not a plugin'), {
            stage: 'run',
            suggestion: `"${name}" does not export a Tailwind plugin. Component libraries and CSS-only packages cannot be loaded with @plugin — check the package's own docs for how it is meant to be included.`,
        });
    }
    if (!callable) return loaded;

    const wrapped = (...args) => {
      try {
        return loaded(...args);
      } catch (error) {
        throw new WindenPluginError(name, error, {
          stage: 'run',
          suggestion: `Check that "${name}" is a Tailwind v4 plugin. A component library, or a plugin written for v3, fails here — v4 rewrote the plugin API.`,
        });
      }
    };

    // Plugins carry their own properties (handler, config); keep them
    return Object.assign(wrapped, loaded);
  };

  // Handle bundled plugins first (already efficient)
  const bundledPlugin = bundledPlugins[modulePath];
  if (bundledPlugin) {
    return { module: attributePlugin(bundledPlugin, modulePath), base };
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

        // Validated after the retry loop: a package that is not a plugin is not
        // a transport failure, and retrying it three times says the wrong thing.
        result.module = attributePlugin(result.module, modulePath);
        return result;
      } catch (error) {
        // "Not a plugin" is a verdict, not a transport failure: retrying it
        // three times and reporting "couldn't load" describes the wrong problem.
        if (error instanceof WindenPluginError) throw error;

        lastError = error;
        if (attempt < maxRetries) {
          console.warn(`[winden:compiler] Plugin fetch failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`, {
            url: resolvedPath,
            error: error.message
          });
        }
      }
    }

    // All retries failed — throw typed error so the top-level catch can
    // formatError() it with phase='plugin' + suggestion for the UI.
    console.error('[winden:compiler] Plugin fetch failed after retries', {
      url: resolvedPath,
      error: lastError.message,
      attempts: maxRetries + 1
    });
    throw new WindenPluginError(resolvedPath, lastError, { attempts: maxRetries + 1 });
  }

  // Handle relative imports (resolve against base if provided)
  if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
    if (!base) {
      console.error('[winden:compiler] Relative import without base URL', { modulePath });
      throw new Error(`Cannot resolve relative import '${modulePath}' without a base URL`);
    }

    try {
      const resolvedPath = new URL(modulePath, base).href;

      // Recursively load the resolved path
      return loadModule(resolvedPath, base, resourceHint, configFileString);
    } catch (error) {
      console.error('[winden:compiler] Failed to resolve relative import', {
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

/**
 * Public compiler entry points (exposed on `window`)
 * ---------------------------------------------------
 *
 * `window.tailwindify(html, customCss, configFileString, preprocessor?, options?)`
 *   - Full compile path. Produces final CSS for a given list of class
 *     names + custom CSS. Use this when you need the compiled CSS to
 *     inject into a page (frontend, builder iframe, save handler).
 *   - `options.incremental` (default false): reuse a cached compiler for
 *     the same CSS/config and only rebuild candidates. Output is a superset
 *     of everything that compiler has seen — fine for live preview, never
 *     for output.css. See loadCompiler().
 *   - `options.important` (default false): compile utilities with
 *     `!important` (Tailwind's `important` import modifier). Used by the
 *     watcher inside the Oxygen iframe, where utilities must beat inline
 *     styles.
 *   - Resolves to `{ css, classes, screens, error?, errorDetails?, success? }`:
 *       css           string   Compiled Tailwind CSS ('' on error)
 *       classes       string[] Class list from the design system
 *       screens       string[] Breakpoint names from the theme's --breakpoint-* namespace
 *       error         string   Plain-English message; error path only
 *       errorDetails  object   { phase, code, details, ... } from formatError
 *       success       false    Sentinel on the error path
 *
 * `window.tailwindifyClasses(customCss, configFileString?)`
 *   - Metadata-only path. Returns the same class list + screens without
 *     compiling. Use this for autocomplete and breakpoint extraction
 *     where producing CSS would be wasted work.
 *   - Resolves to the same shape as `tailwindify`. `css` is always ''
 *     (kept for parity).
 *
 * Callers should branch on `result.error` once, then consume the keys
 * uniformly. The error path produces the same typed-error contract from
 * `formatError()` — see src/compiler/errors.js (#14).
 */
function main() {
  async function tailwindify(html, customCss, configFileString, preprocessorOverride, options) {
    try {
      const classes = Array.isArray(html) ? html : (typeof html === 'object' ? Object.values(html) : []);

      // 5th argument used to be an (ignored) `important` string; only a real
      // options object is honoured so old callers keep the default path.
      const incremental = Boolean(options && typeof options === 'object' && options.incremental);
      const important = Boolean(options && typeof options === 'object' && options.important);

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
      let preprocessedCss = await preprocessSCSS(cssWithTheme, preprocessor);

      // `important`: Tailwind's own switch for "every utility gets !important"
      // is the `important` import modifier. It is a flag on the design system,
      // not on the stylesheet it rides in, so an empty virtual import carries
      // it and the user's own @import lines stay untouched. Preflight,
      // @layer components and --tw-* variables are left alone, exactly as the
      // old regex did — the builder iframes (Oxygen) need utilities to beat
      // inline styles, nothing more. Injected before hashing so the cache
      // keys tell the two outputs apart.
      if (important) {
        preprocessedCss = `${IMPORTANT_IMPORT}\n${preprocessedCss ?? ''}`;
      }

      // OPTIMIZATION: Early bail-out only if no classes AND no custom CSS
      // We still need to compile if there's custom CSS (for @apply directives, etc.)
      if (classes.length === 0 && (!preprocessedCss || preprocessedCss.trim() === '')) {
        return { css: '', classes: [], screens: [] };
      }

      // OPTIMIZATION: Generate cache keys (use preprocessed CSS for hash).
      // The preprocessor mode goes into the key as well: when a user toggles
      // SCSS ↔ CSS, `preprocessedCss` is *usually* different (Sass reformats
      // the input), but on inputs Sass renders byte-identically the hashes
      // collide and a cached result from the other mode would be served. See #15.
      const cssHash = hashString(preprocessedCss);
      const configHash = hashString(configFileString ?? '');
      const cacheKey = `${cssHash}-${configHash}-${preprocessor}`;
      const classesKey = [...classes].sort().join('|');
      const classesHash = hashString(classesKey);
      // Incremental results are supersets (see loadCompiler), so they must
      // never be served to an exact-mode caller with the same class set —
      // e.g. the Gutenberg parent window runs both the live watcher and the
      // compile-on-save path against this one compiler instance.
      const fullCacheKey = `${cacheKey}-${classesHash}-${incremental ? 'inc' : 'exact'}`;

      // Check full compilation cache
      if (compilationCache.compiled.has(fullCacheKey)) {
        return compilationCache.compiled.get(fullCacheKey);
      }

      // `@import`s are resolved by Tailwind through loadStylesheet; a failing
      // import surfaces as a WindenStylesheetError from there.
      const cssToProcess = preprocessedCss;

      // OPTIMIZATION: Load design system with dedup across concurrent callers
      // (LRU cache for sequential, in-flight Map for concurrent). See #16.
      let designSystem, autocompleteClasses, screens;
      try {
        ({ designSystem, autocompleteClasses, screens } =
          await loadDesignSystem(cacheKey, cssToProcess, configFileString));
      } catch (error) {
        if (error?.phase) throw error;
        throw new WindenTailwindError(error);
      }

      // Compile. Lightning CSS (built into Tailwind v4) handles autoprefixing.
      // Incremental: reuse the parsed compiler for this CSS/config and only
      // feed it the candidates — the expensive stylesheet parse happens once
      // per cacheKey instead of once per class change. Exact: fresh compile,
      // so the CSS contains precisely `classes` and nothing that was seen
      // earlier.
      let compiledCss;
      try {
        if (incremental) {
          const compiler = await loadCompiler(cacheKey, cssToProcess, configFileString);
          compiledCss = compiler.build(classes);
        } else {
          compiledCss = (await tailwindcss.compile(cssToProcess, {
            loadStylesheet,
            loadModule: async (modulePath, base, resourceHint) => loadModule(modulePath, base, resourceHint, configFileString)
          })).build(classes);
        }
      } catch (error) {
        if (error?.phase) throw error;
        throw new WindenTailwindError(error);
      }

      // Component classes are the user's own (`@layer components { .card … }`).
      // getClassList() reports utilities only, so without this they exist on
      // the page but not in autocomplete.
      const result = {
        css: compiledCss,
        classes: [...autocompleteClasses, ...componentClassNames(cssToProcess)],
        screens,
      };

      // Cache the result
      compilationCache.compiled.set(fullCacheKey, result);

      return result;
    } catch (error) {
      // Format the caught error through the typed-error contract:
      //   { success: false, error: <user-string>, errorDetails: { phase, code, details, ... } }
      // Inner code paths throw WindenSCSSError / WindenStylesheetError /
      // WindenConfigError; everything else gets wrapped into a generic
      // shape by formatError. Callers should read `errorDetails.phase` +
      // `errorDetails.details.suggestion` for UI display.
      console.error('[winden:compiler]', error);
      return { css: "", classes: [], screens: [], ...formatError(error) };
    }
  }
  return tailwindify;
}
window.tailwindify = main();


/**
 * Put `@config "winden://config"` after the last `@import` (or at the top)
 * when the user has Config-tab content but wrote no `@config` themselves.
 * Shared by every entry point that takes (css, configFileString).
 */
function withConfigDirective(css, configFileString) {
  let out = css ?? '';
  if (!(configFileString && configFileString.trim()) || out.includes('@config')) return out;
  const importMatch = out.match(/(@import\s+["'][^"']+["'][^;]*;[\s\n]*)+/g);
  if (importMatch) {
    let lastImportEnd = 0;
    for (const imp of importMatch) {
      const idx = out.indexOf(imp, lastImportEnd);
      if (idx !== -1) lastImportEnd = idx + imp.length;
    }
    return out.slice(0, lastImportEnd) + '\n@config "winden://config";\n' + out.slice(lastImportEnd);
  }
  return '@config "winden://config";\n' + out;
}

/**
 * The design system for a (css, config) pair, exactly as the compile path
 * would build it: `@config` injected, SCSS preprocessed, cached by the same
 * key `tailwindify()` uses. Returns `{ designSystem, autocompleteClasses,
 * screens, preprocessedCss }`.
 */
async function resolveDesignSystem(customCss, configFileString = '', preprocessor = 'css') {
  const preprocessedCss = await preprocessSCSS(withConfigDirective(customCss, configFileString), preprocessor);
  const cacheKey = `${hashString(preprocessedCss)}-${hashString(configFileString)}-${preprocessor}`;
  const cached = await loadDesignSystem(cacheKey, preprocessedCss, configFileString);
  return { ...cached, preprocessedCss };
}

function classes() {
  async function tailwindifyClasses(customCss, configFileString = '') {
    try {
      // Get preprocessor setting from window (passed from PHP)
      const preprocessor = window.tailwind_compiler_options?.css_preprocessor || 'css';
      const { autocompleteClasses, screens, preprocessedCss: cssToProcess } =
        await resolveDesignSystem(customCss, configFileString, preprocessor);

      return {
        css: '',
        classes: [...autocompleteClasses, ...componentClassNames(cssToProcess)],
        screens,
      };
    } catch (error) {
      // Match tailwindify's error contract: { success: false, error, errorDetails }.
      // css:'' kept for shape parity with tailwindify (#19).
      // tailwindifyClasses is the autocomplete pipeline — it runs every
      // ~500 ms while the user types. "Cannot apply unknown utility class"
      // and "Unknown word" / "At-rule without name" PostCSS failures are
      // expected mid-edit noise and should not log as errors. Real
      // compilation failures still surface through tailwindify().
      const msg = String(error?.message ?? error ?? '');
      const isMidEditNoise =
        /Cannot apply unknown utility class/.test(msg) ||
        /Unknown word/.test(msg) ||
        /At-rule without name/.test(msg);
      if (!isMidEditNoise) {
        console.error('[winden:compiler]', error);
      }
      // Mid-edit noise is silently swallowed — autocomplete pipeline reruns
      // every ~500 ms while typing, so a partial @apply / dangling decl
      // would otherwise pollute the console once per keystroke.
      return { css: '', classes: [], screens: [], ...formatError(error) };
    }
  }
  return tailwindifyClasses;
}
window.tailwindifyClasses = classes();

/**
 * `window.windenValidateClasses(classNames, customCss, configFileString?)`
 *
 * Returns the subset of `classNames` that Tailwind cannot turn into CSS —
 * the typos that otherwise fail silently (`bg-blu-500`, `hoverr:flex`).
 *
 * Uses the design system's own `candidatesToCss`, so it costs a candidate
 * parse rather than a compile, and it reuses the cached design system the
 * autocomplete already builds for this CSS. Arbitrary values (`p-[13px]`) and
 * theme tokens (`text-hero`) validate correctly because the design system is
 * built from the user's own CSS.
 *
 * Classes defined by the user in `@layer components` are NOT utilities, so
 * `candidatesToCss` reports them as unknown; their selectors are collected
 * from the CSS and treated as known.
 *
 * Resolves to `{ unknown: string[], error? }`. On any failure it returns an
 * empty list: a validator that cannot run must never mark valid classes red.
 */
function validator() {
  /** `.card`, `.btn-primary:hover` → card, btn-primary */
  function customSelectorNames(css) {
    const names = new Set();
    const pattern = /\.(-?[_a-zA-Z][\w-]*)/g;
    let match;
    while ((match = pattern.exec(css)) !== null) names.add(match[1]);
    return names;
  }

  /**
   * Run a list of class names through the design system built from the user's
   * own CSS. Shared by the validator and the explainer so they cost one cached
   * design system between them rather than one each.
   */
  async function compileCandidates(classNames, customCss, configFileString) {
    const candidates = (Array.isArray(classNames) ? classNames : [])
      .map((name) => String(name || '').trim())
      .filter(Boolean);
    if (candidates.length === 0) return { candidates: [], compiled: [], known: new Set() };

    // Same preparation as the compile path (config directive, SCSS, cache key)
    const preprocessor = window.tailwind_compiler_options?.css_preprocessor || 'css';
    const { designSystem, preprocessedCss } = await resolveDesignSystem(customCss, configFileString, preprocessor);
    return {
      candidates,
      compiled: designSystem.candidatesToCss(candidates),
      known: customSelectorNames(preprocessedCss),
      designSystem,
    };
  }

  async function windenValidateClasses(classNames, customCss, configFileString = '') {
    try {
      const { candidates, compiled, known } = await compileCandidates(classNames, customCss, configFileString);
      if (candidates.length === 0) return { unknown: [] };

      const unknown = candidates.filter((candidate, index) => {
        if (compiled[index]) return false;
        // A component class may carry variants: `hover:card`
        const utility = candidate.split(':').pop();
        return !known.has(utility);
      });

      return { unknown };
    } catch (error) {
      // Never report unknowns from a validator that failed to run.
      return { unknown: [], ...formatError(error) };
    }
  }

  /**
   * `window.windenResolveColors(classNames, customCss, configFileString?)`
   *
   * The colour each class paints, as a value a browser can render.
   *
   * Reading it off the page does not work: v4 emits a theme variable only when
   * some utility uses it, so `var(--color-red-500)` resolves to nothing in a
   * document that happens not to use red. Compiling the classes emits both the
   * rule and the variables it references, and the two are resolved against each
   * other here.
   *
   * Resolves to `{ colors: { [className]: string } }`, missing entries for
   * anything that paints no colour.
   */
  async function windenResolveColors(classNames, customCss, configFileString = '') {
    try {
      const { candidates, compiled, designSystem } = await compileCandidates(classNames, customCss, configFileString);
      if (candidates.length === 0) return { colors: {} };

      // candidatesToCss writes `var(--color-red-500)` and nothing else: v4 emits
      // a theme variable only where a utility uses it, so the value has to come
      // from the design system rather than from the page or the rule.
      const resolveVariable = (name) => {
        try {
          return designSystem.resolveThemeValue?.(name, true) ?? null;
        } catch {
          return null;
        }
      };

      const colors = {};
      candidates.forEach((candidate, index) => {
        const rule = compiled[index];
        if (!rule) return;

        const declaration = [...rule.matchAll(/([-a-z]+)\s*:\s*([^;{}]+)/g)]
          .find(([, property]) => /(^|-)color$|^fill$|^stroke$|^background$/.test(property));
        if (!declaration) return;

        let value = declaration[2].trim();
        // One hop is enough: v4 writes `background-color: var(--color-red-500)`
        const reference = value.match(/^var\((--[\w-]+)\)$/);
        if (reference) {
          const resolved = resolveVariable(reference[1]);
          if (!resolved) return;
          value = resolved;
        }
        colors[candidate] = value;
      });

      return { colors };
    } catch (error) {
      return { colors: {}, ...formatError(error) };
    }
  }

  /**
   * `window.windenExplainClasses(classNames, customCss, configFileString?)`
   *
   * The CSS each class produces, as the design system writes it — the same
   * call the validator makes, keeping the rule instead of only asking whether
   * there was one. Resolves to `{ css: { [className]: string | null } }`, null
   * for anything the design system does not build (a component class, a typo).
   */
  async function windenExplainClasses(classNames, customCss, configFileString = '') {
    try {
      const { candidates, compiled } = await compileCandidates(classNames, customCss, configFileString);
      const css = {};
      candidates.forEach((candidate, index) => {
        css[candidate] = compiled[index] || null;
      });
      return { css };
    } catch (error) {
      return { css: {}, ...formatError(error) };
    }
  }

  return { windenValidateClasses, windenExplainClasses, windenResolveColors };
}

const classApi = validator();
window.windenValidateClasses = classApi.windenValidateClasses;
window.windenExplainClasses = classApi.windenExplainClasses;
window.windenResolveColors = classApi.windenResolveColors;

/**
 * The CSS the Style Guide extractor feeds Tailwind — the same assembly the
 * watcher and the save path use: the Style tab (which normally carries the
 * Tailwind imports and @plugin lines) with the Wizzard @theme placed after
 * the last @import. When the Style tab has no Tailwind import of its own,
 * the split theme + utilities imports are prepended, as the autocomplete
 * generator does.
 */
function assembleThemeCss(wizardCss, stylesCss) {
  const wizard = wizardCss || '';
  const styles = stylesCss || '';
  const importRegex = /(@import\s+["'][^"']+["'][^;]*;\s*)+/g;
  const matches = [...styles.matchAll(importRegex)];
  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    const at = last.index + last[0].length;
    return `${styles.slice(0, at)}\n${wizard}\n${styles.slice(at)}`;
  }
  return `@layer theme, base, components, utilities;\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n${wizard}\n${styles}`;
}

/**
 * Resolve the theme the way the compiler sees it and read the Style Guide's
 * token categories from it. `jsConfig` is the Config tab (reaches Tailwind
 * through `@config`), `wizardCss` the Wizzard @theme, `stylesCss` the Style tab.
 */
async function resolveThemeConfig(jsConfig, wizardCss, stylesCss) {
  const preprocessor = window.tailwind_compiler_options?.css_preprocessor || 'css';
  const { designSystem, screens } = await resolveDesignSystem(assembleThemeCss(wizardCss, stylesCss), jsConfig || '', preprocessor);
  return { config: extractThemeConfig(designSystem), screens };
}

// Raw token categories (kept for callers of window.extractTailwindConfig)
function configExtractor() {
  async function extractTailwindConfig(customCss, wizardCss, windenStylesCss) {
    try {
      const { config } = await resolveThemeConfig(customCss, wizardCss, windenStylesCss);
      return { config, sources: {}, success: true };
    } catch (error) {
      return { config: {}, sources: {}, success: false, error: error.message };
    }
  }
  return extractTailwindConfig;
}
window.extractTailwindConfig = configExtractor();

// StyleGuide configuration function
function styleGuideConfigExtractor() {
  async function extractStyleGuideConfig(customCss, wizardCss, windenStylesCss) {
    try {
      const { config, screens } = await resolveThemeConfig(customCss, wizardCss, windenStylesCss);
      const styleGuideConfig = convertToStyleGuideFormat(config);

      // Expose breakpoints for plain classes editors — the same list the
      // compiler reports as `screens`, so there is one source.
      window.winden_autocomplete_screens = screens;
      window.parent.winden_autocomplete_screens = screens;

      return { config: styleGuideConfig, sources: {}, success: true };
    } catch (error) {
      return { config: { theme: {} }, sources: {}, success: false, error: error.message };
    }
  }
  return extractStyleGuideConfig;
}
window.extractStyleGuideConfig = styleGuideConfigExtractor();

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

          // Get AJAX URL from PHP-provided sources (WordPress.org requirement: no hardcoded URLs)
          const ajaxUrl = getWindenAjaxUrl();

          if (!ajaxUrl) {
            // AJAX URL not available - this means wp_localize_script wasn't called properly
            console.warn('[winden:compiler] autoExtractBreakpoints: AJAX URL not available, skipping backend fetch');
            break;
          }

          const fetchUrl = ajaxUrl + '?action=winden_get_content';
          const response = await fetch(fetchUrl);

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
            console.warn('[winden:compiler] autoExtractBreakpoints: No content in database yet, using empty values');
            wizardContent = '';
            windenStylesContent = '';
            break; // Exit retry loop, no need to retry
          }
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            console.warn(`[winden:compiler] autoExtractBreakpoints: Fetch failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`, {
              error: error.message
            });
          }
        }
      }

      // Log error if all retries failed
      if (lastError && !wizardContent) {
        const ajaxUrl = getWindenAjaxUrl();
        console.error('[winden:compiler] autoExtractBreakpoints: Failed to fetch breakpoints after retry', {
          error: lastError.message,
          attempts: maxRetries + 1,
          url: ajaxUrl ? ajaxUrl + '?action=winden_get_content' : 'AJAX URL not configured'
        });
      }
    }

    // Extract using cached system (reuses design system cache)
    const result = await window.extractStyleGuideConfig('', wizardContent, windenStylesContent);

    if (!result.success) {
      console.warn('[winden:compiler] autoExtractBreakpoints: Extraction failed, using empty array', {
        error: result.error
      });
      // Set empty array as fallback
      window.winden_autocomplete_screens = [];
      window.parent.winden_autocomplete_screens = [];
    }
  } catch (error) {
    console.error('[winden:compiler] autoExtractBreakpoints: Unexpected error', {
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

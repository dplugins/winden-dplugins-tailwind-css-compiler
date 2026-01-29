/**
 * Winden Tailwind CSS Watcher
 *
 * Watches for DOM changes and compiles Tailwind classes in real-time
 * Implements caching, debouncing, and performance monitoring
 */

// Prevent double initialization if script is loaded multiple times
if (window.__windenWatcherInitialized) {
    // Already initialized, skip
} else {
window.__windenWatcherInitialized = true;

// Configuration for the MutationObserver to watch for class changes
const observerConfig = {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
    childList: true
};

// Track previously compiled classes and file loading states
let previousClassnames = new Set();
let hasLoadedData = {
    'tailwind.config.js': false,
    'style-tab.css': false,
};
let loadedData = {
    'tailwind.config.js': '',
    'style-tab.css': '',
};

// Debouncing and compilation state
let compileTimeout = null;
let isCompiling = false;
let pendingCompilation = false;
let pendingCompilationOptions = null;
let isFirstCompile = true; // Skip CSS injection on first compile (output.css already has styles)
let disableCSSInjection = false; // Completely disable CSS injection in certain contexts (e.g., Oxygen)


// Cache for compiled CSS results
let cssCache = new Map();
const MAX_CACHE_SIZE = 50;

// Performance monitoring
let performanceStats = {
    totalCompilations: 0,
    cacheHits: 0,
    averageCompilationTime: 0,
    totalCompilationTime: 0
};

/**
 * Normalize compile options to ensure consistent boolean values
 */
const normalizeCompileOptions = (options = {}) => {
    const normalized = {
        force: Boolean(options.force),
        reloadFiles: Boolean(options.reloadFiles),
        invalidateCssCache: Boolean(options.invalidateCssCache),
    };

    // reloadFiles implies force
    if (normalized.reloadFiles) {
        normalized.force = true;
    }

    return normalized;
};

/**
 * Merge compile options, with incoming options taking priority
 */
const mergeCompileOptions = (currentOptions, incomingOptions) => {
    if (!currentOptions) {
        return normalizeCompileOptions(incomingOptions);
    }

    const current = normalizeCompileOptions(currentOptions);
    const incoming = normalizeCompileOptions(incomingOptions);

    return {
        force: current.force || incoming.force,
        reloadFiles: current.reloadFiles || incoming.reloadFiles,
        invalidateCssCache: current.invalidateCssCache || incoming.invalidateCssCache,
    };
};

/**
 * Check if options contain any override flags
 */
const hasCompileOverrides = (options) => {
    if (!options) return false;
    return Boolean(options.force || options.reloadFiles || options.invalidateCssCache);
};

/**
 * Reset loaded data cache (forces file reload)
 */
const resetLoadedDataCache = () => {
    Object.keys(loadedData).forEach((file) => {
        loadedData[file] = '';
        hasLoadedData[file] = false;
    });
};

/**
 * Debounced compilation function
 */
const debouncedCompile = (delay = 150) => {
    if (compileTimeout) {
        clearTimeout(compileTimeout);
    }

    compileTimeout = setTimeout(async () => {
        if (!isCompiling) {
            await compileClasses();
        } else {
            pendingCompilation = true;
        }
    }, delay);
};

/**
 * FNV-1a hash function for cache keys (better collision resistance than simple hash)
 */
const fnvHash = (str) => {
    const FNV_OFFSET = 2166136261;
    const FNV_PRIME = 16777619;
    let hash = FNV_OFFSET;

    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }

    return (hash >>> 0).toString(36);
};

/**
 * Efficient class collection with early termination and filtering
 */
const collectClasses = () => {
    const classes = new Set();

    // Invalid patterns to exclude (JS code, HTML syntax, etc.)
    const invalidPatterns = [
        /^[{}\[\]()'"`;=<>]/, // Starts with JS/HTML syntax
        /[{};"'`=<>]/,         // Contains JS/HTML special chars
        /\s/,                   // Contains whitespace
        /^\d+$/,                // Pure numbers
        /^[A-Z][a-z]+\./,       // JavaScript syntax (e.g., "iframeScope.")
    ];

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: (node) => {
                // Skip style and script elements
                if (node.tagName === 'STYLE' || node.tagName === 'SCRIPT') {
                    return NodeFilter.FILTER_REJECT;
                }
                // Only process elements with class attributes
                return node.hasAttribute('class') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        }
    );

    let node;
    while (node = walker.nextNode()) {
        const classList = node.classList;
        for (let i = 0; i < classList.length; i++) {
            const className = classList[i];

            // Skip if matches any invalid pattern
            const isInvalid = invalidPatterns.some(pattern => pattern.test(className));
            if (!isInvalid) {
                classes.add(className);
            }
        }
    }

    return classes;
};

/**
 * Check if classes have actually changed
 */
const hasClassesChanged = (newClasses, oldClasses) => {
    if (newClasses.size !== oldClasses.size) {
        return true;
    }

    // Use Set operations for faster comparison
    for (const className of newClasses) {
        if (!oldClasses.has(className)) {
            return true;
        }
    }

    return false;
};

/**
 * Handles DOM mutations and triggers Tailwind compilation when needed
 */
const tagsToIgnore = new Set(['STYLE', 'SCRIPT']);

const isIgnorableNode = (node) => {
    return Boolean(
        node &&
        node.nodeType === Node.ELEMENT_NODE &&
        tagsToIgnore.has(node.tagName)
    );
};

const handleMutations = async (mutations) => {
    let shouldCompile = false;

    for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
            if (mutation.attributeName === 'class' && !isIgnorableNode(mutation.target)) {
                shouldCompile = true;
                break;
            }
            continue;
        }

        if (mutation.type === 'childList') {
            const relevantNode = [...mutation.addedNodes, ...mutation.removedNodes]
                .some((node) => !isIgnorableNode(node));
            if (relevantNode) {
                shouldCompile = true;
                break;
            }
        }
    }

    if (shouldCompile) {
        debouncedCompile();
    }
};

// Set up the MutationObserver to watch for DOM changes
const observer = new MutationObserver(handleMutations);
observer.observe(document.documentElement, observerConfig);

// No delay needed - we skip CSS injection on first compile using isFirstCompile flag

/**
 * Fetches content of Tailwind config and style files
 */
const fetchEditorContent = async (file = 'tailwind.config.js') => {
    // Return cached data if available
    if (loadedData[file]?.length) {
        return loadedData[file];
    }

    let uploadUrl = '';
    try {
        // Check current window first, then parent (for iframe scenarios)
        uploadUrl = window.uploadUrl || window.parent?.uploadUrl || '';
    } catch (e) {
        // Cross-origin access blocked - try current window only
        uploadUrl = window.uploadUrl || '';
    }

    if (!uploadUrl) {
        return '';
    }

    const response = await fetch(`${uploadUrl}/winden/${file}?_t=${Date.now()}`);
    if (!response.ok) {
        throw new Error(`Failed to load ${file}: ${response.status} ${response.statusText}`);
    }

    const fileData = await response.text();
    loadedData[file] = fileData;
    hasLoadedData[file] = true;
    return fileData;
};

/**
 * Check if we're inside Oxygen iframe
 */
const isOxygenIframe = () => {
    return window.location.href.includes('oxygen_iframe=true');
};

/**
 * Check if we're in Oxygen builder (main window or iframe)
 */
const isOxygenBuilder = () => {
    return window.location.href.includes('ct_builder=true');
};

// Note: We rely on the 1.5s delay (isPageLoaded) to prevent style creation on page load
// After the delay, class changes will trigger real-time CSS injection
// This provides real-time preview while avoiding duplicate styles on initial load

/**
 * Apply !important to CSS declarations in @layer utilities ONLY
 * Only applies when inside Oxygen iframe (to override Oxygen's inline styles)
 * Skips CSS custom properties (--var) as !important doesn't work on them
 *
 * IMPORTANT: We only apply !important to utilities layer because:
 * - When !important is on ALL layers, cascade order is REVERSED
 * - base layer's "margin: 0 !important" would override utilities' "margin: X !important"
 * - By only adding !important to utilities, they properly override Oxygen's inline styles
 */
const applyImportantFn = (text) => {
    // Only apply !important in Oxygen iframe
    if (!isOxygenIframe()) {
        return text;
    }

    if (!text) return text;

    // Find @layer utilities block and only apply !important within it
    return text.replace(
        /@layer\s+utilities\s*\{([\s\S]*?)\}(?=\s*(?:@layer|$))/g,
        (layerMatch, layerContent) => {
            // Apply !important to declarations within utilities layer
            const modifiedContent = layerContent.replace(
                /([^{}@;]+?):\s*([^;{}!]+?)(\s*;)/g,
                (match, prop, value, semi) => {
                    // Skip if already has !important
                    if (value.includes('!important')) {
                        return match;
                    }
                    // Skip CSS custom properties (--variable-name)
                    if (prop.trim().startsWith('--')) {
                        return match;
                    }
                    return `${prop}: ${value.trim()} !important${semi}`;
                }
            );
            return `@layer utilities {${modifiedContent}}`;
        }
    );
};

/**
 * Get or create style element for compiled CSS
 */
const getOrCreateStyleElement = (id) => {
    let styleEl = document.getElementById(id);
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = id;
        document.head.append(styleEl);
    }
    return styleEl;
};

/**
 * Update autocomplete data
 */
const updateAutocompleteData = (classes, screens, compilerOptions) => {
    window.winden_autocomplete = classes;
    window.parent.winden_autocomplete = classes;

    // Handle breakpoints based on Tailwind version
    if (compilerOptions?.tailwind_version === 'v4') {
        // For Tailwind v4, breakpoints are exposed by extractStyleGuideConfig
        if (!window.winden_autocomplete_screens) {
            window.winden_autocomplete_screens = [];
            window.parent.winden_autocomplete_screens = [];
        }
    } else {
        // For Tailwind v3, use screens from compilation result
        window.winden_autocomplete_screens = screens;
        window.parent.winden_autocomplete_screens = screens;
    }
};

/**
 * Main function to compile Tailwind classes
 */
const compileClasses = async (compileOptions = {}) => {
    const options = normalizeCompileOptions(compileOptions);

    // Prevent concurrent compilations
    if (isCompiling) {
        pendingCompilation = true;
        if (hasCompileOverrides(options)) {
            pendingCompilationOptions = mergeCompileOptions(pendingCompilationOptions, options);
        }
        return;
    }

    // Handle cache invalidation
    if (options.reloadFiles) {
        resetLoadedDataCache();
    }

    if (options.invalidateCssCache) {
        cssCache.clear();
    }

    isCompiling = true;

    try {
        // Collect classes from DOM
        const classes = collectClasses();

        // Determine if compilation should proceed based on environment
        let shouldCompile = false;

        // Always compile when force option is set (e.g., from broadcast listener hot reload)
        if (options.force) {
            shouldCompile = true;
        } else {
            // Check if we're in an iframe context that requires special handling
            const inIframe = window?.inIframe ? JSON.parse(window.inIframe) : false;
            const apiVersion2 = window?.apiVersion2 ? JSON.parse(window.apiVersion2) : false;
            const isActuallyInIframe = window.self !== window.top;

            if (inIframe) {
                // For iframe-aware contexts (like Bricks), only compile inside iframe OR with API v2
                shouldCompile = isActuallyInIframe || apiVersion2;
            } else {
                // For non-iframe contexts (like Fancoolo admin, Gutenberg), always compile
                shouldCompile = true;
            }
        }

        // Check for uploadUrl in current window first, then parent (for iframe scenarios)
        const hasUploadUrl = window.uploadUrl || (window.parent !== window && window.parent?.uploadUrl);

        if (document.body && classes.size > 0 && window.tailwindify && hasUploadUrl && shouldCompile) {
            // Check if classes have changed before proceeding (unless forced)
            if (!options.force && !hasClassesChanged(classes, previousClassnames)) {
                return;
            }

            // Skip CSS injection on first compile (output.css already has styles)
            // After first compile, enable real-time CSS injection for class changes
            const compiledStylesNode = (!isFirstCompile && !disableCSSInjection) ? getOrCreateStyleElement('winden-watcher-css') : null;

            // Fetch latest config and style files
            const getConfigFileString = await fetchEditorContent();
            let getStyleFileString = await fetchEditorContent('style-tab.css');

            // Handle custom CSS for Tailwind v4
            // @theme must come AFTER @import statements so it can extend/override Tailwind defaults
            const compilerOptions = window?.tailwind_compiler_options ?? {};

            if (compilerOptions?.custom_css && compilerOptions?.tailwind_version === 'v4') {
                if (getStyleFileString?.length) {
                    // Insert @theme AFTER @import statements
                    // Find the last @import statement and insert after it
                    const importRegex = /(@import\s+["'][^"']+["'][^;]*;\s*)+/g;
                    const matches = [...getStyleFileString.matchAll(importRegex)];

                    if (matches.length > 0) {
                        // Find the end position of the last import block
                        const lastMatch = matches[matches.length - 1];
                        const insertPosition = lastMatch.index + lastMatch[0].length;
                        getStyleFileString =
                            getStyleFileString.slice(0, insertPosition) +
                            '\n' + compilerOptions.custom_css + '\n' +
                            getStyleFileString.slice(insertPosition);
                    } else {
                        // No imports found - append at the end (before any @layer components/utilities)
                        getStyleFileString = getStyleFileString + '\n' + compilerOptions.custom_css;
                    }
                } else {
                    getStyleFileString = compilerOptions.custom_css;
                }
            }

            // Check cache before compilation
            const configHash = fnvHash(getConfigFileString);
            const styleHash = fnvHash(getStyleFileString);
            const classesKey = Array.from(classes).sort().join('|');
            const cacheKey = `${configHash}-${styleHash}-${classesKey}`;

            let tw;

            if (cssCache.has(cacheKey)) {
                // Use cached result
                tw = cssCache.get(cacheKey);
                performanceStats.cacheHits++;
            } else {
                // Compile Tailwind classes
                const startTime = performance.now();
                tw = await window.tailwindify(
                    Array.from(classes),
                    getStyleFileString,
                    getConfigFileString,
                    (compilerOptions?.css_preprocessor ?? 'css'),
                    (compilerOptions?.important ?? '')
                );
                const endTime = performance.now();
                const compilationTime = endTime - startTime;

                // Update performance stats
                performanceStats.totalCompilationTime += compilationTime;
                performanceStats.totalCompilations++;
                performanceStats.averageCompilationTime =
                    performanceStats.totalCompilationTime / performanceStats.totalCompilations;

                // Cache the result (limit cache size to prevent memory issues)
                if (cssCache.size >= MAX_CACHE_SIZE) {
                    const firstKey = cssCache.keys().next().value;
                    cssCache.delete(firstKey);
                }
                cssCache.set(cacheKey, tw);
            }

            if ('error' in tw) {
                console.error('[Winden Watcher] Compilation error:', tw.error);
            } else {
                // Skip CSS injection on first compile, inject on subsequent class changes
                if (!isFirstCompile && compiledStylesNode) {
                    const finalCss = applyImportantFn(tw.css);
                    compiledStylesNode.textContent = finalCss;
                }

                // Mark first compile as done - next class change will inject CSS
                if (isFirstCompile) {
                    isFirstCompile = false;
                }

                // Set up autocomplete data
                if (tw?.classes?.length) {
                    updateAutocompleteData(tw.classes, tw.screens, compilerOptions);
                } else {
                    // Fallback autocomplete generation
                    try {
                        let { default: fullTailwindConfig } = await import(
                            "data:text/javascript;base64," + btoa(getConfigFileString)
                        );

                        window.fullTailwindConfig = fullTailwindConfig;
                        window.parent.fullTailwindConfig = fullTailwindConfig;
                        const autocomplete = await window.tailwindifyClasses();

                        if ('error' in autocomplete) {
                            throw new Error(autocomplete.error);
                        } else {
                            updateAutocompleteData(
                                autocomplete.classes,
                                autocomplete.screens,
                                compilerOptions
                            );
                        }
                    } catch (e) {
                        console.error('[Winden Watcher] Error fetching Tailwind classes:', e);
                        // Reset autocomplete data on error
                        window.winden_autocomplete = [];
                        window.parent.winden_autocomplete = [];
                        window.winden_autocomplete_screens = [];
                        window.parent.winden_autocomplete_screens = [];
                    }
                }
            }

            // Update previous classes
            previousClassnames = classes;
        }
    } catch (error) {
        console.error('[Winden Watcher] Compilation failed:', error);
    } finally {
        isCompiling = false;

        // Handle pending compilation
        if (pendingCompilation) {
            pendingCompilation = false;
            const nextOptions = pendingCompilationOptions;
            pendingCompilationOptions = null;
            setTimeout(() => compileClasses(nextOptions || undefined), 50);
        }
    }
};

// Expose compile function globally for manual triggering
window.compile = (options) => compileClasses(options);

// Expose on parent window if possible
try {
    window.parent.compile = window.compile;
} catch (error) {
    // Silently fail if cross-origin
}

// Expose performance stats for debugging
window.getWindenPerformanceStats = () => {
    const cacheHitRate = performanceStats.totalCompilations > 0
        ? (performanceStats.cacheHits / performanceStats.totalCompilations * 100).toFixed(2)
        : 0;

    return {
        ...performanceStats,
        cacheHitRate: `${cacheHitRate}%`,
        cacheSize: cssCache.size,
        averageCompilationTime: performanceStats.averageCompilationTime.toFixed(2) + 'ms'
    };
};

// Initialize by fetching required files
(async function() {
    try {
        await fetchEditorContent();
        await fetchEditorContent('style-tab.css');
    } catch (error) {
        console.error('[Winden Watcher] Failed to preload editor content:', error);
    } finally {
        debouncedCompile(0);
    }
})();

} // End of double-initialization guard

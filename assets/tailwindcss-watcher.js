/**
 * Winden Tailwind CSS Watcher
 *
 * Watches for DOM changes and compiles Tailwind classes in real-time
 * Implements caching, debouncing, and performance monitoring
 */

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
 * Simple hash function for cache keys
 */
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
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
 * Apply !important to CSS declarations (for Tailwind v4)
 */
const applyImportantFn = (text) => {
    const lines = text.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if line starts with @ (CSS directives - don't modify)
        if (line.charAt(0) === '@' || line.trim().charAt(0) === '@') {
            result.push(line);
        } else {
            // Only replace semicolons that are not already followed by !important
            result.push(line.replace(/;(?!\s*!important)/g, ' !important;'));
        }
    }

    return result.join('\n');
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
        } else if (window?.inIframe ? JSON.parse(window.inIframe) : true) {
            if (window?.apiVersion2 ? JSON.parse(window.apiVersion2) : false) {
                shouldCompile = true;
            } else {
                shouldCompile = window.self !== window.top;
            }
        } else {
            shouldCompile = true;
        }

        // Check for uploadUrl in current window first, then parent (for iframe scenarios)
        const hasUploadUrl = window.uploadUrl || (window.parent !== window && window.parent?.uploadUrl);

        if (document.body && classes.size > 0 && window.tailwindify && hasUploadUrl && shouldCompile) {
            // Check if classes have changed before proceeding (unless forced)
            if (!options.force && !hasClassesChanged(classes, previousClassnames)) {
                return;
            }

            // Get or create style element
            const compiledStylesNode = getOrCreateStyleElement('compiled-styles-tailwind');

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
            const configHash = simpleHash(getConfigFileString);
            const styleHash = simpleHash(getStyleFileString);
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
                // Apply compiled CSS
                if (tw?.css?.length) {
                    let applyImportant = false;
                    if (compilerOptions?.tailwind_version === 'v4') {
                        applyImportant = compilerOptions?.important?.length ? true : false;
                    }

                    const finalCss = applyImportant ? applyImportantFn(tw.css) : tw.css;
                    compiledStylesNode.textContent = finalCss;
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

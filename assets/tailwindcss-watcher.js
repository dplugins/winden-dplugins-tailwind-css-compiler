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

// Scheduling and compilation state
let compileScheduled = false;
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
 * Compile on the next frame, before it paints.
 *
 * This used to be a 150 ms `setTimeout` debounce, and that debounce was the
 * whole of the lag: a warm incremental compile is 1–3 ms, but the editor
 * paints the new class the moment it lands in the DOM, so for those 150 ms
 * an element read `bg-blue-400` with no rule behind it — background gone,
 * padding gone, then the new style. Measured red → blue: transparent for
 * ~165 ms.
 *
 * `requestAnimationFrame` runs before that frame's style and paint, and the
 * warm compile chain is microtasks only (cached stylesheet, cached compiler,
 * synchronous `build()`), so the `<style>` is rewritten inside the same
 * frame: measured, zero unstyled frames. It also coalesces every mutation of
 * a frame into one walk, which is what the debounce was for. A hidden page
 * never gets a frame, so it falls back to a task there; a cold compile
 * (stylesheet or config changed) awaits real work and paints in between as
 * it always did.
 */
const scheduleCompile = () => {
    if (compileScheduled) {
        return;
    }
    compileScheduled = true;

    const run = async () => {
        compileScheduled = false;
        if (!isCompiling) {
            await compileClasses();
        } else {
            pendingCompilation = true;
        }
    };

    if (typeof requestAnimationFrame === 'function' && document.visibilityState !== 'hidden') {
        requestAnimationFrame(run);
    } else {
        setTimeout(run, 0);
    }
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
// Invalid patterns to exclude (JS code, HTML syntax, etc.)
const invalidPatterns = [
    /^[{}\[\]()'"`;=<>]/, // Starts with JS/HTML syntax
    /[{};"'`=<>]/,         // Contains JS/HTML special chars
    /\s/,                   // Contains whitespace
    /^\d+$/,                // Pure numbers
    /^[A-Z][a-z]+\./,       // JavaScript syntax (e.g., "iframeScope.")
];

const isCandidate = (className) => !invalidPatterns.some((pattern) => pattern.test(className));

/** Every class on one element and its descendants, added to `into` */
const addClassesUnder = (root, into) => {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const elements = [root, ...root.querySelectorAll('[class]')];
    for (const element of elements) {
        if (tagsToIgnore.has(element.tagName)) continue;
        const classList = element.classList;
        for (let i = 0; i < classList.length; i++) {
            if (isCandidate(classList[i])) into.add(classList[i]);
        }
    }
};

const collectClasses = () => {
    const classes = new Set();

    // The first compile is scheduled as soon as the stylesheets are fetched,
    // which on a warm cache is before the canvas document has a <body> —
    // and a frame callback runs while it is still parsing. Nothing to
    // collect yet; the observer fires again as the body arrives.
    if (!document.body) {
        return classes;
    }

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
            if (isCandidate(className)) {
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

/**
 * Whether a batch of mutations can have brought a class the sheet lacks.
 *
 * Builders toggle `is-selected`, hover and drag classes on every mouse move,
 * and with a compile per frame rather than per 150 ms pause each of those
 * would walk the whole canvas — measured 4 ms on 5,000 elements. The
 * mutation records already name the elements that changed, and live preview
 * only ever adds CSS (see `incremental` below), so a class going away is
 * never a reason to compile: only a class that is new to the last compile
 * is. Text nodes carry no classes and are skipped outright, so typing prose
 * costs nothing here.
 *
 * Before the first compile nothing is known, and everything is new.
 */
const mutationsBringNewClasses = (mutations) => {
    const seen = new Set();

    for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
            if (mutation.attributeName !== 'class' || isIgnorableNode(mutation.target)) continue;
            const classList = mutation.target.classList;
            for (let i = 0; i < classList.length; i++) {
                if (isCandidate(classList[i])) seen.add(classList[i]);
            }
            continue;
        }

        if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE && !isIgnorableNode(node)) addClassesUnder(node, seen);
            }
        }
    }

    if (previousClassnames.size === 0) return seen.size > 0;
    for (const className of seen) {
        if (!previousClassnames.has(className)) return true;
    }
    return false;
};

const handleMutations = (mutations) => {
    if (mutationsBringNewClasses(mutations)) {
        scheduleCompile();
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
            // Uses shared ID so watcher and hot-reload (css-injector) write to one <style> tag
            const compiledStylesNode = (!isFirstCompile && !disableCSSInjection) ? getOrCreateStyleElement('winden-compiled-css-hotreload') : null;

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
                // Compile Tailwind classes. Live preview only ever adds CSS,
                // so reuse the parsed compiler (`incremental`) — a removed
                // class leaves inert CSS behind until reload, and the parse
                // of theme/plugins/@config is paid once per config change
                // instead of once per keystroke. output.css never comes
                // through here (see winden-compiler-core.js).
                const startTime = performance.now();
                //
                // Inside the Oxygen iframe utilities must beat Oxygen's inline
                // styles, so they compile with !important there (Tailwind's
                // `important` import modifier — utilities only; base and
                // components keep the normal cascade).
                tw = await window.tailwindify(
                    Array.from(classes),
                    getStyleFileString,
                    getConfigFileString,
                    (compilerOptions?.css_preprocessor ?? 'css'),
                    { incremental: true, important: isOxygenIframe() }
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
                    compiledStylesNode.textContent = tw.css;
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
        scheduleCompile();
    }
})();

} // End of double-initialization guard

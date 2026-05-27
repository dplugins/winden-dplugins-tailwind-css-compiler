/**
 * Winden Compiler Core
 *
 * Shared compilation logic used by compile-trigger.js and other scripts
 * This module provides:
 * - Editor type detection
 * - Post ID extraction
 * - Trigger recompile via AJAX
 * - CSS compilation flow
 * - CSS injection into page/iframes
 *
 * Dependencies: window.windenAutoCompile, window.tailwindify
 */

(function() {
    'use strict';

    // Prevent double initialization
    if (window.WindenCompilerCore) {
        return;
    }

    // CSS injection is always enabled - this file is only used for explicit save/reload events
    // (not automatic page load injection, which is handled by tailwindcss-watcher.js)

    /**
     * Detect current editor type
     * @returns {Object} Editor detection flags
     */
    function detectEditorType() {
        const isGutenberg = typeof wp !== 'undefined' && wp.data && wp.data.select && wp.data.select('core/editor');
        const isElementor = typeof elementorFrontend !== 'undefined' || typeof $e !== 'undefined';
        const isBricks = window.location.href.includes('bricks=') ||
                         typeof window.bricksData !== 'undefined' ||
                         document.body.classList.contains('bricks-builder');
        const isOxygen = window.location.href.includes('ct_builder=true');
        // Breakdance uses breakdance_iframe=true, not oxygen=builder
        const isBreakdance = window.location.href.includes('breakdance_iframe') ||
                             window.location.href.includes('breakdance=builder');
        // Oxygen 6 uses oxygen=builder WITHOUT breakdance_iframe
        const isOxygen6 = window.location.href.includes('oxygen=builder') && !isBreakdance;
        // Fancoolo uses page=fancoolo-app
        const isFancoolo = window.location.href.includes('page=fancoolo-app');
        // Builderius uses ?builderius in the main window (not iframe)
        // URL can be ?builderius or ?builderius=builder or ?builderius=1
        const urlParams = new URLSearchParams(window.location.search);
        const isBuilderius = urlParams.has('builderius') &&
                             !urlParams.has('builderius_inner_preview');

        return {
            isGutenberg,
            isElementor,
            isBricks,
            isOxygen,
            isBreakdance,
            isOxygen6,
            isFancoolo,
            isBuilderius
        };
    }

    /**
     * Get post ID from URL with fallbacks for different builders
     * @returns {string|null} Post ID or null
     */
    function getPostId() {
        const urlParams = new URLSearchParams(window.location.search);

        return urlParams.get('post_id') ||
               urlParams.get('post') ||
               urlParams.get('id') ||
               urlParams.get('ct_builder_post') ||
               (window.bricksData && window.bricksData.postId) ||
               (window.windenAutoCompile && window.windenAutoCompile.postId) ||
               null;
    }

    /**
     * Best-effort current-post-id lookup across builder contexts.
     * Returns 0 when unknown — server falls back to a full crawl.
     */
    function getCurrentPostId() {
        try {
            if (window.wp && wp.data && typeof wp.data.select === 'function') {
                const id = wp.data.select('core/editor')?.getCurrentPostId();
                if (id) return Number(id);
            }
        } catch (e) { /* ignore */ }
        try {
            if (window.elementor && elementor.config && elementor.config.document) {
                return Number(elementor.config.document.id) || 0;
            }
        } catch (e) { /* ignore */ }
        try {
            if (window.bricksData && window.bricksData.postId) {
                return Number(window.bricksData.postId) || 0;
            }
        } catch (e) { /* ignore */ }
        try {
            const params = new URLSearchParams(window.location.search);
            const candidate = params.get('post') || params.get('bricks_post_id') || params.get('ct_builder_post_id');
            if (candidate) return Number(candidate) || 0;
        } catch (e) { /* ignore */ }
        return 0;
    }

    /**
     * Trigger recompile via AJAX - crawls classes then compiles
     * @param {Function} compileCallback - Function to call after successful crawl
     * @param {number} [postId] - Optional saved-post id; when present the server
     *                            runs a fast single-post crawl and defers the
     *                            full crawl to WP-Cron.
     */
    function triggerRecompile(compileCallback, postId) {
        if (!window.windenAutoCompile) {
            return;
        }

        const resolvedPostId = (typeof postId === 'number' && postId > 0)
            ? postId
            : getCurrentPostId();

        const body = {
            action: 'winden_trigger_recompile',
            _nonce: window.windenAutoCompile.nonce
        };
        if (resolvedPostId > 0) {
            body.post_id = String(resolvedPostId);
        }

        fetch(window.windenAutoCompile.ajaxUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(body)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Crawl is done, now compile with fresh classes
                if (typeof compileCallback === 'function') {
                    compileCallback().then(() => {
                        console.log('[winden:compiler-core] ✅ Compiled successfully');
                    }).catch((err) => {
                        console.error('[winden:compiler-core] ❌ Compilation failed:', err);
                    });
                }
            } else {
                console.error('[winden:compiler-core] ❌ Crawl failed:', data);
            }
        })
        .catch((err) => {
            console.error('[winden:compiler-core] ❌ AJAX request failed:', err);
            // On error, still try to compile (may use stale classes)
            if (typeof compileCallback === 'function') {
                compileCallback().catch(() => {});
            }
        });
    }

    /**
     * Normalize classes to array of strings
     * @param {*} classes - Classes in various formats
     * @returns {string[]} Array of class strings
     */
    function normalizeClasses(classes) {
        if (!Array.isArray(classes)) {
            if (typeof classes === 'object' && classes !== null) {
                classes = Object.values(classes);
            } else if (typeof classes === 'string') {
                classes = classes.split(/[\s,]+/).filter(c => c.length > 0);
            } else if (classes) {
                classes = [classes];
            } else {
                classes = [];
            }
        }

        // Ensure it's a true array with only strings
        return Array.from(classes).filter(c => typeof c === 'string' && c.length > 0);
    }

    /**
     * Build merged styles with Tailwind imports and Wizzard config
     * @param {string} styles - User's style tab content
     * @param {string} wizzardConfig - Wizzard @theme config
     * @returns {string} Merged CSS content
     */
    function buildMergedStyles(styles, wizzardConfig) {
        let mergedStyles = '';

        if (styles && styles.trim()) {
            // User has style tab content
            // Check if it already has Tailwind imports
            if (!styles.includes('@import "tailwindcss')) {
                // No imports found - add defaults before user's content
                mergedStyles = '@layer theme, base, components, utilities;\n\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n\n';
                mergedStyles += styles;
            } else {
                // User's content already has imports
                mergedStyles = styles;
            }
        } else {
            // No style tab content - use default minimal imports
            mergedStyles = '@layer theme, base, components, utilities;\n\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n\n';
        }

        // APPEND Wizzard @theme config
        if (wizzardConfig) {
            mergedStyles += wizzardConfig;
        }

        return mergedStyles;
    }

    /**
     * Wait for Tailwind compiler to be ready
     * @param {number} timeout - Timeout in ms (default 10000)
     * @returns {Promise<void>}
     */
    function waitForCompiler(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (typeof window.tailwindify === 'function') {
                resolve();
                return;
            }

            let attempts = 0;
            const maxAttempts = timeout / 100;
            const interval = setInterval(() => {
                attempts++;
                if (typeof window.tailwindify === 'function') {
                    clearInterval(interval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    reject(new Error('Compiler timeout'));
                }
            }, 100);
        });
    }

    /**
     * Inject CSS into a document
     * @param {Document} doc - Target document
     * @param {string} css - CSS content
     * @param {string} id - Style element ID
     */
    function injectCSS(doc, css, id = 'winden-compiled-css-hotreload') {
        try {
            let styleTag = doc.getElementById(id);
            if (!styleTag) {
                styleTag = doc.createElement('style');
                styleTag.id = id;
                doc.head.appendChild(styleTag);
            }
            styleTag.textContent = css;
        } catch (e) {
            // Silent fail - cross-origin restrictions
        }
    }

    /**
     * Hot-reload compiled CSS in the page and builder iframes
     * @param {string} css - Compiled CSS
     * @param {Object} editors - Editor detection flags
     */
    function reloadCompiledCSS(css, editors) {
        if (!editors) {
            editors = detectEditorType();
        }

        // Check if we're in main builder windows (NOT iframes)
        const isOxygenMainBuilder = window.location.href.includes('ct_builder=true') &&
                                    !window.location.href.includes('oxygen_iframe=true');
        const isBricksMainBuilder = editors.isBricks &&
                                    !window.location.href.includes('brickspreview=');

        // Skip injection in main builder windows - only inject in iframes
        const shouldSkipMainDocument = isOxygenMainBuilder || isBricksMainBuilder || editors.isGutenberg;

        if (!shouldSkipMainDocument) {
            injectCSS(document, css);
        }

        // If in parent window, also inject in builder iframes
        if (window === window.parent) {
            // Bricks iframe
            const bricksIframe = document.getElementById('bricks-builder-iframe');
            if (bricksIframe && bricksIframe.contentDocument) {
                injectCSS(bricksIframe.contentDocument, css);
            }

            // Oxygen iframe
            if (isOxygenMainBuilder) {
                const oxygenIframe = document.querySelector('iframe[src*="oxygen_iframe"]');
                if (oxygenIframe && oxygenIframe.contentDocument) {
                    injectCSS(oxygenIframe.contentDocument, css);
                }
            }

            // Gutenberg iframe (WordPress 5.9+)
            if (editors.isGutenberg) {
                const gutenbergIframe = document.querySelector('iframe[name="editor-canvas"]');
                if (gutenbergIframe && gutenbergIframe.contentDocument) {
                    injectCSS(gutenbergIframe.contentDocument, css);
                }
            }

            // Builderius preview iframe
            if (editors.isBuilderius) {
                const builderiusIframe = document.querySelector('iframe[class*="preview"], iframe[src*="builderius_inner_preview"]');
                if (builderiusIframe && builderiusIframe.contentDocument) {
                    injectCSS(builderiusIframe.contentDocument, css);
                }
            }
        }
    }

    /**
     * Fetch classes and config from WordPress
     * @returns {Promise<Object>} Classes, config, styles, wizzardConfig
     */
    async function fetchCompileData() {
        const response = await fetch(window.windenAutoCompile.ajaxUrl + '?action=winden_compile_from_crawled', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ _nonce: window.windenAutoCompile.nonce })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to load classes');
        }

        return data.data;
    }

    /**
     * Save compiled CSS to WordPress
     * @param {string} css - Compiled CSS
     * @returns {Promise<void>}
     */
    async function saveCompiledCSS(css) {
        const saveResponse = await fetch(window.windenAutoCompile.ajaxUrl + '?action=winden_save_cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                _nonce: window.windenAutoCompile.nonce,
                styles: css,
                status: 'success'
            })
        });

        const saveData = await saveResponse.json();
        if (!saveData.success) {
            throw new Error('Failed to save CSS');
        }
    }

    /**
     * Clear the recompile flag in WordPress
     * @returns {Promise<void>}
     */
    async function clearRecompileFlag() {
        await fetch(window.windenAutoCompile.ajaxUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'winden_clear_recompile_flag',
                _nonce: window.windenAutoCompile.nonce
            })
        });
    }

    /**
     * Create a compile function with compilation lock
     * @param {Object} options - Options
     * @param {Function} options.onCSSReload - Custom CSS reload function (optional)
     * @returns {Function} Async compile function
     */
    function createCompileFunction(options = {}) {
        let isCompiling = false;
        const editors = detectEditorType();

        return async function compile() {
            if (isCompiling) {
                return;
            }
            isCompiling = true;
            const startTime = performance.now();

            try {
                // Fetch classes and config
                const data = await fetchCompileData();
                let { classes, config, styles, wizzardConfig, css_preprocessor: cssPreprocessor } = data;

                // Normalize classes
                classes = normalizeClasses(classes);

                // Build merged styles
                const combinedStyles = buildMergedStyles(styles, wizzardConfig);

                // Wait for compiler
                await waitForCompiler();

                // Compile CSS
                const compiled = await window.tailwindify(classes, combinedStyles, config, cssPreprocessor);

                if (compiled.error) {
                    throw new Error(compiled.error);
                }

                // Validate compiled CSS
                if (!compiled.css || typeof compiled.css !== 'string') {
                    throw new Error('Invalid CSS generated');
                }

                // Save to output.css
                await saveCompiledCSS(compiled.css);

                // Clear the recompile flag
                await clearRecompileFlag();

                // Hot-reload CSS in the page
                if (typeof options.onCSSReload === 'function') {
                    options.onCSSReload(compiled.css);
                } else {
                    reloadCompiledCSS(compiled.css, editors);
                }

                const duration = Math.round(performance.now() - startTime);
                console.log(`[winden:compiler-core] ✅ Compiled in ${duration}ms`);

            } catch (error) {
                console.error('[winden:compiler-core] ❌ Compilation failed:', error);

                // Store last error for debugging
                if (window.windenAutoCompile) {
                    window.windenAutoCompile.lastError = {
                        timestamp: new Date().toISOString(),
                        message: error.message,
                        stack: error.stack
                    };
                }
            } finally {
                isCompiling = false;
            }
        };
    }

    // Export the core module
    window.WindenCompilerCore = {
        detectEditorType,
        getPostId,
        triggerRecompile,
        normalizeClasses,
        buildMergedStyles,
        waitForCompiler,
        injectCSS,
        reloadCompiledCSS,
        fetchCompileData,
        saveCompiledCSS,
        clearRecompileFlag,
        createCompileFunction
    };

})();

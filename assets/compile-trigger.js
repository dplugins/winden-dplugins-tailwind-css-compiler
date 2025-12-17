/**
 * Winden Compile Trigger
 *
 * Listens to save events from all page builders and triggers CSS compilation
 *
 * Purpose: Detect saves and trigger Tailwind CSS compilation
 * Dependencies: css-injector.js (window.windenCSSInjector), window.tailwindify (Tailwind compiler)
 */

(function() {
    'use strict';

    if (!window.windenAutoCompile) {
        return;
    }

    let isCompiling = false;

    // Helper: Get post ID from URL with fallbacks for different builders
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

    // Helper: Trigger recompile via AJAX
    function triggerRecompile(postId) {
        if (!postId) {
            compile();
            return;
        }

        fetch(windenAutoCompile.ajaxUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'winden_trigger_recompile',
                post_id: postId,
                _nonce: windenAutoCompile.nonce
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                compile();
            }
        })
        .catch(() => {
            compile();
        });
    }

    // Helper: Use css-injector.js to reload CSS
    function reloadCompiledCSS(css) {
        if (window.windenCSSInjector && window.windenCSSInjector.reloadCompiledCSS) {
            window.windenCSSInjector.reloadCompiledCSS(css);
        } else {
            console.error('[Winden] CSS injector not loaded');
        }
    }

    // Detect editor type
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


    // Initialize
    function init() {
        // Don't compile on page load for Fancoolo admin page - only after save event
        if (isFancoolo) {
            // For Fancoolo, skip initial compile - only compile on save event
            // CSS will be compiled when the 'fancoolo:postSaved' event fires
            return;
        }

        // Compile on page load if needed (for other builders)
        if (window.windenAutoCompile.needsCompile) {
            compile();
        }

        // Gutenberg: wp.data subscribe (instant)
        if (isGutenberg) {
            initGutenberg();
        }
        // Elementor: $e.hooks system (instant)
        else if (isElementor) {
            initElementor();
        }
        // Bricks: Vue store watcher (instant)
        else if (isBricks) {
            initBricks();
        }
        // Oxygen: postMessage + class watcher (instant)
        else if (isOxygen) {
            initOxygen();
        }
        // Breakdance: Vue store watcher (same as Oxygen 6)
        else if (isBreakdance) {
            initBreakdance();
        }
        // Oxygen 6: Vue store watcher (instant)
        else if (isOxygen6) {
            initOxygen6();
        }
        // Fancoolo: Custom event listener (already registered globally at line 445)
        // No specific init needed - event listener is set up outside init()
    }

    function initGutenberg() {
        const { subscribe, select } = wp.data;
        let wasSaving = false;

        subscribe(() => {
            try {
                const isSaving = select('core/editor').isSavingPost();
                const isAutosaving = select('core/editor').isAutosavingPost();

                // Trigger when save completes (was saving, now not saving)
                if (wasSaving && !isSaving && !isAutosaving) {
                    const postId = select('core/editor').getCurrentPostId();
                    triggerRecompile(postId);
                }

                wasSaving = isSaving;
            } catch(e) {
                // Silent fail
            }
        });
    }

    function initElementor() {
        // Wait for Elementor to initialize
        window.addEventListener('elementor/init', function() {
            class WindenAfterSave extends $e.modules.hookUI.After {
                getCommand() {
                    return 'document/save/save';
                }

                getId() {
                    return 'winden-after-save';
                }

                getConditions(args) {
                    return true;
                }

                apply(args) {
                    const postId = elementor.config.document.id;
                    triggerRecompile(postId);
                }
            }

            $e.hooks.registerUIAfter(new WindenAfterSave());
        });
    }

    function initBricks() {
        let lastSaveTime = 0;

        // Method 1: Keyboard shortcut (Ctrl/Cmd+S)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const now = Date.now();
                if (now - lastSaveTime < 1000) return;
                lastSaveTime = now;

                setTimeout(() => triggerRecompile(getPostId()), 500);
            }
        });

        // Method 2: Watch #bricks-message element for save completion
        const checkMessageElement = setInterval(() => {
            const messageElement = document.getElementById('bricks-message');

            if (messageElement) {
                clearInterval(checkMessageElement);

                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            if (messageElement.classList.contains('show')) {
                                const now = Date.now();
                                if (now - lastSaveTime < 1000) return;
                                lastSaveTime = now;

                                setTimeout(() => triggerRecompile(getPostId()), 100);
                            }
                        }
                    });
                });

                observer.observe(messageElement, {
                    attributes: true,
                    attributeFilter: ['class']
                });
            }
        }, 100);

        setTimeout(() => clearInterval(checkMessageElement), 10000);
    }

    function initOxygen() {
        // Listen for blockSaved postMessage from iframe
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'blockSaved') {
                // Verify save was successful by checking oxygen-unsaved-changes class
                const oxygenUI = document.getElementById('oxygen-ui');
                const hasUnsavedChanges = oxygenUI && oxygenUI.classList.contains('oxygen-unsaved-changes');

                if (!hasUnsavedChanges) {
                    // Save completed successfully
                    triggerRecompile(getPostId());
                }
            }
        });

        // Fallback: Watch for oxygen-unsaved-changes class removal (MutationObserver)
        const checkOxygenUI = setInterval(() => {
            const oxygenUI = document.getElementById('oxygen-ui');

            if (oxygenUI) {
                clearInterval(checkOxygenUI);

                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.attributeName === 'class') {
                            const hadUnsaved = mutation.oldValue && mutation.oldValue.includes('oxygen-unsaved-changes');
                            const hasUnsaved = oxygenUI.classList.contains('oxygen-unsaved-changes');

                            // Trigger when unsaved changes flag is removed (save completed)
                            if (hadUnsaved && !hasUnsaved) {
                                triggerRecompile(getPostId());
                            }
                        }
                    });
                });

                observer.observe(oxygenUI, {
                    attributes: true,
                    attributeOldValue: true,
                    attributeFilter: ['class']
                });
            }
        }, 100);

        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkOxygenUI), 10000);
    }

    function initBreakdance() {
        // Keyboard shortcut as backup (Ctrl/Cmd+S)
        let lastSaveTime = 0;
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const now = Date.now();
                if (now - lastSaveTime < 1000) return; // Debounce
                lastSaveTime = now;

                setTimeout(() => {
                    const postId = getPostId();
                    triggerRecompile(postId);
                }, 500);
            }
        });

        // Helper to get Vue app (same approach as plain-classes/oxygen6)
        const getVueApp = () => {
            return document.querySelector('#app')?.__vue__ ||
                   window.parent?.document.querySelector('#app')?.__vue__;
        };

        // Wait for Vue app to initialize
        let checkCount = 0;
        const checkBreakdanceReady = setInterval(() => {
            checkCount++;
            const app = getVueApp();

            if (app) {
                clearInterval(checkBreakdanceReady);

                try {
                    const store = app.$store;

                    if (store && store.state) {
                        let wasSaving = false;

                        // Watch ui.saveInProgress for save completion
                        if (store.watch) {
                            store.watch(
                                (state) => state.ui?.saveInProgress,
                                (isSaving) => {
                                    if (wasSaving && !isSaving) {
                                        console.log('[Winden Post-Save] 🎯 Save completed! Triggering recompile...');
                                        triggerRecompile(getPostId());
                                    }
                                    wasSaving = isSaving;
                                }
                            );
                        } else {
                            // Fallback to $watch
                            app.$watch(
                                () => store.state.ui?.saveInProgress,
                                (isSaving) => {
                                    if (wasSaving && !isSaving) {
                                        console.log('[Winden Post-Save] 🎯 Save completed! Triggering recompile...');
                                        triggerRecompile(getPostId());
                                    }
                                    wasSaving = isSaving;
                                }
                            );
                        }
                    } else {
                        console.warn('[Winden Post-Save] ❌ Could not find Vuex store');
                    }
                } catch(e) {
                    console.error('[Winden Post-Save] ❌ Error setting up Breakdance watcher:', e);
                }
            }
        }, 100);

        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkBreakdanceReady), 10000);
    }

    function initOxygen6() {
        // Helper to get Vue app (same approach as plain-classes/oxygen6)
        const getVueApp = () => {
            return document.querySelector('#app')?.__vue__ ||
                   window.parent?.document.querySelector('#app')?.__vue__;
        };

        // Wait for Vue app to initialize
        let checkCount = 0;
        const checkOxygen6Ready = setInterval(() => {
            checkCount++;
            const app = getVueApp();

            if (app) {
                clearInterval(checkOxygen6Ready);

                try {
                    const store = app.$store;

                    if (store && store.state) {
                        let wasSaving = false;

                        // Try ui.saveInProgress first (Breakdance-style), fallback to closingConfirmations
                        const watchPath = store.state.ui?.saveInProgress !== undefined
                            ? (state) => state.ui?.saveInProgress
                            : (state) => state.closingConfirmations?.builder?.isSaving;

                        // Watch for save completion
                        if (store.watch) {
                            store.watch(watchPath, (isSaving) => {
                                if (wasSaving && !isSaving) {
                                    console.log('[Winden Post-Save] 🎯 Save completed! Triggering recompile...');
                                    triggerRecompile(getPostId());
                                }
                                wasSaving = isSaving;
                            });
                        } else {
                            // Fallback to $watch
                            app.$watch(watchPath, (isSaving) => {
                                if (wasSaving && !isSaving) {
                                    console.log('[Winden Post-Save] 🎯 Save completed! Triggering recompile...');
                                    triggerRecompile(getPostId());
                                }
                                wasSaving = isSaving;
                            });
                        }
                    } else {
                        console.warn('[Winden Post-Save] ❌ Could not find Vuex store');
                    }
                } catch(e) {
                    console.error('[Winden Post-Save] ❌ Error setting up Oxygen 6 watcher:', e);
                }
            }
        }, 100);

        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkOxygen6Ready), 10000);
    }


    // Listen for Fancoolo post save events
    window.addEventListener('fancoolo:postSaved', function(event) {
        const postId = event.detail?.postId;
        if (postId) {
            triggerRecompile(postId);
        } else {
            console.warn('[Winden] No postId in event detail');
        }
    });

    // Start when ready
    if (isGutenberg) {
        wp.domReady(init);
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    async function compile() {
        if (isCompiling) return;
        isCompiling = true;

        try {
            // Get classes to compile
            const response = await fetch(windenAutoCompile.ajaxUrl + '?action=winden_compile_from_crawled', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ _nonce: windenAutoCompile.nonce })
            });

            const data = await response.json();

            if (!data.success) throw new Error('Failed to load classes');

            let { classes, config, styles, wizzardConfig } = data.data;

            // Ensure classes is always a proper array
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
            classes = Array.from(classes).filter(c => typeof c === 'string' && c.length > 0);

            // Build CSS following the same pattern as admin (ClassFetcher.ts lines 109-132)
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

            // APPEND Wizzard @theme config - same as ClassFetcher.ts line 129
            if (wizzardConfig) {
                mergedStyles += wizzardConfig;
            }

            // Use merged content for compilation
            const combinedStyles = mergedStyles;

            // Wait for compiler to be ready
            if (typeof window.tailwindify !== 'function') {
                await new Promise((resolve, reject) => {
                    let attempts = 0;
                    const interval = setInterval(() => {
                        attempts++;
                        if (typeof window.tailwindify === 'function') {
                            clearInterval(interval);
                            resolve();
                        } else if (attempts >= 100) {
                            clearInterval(interval);
                            reject(new Error('Compiler timeout'));
                        }
                    }, 100);
                });
            }

            // Compile CSS using combined styles (Wizzard + custom)
            const compiled = await window.tailwindify(classes, combinedStyles, config);

            if (compiled.error) throw new Error(compiled.error);

            // Validate compiled CSS
            if (!compiled.css || typeof compiled.css !== 'string') {
                throw new Error('Invalid CSS generated');
            }

            // Save to output.css
            const saveResponse = await fetch(windenAutoCompile.ajaxUrl + '?action=save_winden_cache', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    _nonce: windenAutoCompile.nonce,
                    styles: compiled.css,
                    status: 'success'
                })
            });

            const saveData = await saveResponse.json();
            if (!saveData.success) throw new Error('Failed to save CSS');

            // Clear the recompile flag
            await fetch(windenAutoCompile.ajaxUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'winden_clear_recompile_flag',
                    _nonce: windenAutoCompile.nonce
                })
            });

            // Hot-reload CSS in the page
            reloadCompiledCSS(compiled.css);

            console.log('[Winden] ✅ CSS compiled and reloaded');

        } catch (error) {
            console.error('[Winden] ❌ Compilation failed:', error);

            // Store last error for debugging
            window.windenAutoCompile.lastError = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack
            };
        } finally {
            isCompiling = false;
        }
    }
})();

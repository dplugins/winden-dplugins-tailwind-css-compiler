/**
 * Winden Compile Trigger
 *
 * Listens to save events from all page builders and triggers CSS compilation
 *
 * Purpose: Detect saves and trigger Tailwind CSS compilation
 * Dependencies: winden-compiler-core.js, css-injector.js (optional)
 */

(function() {
    'use strict';

    // Debug logging helper
    const debug = window.WINDTACS_DEBUG ? console.log.bind(console) : () => {};

    debug('[winden:compile-trigger] compile-trigger.js loaded');
    debug('[winden:compile-trigger] windenAutoCompile:', window.windenAutoCompile ? 'defined' : 'undefined');

    if (!window.windenAutoCompile) {
        debug('[winden:compile-trigger] EXITING: windenAutoCompile not defined');
        return;
    }

    // Wait for core module to be available
    function waitForCore(callback) {
        debug('[winden:compile-trigger] Waiting for WindenCompilerCore...');
        if (window.WindenCompilerCore) {
            debug('[winden:compile-trigger] WindenCompilerCore already available');
            callback();
        } else {
            const interval = setInterval(() => {
                if (window.WindenCompilerCore) {
                    clearInterval(interval);
                    debug('[winden:compile-trigger] WindenCompilerCore now available');
                    callback();
                }
            }, 50);
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(interval);
                debug('[winden:compile-trigger] TIMEOUT: WindenCompilerCore never loaded');
            }, 5000);
        }
    }

    waitForCore(function() {
        const Core = window.WindenCompilerCore;
        const editors = Core.detectEditorType();
        debug('[winden:compile-trigger] Editor detection:', JSON.stringify(editors));

        // Create compile function with optional css-injector support
        const compile = Core.createCompileFunction({
            onCSSReload: function(css) {
                // Use css-injector.js if available, otherwise fall back to core
                if (window.windenCSSInjector && window.windenCSSInjector.reloadCompiledCSS) {
                    window.windenCSSInjector.reloadCompiledCSS(css);
                } else {
                    Core.reloadCompiledCSS(css, editors);
                }
            }
        });

        // Helper: Trigger recompile with the compile callback
        // Flushes any pending Winden class saves first
        function triggerRecompile() {
            // Check if Winden has pending saves that need to be flushed
            if (window.windenFlushPendingSaves && window.windenHasPendingSaves && window.windenHasPendingSaves()) {
                debug('[winden:compile-trigger] Flushing pending Winden class saves before compile...');
                window.windenFlushPendingSaves().then(function() {
                    debug('[winden:compile-trigger] Pending saves flushed, starting compile');
                    Core.triggerRecompile(compile);
                }).catch(function(err) {
                    console.error('[winden:compile-trigger] Error flushing saves:', err);
                    // Still trigger compile even if flush failed
                    Core.triggerRecompile(compile);
                });
            } else {
                Core.triggerRecompile(compile);
            }
        }

        // Initialize based on editor type
        function init() {
            debug('[winden:compile-trigger] init() called');
            // Don't compile on page load - output.css already has the styles
            // Hot reload elements are only created when saving from Winden admin
            // or when saving from page builders

            if (editors.isGutenberg) {
                debug('[winden:compile-trigger] Detected: Gutenberg');
                initGutenberg();
            } else if (editors.isElementor) {
                debug('[winden:compile-trigger] Detected: Elementor');
                initElementor();
            } else if (editors.isBricks) {
                debug('[winden:compile-trigger] Detected: Bricks');
                initBricks();
            } else if (editors.isOxygen) {
                debug('[winden:compile-trigger] Detected: Oxygen');
                initOxygen();
            } else if (editors.isBreakdance) {
                debug('[winden:compile-trigger] Detected: Breakdance');
                initBreakdance();
            } else if (editors.isOxygen6) {
                debug('[winden:compile-trigger] Detected: Oxygen 6');
                initOxygen6();
            } else if (editors.isBuilderius) {
                debug('[winden:compile-trigger] Detected: Builderius');
                initBuilderius();
            } else {
                debug('[winden:compile-trigger] No editor detected!');
            }
        }

        function initGutenberg() {
            const { subscribe, select } = wp.data;
            let wasSaving = false;

            subscribe(() => {
                try {
                    const isSaving = select('core/editor').isSavingPost();
                    const isAutosaving = select('core/editor').isAutosavingPost();

                    if (wasSaving && !isSaving && !isAutosaving) {
                        triggerRecompile();
                    }

                    wasSaving = isSaving;
                } catch(e) {
                    // Silent fail
                }
            });
        }

        function initElementor() {
            function registerElementorHook() {
                if (typeof $e === 'undefined' || !$e.modules || !$e.modules.hookUI) {
                    debug('[winden:compile-trigger] $e.modules.hookUI not available yet');
                    return false;
                }

                try {
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
                            debug('[winden:compile-trigger] Elementor save detected, triggering recompile');
                            triggerRecompile();
                        }
                    }

                    $e.hooks.registerUIAfter(new WindenAfterSave());
                    debug('[winden:compile-trigger] Elementor hook registered successfully');
                    return true;
                } catch (e) {
                    debug('[winden:compile-trigger] Error registering Elementor hook:', e);
                    return false;
                }
            }

            // Try to register immediately (Elementor might already be initialized)
            if (registerElementorHook()) {
                return;
            }

            // If not ready, listen for elementor/init event
            window.addEventListener('elementor/init', function() {
                debug('[winden:compile-trigger] elementor/init event fired');
                // Small delay to ensure $e is fully ready
                setTimeout(registerElementorHook, 100);
            });

            // Also try periodically in case we missed the event
            let attempts = 0;
            const checkInterval = setInterval(function() {
                attempts++;
                if (registerElementorHook() || attempts > 50) {
                    clearInterval(checkInterval);
                }
            }, 200);
        }

        function initBricks() {
            let lastSaveTime = 0;

            // Method 1: Keyboard shortcut (Ctrl/Cmd+S)
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    const now = Date.now();
                    if (now - lastSaveTime < 1000) return;
                    lastSaveTime = now;

                    setTimeout(() => triggerRecompile(), 500);
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

                                    setTimeout(() => triggerRecompile(), 100);
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
            debug('[winden:compile-trigger] initOxygen started');

            // Method 1: Keyboard shortcut (Ctrl/Cmd+S)
            let lastSaveTime = 0;

            // Use capture phase (true) to ensure we run before Oxygen's handlers
            // which may call stopPropagation() during bubbling
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    debug('[winden:compile-trigger] Ctrl+S detected in compile-trigger');
                    const now = Date.now();
                    if (now - lastSaveTime < 1000) {
                        debug('[winden:compile-trigger] Debounce: skipping (too soon)');
                        return;
                    }
                    lastSaveTime = now;

                    // Wait for Oxygen to complete the save before recompiling
                    debug('[winden:compile-trigger] Scheduling triggerRecompile in 500ms...');
                    setTimeout(() => {
                        debug('[winden:compile-trigger] Calling triggerRecompile now');
                        triggerRecompile();
                    }, 500);
                }
            }, true); // Use capture phase

            // Method 2: Watch for oxygen-unsaved-changes class removal (save completed)
            // This is more reliable than keyboard detection
            const checkOxygenUI = setInterval(() => {
                const oxygenUI = document.getElementById('oxygen-ui');

                if (oxygenUI) {
                    clearInterval(checkOxygenUI);

                    const observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            if (mutation.attributeName === 'class') {
                                const hadUnsaved = mutation.oldValue && mutation.oldValue.includes('oxygen-unsaved-changes');
                                const hasUnsaved = oxygenUI.classList.contains('oxygen-unsaved-changes');

                                // Only trigger when unsaved changes are cleared (save completed)
                                if (hadUnsaved && !hasUnsaved) {
                                    const now = Date.now();
                                    if (now - lastSaveTime < 1000) return; // Debounce
                                    lastSaveTime = now;

                                    triggerRecompile();
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

            setTimeout(() => clearInterval(checkOxygenUI), 10000);
        }

        function initBreakdance() {
            let lastSaveTime = 0;
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    const now = Date.now();
                    if (now - lastSaveTime < 1000) return;
                    lastSaveTime = now;

                    setTimeout(() => triggerRecompile(), 500);
                }
            });

            const getVueApp = () => {
                return document.querySelector('#app')?.__vue__ ||
                       window.parent?.document.querySelector('#app')?.__vue__;
            };

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

                            if (store.watch) {
                                store.watch(
                                    (state) => state.ui?.saveInProgress,
                                    (isSaving) => {
                                        if (wasSaving && !isSaving) {
                                            triggerRecompile();
                                        }
                                        wasSaving = isSaving;
                                    }
                                );
                            } else {
                                app.$watch(
                                    () => store.state.ui?.saveInProgress,
                                    (isSaving) => {
                                        if (wasSaving && !isSaving) {
                                            triggerRecompile();
                                        }
                                        wasSaving = isSaving;
                                    }
                                );
                            }
                        }
                    } catch(e) {
                        console.error('[winden:compile-trigger] Error setting up Breakdance watcher:', e);
                    }
                }
            }, 100);

            setTimeout(() => clearInterval(checkBreakdanceReady), 10000);
        }

        function initOxygen6() {
            const getVueApp = () => {
                return document.querySelector('#app')?.__vue__ ||
                       window.parent?.document.querySelector('#app')?.__vue__;
            };

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

                            const watchPath = store.state.ui?.saveInProgress !== undefined
                                ? (state) => state.ui?.saveInProgress
                                : (state) => state.closingConfirmations?.builder?.isSaving;

                            if (store.watch) {
                                store.watch(watchPath, (isSaving) => {
                                    if (wasSaving && !isSaving) {
                                        triggerRecompile();
                                    }
                                    wasSaving = isSaving;
                                });
                            } else {
                                app.$watch(watchPath, (isSaving) => {
                                    if (wasSaving && !isSaving) {
                                        triggerRecompile();
                                    }
                                    wasSaving = isSaving;
                                });
                            }
                        }
                    } catch(e) {
                        console.error('[winden:compile-trigger] Error setting up Oxygen 6 watcher:', e);
                    }
                }
            }, 100);

            setTimeout(() => clearInterval(checkOxygen6Ready), 10000);
        }

        function initBuilderius() {
            debug('[winden:compile-trigger] initBuilderius started');

            let lastSaveTime = 0;

            // Method 1: Watch for "Template saved!" toast notification
            const setupToastObserver = () => {
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType !== Node.ELEMENT_NODE) continue;

                            // Check for toast with "Template saved!" or "Component saved!"
                            const toast = node.matches?.('.toastSuccess, [data-type="success"]')
                                ? node
                                : node.querySelector?.('.toastSuccess, [data-type="success"]');

                            if (toast) {
                                const title = toast.querySelector?.('[data-title], .uniSonnerNotifications__title');
                                const titleText = title?.textContent || '';

                                if (titleText.includes('saved')) {
                                    debug('[winden:compile-trigger] Builderius save toast detected:', titleText);
                                    const now = Date.now();
                                    if (now - lastSaveTime < 1000) return;
                                    lastSaveTime = now;

                                    setTimeout(() => {
                                        debug('[winden:compile-trigger] Triggering recompile after save toast');
                                        triggerRecompile();
                                    }, 100);
                                }
                            }
                        }
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                debug('[winden:compile-trigger] Toast observer set up');
            };

            setupToastObserver();

            // Method 2: Keyboard shortcut fallback (Ctrl/Cmd+S)
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    debug('[winden:compile-trigger] Ctrl+S detected in Builderius');
                    // Don't trigger here - let the toast observer handle it
                    // This is just for debugging
                }
            }, true);
        }

        // Listen for Fancoolo post save events
        window.addEventListener('fancoolo:postSaved', function(event) {
            triggerRecompile();
        });

        // Start when ready
        debug('[winden:compile-trigger] Setting up init trigger, document.readyState:', document.readyState);
        if (editors.isGutenberg) {
            debug('[winden:compile-trigger] Using wp.domReady for Gutenberg');
            wp.domReady(init);
        } else if (document.readyState === 'loading') {
            debug('[winden:compile-trigger] Document still loading, waiting for DOMContentLoaded');
            document.addEventListener('DOMContentLoaded', init);
        } else {
            debug('[winden:compile-trigger] Document ready, calling init immediately');
            init();
        }
    });
})();

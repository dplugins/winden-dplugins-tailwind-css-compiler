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

    console.log('[Winden Compile] compile-trigger.js loaded');
    console.log('[Winden Compile] windenAutoCompile:', window.windenAutoCompile ? 'defined' : 'undefined');

    if (!window.windenAutoCompile) {
        console.log('[Winden Compile] EXITING: windenAutoCompile not defined');
        return;
    }

    // Wait for core module to be available
    function waitForCore(callback) {
        console.log('[Winden Compile] Waiting for WindenCompilerCore...');
        if (window.WindenCompilerCore) {
            console.log('[Winden Compile] WindenCompilerCore already available');
            callback();
        } else {
            const interval = setInterval(() => {
                if (window.WindenCompilerCore) {
                    clearInterval(interval);
                    console.log('[Winden Compile] WindenCompilerCore now available');
                    callback();
                }
            }, 50);
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(interval);
                console.log('[Winden Compile] TIMEOUT: WindenCompilerCore never loaded');
            }, 5000);
        }
    }

    waitForCore(function() {
        const Core = window.WindenCompilerCore;
        const editors = Core.detectEditorType();
        console.log('[Winden Compile] Editor detection:', JSON.stringify(editors));

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
                console.log('[Winden Compile] Flushing pending Winden class saves before compile...');
                window.windenFlushPendingSaves().then(function() {
                    console.log('[Winden Compile] Pending saves flushed, starting compile');
                    Core.triggerRecompile(compile);
                }).catch(function(err) {
                    console.error('[Winden Compile] Error flushing saves:', err);
                    // Still trigger compile even if flush failed
                    Core.triggerRecompile(compile);
                });
            } else {
                Core.triggerRecompile(compile);
            }
        }

        // Initialize based on editor type
        function init() {
            console.log('[Winden Compile] init() called');
            // Don't compile on page load - output.css already has the styles
            // Hot reload elements are only created when saving from Winden admin
            // or when saving from page builders

            if (editors.isGutenberg) {
                console.log('[Winden Compile] Detected: Gutenberg');
                initGutenberg();
            } else if (editors.isElementor) {
                console.log('[Winden Compile] Detected: Elementor');
                initElementor();
            } else if (editors.isBricks) {
                console.log('[Winden Compile] Detected: Bricks');
                initBricks();
            } else if (editors.isOxygen) {
                console.log('[Winden Compile] Detected: Oxygen');
                initOxygen();
            } else if (editors.isBreakdance) {
                console.log('[Winden Compile] Detected: Breakdance');
                initBreakdance();
            } else if (editors.isOxygen6) {
                console.log('[Winden Compile] Detected: Oxygen 6');
                initOxygen6();
            } else {
                console.log('[Winden Compile] No editor detected!');
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
                        triggerRecompile();
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
            console.log('[Winden Compile] initOxygen started');

            // Method 1: Keyboard shortcut (Ctrl/Cmd+S)
            let lastSaveTime = 0;

            // Use capture phase (true) to ensure we run before Oxygen's handlers
            // which may call stopPropagation() during bubbling
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    console.log('[Winden Compile] Ctrl+S detected in compile-trigger');
                    const now = Date.now();
                    if (now - lastSaveTime < 1000) {
                        console.log('[Winden Compile] Debounce: skipping (too soon)');
                        return;
                    }
                    lastSaveTime = now;

                    // Wait for Oxygen to complete the save before recompiling
                    console.log('[Winden Compile] Scheduling triggerRecompile in 500ms...');
                    setTimeout(() => {
                        console.log('[Winden Compile] Calling triggerRecompile now');
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
                        console.error('[Winden] Error setting up Breakdance watcher:', e);
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
                        console.error('[Winden] Error setting up Oxygen 6 watcher:', e);
                    }
                }
            }, 100);

            setTimeout(() => clearInterval(checkOxygen6Ready), 10000);
        }

        // Listen for Fancoolo post save events
        window.addEventListener('fancoolo:postSaved', function(event) {
            triggerRecompile();
        });

        // Start when ready
        console.log('[Winden Compile] Setting up init trigger, document.readyState:', document.readyState);
        if (editors.isGutenberg) {
            console.log('[Winden Compile] Using wp.domReady for Gutenberg');
            wp.domReady(init);
        } else if (document.readyState === 'loading') {
            console.log('[Winden Compile] Document still loading, waiting for DOMContentLoaded');
            document.addEventListener('DOMContentLoaded', init);
        } else {
            console.log('[Winden Compile] Document ready, calling init immediately');
            init();
        }
    });
})();

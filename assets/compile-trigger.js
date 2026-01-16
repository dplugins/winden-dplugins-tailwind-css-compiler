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

    if (!window.windenAutoCompile) {
        return;
    }

    // Wait for core module to be available
    function waitForCore(callback) {
        if (window.WindenCompilerCore) {
            callback();
        } else {
            const interval = setInterval(() => {
                if (window.WindenCompilerCore) {
                    clearInterval(interval);
                    callback();
                }
            }, 50);
            // Timeout after 5 seconds
            setTimeout(() => clearInterval(interval), 5000);
        }
    }

    waitForCore(function() {
        const Core = window.WindenCompilerCore;
        const editors = Core.detectEditorType();

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
        function triggerRecompile() {
            Core.triggerRecompile(compile);
        }

        // Initialize based on editor type
        function init() {
            // Don't compile on page load for Fancoolo admin page - only after save event
            if (editors.isFancoolo) {
                return;
            }

            // Compile on page load if needed (for other builders)
            if (window.windenAutoCompile.needsCompile) {
                compile();
            }

            if (editors.isGutenberg) {
                initGutenberg();
            } else if (editors.isElementor) {
                initElementor();
            } else if (editors.isBricks) {
                initBricks();
            } else if (editors.isOxygen) {
                initOxygen();
            } else if (editors.isBreakdance) {
                initBreakdance();
            } else if (editors.isOxygen6) {
                initOxygen6();
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
            // Listen for blockSaved postMessage from iframe
            window.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'blockSaved') {
                    const oxygenUI = document.getElementById('oxygen-ui');
                    const hasUnsavedChanges = oxygenUI && oxygenUI.classList.contains('oxygen-unsaved-changes');

                    if (!hasUnsavedChanges) {
                        triggerRecompile();
                    }
                }
            });

            // Fallback: Watch for oxygen-unsaved-changes class removal
            const checkOxygenUI = setInterval(() => {
                const oxygenUI = document.getElementById('oxygen-ui');

                if (oxygenUI) {
                    clearInterval(checkOxygenUI);

                    const observer = new MutationObserver(function(mutations) {
                        mutations.forEach(function(mutation) {
                            if (mutation.attributeName === 'class') {
                                const hadUnsaved = mutation.oldValue && mutation.oldValue.includes('oxygen-unsaved-changes');
                                const hasUnsaved = oxygenUI.classList.contains('oxygen-unsaved-changes');

                                if (hadUnsaved && !hasUnsaved) {
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
        if (editors.isGutenberg) {
            wp.domReady(init);
        } else if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    });
})();

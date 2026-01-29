/**
 * Oxygen Winden Classes Integration
 *
 * Handles the Winden Classes input field in Oxygen builder:
 * - Angular integration for ng-model binding
 * - AJAX save/load of classes per element
 * - Iframe class application
 * - Autocomplete integration
 * - Ctrl+S save hook
 *
 * Dependencies: windenOxygenClasses (localized data)
 */

(function() {
    'use strict';

    // Exit if not in Oxygen builder or if localized data is missing
    if (typeof window.windenOxygenClasses === 'undefined') {
        return;
    }

    const nonce = window.windenOxygenClasses.nonce;
    const ajaxurl = window.windenOxygenClasses.ajaxUrl;
    const breakpoints = window.windenOxygenClasses.breakpoints || ['sm', 'md', 'lg', 'xl', '2xl'];
    let initAttempts = 0;
    const maxAttempts = 100; // 10 seconds max
    let windenClassesData = {};
    let angularScope = null;
    let lastPreviewClass = null;

    // Track pending saves that haven't been sent to server yet
    const pendingSaves = {};
    const saveDebounceTimers = {};

    // Get post ID from Oxygen's localized data
    function getPostId() {
        if (typeof CtBuilderAjax !== 'undefined' && CtBuilderAjax.templateID) {
            return CtBuilderAjax.templateID;
        }
        return null;
    }

    // Fetch existing classes from server
    function fetchClasses(postId, callback) {
        fetch(ajaxurl + '?action=winden_get_post_classes&post_id=' + postId, {
            method: 'GET',
            credentials: 'same-origin'
        }).then(response => response.json())
          .then(data => {
            if (data.success && data.data && data.data.classes) {
                callback(data.data.classes);
            } else {
                callback({});
            }
        }).catch(error => {
            console.error('[Winden] Failed to fetch classes:', error);
            callback({});
        });
    }

    // Wait for Angular to be ready
    function initWindenAngular() {
        initAttempts++;

        if (typeof angular === 'undefined') {
            if (initAttempts < maxAttempts) {
                setTimeout(initWindenAngular, 100);
            }
            return;
        }

        const postId = getPostId();
        if (!postId) {
            if (initAttempts < maxAttempts) {
                setTimeout(initWindenAngular, 100);
            }
            return;
        }

        // Try to get scope from multiple possible elements
        let scope = null;
        const scopeElements = [
            document.body,
            document.querySelector('.oxygen-sidebar-currently-editing'),
            document.querySelector('#oxygen-sidebar'),
            document.querySelector('[ng-controller]')
        ];

        for (let i = 0; i < scopeElements.length; i++) {
            if (scopeElements[i]) {
                scope = angular.element(scopeElements[i]).scope();
                if (scope) break;
            }
        }

        if (!scope) {
            if (initAttempts < maxAttempts) {
                setTimeout(initWindenAngular, 100);
            }
            return;
        }

        angularScope = scope;

        // Check if we already initialized
        if (scope.windenClasses && scope.windenSaveClasses) {
            return;
        }

        // Fetch classes then initialize
        fetchClasses(postId, classes => {
            windenClassesData = classes;

            scope.$apply(() => {
                // Initialize windenClasses storage on scope
                scope.windenClasses = windenClassesData || {};

                // Save function called by ng-change
                scope.windenSaveClasses = function(elementId) {
                    if (!elementId || elementId === 0 || elementId === -1) return;

                    const currentPostId = getPostId();
                    if (!currentPostId) return;

                    // Ensure the object exists
                    if (!scope.windenClasses) {
                        scope.windenClasses = {};
                    }

                    const classes = scope.windenClasses[elementId] || '';

                    // Track as pending save
                    pendingSaves[elementId] = {
                        postId: currentPostId,
                        classes: classes
                    };

                    // Update iframe preview immediately
                    updateIframeElement(elementId, classes);

                    // Debounce actual AJAX save
                    if (saveDebounceTimers[elementId]) {
                        clearTimeout(saveDebounceTimers[elementId]);
                    }

                    saveDebounceTimers[elementId] = setTimeout(() => {
                        performSave(elementId, currentPostId, classes);
                    }, 100);
                };

                // Actual save function
                function performSave(elementId, postId, classes) {
                    fetch(ajaxurl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            action: 'winden_save_element_classes',
                            _nonce: nonce,
                            post_id: postId,
                            element_id: elementId,
                            classes: classes
                        })
                    }).then(response => response.json())
                      .then(data => {
                        if (data.success) {
                            delete pendingSaves[elementId];
                        } else {
                            console.error('[Winden] Save failed:', data);
                        }
                    }).catch(error => {
                        console.error('[Winden] Failed to save classes:', error);
                    });
                }

                // Flush all pending saves synchronously
                window.windenFlushPendingSaves = function() {
                    const keys = Object.keys(pendingSaves);
                    if (keys.length === 0) {
                        return Promise.resolve();
                    }

                    // Cancel all debounce timers
                    Object.keys(saveDebounceTimers).forEach(key => {
                        clearTimeout(saveDebounceTimers[key]);
                        delete saveDebounceTimers[key];
                    });

                    // Save all pending items
                    const savePromises = keys.map(elementId => {
                        const pending = pendingSaves[elementId];
                        return fetch(ajaxurl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams({
                                action: 'winden_save_element_classes',
                                _nonce: nonce,
                                post_id: pending.postId,
                                element_id: elementId,
                                classes: pending.classes
                            })
                        }).then(response => response.json())
                          .then(data => {
                            if (data.success) {
                                delete pendingSaves[elementId];
                            }
                            return data;
                        });
                    });

                    return Promise.all(savePromises);
                };

                // Check if there are pending saves
                window.windenHasPendingSaves = function() {
                    return Object.keys(pendingSaves).length > 0;
                };
            });

            // Apply all existing classes to iframe elements on load
            applyAllClassesToIframe();

            // Watch for iframe content changes
            watchIframeChanges();
        });
    }

    function getIframe() {
        return document.querySelector('#ct-artificial-viewport') || document.querySelector('iframe');
    }

    function getActiveElementId() {
        return angularScope?.iframeScope?.component?.active?.id || null;
    }

    function applyPreviewClass(previewClass) {
        const elementId = getActiveElementId();
        if (!elementId) return;

        const iframe = getIframe();
        if (!iframe || !iframe.contentDocument) return;

        let element = iframe.contentDocument.querySelector('[component-id="' + elementId + '"]');
        if (!element) {
            element = iframe.contentDocument.querySelector('[ng-attr-component-id="' + elementId + '"]');
        }
        if (!element) return;

        if (lastPreviewClass) {
            element.classList.remove(lastPreviewClass);
        }
        element.classList.remove('winden-preview');

        if (previewClass) {
            element.classList.add(previewClass);
            element.classList.add('winden-preview');
            lastPreviewClass = previewClass;
        } else {
            lastPreviewClass = null;
        }
    }

    function applyAllClassesToIframe(retryCount = 0) {
        const maxRetries = 20;

        if (!windenClassesData || Object.keys(windenClassesData).length === 0) {
            return;
        }

        const iframe = getIframe();

        if (!iframe) {
            if (retryCount < maxRetries) {
                setTimeout(() => applyAllClassesToIframe(retryCount + 1), 300);
            }
            return;
        }

        // Wait for iframe content to load
        if (!iframe.contentDocument || !iframe.contentDocument.body) {
            if (retryCount < maxRetries) {
                setTimeout(() => applyAllClassesToIframe(retryCount + 1), 300);
            }
            return;
        }

        let applied = 0;
        const notFound = [];

        // Apply classes for each element
        Object.keys(windenClassesData).forEach(elementId => {
            const classes = windenClassesData[elementId];
            if (classes) {
                const success = updateIframeElement(elementId, classes);
                if (success) {
                    applied++;
                } else {
                    notFound.push(elementId);
                }
            }
        });

        // If some elements weren't found, retry
        if (notFound.length > 0 && retryCount < maxRetries) {
            setTimeout(() => applyAllClassesToIframe(retryCount + 1), 500);
        }
    }

    function watchIframeChanges() {
        const iframe = getIframe();
        if (!iframe) {
            setTimeout(watchIframeChanges, 500);
            return;
        }

        // Re-apply classes when iframe reloads
        iframe.addEventListener('load', () => {
            setTimeout(() => applyAllClassesToIframe(0), 500);
        });

        // Watch for DOM changes inside iframe
        try {
            if (iframe.contentDocument && iframe.contentDocument.body) {
                const observer = new MutationObserver(mutations => {
                    let shouldApply = false;
                    mutations.forEach(mutation => {
                        if (mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach(node => {
                                if (node.nodeType === 1 && node.hasAttribute &&
                                    (node.hasAttribute('component-id') || node.hasAttribute('ng-attr-component-id'))) {
                                    shouldApply = true;
                                }
                            });
                        }
                    });
                    if (shouldApply) {
                        clearTimeout(window.windenApplyTimeout);
                        window.windenApplyTimeout = setTimeout(() => {
                            applyAllClassesToIframe(0);
                        }, 100);
                    }
                });

                observer.observe(iframe.contentDocument.body, {
                    childList: true,
                    subtree: true
                });
            }
        } catch (e) {
            // Cross-origin iframe - can't attach observer
        }
    }

    function updateIframeElement(elementId, classes) {
        const iframe = getIframe();
        if (!iframe || !iframe.contentDocument) return false;

        let element = iframe.contentDocument.querySelector('[component-id="' + elementId + '"]');
        if (!element) {
            element = iframe.contentDocument.querySelector('[ng-attr-component-id="' + elementId + '"]');
        }
        if (!element) {
            return false;
        }

        // Get previous winden classes
        const prevClasses = element.dataset.windenClasses || '';

        // Remove previous winden classes
        if (prevClasses) {
            prevClasses.split(/\s+/).forEach(cls => {
                if (cls) element.classList.remove(cls);
            });
        }

        // Add new winden classes
        if (classes) {
            classes.split(/\s+/).forEach(cls => {
                if (cls) element.classList.add(cls);
            });
            element.dataset.windenClasses = classes;
        } else {
            delete element.dataset.windenClasses;
        }

        return true;
    }

    // Initialize autocomplete
    function initAutocomplete() {
        if (typeof window.WindenAutocomplete === 'undefined') {
            setTimeout(initAutocomplete, 500);
            return;
        }

        const textarea = document.getElementById('winden-classes-textarea');
        if (!textarea) {
            setTimeout(initAutocomplete, 500);
            return;
        }

        // Ensure spellcheck is disabled
        textarea.setAttribute('spellcheck', 'false');

        // Check for autocomplete data
        const autocomplete = window.winden_autocomplete ||
            (window.parent && window.parent !== window ? window.parent.winden_autocomplete : null);

        let hasData = false;
        if (Array.isArray(autocomplete) && autocomplete.length > 0) {
            hasData = true;
        } else if (autocomplete && typeof autocomplete === 'object' && Object.keys(autocomplete).length > 0) {
            hasData = true;
        }

        if (!hasData) {
            setTimeout(initAutocomplete, 500);
            return;
        }

        try {
            const wrapper = textarea.parentElement;

            // Update autocomplete breakpoints
            if (breakpoints && breakpoints.length > 0) {
                window.WindenAutocomplete.setBreakpoints(breakpoints);
            }

            window.WindenAutocomplete.create({
                container: wrapper,
                input: textarea,
                maxSuggestions: 12,
                debounceMs: 50,
                onChange: () => {
                    // Trigger Angular update
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                },
                onPreview: (previewClass) => {
                    applyPreviewClass(previewClass);
                }
            });
        } catch (e) {
            console.error('[Winden] Failed to initialize autocomplete:', e);
        }
    }

    // Setup Oxygen save hook
    function setupOxygenSaveHook() {
        let lastSaveFlushTime = 0;

        // Hook into Ctrl+S keyboard shortcut
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                const now = Date.now();
                if (now - lastSaveFlushTime < 500) return;
                lastSaveFlushTime = now;

                if (window.windenFlushPendingSaves) {
                    window.windenFlushPendingSaves();
                }
            }
        }, true);

        // Watch for oxygen-unsaved-changes class
        const checkOxygenUI = setInterval(() => {
            const oxygenUI = document.getElementById('oxygen-ui');
            if (!oxygenUI) return;

            clearInterval(checkOxygenUI);

            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.attributeName !== 'class') return;

                    const hadUnsaved = mutation.oldValue && mutation.oldValue.includes('oxygen-unsaved-changes');
                    const hasUnsaved = oxygenUI.classList.contains('oxygen-unsaved-changes');

                    if (hadUnsaved && !hasUnsaved) {
                        // Save completed
                    }
                });
            });

            observer.observe(oxygenUI, {
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['class']
            });
        }, 100);

        setTimeout(() => clearInterval(checkOxygenUI), 10000);
    }

    // Auto-resize textarea
    function autoResizeTextarea(textarea) {
        if (!textarea) return;

        if (CSS.supports && CSS.supports('field-sizing', 'content')) {
            return;
        }

        function resize() {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 200);
            textarea.style.height = newHeight + 'px';
        }

        textarea.addEventListener('input', resize);
        resize();
    }

    function initAutoResize() {
        document.querySelectorAll('.winden-textarea-base').forEach(autoResizeTextarea);
    }

    // Split mode toggle functionality
    function initSplitMode() {
        const toggleWrapper = document.getElementById('winden-split-toggle');
        const singleMode = document.getElementById('winden-single-mode');
        const splitMode = document.getElementById('winden-split-mode');

        if (!toggleWrapper || !singleMode || !splitMode) {
            setTimeout(initSplitMode, 500);
            return;
        }

        const checkbox = toggleWrapper.querySelector('input');
        const toggleSwitch = toggleWrapper.querySelector('.winden-toggle');

        // Restore saved preference from PHP
        if (window.windenOxygenClasses?.splitMode) {
            checkbox.checked = true;
            toggleSwitch.classList.add('is-checked');
            singleMode.style.display = 'none';
            splitMode.classList.add('is-active');
            // Sync after a short delay to ensure textarea has value
            setTimeout(syncToSplitMode, 100);
        }

        toggleWrapper.addEventListener('click', e => {
            e.preventDefault();
            checkbox.checked = !checkbox.checked;
            toggleSwitch.classList.toggle('is-checked', checkbox.checked);

            // Save preference via AJAX
            fetch(ajaxurl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'winden_save_split_mode',
                    _nonce: nonce,
                    enabled: checkbox.checked
                })
            });

            if (checkbox.checked) {
                singleMode.style.display = 'none';
                splitMode.classList.add('is-active');
                syncToSplitMode();
            } else {
                singleMode.style.display = 'block';
                splitMode.classList.remove('is-active');
                syncFromSplitMode();
            }
        });

        function syncToSplitMode() {
            const mainTextarea = document.getElementById('winden-classes-textarea');
            if (!mainTextarea) return;

            const classes = mainTextarea.value || '';

            // Build breakpoint groups
            const breakpointGroups = { '': [] };
            breakpoints.forEach(bp => {
                breakpointGroups[bp] = [];
            });

            const bpPattern = new RegExp('^(' + breakpoints.join('|') + '):');

            // Parse classes into groups
            classes.split(/\s+/).forEach(cls => {
                if (!cls) return;
                const match = cls.match(bpPattern);
                if (match) {
                    breakpointGroups[match[1]].push(cls);
                } else {
                    breakpointGroups[''].push(cls);
                }
            });

            // Update split textareas
            document.querySelectorAll('.winden-split-textarea').forEach(textarea => {
                const bp = textarea.dataset.breakpoint;
                if (breakpointGroups[bp]) {
                    textarea.value = breakpointGroups[bp].join(' ');
                }
            });
        }

        function syncFromSplitMode() {
            const mainTextarea = document.getElementById('winden-classes-textarea');
            if (!mainTextarea) return;

            const allClasses = [];

            document.querySelectorAll('.winden-split-textarea').forEach(textarea => {
                const classes = textarea.value.trim();
                if (classes) {
                    allClasses.push(classes);
                }
            });

            mainTextarea.value = allClasses.join(' ');

            // Trigger Angular update
            mainTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Watch for changes in split textareas
        document.querySelectorAll('.winden-split-textarea').forEach(textarea => {
            textarea.addEventListener('input', () => {
                if (checkbox.checked) {
                    syncFromSplitMode();
                }
            });
        });
    }

    // Initialize
    function init() {
        initWindenAngular();
        initAutocomplete();
        setupOxygenSaveHook();
        initSplitMode();
        initAutoResize();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

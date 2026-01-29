/**
 * Gutenberg Winden Classes Integration
 *
 * Adds a "Winden Classes" panel to the block inspector sidebar
 * that syncs with the native "Additional CSS class(es)" field.
 * Uses vanilla JS - no React needed.
 */

import './index.scss';

(function() {
    'use strict';

    // Prevent duplicate initialization
    if (window.__windenClassesGutenbergInitialized) {
        return;
    }
    window.__windenClassesGutenbergInitialized = true;

    const { addFilter, removeFilter } = wp.hooks;
    const { createElement, Fragment, useState, useEffect, useRef } = wp.element;
    const { createHigherOrderComponent } = wp.compose;
    const { InspectorControls } = wp.blockEditor;
    const { PanelBody } = wp.components;

    const breakpoints = window.windenGutenbergClasses?.breakpoints || ['sm', 'md', 'lg', 'xl', '2xl'];

    // Remove any existing filters first
    removeFilter('editor.BlockEdit', 'winden/with-winden-classes-panel');

    /**
     * Parse classes by breakpoint
     */
    function parseClassesByBreakpoint(classes) {
        const groups = { '': [] };
        breakpoints.forEach(bp => { groups[bp] = []; });

        const bpPattern = new RegExp(`^(${breakpoints.join('|')}):`);

        (classes || '').split(/\s+/).forEach(cls => {
            if (!cls) return;
            const match = cls.match(bpPattern);
            if (match && groups[match[1]] !== undefined) {
                groups[match[1]].push(cls);
            } else {
                groups[''].push(cls);
            }
        });

        return groups;
    }

    /**
     * Winden Classes Panel Component
     * Uses native className attribute (syncs with "Additional CSS class(es)")
     */
    function WindenClassesPanel({ attributes, setAttributes, clientId }) {
        const wrapperRef = useRef(null);
        const textareaRef = useRef(null);
        const splitRefs = useRef({});
        const [isSplitMode, setIsSplitMode] = useState(false);
        const [autocompleteInitialized, setAutocompleteInitialized] = useState(false);
        const previewClassRef = useRef(null);

        // Use native className attribute
        const className = attributes.className || '';

        // Initialize autocomplete
        useEffect(() => {
            if (autocompleteInitialized || !wrapperRef.current || !textareaRef.current) {
                return;
            }

            const initAutocomplete = () => {
                if (typeof window.WindenAutocomplete === 'undefined') {
                    setTimeout(initAutocomplete, 200);
                    return;
                }

                const autocompleteData = window.winden_autocomplete ||
                    (window.parent && window.parent !== window ? window.parent.winden_autocomplete : null);

                let hasData = false;
                if (Array.isArray(autocompleteData) && autocompleteData.length > 0) {
                    hasData = true;
                } else if (autocompleteData && typeof autocompleteData === 'object' && Object.keys(autocompleteData).length > 0) {
                    hasData = true;
                }

                if (!hasData) {
                    setTimeout(initAutocomplete, 500);
                    return;
                }

                try {
                    if (breakpoints.length > 0) {
                        window.WindenAutocomplete.setBreakpoints(breakpoints);
                    }

                    window.WindenAutocomplete.create({
                        container: wrapperRef.current,
                        input: textareaRef.current,
                        maxSuggestions: 12,
                        debounceMs: 50,
                        dropdownClass: 'wcl-theme-light',
                        onChange: (value) => {
                            setAttributes({ className: value });
                        },
                        onPreview: (previewClass) => {
                            applyPreviewClass(previewClass);
                        }
                    });

                    setAutocompleteInitialized(true);
                } catch (e) {
                    console.error('[Winden Gutenberg] Autocomplete init error:', e);
                }
            };

            initAutocomplete();
        }, [autocompleteInitialized]);

        const applyPreviewClass = (previewClass) => {
            const editorIframe = document.querySelector('iframe[name="editor-canvas"]') ||
                document.querySelector('iframe.block-editor-iframe');
            const iframeDocument = editorIframe ? editorIframe.contentDocument || editorIframe.contentWindow.document : null;
            if (!iframeDocument) {
                return;
            }

            const blockElement = iframeDocument.querySelector('[data-block="' + clientId + '"]');
            if (!blockElement) {
                return;
            }

            if (previewClassRef.current) {
                blockElement.classList.remove(previewClassRef.current);
            }
            blockElement.classList.remove('winden-preview');

            if (previewClass) {
                blockElement.classList.add(previewClass);
                blockElement.classList.add('winden-preview');
                previewClassRef.current = previewClass;
            } else {
                previewClassRef.current = null;
            }
        };

        useEffect(() => {
            return () => {
                applyPreviewClass(null);
            };
        }, []);

        // Sync textarea value when className changes externally
        useEffect(() => {
            if (textareaRef.current && textareaRef.current.value !== className && !isSplitMode) {
                textareaRef.current.value = className;
            }
            if (isSplitMode) {
                syncToSplitMode();
            }
        }, [className]);

        // Sync to split mode textareas
        const syncToSplitMode = () => {
            const groups = parseClassesByBreakpoint(className);

            if (splitRefs.current['']) {
                splitRefs.current[''].value = groups[''].join(' ');
            }

            breakpoints.forEach(bp => {
                if (splitRefs.current[bp]) {
                    splitRefs.current[bp].value = groups[bp].join(' ');
                }
            });
        };

        // Combine classes from split textareas
        const combineClasses = () => {
            const allClasses = [];

            if (splitRefs.current['']) {
                const defaultClasses = splitRefs.current[''].value.trim();
                if (defaultClasses) allClasses.push(defaultClasses);
            }

            breakpoints.forEach(bp => {
                if (splitRefs.current[bp]) {
                    const bpClasses = splitRefs.current[bp].value.trim();
                    if (bpClasses) allClasses.push(bpClasses);
                }
            });

            return allClasses.join(' ');
        };

        // Toggle split mode
        const handleToggleSplit = () => {
            if (!isSplitMode) {
                setIsSplitMode(true);
                setTimeout(syncToSplitMode, 0);
            } else {
                const combined = combineClasses();
                setAttributes({ className: combined });
                setIsSplitMode(false);
            }
        };

        // Handle split textarea change
        const handleSplitChange = () => {
            const combined = combineClasses();
            setAttributes({ className: combined });
        };

        // Single mode view
        const singleModeView = createElement('div', { className: 'winden-single-mode' },
            createElement('textarea', {
                ref: textareaRef,
                className: 'winden-textarea-base',
                defaultValue: className,
                placeholder: 'e.g. bg-blue-500 text-white p-4',
                onChange: (e) => setAttributes({ className: e.target.value }),
                spellCheck: false,
                autoComplete: 'off',
                autoCorrect: 'off',
                autoCapitalize: 'off'
            })
        );

        // Split mode view
        const splitGroups = [
            createElement('div', { key: 'default', className: 'winden-split-group' },
                createElement('div', { className: 'winden-split-label' }, 'Default'),
                createElement('textarea', {
                    ref: (el) => { splitRefs.current[''] = el; },
                    className: 'winden-textarea-base winden-split-textarea',
                    placeholder: 'Classes without breakpoint',
                    onChange: handleSplitChange,
                    spellCheck: false,
                    autoComplete: 'off'
                })
            ),
            ...breakpoints.map(bp =>
                createElement('div', { key: bp, className: 'winden-split-group' },
                    createElement('div', { className: 'winden-split-label' }, bp.toUpperCase()),
                    createElement('textarea', {
                        ref: (el) => { splitRefs.current[bp] = el; },
                        className: 'winden-textarea-base winden-split-textarea',
                        placeholder: `${bp}: classes`,
                        onChange: handleSplitChange,
                        spellCheck: false,
                        autoComplete: 'off'
                    })
                )
            )
        ];

        const splitModeView = createElement('div', { className: 'winden-split-mode' }, splitGroups);

        // Toggle switch
        const toggleSwitch = createElement('label', { className: 'winden-toggle-wrapper' },
            createElement('span', { className: `winden-toggle ${isSplitMode ? 'is-checked' : ''}` },
                createElement('input', {
                    type: 'checkbox',
                    checked: isSplitMode,
                    onChange: handleToggleSplit
                }),
                createElement('span', { className: 'winden-toggle-dot' })
            ),
            createElement('span', { className: 'winden-toggle-label' }, 'Split by breakpoint')
        );

        return createElement('div', {
            className: 'winden-classes-gutenberg-panel wcl-theme-light',
            ref: wrapperRef
        },
            isSplitMode ? splitModeView : singleModeView,
            toggleSwitch
        );
    }

    /**
     * Add Winden Classes panel to block inspector
     */
    const withWindenClassesPanel = createHigherOrderComponent((BlockEdit) => {
        return (props) => {
            const { attributes, setAttributes, clientId, isSelected } = props;

            // Check if block supports customClassName
            const blockType = wp.blocks.getBlockType(props.name);
            const supportsClassName = blockType?.supports?.customClassName !== false;

            if (!supportsClassName) {
                return createElement(BlockEdit, props);
            }

            return createElement(Fragment, null,
                createElement(BlockEdit, props),
                isSelected && createElement(InspectorControls, null,
                    createElement(PanelBody, {
                        title: 'Winden Classes',
                        initialOpen: true,
                        className: 'winden-classes-panel'
                    },
                        createElement(WindenClassesPanel, {
                            attributes,
                            setAttributes,
                            clientId
                        })
                    )
                )
            );
        };
    }, 'withWindenClassesPanel');

    addFilter(
        'editor.BlockEdit',
        'winden/with-winden-classes-panel',
        withWindenClassesPanel
    );

})();

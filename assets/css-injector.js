/**
 * Winden CSS Injector
 *
 * Handles injecting compiled CSS into page and iframes
 * Reusable utility for hot-reloading CSS across all page builders
 *
 * Purpose: Pure CSS injection logic with builder-specific iframe handling
 * Dependencies: None (uses WindenCompilerCore if available)
 */

(function() {
    'use strict';

    // CSS injection is always enabled - this file is only used for explicit save/reload events
    // (not automatic page load injection, which is handled by tailwindcss-watcher.js)

    /**
     * Apply !important to CSS declarations in @layer utilities ONLY
     * Ensures hot-reloaded styles override builder defaults
     * Skips CSS custom properties (--var) as !important doesn't work on them
     *
     * IMPORTANT: We only apply !important to utilities layer because:
     * - When !important is on ALL layers, cascade order is REVERSED
     * - base layer's "margin: 0 !important" would override utilities' "margin: X !important"
     * - By only adding !important to utilities, they properly override Oxygen's inline styles
     *
     * @param {string} css - The CSS content
     * @returns {string} CSS with !important added to utilities declarations
     */
    function applyImportant(css) {
        if (!css) return css;

        // Find @layer utilities block and only apply !important within it
        return css.replace(
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
    }

    /**
     * Detect builder types from URL
     * Always uses local detection to ensure main builder vs iframe distinction
     * (WindenCompilerCore.detectEditorType() doesn't have isBricksMainBuilder/isOxygenMainBuilder)
     */
    function getEditorFlags() {
        const href = window.location.href;
        return {
            isGutenberg: href.includes('post.php') ||
                         href.includes('post-new.php') ||
                         href.includes('site-editor.php'),
            isOxygen: href.includes('ct_builder=true'),
            isOxygenMainBuilder: href.includes('ct_builder=true') &&
                                 !href.includes('oxygen_iframe=true'),
            isFancoolo: href.includes('page=fancoolo-app'),
            isBricks: href.includes('bricks='),
            isBricksMainBuilder: href.includes('bricks=') &&
                                 !href.includes('brickspreview=')
        };
    }

    /**
     * Inject CSS into a document
     * @param {Document} doc - The document to inject CSS into
     * @param {string} css - The CSS content to inject
     */
    /**
     * Inject CSS into a document
     * @param {Document} doc - The document to inject CSS into
     * @param {string} css - The CSS content to inject
     * @param {boolean} useImportant - Whether to apply !important to declarations
     */
    function injectCSS(doc, css, useImportant = false) {
        let styleTag = doc.getElementById('winden-compiled-css-hotreload');
        if (!styleTag) {
            styleTag = doc.createElement('style');
            styleTag.id = 'winden-compiled-css-hotreload';
            doc.head.appendChild(styleTag);
        }
        // Apply !important only when requested (for Oxygen)
        styleTag.textContent = useImportant ? applyImportant(css) : css;
    }

    /**
     * Safely inject CSS into an iframe
     * @param {HTMLIFrameElement} iframe - The iframe element
     * @param {string} css - The CSS content to inject
     * @param {boolean} useImportant - Whether to apply !important to declarations
     */
    function injectIntoIframe(iframe, css, useImportant = false) {
        if (iframe && iframe.contentDocument) {
            try {
                injectCSS(iframe.contentDocument, css, useImportant);
            } catch (e) {
                // Silent fail - cross-origin restrictions
            }
        }
    }

    /**
     * Hot-reload compiled CSS in the page and all relevant iframes
     * @param {string} css - The compiled CSS to inject
     */
    function reloadCompiledCSS(css) {
        const editors = getEditorFlags();

        // Skip injection entirely on Fancoolo admin page
        // Fancoolo has its own preview iframe where CSS should be injected
        if (editors.isFancoolo) {
            const fancooloIframe = document.querySelector('iframe[id*="fancoolo"], iframe[class*="fancoolo"]');
            injectIntoIframe(fancooloIframe, css);
            return; // Don't inject anywhere else for Fancoolo
        }

        // For page builders, ONLY inject into iframe, NOT into main editor page
        // This prevents Winden styles from affecting the builder UI
        const shouldSkipMainDocument = editors.isOxygenMainBuilder || editors.isGutenberg || editors.isBricksMainBuilder;

        if (!shouldSkipMainDocument) {
            injectCSS(document, css);
        }

        // If in parent window, also inject in builder-specific iframes
        if (window === window.parent) {
            // Bricks iframe (no !important needed)
            injectIntoIframe(document.getElementById('bricks-builder-iframe'), css, false);

            // Oxygen iframe - use !important to override Oxygen's inline styles
            if (editors.isOxygenMainBuilder) {
                injectIntoIframe(document.querySelector('iframe[src*="oxygen_iframe"]'), css, true);
            }

            // Gutenberg iframe (no !important needed)
            if (editors.isGutenberg) {
                injectIntoIframe(document.querySelector('iframe[name="editor-canvas"]'), css, false);
            }
        }
    }

    // Expose to global scope for use by compile-trigger.js and other scripts
    window.windenCSSInjector = {
        reloadCompiledCSS: reloadCompiledCSS,
        injectCSS: injectCSS
    };

})();

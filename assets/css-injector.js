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

    /**
     * Detect builder types from URL
     * Uses WindenCompilerCore if available, otherwise falls back to local detection
     */
    function getEditorFlags() {
        // Use WindenCompilerCore if available (loaded after this script)
        if (window.WindenCompilerCore) {
            return window.WindenCompilerCore.detectEditorType();
        }

        // Fallback: local detection (for when this script runs before WindenCompilerCore)
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
    function injectCSS(doc, css) {
        let styleTag = doc.getElementById('winden-compiled-css-hotreload');
        if (!styleTag) {
            styleTag = doc.createElement('style');
            styleTag.id = 'winden-compiled-css-hotreload';
            doc.head.appendChild(styleTag);
        }
        styleTag.textContent = css;
    }

    /**
     * Safely inject CSS into an iframe
     * @param {HTMLIFrameElement} iframe - The iframe element
     * @param {string} css - The CSS content to inject
     */
    function injectIntoIframe(iframe, css) {
        if (iframe && iframe.contentDocument) {
            try {
                injectCSS(iframe.contentDocument, css);
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
            // Bricks iframe
            injectIntoIframe(document.getElementById('bricks-builder-iframe'), css);

            // Oxygen iframe (if we're in Oxygen main builder)
            if (editors.isOxygenMainBuilder) {
                injectIntoIframe(document.querySelector('iframe[src*="oxygen_iframe"]'), css);
            }

            // Gutenberg iframe (WordPress 5.9+)
            if (editors.isGutenberg) {
                injectIntoIframe(document.querySelector('iframe[name="editor-canvas"]'), css);
            }
        }
    }

    // Expose to global scope for use by compile-trigger.js and other scripts
    window.windenCSSInjector = {
        reloadCompiledCSS: reloadCompiledCSS,
        injectCSS: injectCSS
    };

})();

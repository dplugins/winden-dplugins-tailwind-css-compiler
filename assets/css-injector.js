/**
 * Winden CSS Injector
 *
 * Handles injecting compiled CSS into page and iframes
 * Reusable utility for hot-reloading CSS across all page builders
 *
 * Purpose: Pure CSS injection logic with builder-specific iframe handling
 * Dependencies: None
 */

(function() {
    'use strict';

    // Detect builder types from URL
    const isGutenberg = window.location.href.includes('post.php') ||
                       window.location.href.includes('post-new.php') ||
                       window.location.href.includes('site-editor.php');

    const isOxygenMainBuilder = window.location.href.includes('ct_builder=true') &&
                                !window.location.href.includes('oxygen_iframe=true');

    const isFancoolo = window.location.href.includes('page=fancoolo-app');

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
     * Hot-reload compiled CSS in the page and all relevant iframes
     * @param {string} css - The compiled CSS to inject
     */
    function reloadCompiledCSS(css) {
        // Skip injection entirely on Fancoolo admin page
        // Fancoolo has its own preview iframe where CSS should be injected
        if (isFancoolo) {
            // For Fancoolo, only inject into the preview iframe, not the admin UI
            const fancooloIframe = document.querySelector('iframe[id*="fancoolo"], iframe[class*="fancoolo"]');
            if (fancooloIframe && fancooloIframe.contentDocument) {
                try {
                    injectCSS(fancooloIframe.contentDocument, css);
                } catch (e) {
                    // Silent fail - cross-origin restrictions
                }
            }
            return; // Don't inject anywhere else for Fancoolo
        }

        // For Gutenberg, ONLY inject into iframe, NOT into main editor page
        // This prevents Winden styles from affecting the WordPress admin UI
        const shouldSkipMainDocument = isOxygenMainBuilder || isGutenberg;

        // Skip injection in Oxygen main builder or Gutenberg main editor
        if (!shouldSkipMainDocument) {
            injectCSS(document, css);
        }

        // If in parent window, also inject in builder-specific iframes
        if (window === window.parent) {
            // Bricks iframe
            const bricksIframe = document.getElementById('bricks-builder-iframe');
            if (bricksIframe && bricksIframe.contentDocument) {
                try {
                    injectCSS(bricksIframe.contentDocument, css);
                } catch (e) {
                    // Silent fail - cross-origin restrictions
                }
            }

            // Oxygen iframe (if we're in Oxygen main builder)
            if (isOxygenMainBuilder) {
                const oxygenIframe = document.querySelector('iframe[src*="oxygen_iframe"]');
                if (oxygenIframe && oxygenIframe.contentDocument) {
                    try {
                        injectCSS(oxygenIframe.contentDocument, css);
                    } catch (e) {
                        // Silent fail - cross-origin restrictions
                    }
                }
            }

            // Gutenberg iframe (WordPress 5.9+)
            if (isGutenberg) {
                const gutenbergIframe = document.querySelector('iframe[name="editor-canvas"]');
                if (gutenbergIframe && gutenbergIframe.contentDocument) {
                    try {
                        injectCSS(gutenbergIframe.contentDocument, css);
                    } catch (e) {
                        // Silent fail - cross-origin restrictions
                    }
                }
            }
        }
    }

    // Expose to global scope for use by compile-trigger.js and other scripts
    window.windenCSSInjector = {
        reloadCompiledCSS: reloadCompiledCSS,
        injectCSS: injectCSS
    };

})();

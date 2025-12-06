/**
 * Winden Monaco Helper
 * Provides utilities for other plugins to integrate Monaco Editor with Winden's Tailwind autocomplete
 *
 * @version 1.0.0
 * @author DPlugins
 */

(function(window) {
    'use strict';

    /**
     * Winden Monaco Integration Helper
     */
    window.WindenMonaco = {
        /**
         * Initialize Monaco editor with Winden's Tailwind autocomplete
         *
         * @param {object} monaco - Monaco instance from @monaco-editor/react
         * @param {string} language - Language mode (css, scss, javascript)
         * @param {object} options - Additional options
         * @param {boolean} options.includeDirectives - Include @ directives (default: true)
         * @param {boolean} options.includeClasses - Include Tailwind classes (default: true)
         * @param {array} options.customClasses - Additional custom classes to suggest
         * @param {array} options.customSuggestions - Additional custom @ directives
         * @returns {IDisposable} Disposable completion provider
         */
        initializeAutocomplete: function(monaco, language, options = {}) {
            const data = window.windenMonacoData || {};
            const classes = [...(data.classes || []), ...(options.customClasses || [])];

            let suggestions = data.suggestions || ['@apply', '@config', '@layer', '@screen', '@tailwind'];
            if (data.tailwindVersion === 'v4') {
                suggestions = ['@apply', '@config', '@layer', '@screen', '@tailwind', '@theme', '@utility', '@variant'];
            }

            // Merge with custom suggestions
            if (options.customSuggestions && Array.isArray(options.customSuggestions)) {
                suggestions = [...new Set([...suggestions, ...options.customSuggestions])];
            }

            const includeDirectives = options.includeDirectives !== false;
            const includeClasses = options.includeClasses !== false;

            // Register completion provider
            return monaco.languages.registerCompletionItemProvider(language, {
                provideCompletionItems: function(model, position) {
                    const textUntilPosition = model.getValueInRange({
                        startLineNumber: position.lineNumber,
                        startColumn: 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                    });

                    const word = model.getWordUntilPosition(position);
                    const trimmedText = textUntilPosition.trim().split(' ')[0].trim();

                    // @ directives (like @apply, @tailwind, @theme)
                    if (includeDirectives && trimmedText === '@') {
                        return {
                            suggestions: suggestions.map((suggestion) => ({
                                label: suggestion,
                                kind: monaco.languages.CompletionItemKind.Function,
                                insertText: suggestion,
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: {
                                    startLineNumber: position.lineNumber,
                                    endLineNumber: position.lineNumber,
                                    startColumn: word.startColumn,
                                    endColumn: word.endColumn
                                },
                                filterText: trimmedText,
                                documentation: `Tailwind CSS directive: ${suggestion}`
                            }))
                        };
                    }

                    // Tailwind classes after @apply or other directives
                    if (includeClasses && suggestions.includes(trimmedText)) {
                        return {
                            suggestions: classes.map((suggestion) => ({
                                label: suggestion,
                                kind: monaco.languages.CompletionItemKind.Value,
                                insertText: suggestion,
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                range: {
                                    startLineNumber: position.lineNumber,
                                    endLineNumber: position.lineNumber,
                                    startColumn: word.startColumn,
                                    endColumn: word.endColumn
                                },
                                filterText: suggestion.split(' ')[0],
                                documentation: `Tailwind CSS class: ${suggestion}`
                            }))
                        };
                    }

                    return { suggestions: [] };
                }
            });
        },

        /**
         * Get all available Tailwind classes from Winden cache
         *
         * @returns {array} Array of Tailwind class names
         */
        getClasses: function() {
            return window.windenMonacoData?.classes || [];
        },

        /**
         * Get all available @ directives/suggestions
         *
         * @returns {array} Array of @ directive names
         */
        getSuggestions: function() {
            const data = window.windenMonacoData || {};
            if (data.tailwindVersion === 'v4') {
                return ['@apply', '@config', '@layer', '@screen', '@tailwind', '@theme', '@utility', '@variant'];
            }
            return ['@apply', '@config', '@layer', '@screen', '@tailwind'];
        },

        /**
         * Get Monaco loader configuration
         * Use this when setting up Monaco editor from scratch
         *
         * @returns {object} Monaco loader config object
         */
        getLoaderConfig: function() {
            const pluginUrl = window.windenMonacoData?.pluginUrl || '';
            return {
                paths: {
                    vs: pluginUrl + 'node_modules/monaco-editor/min/vs'
                }
            };
        },

        /**
         * Get Tailwind version being used
         *
         * @returns {string} Tailwind version ('v3' or 'v4')
         */
        getTailwindVersion: function() {
            return window.windenMonacoData?.tailwindVersion || 'v3';
        },

        /**
         * Check if Winden Monaco data is available
         *
         * @returns {boolean} True if data is available
         */
        isAvailable: function() {
            return !!(window.windenMonacoData && window.windenMonacoData.classes);
        },

        /**
         * Filter classes by a search term
         * Useful for creating custom autocomplete implementations
         *
         * @param {string} searchTerm - Term to search for
         * @param {number} limit - Maximum number of results (default: 50)
         * @returns {array} Filtered array of class names
         */
        filterClasses: function(searchTerm, limit = 50) {
            const classes = this.getClasses();
            if (!searchTerm) return classes.slice(0, limit);

            const search = searchTerm.toLowerCase();
            return classes
                .filter(cls => cls.toLowerCase().includes(search))
                .slice(0, limit);
        }
    };

    // Console message when loaded
    if (window.windenMonacoData) {
        console.log('[Winden Monaco] Helper loaded with', window.windenMonacoData.classes?.length || 0, 'Tailwind classes');
    }

})(window);

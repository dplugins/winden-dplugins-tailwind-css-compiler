import { useState, useEffect, useCallback, useRef } from 'react';
import type { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { STYLES_SUGGESTIONS_V4 } from '@const/stylesSuggestionsV4';
import type { WizzardState } from '@/types/wizzard';
import '@/types/global.d.ts';

interface UseAutocompleteProps {
    scssContentRef: React.MutableRefObject<string>;
    jsContentRef: React.MutableRefObject<string>;
    wizzardContentRef: React.MutableRefObject<WizzardState>;
    scssContent: string;
    jsContent: string;
}

interface UseAutocompleteReturn {
    autocompleteClasses: string[];
    monacoEditor: Monaco | null;
    setMonacoEditor: (monaco: Monaco | null) => void;
    fetchAutocomplete: () => Promise<void>;
    addSuggestions: (monaco: Monaco, language: string, classes: string[], suggestions: string[]) => void;
}

/**
 * Cheap "user is mid-typing" check used to skip autocomplete compiles
 * that would otherwise log CssSyntaxError / "unknown utility class"
 * every keystroke. Returns true when:
 *   - braces are unbalanced, or
 *   - a bare identifier sits inside a rule body without a `:` or `;`
 *     (e.g. typing `p` before the `:`), or
 *   - an `@apply` clause has no terminating `;` on its line yet, so
 *     the candidate it ships is partial (`bg-`, `bg-e`, ...). Tailwind
 *     rejects partials with "Cannot apply unknown utility class".
 */
function looksLikeMidEdit(css: string): boolean {
  if (!css) return false;
  // Strip block comments and string literals so we count actual code.
  const stripped = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
  let opens = 0;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped.charCodeAt(i);
    if (ch === 123 /* { */) opens++;
    else if (ch === 125 /* } */) opens--;
    if (opens < 0) return true;
  }
  if (opens !== 0) return true;
  // Inside a rule body, a bare identifier with no `:` is a partial decl.
  const tail = stripped.trimEnd();
  if (/[{;][^{};:]*[A-Za-z][A-Za-z0-9_-]*\s*$/.test(tail)) return true;
  // `@apply` line not yet terminated by `;` on the same line.
  if (/@apply\b[^;}\n]*$/m.test(stripped)) return true;
  return false;
}

/**
 * Hook for managing Monaco Editor autocomplete functionality
 */
export function useAutocomplete({
    scssContentRef,
    jsContentRef,
    wizzardContentRef,
    scssContent,
    jsContent,
}: UseAutocompleteProps): UseAutocompleteReturn {
    const [autocompleteClasses, setAutocompleteClasses] = useState<string[]>([]);
    const [monacoEditor, setMonacoEditor] = useState<Monaco | null>(null);
    const [completionDisposable, setCompletionDisposable] = useState<monaco.IDisposable | null>(null);

    const fetchAutocomplete = useCallback(async () => {
        let response: any = null;

        if (typeof window.tailwindifyClasses === 'function') {
            try {
                const styleTabContent = scssContentRef?.current?.trim() || '';
                const hasImports = styleTabContent.includes('@import');
                const hasLayer = styleTabContent.includes('@layer');

                let custom_css = '';

                if (hasLayer || hasImports) {
                    if (wizzardContentRef?.current?.configCode?.length && wizzardContentRef.current.configCode.trim().startsWith('@theme')) {
                        const lastImportRegex = /@import[^;]*;/g;
                        let lastImportMatch;
                        let lastImportEnd = -1;

                        while ((lastImportMatch = lastImportRegex.exec(styleTabContent)) !== null) {
                            lastImportEnd = lastImportMatch.index + lastImportMatch[0].length;
                        }

                        if (lastImportEnd > -1) {
                            custom_css = styleTabContent.slice(0, lastImportEnd) +
                                '\n\n' + wizzardContentRef.current.configCode + '\n' +
                                styleTabContent.slice(lastImportEnd);
                        } else {
                            const layerMatch = styleTabContent.match(/@layer[^;]*;/);
                            if (layerMatch) {
                                const layerEnd = styleTabContent.indexOf(layerMatch[0]) + layerMatch[0].length;
                                custom_css = styleTabContent.slice(0, layerEnd) +
                                    '\n\n' + wizzardContentRef.current.configCode + '\n' +
                                    styleTabContent.slice(layerEnd);
                            } else {
                                custom_css = wizzardContentRef.current.configCode + '\n\n' + styleTabContent;
                            }
                        }
                    } else {
                        custom_css = styleTabContent;
                    }
                } else {
                    custom_css = '@layer theme, base, components, utilities;\n\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n';

                    if (wizzardContentRef?.current?.configCode?.length && wizzardContentRef.current.configCode.trim().startsWith('@theme')) {
                        custom_css += '\n' + wizzardContentRef.current.configCode + '\n';
                    }

                    if (styleTabContent) {
                        custom_css += '\n' + styleTabContent + '\n';
                    }
                }

                const configContent = jsContentRef?.current ?? '';
                // Skip the compile when the CSS is obviously mid-typing.
                // PostCSS hard-throws on unbalanced braces / dangling
                // identifiers, which would flood the console with
                // CssSyntaxError every keystroke. The 500 ms debounce
                // upstream covers most slow typists; this catches the
                // remaining cases where they paused inside an open rule.
                if (looksLikeMidEdit(custom_css)) {
                  return;
                }
                response = await window.tailwindifyClasses!(custom_css, configContent);
            } catch (error: any) {
                console.error('[winden:autocomplete] Compilation error:', error);
                return;
            }
        }

        // The compiler returns an error envelope rather than throwing
        // (typed-error contract from #14). If compilation failed — usually
        // because the user is mid-typing and the CSS is temporarily
        // invalid — keep the previous autocomplete list instead of wiping
        // it to []. Otherwise typing a single character would erase all
        // Tailwind suggestions until the next valid compile.
        if (response && (response as any).error) {
          console.debug('[winden:autocomplete] keeping previous classes — compile errored mid-edit', (response as any).error);
          return;
        }
        const classes = [...new Set(response?.classes?.length ? response.classes : [])];
        setAutocompleteClasses(classes);
    }, [scssContentRef, jsContentRef, wizzardContentRef]);

    // Cleanup completion disposable
    useEffect(() => {
        return () => {
            if (completionDisposable && typeof completionDisposable.dispose === 'function') {
                completionDisposable.dispose();
            }
        };
    }, [completionDisposable]);

    const addSuggestions = useCallback((monaco: Monaco, language: string, classes: string[], suggestions: string[]) => {
        if (monaco) {
            setCompletionDisposable(
                monaco.languages.registerCompletionItemProvider(language, {
                    provideCompletionItems: function (model, position) {
                        var textUntilPosition = model.getValueInRange({
                            startLineNumber: position.lineNumber,
                            startColumn: 1,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column
                        });

                        const word = model.getWordUntilPosition(position);
                        const trimmedText = textUntilPosition.trim().split(' ')[0].trim();

                        if (trimmedText === '@') {
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
                                    filterText: trimmedText
                                }))
                            };
                        } else if (trimmedText === '-') {
                            const dashSuggestions = STYLES_SUGGESTIONS_V4;
                            return {
                                suggestions: dashSuggestions.map((suggestion) => ({
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
                                    filterText: suggestion
                                }))
                            };
                        } else if (suggestions.includes(trimmedText)) {
                            return {
                                suggestions: classes.map((suggestion) => ({
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
                                    filterText: suggestion.split(' ')[0]
                                }))
                            };
                        } else {
                            return { suggestions: [] };
                        }
                    }
                })
            );
        }
    }, []);

    // Wait for compiler and fetch autocomplete
    useEffect(() => {
        const _wait = setInterval(async () => {
            if (typeof window.tailwindifyClasses === 'function') {
                clearInterval(_wait);
                localStorage.removeItem('_wait_for_config');
                fetchAutocomplete();
            }
        }, 100);

        return () => clearInterval(_wait);
    }, [fetchAutocomplete]);

    // Refresh autocomplete when content changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAutocomplete();
        }, 500);

        return () => clearTimeout(timer);
    }, [scssContent, jsContent, fetchAutocomplete]);

    return {
        autocompleteClasses,
        monacoEditor,
        setMonacoEditor,
        fetchAutocomplete,
        addSuggestions,
    };
}

import React, { useState, useEffect, useRef, useContext, lazy, Suspense, useCallback } from 'react';

// Editor
import Editor, { loader, Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Types
import type { WizzardState } from '@/types/wizzard';

// Constants
import { initialSettings } from '@const/settings';
import { STYLES_SUGGESTIONS_V4 } from '@const/stylesSuggestionsV4';

// Hooks
import { WizzardContext } from '@hooks/wizzardContext';
import { useWizzardContent } from '@hooks/wizzard';

// Utils
import { registerPlainJSLanguage } from '@/utils/monacoPlainJS';

// Components & Pages
import Header from '@parts/Header';
import LoadingScreen from '@el/loadingScreen';
import License from '@pages/License';
import StyleEditorWithTabs from '@parts/StyleEditorWithTabs';

// Lazy load components
const StyleGuide = lazy(() => import('@pages/StyleGuide'));
const Wizzard = lazy(() => import('@pages/Wizzard'));

// Configure Monaco Environment for web workers (CSS/SCSS only)
(window as any).MonacoEnvironment = {
  getWorker: function (workerId: string, label: string) {
    // Get the build URL from localized data
    const buildUrl = (window as any).windenData?.buildUrl || '';

    // Only CSS/SCSS worker, everything else uses base editor worker
    let workerPath: string;
    if (label === 'css' || label === 'scss' || label === 'less') {
      workerPath = 'admin/css.worker.js';
    } else {
      // JavaScript and all other languages use base editor worker (syntax highlighting only)
      workerPath = 'admin/editor.worker.js';
    }

    const fullUrl = `${buildUrl}${workerPath}`;

    // Create worker using a blob to avoid CORS issues
    const workerBlob = new Blob([`importScripts('${fullUrl}');`], {
      type: 'application/javascript'
    });
    const workerBlobUrl = URL.createObjectURL(workerBlob);

    return new Worker(workerBlobUrl, {
      name: label
    });
  }
};

loader.config({ monaco });

// Register PlainJS language for Config tab (JavaScript syntax without TypeScript worker)
loader.init().then(registerPlainJSLanguage);

interface AppProps {
  licenseStatus: string;
  proExists: string;
}

function App({ licenseStatus, proExists }: AppProps) {
    const { localWizzardState, setLocalWizzardState } = useContext(WizzardContext)!;
    const [activeTab, setActiveTab] = useState('style');

    // Free version (no pro folder) should always show main app
    // Pro version without license should show license page
    const isProVersion = JSON.parse(proExists);
    const [settings, setSettings] = useState(initialSettings);
    const [jsContent, setJsContent] = useState('');
    const [scssContent, setScssContent] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    const jsContentRef = useRef(jsContent);
    const scssContentRef = useRef(scssContent);
    const wizzardContentRef = useRef<WizzardState>(localWizzardState);

    /* Monaco Editor */
    const [autocompleteClasses, setAutocompleteClasses] = useState<string[]>([]);
    const [monacoEditor, setMonacoEditor] = useState<Monaco | null>(null);

    /* License State */
    const [licenseState, setLicenseState] = useState(JSON.parse(licenseStatus));

    // Use the new React Query hook
    const { data: contentData, isLoading: isDataLoading, error: contentError } = useWizzardContent();

    // Update state when content is loaded
    useEffect(() => {
        if (contentData) {
            setJsContent(contentData.javascript);
            setScssContent(contentData.scss);
            if (contentData.wizzard) {
                setLocalWizzardState(contentData.wizzard);
            }
            localStorage.setItem('_content_fetched', 'true');
        }
    }, [contentData, setLocalWizzardState]);

    useEffect(() => {
        jsContentRef.current = jsContent;
        scssContentRef.current = scssContent;
        wizzardContentRef.current = localWizzardState;
    }, [jsContent, scssContent, localWizzardState]);

    const fetchAutocomplete = async () => {
        let response: any = null;
        // Always use v4
        if (typeof (window as any)?.tailwindifyClasses === 'function') {
            let custom_css = '@layer theme, base, components, utilities;\n\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities); ';
            if (wizzardContentRef?.current?.configCode?.length && wizzardContentRef.current.configCode.trim().startsWith('@theme')) {
                custom_css += wizzardContentRef.current.configCode;
            }
            response = await (window as any).tailwindifyClasses(custom_css);
        }
        setAutocompleteClasses([...new Set(response?.classes?.length ? response.classes : [])]);
    };

    useEffect(() => {
        const savedTab = localStorage.getItem('activeTab');
        if (savedTab) {
            if (savedTab === 'styleguide') {
                localStorage.setItem('_wait_for_config', 'true');
                setActiveTab(savedTab);
            } else {
                setActiveTab(savedTab);
            }
        } else {
            // Set default tab to 'style' if no saved tab exists
            setActiveTab('style');
            localStorage.setItem('activeTab', 'style');
        }
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(isDarkMode);

        const _wait = setInterval(async () => {
            if (typeof (window as any)?.tailwindifyClasses === 'function') {
                clearInterval(_wait);
                // Remove the wait flag to allow StyleGuide to load
                localStorage.removeItem('_wait_for_config');
                fetchAutocomplete();
            }
        }, 100);

        return () => clearInterval(_wait);
    }, []);

    useEffect(() => {
        // Always v4
        (window as any).settings_tailwind_version = 'v4';
    }, [])

    // Set up window.winden_editor for autoExtractBreakpoints function
    useEffect(() => {
        if (localWizzardState && (localWizzardState.configCode || scssContent)) {
            (window as any).winden_editor = {
                wizzard: {
                    configCode: localWizzardState.configCode || ''
                },
                scss: scssContent || ''
            };

            // Trigger autoExtractBreakpoints if it exists
            if (typeof (window as any).autoExtractBreakpoints === 'function') {
                (window as any).autoExtractBreakpoints();
            }

            // Trigger style guide refresh if it exists
            if (typeof (window as any).refreshStyleGuide === 'function') {
                (window as any).refreshStyleGuide();
            }
        }
    }, [localWizzardState, scssContent]);

    const handleTabClick = useCallback((tab: string) => {
        fetchAutocomplete();
        setActiveTab(tab);
        localStorage.setItem('activeTab', tab);

        // Don't re-fetch wizard data when switching tabs - use the in-memory state
        // The wizard data is already loaded on app mount and stays in sync via localWizzardState
    }, []);

    const [completionDisposable, setCompletionDisposable] = useState<monaco.IDisposable | null>(null);

    useEffect(() => {
        return () => {
            if (completionDisposable && typeof completionDisposable.dispose === 'function') {
                completionDisposable.dispose()
            }
        }
    }, [completionDisposable])

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
                                suggestions: suggestions.map((suggestion) => {
                                    return {
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
                                    }
                                })
                            };
                        } else if (trimmedText === '-') {
                            // Always use v4 suggestions
                            const dashSuggestions = STYLES_SUGGESTIONS_V4;
                            return {
                                suggestions: dashSuggestions.map((suggestion) => {
                                    return {
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
                                    }
                                })
                            };
                        } else if (suggestions.includes(trimmedText)) {
                            return {
                                suggestions: classes.map((suggestion) => {
                                    return {
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
                                    }
                                })
                            };
                        } else {
                            return { suggestions: [] };
                        }
                    }
                })
            )
        }
    }, []);

    useEffect(() => {
        if (monacoEditor) {
            const language = (settings as any)?.css_preprocessor === 'scss' ? 'scss' : 'css';
            const classes = Array.isArray(autocompleteClasses) ? autocompleteClasses : Object.values(autocompleteClasses);
            if (classes?.length) {
                // Always use v4 suggestions
                const _suggestions = ['@apply', '@config', '@layer', '@screen', '@tailwind', '@theme', '@utility', '@variant'];
                addSuggestions(monacoEditor, language, classes, _suggestions);
            }
        }
    }, [monacoEditor, settings, autocompleteClasses, addSuggestions]);

    // Show error if content failed to load
    if (contentError) {
        console.error('Failed to load content:', contentError);
    }

    return (
        <>
            {/* Show license page only if pro folder exists but license is not active */}
            {isProVersion && !licenseState ? <License setLicenseState={setLicenseState} /> : (
                <>
                    <Header
                        activeTab={activeTab}
                        handleTabClick={handleTabClick}
                        jsContentRef={jsContentRef}
                        scssContentRef={scssContentRef}
                        wizzardContentRef={wizzardContentRef}
                        jsContent={jsContent}
                        scssContent={scssContent}
                        darkMode={darkMode}
                        setDarkMode={setDarkMode}
                        setLicenseState={setLicenseState}
                        tabPostfix={(settings as any)?.css_preprocessor === 'scss' ? "(SCSS)" : "(CSS)"}
                        settings={settings}
                        setSettings={setSettings}
                        isDataLoading={isDataLoading}
                        isProVersion={isProVersion}
                    />

                    <div className="relative grow flex base">
                        <div className="w-full grow flex flex-col">

                            <div className="tab-content grow">
                                {activeTab === 'wizzard' && (
                                    <Suspense fallback={<LoadingScreen />}>
                                        {isDataLoading ? <LoadingScreen /> : <Wizzard />}
                                    </Suspense>
                                )}
                                {activeTab === 'styleguide' && (
                                    <Suspense fallback={<LoadingScreen />}>
                                        <StyleGuide
                                            scssContent={scssContent}
                                            jsContent={jsContent}
                                            settings={settings}
                                        />
                                    </Suspense>
                                )}
                                {activeTab === 'style' && (
                                    <StyleEditorWithTabs
                                        value={scssContent}
                                        onChange={(value) => setScssContent(value || '')}
                                        language={(settings as any)?.css_preprocessor === 'scss' ? 'scss' : 'css'}
                                        darkMode={darkMode}
                                        onMonacoMount={(instance, monaco) => {
                                            setMonacoEditor(monaco);
                                        }}
                                    />
                                )}
                                {activeTab === 'javascript' && (
                                    <Editor
                                        height="100%"
                                        language="plainjs"
                                        theme={darkMode ? "vs-dark" : "vs"}
                                        value={jsContent}
                                        onChange={(value) => setJsContent(value || '')}
                                        options={{
                                            selectOnLineNumbers: true,
                                            tabSize: 2,
                                            minimap: { enabled: false }
                                        }}
                                        loading={<LoadingScreen />}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default App;

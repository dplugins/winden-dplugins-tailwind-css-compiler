import React, { useEffect, useContext, useCallback } from 'react';
import type { Monaco } from '@monaco-editor/react';

// Types
import type { WizzardState } from '@/types/wizzard';

// Hooks
import { WizzardContext } from '@hooks/wizzardContext';
import { useWizzardContent } from '@hooks/wizzard';
import { useAutocomplete } from '@hooks/useAutocomplete';

// Contexts
import { useEditorContext } from '@/contexts/EditorContext';

// Config
import { setupMonaco } from '@/config/monacoSetup';

// Components
import Header from '@parts/Header';
import License from '@pages/License';
import { TabContent } from '@parts/TabContent';

// Import global type declarations
import '@/types/global.d.ts';

// Initialize Monaco on module load
setupMonaco();

function App() {
    const { localWizzardState, setLocalWizzardState } = useContext(WizzardContext)!;

    const {
        jsContent,
        setJsContent,
        scssContent,
        setScssContent,
        jsContentRef,
        scssContentRef,
        wizzardContentRef,
        settings,
        darkMode,
        activeTab,
        handleTabClick,
        licenseState,
        setLicenseState,
        isDataLoading: contextIsDataLoading,
        setIsDataLoading,
        isProVersion,
    } = useEditorContext();

    // Use the React Query hook for content fetching
    const { data: contentData, isLoading: isDataLoading, error: contentError } = useWizzardContent();

    // Use the autocomplete hook
    const {
        autocompleteClasses,
        monacoEditor,
        setMonacoEditor,
        fetchAutocomplete,
        addSuggestions,
    } = useAutocomplete({
        scssContentRef,
        jsContentRef,
        wizzardContentRef,
        scssContent,
        jsContent,
    });

    // Sync loading state with context
    useEffect(() => {
        setIsDataLoading(isDataLoading);
    }, [isDataLoading, setIsDataLoading]);

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
    }, [contentData, setLocalWizzardState, setJsContent, setScssContent]);

    // Set Tailwind version
    useEffect(() => {
        window.settings_tailwind_version = 'v4';
    }, []);

    // Set up window.winden_editor for autoExtractBreakpoints
    useEffect(() => {
        if (localWizzardState && (localWizzardState.configCode || scssContent)) {
            window.winden_editor = {
                wizzard: {
                    configCode: localWizzardState.configCode || ''
                },
                scss: scssContent || ''
            };

            if (typeof window.autoExtractBreakpoints === 'function') {
                window.autoExtractBreakpoints();
            }

            if (typeof window.refreshStyleGuide === 'function') {
                window.refreshStyleGuide();
            }
        }
    }, [localWizzardState, scssContent]);

    // Enhanced tab click that also refreshes autocomplete
    const onTabClick = useCallback((tab: string) => {
        fetchAutocomplete();
        handleTabClick(tab);
    }, [handleTabClick, fetchAutocomplete]);

    // Register Monaco suggestions when editor and classes are ready
    useEffect(() => {
        if (monacoEditor) {
            const language = (settings as any)?.css_preprocessor === 'scss' ? 'scss' : 'css';
            const classes = Array.isArray(autocompleteClasses) ? autocompleteClasses : Object.values(autocompleteClasses);
            if (classes?.length) {
                const _suggestions = ['@apply', '@config', '@layer', '@screen', '@tailwind', '@theme', '@utility', '@variant'];
                addSuggestions(monacoEditor, language, classes, _suggestions);
            }
        }
    }, [monacoEditor, settings, autocompleteClasses, addSuggestions]);

    // Handle Monaco mount from TabContent
    const handleMonacoMount = useCallback((instance: any, monaco: Monaco) => {
        setMonacoEditor(monaco);
    }, [setMonacoEditor]);

    // Show error if content failed to load
    if (contentError) {
        console.error('Failed to load content:', contentError);
    }

    return (
        <>
            {isProVersion && !licenseState ? (
                <License setLicenseState={setLicenseState} />
            ) : (
                <>
                    <Header
                        onTabClick={onTabClick}
                        tabPostfix={(settings as any)?.css_preprocessor === 'scss' ? "(SCSS)" : "(CSS)"}
                    />

                    <div className="relative grow flex base">
                        <div className="w-full grow flex flex-col">
                            <div className="tab-content grow">
                                <TabContent
                                    activeTab={activeTab}
                                    isDataLoading={isDataLoading}
                                    scssContent={scssContent}
                                    jsContent={jsContent}
                                    settings={settings}
                                    darkMode={darkMode}
                                    setScssContent={setScssContent}
                                    setJsContent={setJsContent}
                                    onMonacoMount={handleMonacoMount}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default App;

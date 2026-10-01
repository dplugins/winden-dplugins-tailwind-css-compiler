import React, { lazy, Suspense } from 'react';
import type { Monaco } from '@monaco-editor/react';
import LoadingScreen from '@el/loadingScreen';

const StyleGuide = lazy(() => import('@pages/StyleGuide'));
const Wizzard = lazy(() => import('@pages/Wizzard'));
// Monaco is 3.84 MB; only these two tabs have an editor on them
const StyleEditorWithTabs = lazy(() => import('@parts/StyleEditorWithTabs'));
const Editor = lazy(() => import('@parts/MonacoEditor'));

interface TabContentProps {
    activeTab: string;
    isDataLoading: boolean;
    scssContent: string;
    jsContent: string;
    settings: Record<string, any>;
    darkMode: boolean;
    setScssContent: (value: string) => void;
    setJsContent: (value: string) => void;
    onMonacoMount: (instance: any, monaco: Monaco) => void;
}

/**
 * Renders the content for each tab in the main editor
 */
export function TabContent({
    activeTab,
    isDataLoading,
    scssContent,
    jsContent,
    settings,
    darkMode,
    setScssContent,
    setJsContent,
    onMonacoMount,
}: TabContentProps): JSX.Element | null {
    const language = settings?.css_preprocessor === 'scss' ? 'scss' : 'css';

    // Which tab is active is remembered in the Wizzard state, which arrives a
    // moment after the first render — so the editor tab, being the default,
    // mounted first and fetched all 3.84 MB of Monaco even when the remembered
    // tab was the Wizzard. Measured: 5.28 MB over the network on a Wizzard
    // landing, for an editor that was unmounted again before it drew anything.
    if (isDataLoading) {
        return <LoadingScreen />;
    }

    switch (activeTab) {
        case 'wizzard':
            return (
                <Suspense fallback={<LoadingScreen />}>
                    <Wizzard />
                </Suspense>
            );

        case 'styleguide':
            return (
                <Suspense fallback={<LoadingScreen />}>
                    <StyleGuide
                        scssContent={scssContent}
                        jsContent={jsContent}
                        settings={settings}
                    />
                </Suspense>
            );

        case 'style':
            return (
                <Suspense fallback={<LoadingScreen />}>
                <StyleEditorWithTabs
                    value={scssContent}
                    onChange={(value) => setScssContent(value || '')}
                    language={language}
                    darkMode={darkMode}
                    onMonacoMount={onMonacoMount}
                />
                </Suspense>
            );

        case 'javascript':
            return (
                <Suspense fallback={<LoadingScreen />}>
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
                </Suspense>
            );

        default:
            return null;
    }
}

export default TabContent;

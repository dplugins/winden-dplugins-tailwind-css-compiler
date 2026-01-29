import React, { lazy, Suspense } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import LoadingScreen from '@el/loadingScreen';
import StyleEditorWithTabs from '@parts/StyleEditorWithTabs';

const StyleGuide = lazy(() => import('@pages/StyleGuide'));
const Wizzard = lazy(() => import('@pages/Wizzard'));

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

    switch (activeTab) {
        case 'wizzard':
            return (
                <Suspense fallback={<LoadingScreen />}>
                    {isDataLoading ? <LoadingScreen /> : <Wizzard />}
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
                <StyleEditorWithTabs
                    value={scssContent}
                    onChange={(value) => setScssContent(value || '')}
                    language={language}
                    darkMode={darkMode}
                    onMonacoMount={onMonacoMount}
                />
            );

        case 'javascript':
            return (
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
            );

        default:
            return null;
    }
}

export default TabContent;

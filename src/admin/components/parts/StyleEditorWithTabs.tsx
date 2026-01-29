import React, { useState, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import StyleTabs from './StyleTabs';
import LoadingScreen from '@el/loadingScreen';
import type { StyleTab, StyleTabsState } from '@/types/styleTabs';
import { createStyleTab, combineStyleTabs, parseContentIntoTabs } from '@/types/styleTabs';
import { buildLineMap, type TabLineMapping } from '@/types/errorMapping';
import '@/types/global.d.ts';

interface StyleEditorWithTabsProps {
    /** Current combined CSS content */
    value: string;
    /** Callback when content changes */
    onChange: (value: string) => void;
    /** CSS preprocessor language */
    language: 'css' | 'scss';
    /** Dark mode */
    darkMode: boolean;
    /** Monaco instance callback */
    onMonacoMount?: (instance: any, monaco: Monaco) => void;
}

export const StyleEditorWithTabs: React.FC<StyleEditorWithTabsProps> = ({
    value,
    onChange,
    language,
    darkMode,
    onMonacoMount,
}) => {
    // Track if we've initialized from the value prop
    const [initialized, setInitialized] = useState(false);

    // Initialize tabs from existing content or create default tab
    const [tabsState, setTabsState] = useState<StyleTabsState>(() => {
        const initialTabs = parseContentIntoTabs(value);
        return {
            tabs: initialTabs,
            activeTabId: initialTabs[0]?.id || '',
        };
    });

    // Update tabs when value prop changes (for initial data load)
    useEffect(() => {
        // Only initialize once when value comes in from server
        if (!initialized && value && value.trim() !== '') {
            const loadedTabs = parseContentIntoTabs(value);
            setTabsState({
                tabs: loadedTabs,
                activeTabId: loadedTabs[0]?.id || '',
            });
            setInitialized(true);
        }
    }, [value, initialized]);

    // Get current active tab
    const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeTabId);

    // Update parent when tabs change (but not during initialization)
    useEffect(() => {
        if (initialized) {
            const combined = combineStyleTabs(tabsState.tabs);
            onChange(combined);

            // Expose tabs and line map on window for error mapping
            window.windenStyleTabs = {
                tabs: tabsState.tabs,
                combinedContent: combined,
            };
        }
    }, [tabsState.tabs, initialized]); // Don't include onChange in deps to avoid loops

    const handleTabChange = (tabId: string) => {
        setTabsState(prev => ({
            ...prev,
            activeTabId: tabId,
        }));
    };

    const handleTabAdd = (newTab: StyleTab) => {
        setTabsState(prev => ({
            tabs: [...prev.tabs, newTab],
            activeTabId: newTab.id,
        }));
    };

    const handleTabRemove = (tabId: string) => {
        setTabsState(prev => {
            const newTabs = prev.tabs.filter(t => t.id !== tabId);
            const newActiveId = prev.activeTabId === tabId
                ? (newTabs[0]?.id || '')
                : prev.activeTabId;

            return {
                tabs: newTabs,
                activeTabId: newActiveId,
            };
        });
    };

    const handleTabUpdate = (tabId: string, updates: Partial<StyleTab>) => {
        setTabsState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t =>
                t.id === tabId ? { ...t, ...updates } : t
            ),
        }));
    };

    const handleEditorChange = (newContent: string | undefined) => {
        const content = newContent || '';

        setTabsState(prev => ({
            ...prev,
            tabs: prev.tabs.map(t =>
                t.id === prev.activeTabId
                    ? { ...t, content }
                    : t
            ),
        }));
    };

    return (
        <div className="flex flex-col h-full">
            <StyleTabs
                tabs={tabsState.tabs}
                activeTabId={tabsState.activeTabId}
                onTabChange={handleTabChange}
                onTabAdd={handleTabAdd}
                onTabRemove={handleTabRemove}
                onTabUpdate={handleTabUpdate}
            />

            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language={language}
                    theme={darkMode ? 'vs-dark' : 'vs'}
                    value={activeTab?.content || ''}
                    onChange={handleEditorChange}
                    options={{
                        selectOnLineNumbers: true,
                        tabSize: 2,
                        minimap: { enabled: false },
                    }}
                    onMount={onMonacoMount}
                    loading={<LoadingScreen />}
                />
            </div>
        </div>
    );
};

export default StyleEditorWithTabs;

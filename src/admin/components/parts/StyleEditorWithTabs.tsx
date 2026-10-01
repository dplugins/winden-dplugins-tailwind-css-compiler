import React, { useState, useEffect, useRef } from 'react';
import Editor, { type Monaco } from '@parts/MonacoEditor';
import StyleTabs from './StyleTabs';
import { PluginPicker } from './PluginPicker';
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
    /**
     * The content this editor last handed upwards.
     *
     * Anything else arriving in `value` came from outside — the server, most
     * often, since the app renders with DEFAULT_CSS_CONTENT before the fetch
     * resolves. Initialising "once" meant the real content lost that race and
     * was dropped: tabs saved from elsewhere never appeared, and saving from
     * that state wrote the stale copy back over them.
     */
    const lastEmitted = useRef<string | null>(null);

    // Initialize tabs from existing content or create default tab
    const [tabsState, setTabsState] = useState<StyleTabsState>(() => {
        const initialTabs = parseContentIntoTabs(value);
        return {
            tabs: initialTabs,
            activeTabId: initialTabs[0]?.id || '',
        };
    });

    // Re-read whenever the content changed somewhere other than here
    useEffect(() => {
        if (!value || value.trim() === '' || value === lastEmitted.current) return;

        const loadedTabs = parseContentIntoTabs(value);
        setTabsState((current) => ({
            tabs: loadedTabs,
            // Stay on the tab being edited if it survived the reload
            activeTabId: loadedTabs.some((tab) => tab.id === current.activeTabId)
                ? current.activeTabId
                : loadedTabs[0]?.id || '',
        }));
        lastEmitted.current = value;
    }, [value]);

    /**
     * One Monaco model per tab, so each tab keeps its own undo stack.
     *
     * With a single shared model, switching tabs was applied as an undoable
     * edit, and Ctrl+Z brought the previous tab's content into the current one.
     */
    const modelPath = (tabId: string) => `winden-style/${tabId}`;
    const monacoRef = useRef<Monaco | null>(null);
    const modelTabIds = useRef<string[]>([]);

    const handleEditorMount = (instance: any, monaco: Monaco) => {
        monacoRef.current = monaco;
        onMonacoMount?.(instance, monaco);
    };

    // Dispose the models of tabs that no longer exist. This runs after the
    // editor has already switched to the new active tab's model.
    useEffect(() => {
        const ids = tabsState.tabs.map((tab) => tab.id);
        const monaco = monacoRef.current;
        if (monaco) {
            modelTabIds.current
                .filter((id) => !ids.includes(id))
                .forEach((id) => monaco.editor.getModel(monaco.Uri.parse(modelPath(id)))?.dispose());
        }
        modelTabIds.current = ids;
    }, [tabsState.tabs]);

    // Get current active tab
    const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeTabId);

    // Update parent when tabs change (but not during initialization)
    useEffect(() => {
        const combined = combineStyleTabs(tabsState.tabs);
        lastEmitted.current = combined;
        onChange(combined);

        // Expose tabs and line map on window for error mapping
        window.windenStyleTabs = {
            tabs: tabsState.tabs,
            combinedContent: combined,
        };
    }, [tabsState.tabs]); // Don't include onChange in deps to avoid loops

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

    // Where a @plugin line can legally live: the first unwrapped tab
    const pluginTab = tabsState.tabs.find((tab) => tab.layer === 'none') ?? tabsState.tabs[0];

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <StyleTabs
                        tabs={tabsState.tabs}
                        activeTabId={tabsState.activeTabId}
                        onTabChange={handleTabChange}
                        onTabAdd={handleTabAdd}
                        onTabRemove={handleTabRemove}
                        onTabUpdate={handleTabUpdate}
                    />
                </div>

                {/*
                  * Plugins are declared at the top level, so they belong in a
                  * tab with no @layer wrapper — writing one inside `@layer
                  * components` would be invalid CSS.
                  */}
                <PluginPicker
                    css={pluginTab?.content ?? ''}
                    onChange={(content) => pluginTab && handleTabUpdate(pluginTab.id, { content })}
                />
            </div>

            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    path={activeTab ? modelPath(activeTab.id) : undefined}
                    language={language}
                    theme={darkMode ? 'vs-dark' : 'vs'}
                    value={activeTab?.content || ''}
                    onChange={handleEditorChange}
                    options={{
                        selectOnLineNumbers: true,
                        tabSize: 2,
                        minimap: { enabled: false },
                    }}
                    onMount={handleEditorMount}
                    loading={<LoadingScreen />}
                />
            </div>
        </div>
    );
};

export default StyleEditorWithTabs;

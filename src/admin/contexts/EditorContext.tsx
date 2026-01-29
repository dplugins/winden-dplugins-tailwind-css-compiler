import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { WizzardState } from '@/types/wizzard';
import { initialSettings } from '@const/settings';

/**
 * Settings interface for application configuration
 */
export interface Settings {
  autocomplete_gutenberg?: boolean;
  autocomplete_bricks?: boolean;
  autocomplete_oxygen?: boolean;
  autocomplete_oxygen6?: boolean;
  autocomplete_elementor?: boolean;
  dequeue_styles_gutenberg?: boolean;
  dequeue_styles_bricks?: boolean;
  dequeue_styles_oxygen?: boolean;
  register_wizzard_data_in_fse?: boolean;
  disable_dev_mode?: boolean;
  inline_compiled_css?: boolean;
  compiled_css?: boolean;
  cdn_for_admin?: boolean;
  css_preprocessor?: 'css' | 'scss';
  folded_sidebar?: boolean;
  enable_files_scan?: boolean;
  scan_file_formats?: string[];
  scan_path?: string | string[];
}

/**
 * Editor context value interface
 * Contains all shared state between App, Header, and Nav components
 */
interface EditorContextValue {
  // Content state
  jsContent: string;
  setJsContent: React.Dispatch<React.SetStateAction<string>>;
  scssContent: string;
  setScssContent: React.Dispatch<React.SetStateAction<string>>;

  // Content refs for async operations
  jsContentRef: React.MutableRefObject<string>;
  scssContentRef: React.MutableRefObject<string>;
  wizzardContentRef: React.MutableRefObject<WizzardState>;

  // Settings
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;

  // UI state
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;

  // License state
  licenseState: boolean;
  setLicenseState: React.Dispatch<React.SetStateAction<boolean>>;

  // Loading state
  isDataLoading: boolean;
  setIsDataLoading: React.Dispatch<React.SetStateAction<boolean>>;

  // Pro version flag
  isProVersion: boolean;

  // Tab navigation
  handleTabClick: (tab: string) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  children: React.ReactNode;
  licenseStatus: string;
  proExists: string;
  localWizzardState: WizzardState;
}

/**
 * EditorProvider - Provides shared editor state to all child components
 * Eliminates props drilling between App, Header, and Nav
 */
export function EditorProvider({
  children,
  licenseStatus,
  proExists,
  localWizzardState,
}: EditorProviderProps) {
  const isProVersion = JSON.parse(proExists);

  // Content state
  const [jsContent, setJsContent] = useState('');
  const [scssContent, setScssContent] = useState('');

  // Settings state
  const [settings, setSettings] = useState<Settings>(initialSettings);

  // UI state
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('style');

  // License state
  const [licenseState, setLicenseState] = useState(JSON.parse(licenseStatus));

  // Loading state
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Content refs for async operations (save handlers need latest values)
  const jsContentRef = useRef(jsContent);
  const scssContentRef = useRef(scssContent);
  const wizzardContentRef = useRef<WizzardState>(localWizzardState);

  // Keep refs in sync with state
  useEffect(() => {
    jsContentRef.current = jsContent;
  }, [jsContent]);

  useEffect(() => {
    scssContentRef.current = scssContent;
  }, [scssContent]);

  useEffect(() => {
    wizzardContentRef.current = localWizzardState;
  }, [localWizzardState]);

  // Initialize from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab) {
      if (savedTab === 'styleguide') {
        localStorage.setItem('_wait_for_config', 'true');
      }
      setActiveTab(savedTab);
    }

    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDarkMode);
  }, []);

  // Tab navigation handler
  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('activeTab', tab);
  }, []);

  const value: EditorContextValue = {
    jsContent,
    setJsContent,
    scssContent,
    setScssContent,
    jsContentRef,
    scssContentRef,
    wizzardContentRef,
    settings,
    setSettings,
    darkMode,
    setDarkMode,
    activeTab,
    setActiveTab,
    licenseState,
    setLicenseState,
    isDataLoading,
    setIsDataLoading,
    isProVersion,
    handleTabClick,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

/**
 * Hook to access editor context
 * Throws error if used outside EditorProvider
 */
export function useEditorContext(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
}

export { EditorContext };

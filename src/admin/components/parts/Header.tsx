import React from 'react';
import Nav from './Nav';
import Filter from '../pages/StyleGuide/Filter';
import { handleSave } from '../../functions/HandleSave';
import type { WizzardState } from '@/types/wizzard';

interface Settings {
  autocomplete_gutenberg?: boolean;
  autocomplete_bricks?: boolean;
  autocomplete_oxygen?: boolean;
  autocomplete_oxygen6?: boolean;
  autocomplete_elementor?: boolean;
  dequeue_styles_gutenberg?: boolean;
  dequeue_styles_bricks?: boolean;
  dequeue_styles_oxygen?: boolean;
  register_wizzard_data_in_fse?: boolean;
  compiled_css?: boolean;
  cdn_for_admin?: boolean;
  css_preprocessor?: "css" | "scss";
  folded_sidebar?: boolean;
  enable_files_scan?: boolean;
  scan_file_formats?: string[];
  scan_path?: string | string[];
}

const filterNames = ['Colors', 'Typography', 'Screens', 'Space', 'Widths', 'Border Radius', 'Shadows'];

interface HeaderProps {
  /** Currently active tab */
  activeTab: string;
  /** Function to handle tab switching */
  handleTabClick: (tabValue: string) => void;
  /** Reference to JS content */
  jsContentRef: React.MutableRefObject<string>;
  /** Reference to SCSS content */
  scssContentRef: React.MutableRefObject<string>;
  /** Reference to wizzard content */
  wizzardContentRef: React.MutableRefObject<WizzardState | null>;
  /** Current JS content */
  jsContent: string;
  /** Current SCSS content */
  scssContent: string;
  /** Dark mode state */
  darkMode: boolean;
  /** Function to toggle dark mode */
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  /** Function to update license state */
  setLicenseState: React.Dispatch<React.SetStateAction<boolean>>;
  /** Optional suffix for tab labels */
  tabPostfix?: string;
  /** Application settings */
  settings: Settings;
  /** Function to update settings */
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  /** Loading state */
  isDataLoading: boolean;
  /** Whether pro folder exists */
  isProVersion: boolean;
}

/**
 * Header component with navigation tabs and controls
 * Manages tab switching between Style, Config, Wizzard, and Style Guide views
 */
const Header: React.FC<HeaderProps> = ({
  activeTab,
  handleTabClick,
  jsContentRef,
  scssContentRef,
  wizzardContentRef,
  jsContent,
  scssContent,
  darkMode,
  setDarkMode,
  setLicenseState,
  tabPostfix = '',
  settings,
  setSettings,
  isDataLoading,
  isProVersion
}) => {
  return (
    <header className="flex flex-col bg-base-1 text-foreground sticky top-[32px] z-50">
      <div className="flex pr-2 gap-2 justify-between items-center border-y border-border">
        <ul className="tabs flex gap-2">
          {[
            { name: 'Style', value: 'style' },
            { name: 'Config', value: 'javascript' },
            { name: 'Wizzard', value: 'wizzard' },
            { name: 'Style Guide', value: 'styleguide' },
          ].map(tab => (
            <li
              key={tab.value}
              className={`tab p-4 !m-0 cursor-pointer ${activeTab === tab.value ? 'border-b-[3px] mb-[-1px] border-action' : ''}`}
              onClick={() => handleTabClick(tab.value)}
            >
              {tab.name}&nbsp;{tab.value === 'style' ? tabPostfix : ''}
            </li>
          ))}
        </ul>
        <Nav
          onSave={() => handleSave(jsContentRef, scssContentRef, wizzardContentRef, settings)}
          jsContentRef={jsContentRef}
          scssContentRef={scssContentRef}
          wizzardContentRef={wizzardContentRef}
          jsContent={jsContent}
          scssContent={scssContent}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          setLicenseState={setLicenseState}
          settings={settings}
          setSettings={setSettings}
          isDataLoading={isDataLoading}
          isProVersion={isProVersion}
        />
      </div>
      {activeTab === 'styleguide' && <Filter filterNames={filterNames} />}
    </header>
  );
};

export default Header;

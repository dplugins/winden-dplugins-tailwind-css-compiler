import React from 'react';
import Nav from './Nav';
import Filter from '../pages/StyleGuide/Filter';
import { useEditorContext } from '@/contexts/EditorContext';
import {
  EDITOR_TAB_LABELS,
  normalizeEditorTabs,
  type EditorTabKey,
} from '@const/settings';

const filterNames = ['Colors', 'Typography', 'Screens', 'Space', 'Widths', 'Border Radius', 'Shadows'];

interface HeaderProps {
  /** Function to handle tab switching (includes autocomplete refresh) */
  onTabClick: (tabValue: string) => void;
  /** Optional suffix for tab labels */
  tabPostfix?: string;
}

/**
 * Header component with navigation tabs and controls
 * Tab order and visibility are driven by `settings.editor_tabs`
 * (configured in Settings → Editor).
 */
const Header: React.FC<HeaderProps> = ({
  onTabClick,
  tabPostfix = '',
}) => {
  const { activeTab, settings } = useEditorContext();

  const tabs = normalizeEditorTabs((settings as any)?.editor_tabs).filter((t) => t.visible);

  return (
    <header className="flex flex-col bg-base-1 text-foreground sticky top-[32px] z-50">
      <div className="flex pr-2 gap-2 justify-between items-center border-y border-border">
        <ul className="tabs flex gap-2">
          {tabs.map((tab) => {
            const key = tab.value as EditorTabKey;
            return (
              <li
                key={key}
                className={`tab p-4 !m-0 cursor-pointer ${activeTab === key ? 'border-b-[3px] mb-[-1px] border-action' : ''}`}
                onClick={() => onTabClick(key)}
              >
                {EDITOR_TAB_LABELS[key]}&nbsp;{key === 'style' ? tabPostfix : ''}
              </li>
            );
          })}
        </ul>
        <Nav />
      </div>
      {activeTab === 'styleguide' && <Filter filterNames={filterNames} />}
    </header>
  );
};

export default Header;

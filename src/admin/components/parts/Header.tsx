import React from 'react';
import Nav from './Nav';
import Filter from '../pages/StyleGuide/Filter';
import { useEditorContext } from '@/contexts/EditorContext';

const filterNames = ['Colors', 'Typography', 'Screens', 'Space', 'Widths', 'Border Radius', 'Shadows'];

interface HeaderProps {
  /** Function to handle tab switching (includes autocomplete refresh) */
  onTabClick: (tabValue: string) => void;
  /** Optional suffix for tab labels */
  tabPostfix?: string;
}

/**
 * Header component with navigation tabs and controls
 * Manages tab switching between Style, Config, Wizzard, and Style Guide views
 * Now uses EditorContext for shared state instead of props drilling
 */
const Header: React.FC<HeaderProps> = ({
  onTabClick,
  tabPostfix = '',
}) => {
  const { activeTab } = useEditorContext();

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
              onClick={() => onTabClick(tab.value)}
            >
              {tab.name}&nbsp;{tab.value === 'style' ? tabPostfix : ''}
            </li>
          ))}
        </ul>
        <Nav />
      </div>
      {activeTab === 'styleguide' && <Filter filterNames={filterNames} />}
    </header>
  );
};

export default Header;

/**
 * Custom hook for managing active tab state in Wizzard
 *
 * Handles:
 * - Initializing activeTab from saved state
 * - Syncing activeTab changes to Wizzard state
 * - Switching tabs when feature flags change
 * - Ensuring valid tab is always selected
 */

import { useState, useEffect } from 'react';
import type { WizzardState } from '@/types/wizzard';
import type { TabConfig } from '@pages/Wizzard/WizzardTabs';

interface UseActiveTabParams {
  localWizzardState: WizzardState | null;
  setLocalWizzardState: (state: WizzardState | ((prev: WizzardState) => WizzardState)) => void;
  tabConfig: TabConfig[];
}

interface UseActiveTabReturn {
  activeTab: number;
  setActiveTab: (tabId: number) => void;
}

/**
 * Hook for managing Wizzard active tab state
 *
 * @param params - Hook parameters
 * @returns Active tab state and setter
 *
 * @example
 * ```typescript
 * const { activeTab, setActiveTab } = useActiveTab({
 *   localWizzardState,
 *   setLocalWizzardState,
 *   tabConfig
 * });
 * ```
 */
export const useActiveTab = ({
  localWizzardState,
  setLocalWizzardState,
  tabConfig,
}: UseActiveTabParams): UseActiveTabReturn => {
  // Initialize activeTab from saved state or with the first available tab
  const [activeTab, setActiveTab] = useState(() => {
    // Check if we have a saved activeTab in the wizard state
    if (localWizzardState?.activeTab !== undefined) {
      const savedTabExists = tabConfig.some(tab => tab.id === localWizzardState.activeTab);
      if (savedTabExists) {
        return localWizzardState.activeTab;
      }
    }

    // Default to first available tab
    const firstTabId = tabConfig.length > 0 ? tabConfig[0].id : 6;
    return firstTabId;
  });

  // Save activeTab to localWizzardState when it changes
  useEffect(() => {
    if (localWizzardState && localWizzardState.activeTab !== activeTab) {
      setLocalWizzardState(prev => ({
        ...prev,
        activeTab: activeTab
      }));
    }
  }, [activeTab, localWizzardState, setLocalWizzardState]);

  // Update activeTab when feature flags change (tabs appear/disappear)
  useEffect(() => {
    const currentTabExists = tabConfig.some(tab => tab.id === activeTab);

    if (!currentTabExists && tabConfig.length > 0) {
      // Current tab no longer exists, switch to first available
      const newTabId = tabConfig[0].id;
      setActiveTab(newTabId);
    }
    // REMOVED: Problematic auto-switch logic that prevented access to Backups tab
    // Previously, this would force-switch from Backups (id: 6) to the first feature tab
    // when feature tabs were available. This prevented users from accessing Backups.
  }, [
    localWizzardState?.colorsActive,
    localWizzardState?.fontSizesActive,
    localWizzardState?.fontFamilyActive,
    localWizzardState?.spacesActive,
    localWizzardState?.borderRadiusActive,
    localWizzardState?.breakpointsActive,
    tabConfig,
    activeTab
  ]);

  return {
    activeTab,
    setActiveTab,
  };
};

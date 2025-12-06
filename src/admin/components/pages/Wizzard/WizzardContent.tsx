/**
 * Wizzard Content Component
 *
 * Renders the content panels for each Wizzard tab.
 * Conditionally renders components based on the active tab and feature flags.
 */

import React from 'react';
import * as Tabs from "@radix-ui/react-tabs";

// Tab Components
import ScaleCalculator from "./components/ScaleCalculator/ScaleCalculator";
import SettingsTab from "./SettingsTab";
import Color from "./Color/Color";
import Breakpoints from "./Breakpoints/Breakpoints";
import FontFamily from "./FontFamily/FontFamily";
import Backups from "./Backups/Backups";

import type { WizzardState } from '@/types/wizzard';
import type { UseClampCalculatorReturn } from '@hooks/useClampCalculator';

/**
 * Props for WizzardContent component
 */
interface WizzardContentProps {
  wizzardState: WizzardState | null;
  activeTab: number;
  fontSize: UseClampCalculatorReturn;
  spacing: UseClampCalculatorReturn;
  borderRadius: UseClampCalculatorReturn;
  onStateUpdate: (items: Array<{ key: string; value: any }>, parent: string) => void;
  onRegenerateConfig: (shouldSave: boolean) => void;
  onExport: () => void;
  getTabLabel: (id: number) => string;
}

/**
 * Wizzard Content Component
 *
 * Manages the rendering of all tab content panels.
 * Each tab is conditionally rendered based on feature activation flags.
 *
 * @param props - Component props
 * @returns Rendered tab content panels
 */
export const WizzardContent: React.FC<WizzardContentProps> = ({
  wizzardState,
  activeTab,
  fontSize,
  spacing,
  borderRadius,
  onStateUpdate,
  onRegenerateConfig,
  onExport,
  getTabLabel,
}) => {
  return (
    <>
      {/* Colors Tab */}
      {activeTab === 0 && wizzardState?.colorsActive && (
        <Tabs.Content value="0" className="w-full">
          <Color label={getTabLabel(0)} />
        </Tabs.Content>
      )}

      {/* Font Sizes Tab */}
      <Tabs.Content value="1" className="w-full overflow-hidden">
        <ScaleCalculator
          label={getTabLabel(1)}
          font
          state={wizzardState?.fontSize}
          updateState={(key: string, value: any) => {
            onStateUpdate([{ key, value }], "fontSize");
          }}
          updateStates={(items: Array<{ key: string; value: any }>) => {
            onStateUpdate(items, "fontSize");
          }}
          clampOverrides={fontSize.clampOverrides}
          setClampOverrides={fontSize.setClampOverrides}
          clamps={fontSize.clamps}
          setClamps={fontSize.setClamps}
        />
      </Tabs.Content>

      {/* Font Family Tab */}
      {activeTab === 2 && wizzardState?.fontFamilyActive && (
        <Tabs.Content value="2" className="w-full overflow-hidden">
          <FontFamily label={getTabLabel(2)} />
        </Tabs.Content>
      )}

      {/* Spacing Tab */}
      <Tabs.Content value="3" className="w-full overflow-hidden">
        <ScaleCalculator
          label={getTabLabel(3)}
          spacing
          state={wizzardState?.spacing}
          updateState={(key: string, value: any) => {
            onStateUpdate([{ key, value }], "spacing");
          }}
          updateStates={(items: Array<{ key: string; value: any }>) => {
            onStateUpdate(items, "spacing");
          }}
          clampOverrides={spacing.clampOverrides}
          setClampOverrides={spacing.setClampOverrides}
          clamps={spacing.clamps}
          setClamps={spacing.setClamps}
        />
      </Tabs.Content>

      {/* Border Radius Tab */}
      <Tabs.Content value="4" className="w-full overflow-hidden">
        <ScaleCalculator
          label={getTabLabel(4)}
          borderRadius
          state={wizzardState?.borderRadius}
          updateState={(key: string, value: any) => {
            onStateUpdate([{ key, value }], "borderRadius");
          }}
          updateStates={(items: Array<{ key: string; value: any }>) => {
            onStateUpdate(items, "borderRadius");
          }}
          clampOverrides={borderRadius.clampOverrides}
          setClampOverrides={borderRadius.setClampOverrides}
          clamps={borderRadius.clamps}
          setClamps={borderRadius.setClamps}
        />
      </Tabs.Content>

      {/* Breakpoints Tab */}
      {activeTab === 5 && wizzardState?.breakpointsActive && (
        <Tabs.Content value="5" className="w-full overflow-hidden">
          <Breakpoints label={getTabLabel(5)} />
        </Tabs.Content>
      )}

      {/* Backups Tab */}
      {activeTab === 6 && (
        <Tabs.Content value="6" className="w-full overflow-hidden">
          <Backups
            label={getTabLabel(6)}
            onExport={onExport}
          />
        </Tabs.Content>
      )}

      {/* Settings Tab */}
      {activeTab === 7 && (
        <Tabs.Content value="7" className="w-full overflow-hidden">
          <SettingsTab
            label={getTabLabel(7)}
            onStateChange={() => onRegenerateConfig(true)}
            setClampsFontSize={fontSize.setClamps}
            setClampsSpacing={spacing.setClamps}
            setClampsBorderRadius={borderRadius.setClamps}
          />
        </Tabs.Content>
      )}
    </>
  );
};

export default WizzardContent;

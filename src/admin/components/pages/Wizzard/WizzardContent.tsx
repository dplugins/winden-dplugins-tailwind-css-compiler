/**
 * Wizzard Content Component
 *
 * Renders the content panels for each Wizzard tab.
 * Conditionally renders components based on the active tab and feature flags.
 */

import React from 'react';
import * as Tabs from "@radix-ui/react-tabs";
// Tabs.Trigger must live inside Tabs.List (it uses Radix's RovingFocusGroup
// context). The empty-state CTA below renders outside the list, so it uses
// a plain button + onSetActiveTab callback instead.

// Tab Components
import ScaleCalculator from "./components/ScaleCalculator/ScaleCalculator";
import SettingsTab from "./SettingsTab";
import Color from "./Color/Color";
import Breakpoints from "./Breakpoints/Breakpoints";
import FontFamily from "./FontFamily/FontFamily";
import Backups from "./Backups/Backups";
import { Button } from "@el/Button";
import { ReactComponent as TuneIcon } from "@/assets/icons/TuneIcon.svg";

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
  onSetActiveTab: (tabId: number) => void;
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
  onSetActiveTab,
}) => {
  const hasAnyActiveFeature = !!(
    wizzardState?.colorsActive ||
    wizzardState?.fontSizesActive ||
    wizzardState?.fontFamilyActive ||
    wizzardState?.spacesActive ||
    wizzardState?.borderRadiusActive ||
    wizzardState?.breakpointsActive
  );

  // First-time / nothing-configured state. Show this whenever no feature
  // is active and the user isn't intentionally on Settings (7). Backups
  // has nothing useful to display before any state exists, so the empty
  // state replaces it too — useActiveTab defaults a fresh visitor to
  // Backups, which would otherwise look broken. The CTA below is a real
  // Radix tab trigger so it advances the active tab without prop-drilling
  // a setter through WizzardContent.
  if (!hasAnyActiveFeature && activeTab !== 7) {
    return (
      <div className="flex w-full items-center justify-center px-6 py-16">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-semibold text-base-foreground">
            Build your design tokens
          </h2>
          <p className="mt-3 text-sm text-foreground/70">
            Turn on the design tokens you want to manage — colors, type
            scales, spacing, breakpoints, and more — then come back here
            to fine-tune them.
          </p>
          <Button
            className="mt-6"
            icon={<TuneIcon className="h-4 w-4" />}
            onClick={() => onSetActiveTab(7)}
          >
            Open settings
          </Button>
        </div>
      </div>
    );
  }

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

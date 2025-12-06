/**
 * Wizzard Tabs Component
 *
 * Renders the vertical tab navigation sidebar for the Wizzard interface.
 * Tabs are dynamically shown/hidden based on feature activation flags.
 */

import React from 'react';
import * as Tabs from "@radix-ui/react-tabs";
import { Tooltip, TooltipTrigger, TooltipContent } from "@el/Tooltip";

// Custom Icons
import FontFamilyIcon from "./components/icons/fontFamilyIcon";
import { ReactComponent as LineWeightOutlinedIcon } from "@/assets/icons/LineWeightOutlinedIcon.svg";
import { ReactComponent as ColorLensOutlinedIcon } from "@/assets/icons/ColorLensOutlinedIcon.svg";
import { ReactComponent as DevicesOutlinedIcon } from "@/assets/icons/DevicesOutlinedIcon.svg";
import { ReactComponent as FormatSizeIcon } from "@/assets/icons/FormatSizeIcon.svg";
import { ReactComponent as TuneIcon } from "@/assets/icons/TuneIcon.svg";
import { ReactComponent as BackupIcon } from "@/assets/icons/BackupIcon.svg";
import { ReactComponent as RoundedCornerIcon } from "@/assets/icons/RoundedCornerIcon.svg";

import type { WizzardState } from '@/types/wizzard';

/**
 * Tab configuration item
 */
export interface TabConfig {
  id: number;
  icon: React.ReactNode;
  label: string;
}

/**
 * Props for WizzardTabs component
 */
interface WizzardTabsProps {
  wizzardState: WizzardState | null;
  activeTab: number;
  onTabChange: (tabId: number) => void;
}

/**
 * Generate tab configuration based on active features
 *
 * Tabs are conditionally included based on feature activation flags.
 * Backups and Settings tabs are always shown.
 *
 * @param state - Current Wizzard state
 * @returns Array of tab configurations
 */
export function generateTabConfig(state: WizzardState | null): TabConfig[] {
  if (!state) {
    return [
      { id: 6, icon: <BackupIcon />, label: "Backups" },
      { id: 7, icon: <TuneIcon />, label: "Settings" },
    ];
  }

  const tabs = [
    ...(state.colorsActive
      ? [{ id: 0, icon: <ColorLensOutlinedIcon />, label: "Colors" }]
      : []),
    ...(state.fontSizesActive
      ? [{ id: 1, icon: <FormatSizeIcon />, label: "Font Sizes" }]
      : []),
    ...(state.fontFamilyActive
      ? [{ id: 2, icon: <FontFamilyIcon />, label: "Font Family" }]
      : []),
    ...(state.spacesActive
      ? [{ id: 3, icon: <LineWeightOutlinedIcon />, label: "Spaces" }]
      : []),
    ...(state.borderRadiusActive
      ? [{ id: 4, icon: <RoundedCornerIcon />, label: "Border Radius" }]
      : []),
    ...(state.breakpointsActive
      ? [{ id: 5, icon: <DevicesOutlinedIcon />, label: "Breakpoints" }]
      : []),
    { id: 6, icon: <BackupIcon />, label: "Backups" },
    { id: 7, icon: <TuneIcon />, label: "Settings" },
  ];

  return tabs;
}

/**
 * Wizzard Tabs Component
 *
 * Vertical sidebar navigation for Wizzard features.
 * Each tab shows an icon and displays a label in a tooltip.
 *
 * @param props - Component props
 * @returns Rendered tab navigation
 */
export const WizzardTabs: React.FC<WizzardTabsProps> = ({
  wizzardState,
  activeTab,
  onTabChange,
}) => {
  const tabConfig = generateTabConfig(wizzardState);

  return (
    <Tabs.List className="mb-4 flex flex-col gap-2 rounded-sm">
      {tabConfig.map((tab, idx) => {
        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <Tabs.Trigger
                key={tab.id}
                value={String(tab.id)}
                onClick={() => {
                  onTabChange(tab.id);
                }}
                className={`bg-base-1 cursor-pointer flex items-center gap-2 rounded-sm border border-solid border-input px-2 py-1 text-xs ${
                  activeTab === tab.id ? "bg-base-foreground text-base-1" : ""
                }`}
              >
                {tab.icon}
              </Tabs.Trigger>
            </TooltipTrigger>
            <TooltipContent side="right">{tab.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </Tabs.List>
  );
};

export default WizzardTabs;

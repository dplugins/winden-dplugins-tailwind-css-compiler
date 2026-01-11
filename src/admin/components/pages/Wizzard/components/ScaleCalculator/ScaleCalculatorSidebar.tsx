/**
 * Scale Calculator Sidebar
 * Contains mode toggles, builder integrations, and settings
 */

import React from "react";
import {
  Sidebar,
  SidebarSeparator,
} from "../../components/layout/Layout";
import { Input } from "@el/Input";
import { Checkbox } from "@el/Checkbox";
import SegmentedControl from "@el/SegmentedControl";

import {
  dynamicSpacingFSE,
  dynamicSpacingBricks,
  dynamicSpacingOxygen,
} from "@/dynamicData/spacing";

import {
  dynamicFontSizeFSE,
  dynamicFontSizeOxygen,
  dynamicFontSizeBricks,
} from "@/dynamicData/fontSize";

import type { ScaleState, WizzardState } from "./types";

interface ScaleCalculatorSidebarProps {
  label: string;
  font?: boolean;
  spacing?: boolean;
  borderRadius?: boolean;
  state: ScaleState;
  updateState: (key: string, value: any) => void;
  localWizzardState: WizzardState | null;
  setLocalWizzardState: (state: WizzardState) => void;
  handleRemSizeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ScaleCalculatorSidebar: React.FC<ScaleCalculatorSidebarProps> = ({
  label,
  font,
  spacing,
  borderRadius,
  state,
  updateState,
  localWizzardState,
  setLocalWizzardState,
  handleRemSizeChange,
}) => {
  /**
   * Check if builders integration header should be shown
   */
  const showBuildersIntegrationHeader = (): boolean => {
    if (font) {
      return (
        Object.keys(dynamicFontSizeFSE)?.length > 0 ||
        Object.keys(dynamicFontSizeBricks)?.length > 0 ||
        Object.keys(dynamicFontSizeOxygen)?.length > 0
      );
    } else if (spacing) {
      return (
        Object.keys(dynamicSpacingFSE)?.length > 0 ||
        Object.keys(dynamicSpacingBricks)?.length > 0 ||
        Object.keys(dynamicSpacingOxygen)?.length > 0
      );
    }
    return true;
  };

  return (
    <Sidebar label={label}>
      {/* Mode Toggle */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase text-foreground/50">Mode</span>
        <SegmentedControl
          options={[
            { value: 'wizard', label: 'Wizard' },
            { value: 'manual', label: 'Manual' }
          ]}
          value={state?.manualMode ? 'manual' : 'wizard'}
          onChange={(value) => updateState("manualMode", value === 'manual')}
        />
      </div>

      {/* Fluid/Fixed Toggle */}
      <div className="flex flex-col gap-2 mt-4">
        <span className="text-xs font-medium uppercase text-foreground/50">Scale Type</span>
        <SegmentedControl
          options={[
            { value: 'fluid', label: 'Fluid' },
            { value: 'fixed', label: 'Fixed' }
          ]}
          value={state?.disableFluid ? 'fixed' : 'fluid'}
          onChange={(value) => updateState("disableFluid", value === 'fixed')}
        />
      </div>

      {/* REM/PX Toggle */}
      <div className="flex flex-col gap-2 mt-4">
        <span className="text-xs font-medium uppercase text-foreground/50">Calculated Unit</span>
        <SegmentedControl
          options={[
            { value: 'rem', label: 'REM' },
            { value: 'px', label: 'PX' }
          ]}
          value={state?.useRem ? 'rem' : 'px'}
          onChange={(value) => updateState("useRem", value === 'rem')}
        />
      </div>

      {state?.useRem && (
        <div className="mt-12">
          <Input
            label="REM Size (px):"
            type="number"
            value={state?.remSize}
            onChange={handleRemSizeChange}
          />
          <p className="mt-2 text-xs text-foreground/50">
            The pixel value of 1rem. Defaults to 16px in all browsers but
            can be changed with CSS. For example, if you set your root font
            size to 62.5%, then 1rem equals 10px.
          </p>
        </div>
      )}

      {showBuildersIntegrationHeader() && (
        <SidebarSeparator label="Builders integration" />
      )}

      {font && (
        <>
          {Object.keys(dynamicFontSizeFSE)?.length > 0 && (
            <Checkbox
              label="Include FSE Sizes"
              checked={localWizzardState?.extendFontSizesFSE ?? false}
              onCheckedChange={(checked) => {
                if (localWizzardState) {
                  setLocalWizzardState({
                    ...localWizzardState,
                    extendFontSizesFSE: checked as boolean,
                  });
                }
              }}
            />
          )}
          {Object.keys(dynamicFontSizeBricks)?.length > 0 && (
            <Checkbox
              label="Include Bricks Sizes"
              checked={localWizzardState?.extendFontSizesBricks ?? false}
              onCheckedChange={(checked) => {
                if (localWizzardState) {
                  setLocalWizzardState({
                    ...localWizzardState,
                    extendFontSizesBricks: checked as boolean,
                  });
                }
              }}
            />
          )}
          {Object.keys(dynamicFontSizeOxygen)?.length > 0 && (
            <Checkbox
              label="Include Oxygen Sizes"
              checked={localWizzardState?.extendFontSizesOxygen ?? false}
              onCheckedChange={(checked) => {
                if (localWizzardState) {
                  setLocalWizzardState({
                    ...localWizzardState,
                    extendFontSizesOxygen: checked as boolean,
                  });
                }
              }}
            />
          )}
        </>
      )}

      {spacing && (
        <>
          {Object.keys(dynamicSpacingFSE)?.length > 0 && (
            <Checkbox
              label="Include FSE Spacing"
              checked={localWizzardState?.extendSpacingFSE ?? false}
              onCheckedChange={(checked) => {
                if (localWizzardState) {
                  setLocalWizzardState({
                    ...localWizzardState,
                    extendSpacingFSE: checked as boolean,
                  });
                }
              }}
            />
          )}
          {Object.keys(dynamicSpacingBricks)?.length > 0 && (
            <Checkbox
              label="Include Bricks Spacing"
              checked={localWizzardState?.extendSpacingBricks ?? false}
              onCheckedChange={(checked) => {
                if (localWizzardState) {
                  setLocalWizzardState({
                    ...localWizzardState,
                    extendSpacingBricks: checked as boolean,
                  });
                }
              }}
            />
          )}
          {Object.keys(dynamicSpacingOxygen)?.length > 0 && (
            <Checkbox
              label="Include Oxygen Spacing"
              checked={localWizzardState?.extendSpacingOxygen ?? false}
              onCheckedChange={(checked) => {
                if (localWizzardState) {
                  setLocalWizzardState({
                    ...localWizzardState,
                    extendSpacingOxygen: checked as boolean,
                  });
                }
              }}
            />
          )}
        </>
      )}

      <SidebarSeparator label="Keep tailwind default sizes" />
      <Checkbox
        checked={state?.extend ?? false}
        onCheckedChange={(value) => updateState("extend", value)}
        label="Extend"
      />

      {(spacing || borderRadius) && (
        <>
          <SidebarSeparator label="Include Utility Sizes" />
          <Checkbox
            checked={localWizzardState?.includeUtilitySizes ?? false}
            onCheckedChange={(checked) => {
              if (localWizzardState) {
                setLocalWizzardState({
                  ...localWizzardState,
                  includeUtilitySizes: checked as boolean,
                });
              }
            }}
            label="Include Utility Sizes"
          />
          {localWizzardState?.includeUtilitySizes && (
            <div className="mt-2 text-xs text-foreground/60">
              {spacing && (
                <div className="space-y-0.5 border border-solid border-border rounded-sm ml-[1.5rem]">
                  <div className="border-b border-b-solid border-border p-1 px-2">0 → 0</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">px → 1px</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">auto → auto</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">full → 100%</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">screen → 100vh</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">svw → 100svw</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">lvw → 100lvw</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">dvw → 100dvw</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">min → min-content</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">max → max-content</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">fit → fit-content</div>
                </div>
              )}
              {borderRadius && (
                <div className="space-y-0.5 border border-solid border-border rounded-sm ml-[1.5rem]">
                  <div className="border-b border-b-solid border-border p-1 px-2">full → calc(infinity * 1px)</div>
                  <div className="border-b border-b-solid border-border p-1 px-2">none → 0</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Sidebar>
  );
};

export default ScaleCalculatorSidebar;

import React, { useContext } from "react";
import {
  Wrapper,
  Sidebar,
  Content,
  SidebarSeparator,
} from "../components/layout/Layout";
import { ArrowButton } from "@el/ArrowButton";
import { Checkbox } from "@el/Checkbox";
import { breakpointsPresets } from "./breakpointsPresets";
import ListWithButton from "../components/layout/ListWithButton";

import { WizzardContext } from "@hooks/wizzardContext";

import {
  dynamicScreensFSE,
  dynamicScreensBricks,
  dynamicScreensOxygen,
} from "@/dynamicData/screens";

import { DynamicBreakpoints } from "./DynamicBreakpoints";

interface BreakpointEntry {
  id: string;
  name: string;
  value: string | number;
}

interface BreakpointsProps {
  label: string;
}

/**
 * Breakpoints configuration component
 * @param label - Label for the sidebar
 */
const Breakpoints: React.FC<BreakpointsProps> = ({ label }) => {
  const { localWizzardState, setLocalWizzardState } =
    useContext(WizzardContext);

  /**
   * Update breakpoints in wizard state
   */
  const setBreakpoints = (breakpoints: BreakpointEntry[]): void => {
    const _state = { ...localWizzardState };
    _state.breakpoints = breakpoints;
    setLocalWizzardState(_state);
  };

  /**
   * Set extend breakpoints flag
   */
  const setExtend = (extendBreakpoints: boolean): void => {
    const _state = { ...localWizzardState };
    _state.extendBreakpoints = extendBreakpoints;
    setLocalWizzardState(_state);
  };

  /**
   * Custom ID generator
   */
  const generateId = (): string =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  /**
   * Load preset breakpoints
   */
  const loadPreset = (preset: Omit<BreakpointEntry, 'id'>[]): void => {
    const updatedBreakpoints = preset.map((bp) => ({
      ...bp,
      id: generateId(),
    }));
    setBreakpoints(updatedBreakpoints);
  };

  /**
   * Add a new blank breakpoint
   */
  const addBreakpoint = (): void => {
    setBreakpoints([
      ...(localWizzardState?.breakpoints ?? []),
      { id: generateId(), name: "", value: "" },
    ]);
  };

  /**
   * Delete a breakpoint by index
   */
  const deleteBreakpoint = (index: number): void => {
    const newBreakpoints = (localWizzardState?.breakpoints ?? []).filter(
      (_: BreakpointEntry, i: number) => i !== index
    );
    setBreakpoints(newBreakpoints);
  };

  /**
   * Update breakpoint's name
   */
  const handleNameChange = (index: number, value: string): void => {
    const newBreakpoints = (localWizzardState?.breakpoints ?? []).map(
      (breakpoint: BreakpointEntry, i: number) => {
        if (i === index) {
          return { ...breakpoint, name: value };
        }
        return breakpoint;
      }
    );
    setBreakpoints(newBreakpoints);
  };

  /**
   * Update breakpoint's value
   */
  const handleValueChange = (index: number, value: string | number): void => {
    const newBreakpoints = (localWizzardState?.breakpoints ?? []).map(
      (breakpoint: BreakpointEntry, i: number) => {
        if (i === index) {
          return { ...breakpoint, value };
        }
        return breakpoint;
      }
    );
    setBreakpoints(newBreakpoints);
  };

  /**
   * Check if builder integration header should be shown
   */
  const showBuildersIntegrationHeader = (): boolean => {
    return (
      Object.keys(dynamicScreensFSE)?.length > 0 ||
      Object.keys(dynamicScreensBricks)?.length > 0 ||
      Object.keys(dynamicScreensOxygen)?.length > 0
    );
  };


  return (
    <>
      <Wrapper>
        <Sidebar label={label}>
          <div className="space-y-4">
            <ArrowButton
              variant="outline"
              className="w-full text-left"
              onClick={() => loadPreset(breakpointsPresets.preset1)}
            >
              Load Preset: mob, tab, desk
            </ArrowButton>
            <ArrowButton
              variant="outline"
              className="w-full text-left"
              onClick={() => loadPreset(breakpointsPresets.preset2)}
            >
              Load Preset: mobile, tablet, desktop
            </ArrowButton>
            <ArrowButton
              variant="outline"
              className="w-full text-left"
              onClick={() => loadPreset(breakpointsPresets.preset3)}
            >
              Load Preset: sm, md, lg, xl
            </ArrowButton>
          </div>

          {showBuildersIntegrationHeader() ? (
            <SidebarSeparator label="Builders integration" />
          ) : null}

          {Object.keys(dynamicScreensFSE)?.length ? (
            <Checkbox
              label="Include FSE Breakpoints"
              checked={localWizzardState?.extendScreensFSE}
              onCheckedChange={(checked) => {
                const _state = { ...localWizzardState };
                _state.extendScreensFSE = checked as boolean;
                setLocalWizzardState(_state);
              }}
            />
          ) : null}
          {Object.keys(dynamicScreensBricks)?.length ? (
            <Checkbox
              label="Include Bricks Breakpoints"
              checked={localWizzardState?.extendScreensBricks}
              onCheckedChange={(checked) => {
                const _state = { ...localWizzardState };
                _state.extendScreensBricks = checked as boolean;
                setLocalWizzardState(_state);
              }}
            />
          ) : null}
          {Object.keys(dynamicScreensOxygen)?.length ? (
            <Checkbox
              label="Include Oxygen Breakpoints"
              checked={localWizzardState?.extendScreensOxygen}
              onCheckedChange={(checked) => {
                const _state = { ...localWizzardState };
                _state.extendScreensOxygen = checked as boolean;
                setLocalWizzardState(_state);
              }}
            />
          ) : null}

          <SidebarSeparator label="Keep tailwind default breakpoints" />
          <Checkbox
            label="Extend"
            checked={localWizzardState?.extendBreakpoints ?? false}
            onCheckedChange={(checked) => setExtend(checked as boolean)}
          />
        </Sidebar>
        <Content>
          <ListWithButton
            items={localWizzardState?.breakpoints ?? []}
            onNameChange={handleNameChange}
            onValueChange={handleValueChange}
            onDelete={deleteBreakpoint}
            onAddNew={addBreakpoint}
            label1="Name"
            label2="Value"
            labelButton="Breakpoint"
          />

          {localWizzardState?.extendScreensFSE &&
          Object.keys(dynamicScreensFSE)?.length ? (
            <DynamicBreakpoints
              entries={dynamicScreensFSE}
              title="FSE Breakpoints"
            />
          ) : null}
          {localWizzardState?.extendScreensBricks &&
          Object.keys(dynamicScreensBricks)?.length ? (
            <DynamicBreakpoints
              entries={dynamicScreensBricks}
              title="Bricks Breakpoints"
            />
          ) : null}
          {localWizzardState?.extendScreensOxygen &&
          Object.keys(dynamicScreensOxygen)?.length ? (
            <DynamicBreakpoints
              entries={dynamicScreensOxygen}
              title="Oxygen Breakpoints"
            />
          ) : null}
        </Content>
      </Wrapper>
    </>
  );
};

export default Breakpoints;

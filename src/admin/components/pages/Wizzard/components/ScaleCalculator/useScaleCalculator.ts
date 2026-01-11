/**
 * useScaleCalculator Hook
 * Thin React wrapper around pure calculation functions
 * Manages state and wires up calculations to UI
 */

import { useState, useEffect, useCallback, useContext } from "react";
import { WizzardContext } from "@hooks/wizzardContext";
import {
  calculateAllClamps,
  parseSteps,
  initializeClampOverrides,
  updateClampOverride,
  clearClampOverrideField,
  appendUnit,
} from "./calculations";
import type { ClampOverride, ClampInfo, ScaleState, StateUpdate, ScaleStateValue } from "./types";

interface UseScaleCalculatorProps {
  state: ScaleState;
  updateState: (key: string, value: ScaleStateValue) => void;
  updateStates: (updates: StateUpdate[]) => void;
  clampOverrides: Record<string, ClampOverride>;
  setClampOverrides: (overrides: Record<string, ClampOverride> | ((prev: Record<string, ClampOverride>) => Record<string, ClampOverride>)) => void;
  clamps: Record<string, ClampInfo>;
  setClamps: (clamps: Record<string, ClampInfo> | ((prev: Record<string, ClampInfo>) => Record<string, ClampInfo>)) => void;
}

export function useScaleCalculator({
  state,
  updateState,
  updateStates,
  clampOverrides,
  setClampOverrides,
  clamps,
  setClamps,
}: UseScaleCalculatorProps) {
  const { localWizzardState, setLocalWizzardState } = useContext(WizzardContext);

  // Local state for raw steps input (before parsing)
  const [rawStepsInput, setRawStepsInput] = useState(state?.steps?.join(", ") || "");

  // Sync raw input when steps change externally
  useEffect(() => {
    setRawStepsInput(state?.steps?.join(", ") || "");
  }, [state?.steps]);

  // Recalculate clamps when relevant state changes
  useEffect(() => {
    if (state?.manualMode) return;

    const { clamps: newClamps, stepValues, minMaxValues } = calculateAllClamps(state, clampOverrides);

    setClamps(newClamps);
    updateStates([
      { key: "stepValues", value: stepValues },
      { key: "minMaxValues", value: minMaxValues },
    ]);
  }, [
    state?.manualMode,
    state?.minBaseSize,
    state?.minScreenSize,
    state?.minScaleRatio,
    state?.maxBaseSize,
    state?.maxScreenSize,
    state?.maxScaleRatio,
    state?.steps,
    state?.baseStep,
    state?.useRem,
    state?.remSize,
    state?.disableFluid,
    state?.decimalPlaces,
    clampOverrides,
    setClamps,
    updateStates,
  ]);

  // --- Event Handlers ---

  const handleStepsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRawStepsInput(e.target.value);
  }, []);

  const handleStepsBlur = useCallback(() => {
    const newSteps = parseSteps(rawStepsInput);
    updateState("steps", newSteps);

    // Initialize overrides for new steps
    setClampOverrides((prev) => initializeClampOverrides(newSteps, prev));
    setClamps((prev) => initializeClampOverrides(newSteps, prev) as Record<string, ClampInfo>);
  }, [rawStepsInput, updateState, setClampOverrides, setClamps]);

  const handleBaseStepChange = useCallback((value: string) => {
    updateState("baseStep", value);
  }, [updateState]);

  const handleRemSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateState("remSize", parseFloat(e.target.value));
  }, [updateState]);

  const handleMinBaseChange = useCallback((step: string, value: string) => {
    const newOverrides = updateClampOverride(clampOverrides, step, "minBase", value);
    setClampOverrides(newOverrides);
    updateState("overrides", newOverrides);
  }, [clampOverrides, setClampOverrides, updateState]);

  const handleMaxBaseChange = useCallback((step: string, value: string) => {
    const newOverrides = updateClampOverride(clampOverrides, step, "maxBase", value);
    setClampOverrides(newOverrides);
    updateState("overrides", newOverrides);
  }, [clampOverrides, setClampOverrides, updateState]);

  const handleClampEnabledChange = useCallback((step: string, enabled: boolean) => {
    const newOverrides = updateClampOverride(clampOverrides, step, "enabled", enabled);
    setClampOverrides(newOverrides);
    updateState("overrides", newOverrides);
  }, [clampOverrides, setClampOverrides, updateState]);

  const clearMinBase = useCallback((step: string) => {
    const newOverrides = clearClampOverrideField(clampOverrides, step, "minBase");
    setClampOverrides(newOverrides);
    updateState("overrides", newOverrides);
  }, [clampOverrides, setClampOverrides, updateState]);

  const clearMaxBase = useCallback((step: string) => {
    const newOverrides = clearClampOverrideField(clampOverrides, step, "maxBase");
    setClampOverrides(newOverrides);
    updateState("overrides", newOverrides);
  }, [clampOverrides, setClampOverrides, updateState]);

  const handleManualValueChange = useCallback((step: string, field: string, value: string) => {
    const newManualValues = {
      ...state?.manualValues,
      [step]: {
        ...state?.manualValues?.[step],
        enabled: state?.manualValues?.[step]?.enabled ?? true,
        [field]: value,
      },
    };
    updateState("manualValues", newManualValues);
  }, [state?.manualValues, updateState]);

  return {
    // Context
    localWizzardState,
    setLocalWizzardState,

    // Local state
    rawStepsInput,

    // Handlers
    handleStepsChange,
    handleStepsBlur,
    handleBaseStepChange,
    handleRemSizeChange,
    handleMinBaseChange,
    handleMaxBaseChange,
    handleClampEnabledChange,
    clearMinBase,
    clearMaxBase,
    handleManualValueChange,

    // Re-export utility for UI
    appendUnit,
  };
}

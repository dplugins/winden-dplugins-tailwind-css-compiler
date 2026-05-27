/**
 * useScaleCalculator Hook
 * Thin React wrapper around pure calculation functions
 * Manages state and wires up calculations to UI
 */

import { useEffect, useCallback, useContext } from "react";
import { WizzardContext } from "@hooks/wizzardContext";
import {
  calculateAllClamps,
  createEmptyClampOverride,
  createEmptyManualValue,
  generateUniqueStepName,
  updateClampOverride,
  clearClampOverrideField,
  renameStepInList,
  insertStepInList,
  moveStepToIndex,
  removeStepFromList,
  renameStepRecord,
  removeStepRecord,
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

  const syncStepCollections = useCallback(({
    steps,
    overrides,
    manualValues,
    baseStep,
  }: {
    steps: string[];
    overrides: Record<string, ClampOverride>;
    manualValues: NonNullable<ScaleState["manualValues"]>;
    baseStep: string;
  }) => {
    const nextUpdates: StateUpdate[] = [
      { key: "steps", value: steps },
      { key: "overrides", value: overrides },
      { key: "manualValues", value: manualValues },
      { key: "baseStep", value: baseStep },
    ];

    if (!state?.manualMode) {
      const nextState: ScaleState = {
        ...state,
        steps,
        overrides,
        manualValues,
        baseStep,
      };
      const {
        clamps: nextClamps,
        stepValues,
        minMaxValues,
      } = calculateAllClamps(nextState, overrides);

      setClampOverrides(overrides);
      setClamps(nextClamps);
      nextUpdates.push(
        { key: "stepValues", value: stepValues },
        { key: "minMaxValues", value: minMaxValues }
      );
    } else {
      setClampOverrides(overrides);
      setClamps({});
    }

    updateStates(nextUpdates);
  }, [state, setClampOverrides, setClamps, updateStates]);

  // --- Event Handlers ---

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

  const handleStepEnabledChange = useCallback((step: string, enabled: boolean) => {
    if (state?.manualMode) {
      const newManualValues = {
        ...state?.manualValues,
        [step]: {
          ...createEmptyManualValue(state?.manualValues?.[step]),
          enabled,
        },
      };
      updateState("manualValues", newManualValues);
      return;
    }

    const newOverrides = updateClampOverride(clampOverrides, step, "enabled", enabled);
    setClampOverrides(newOverrides);
    updateState("overrides", newOverrides);
  }, [clampOverrides, setClampOverrides, state?.manualMode, state?.manualValues, updateState]);

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

  const handleStepRename = useCallback((currentStep: string, nextStepName: string) => {
    const trimmedStepName = nextStepName.trim();
    const currentSteps = state?.steps || [];

    if (!trimmedStepName || trimmedStepName === currentStep) {
      return false;
    }

    if (currentSteps.includes(trimmedStepName)) {
      return false;
    }

    const nextSteps = renameStepInList(currentSteps, currentStep, trimmedStepName);
    const nextOverrides = renameStepRecord(clampOverrides, currentStep, trimmedStepName);
    const nextManualValues = renameStepRecord(state?.manualValues || {}, currentStep, trimmedStepName);
    const nextBaseStep = state?.baseStep === currentStep
      ? trimmedStepName
      : (state?.baseStep || trimmedStepName);

    syncStepCollections({
      steps: nextSteps,
      overrides: nextOverrides,
      manualValues: nextManualValues,
      baseStep: nextBaseStep,
    });

    return true;
  }, [clampOverrides, state?.baseStep, state?.manualValues, state?.steps, syncStepCollections]);

  const handleAddStep = useCallback((referenceStep?: string, position: "above" | "below" = "below") => {
    const currentSteps = state?.steps || [];
    const fallbackName = referenceStep ? generateUniqueStepName(currentSteps, referenceStep) : generateUniqueStepName(currentSteps);
    const referenceIndex = referenceStep ? currentSteps.indexOf(referenceStep) : currentSteps.length - 1;
    const insertIndex = referenceIndex < 0
      ? currentSteps.length
      : position === "above"
        ? referenceIndex
        : referenceIndex + 1;
    const nextSteps = insertStepInList(currentSteps, insertIndex, fallbackName);
    const nextOverrides = {
      ...clampOverrides,
      [fallbackName]: createEmptyClampOverride(),
    };
    const nextManualValues = {
      ...state?.manualValues,
      [fallbackName]: createEmptyManualValue(),
    };
    const nextBaseStep = state?.baseStep || fallbackName;

    syncStepCollections({
      steps: nextSteps,
      overrides: nextOverrides,
      manualValues: nextManualValues,
      baseStep: nextBaseStep,
    });
  }, [clampOverrides, state?.baseStep, state?.manualValues, state?.steps, syncStepCollections]);

  const handleDeleteStep = useCallback((targetStep: string) => {
    const currentSteps = state?.steps || [];
    const targetIndex = currentSteps.indexOf(targetStep);

    if (targetIndex < 0) {
      return;
    }

    const nextSteps = removeStepFromList(currentSteps, targetStep);
    const nextOverrides = removeStepRecord(clampOverrides, targetStep);
    const nextManualValues = removeStepRecord(state?.manualValues || {}, targetStep);

    let nextBaseStep = state?.baseStep || "";
    if (!nextSteps.length) {
      nextBaseStep = "";
    } else if (state?.baseStep === targetStep) {
      nextBaseStep = nextSteps[Math.max(0, targetIndex - 1)] || nextSteps[0];
    }

    syncStepCollections({
      steps: nextSteps,
      overrides: nextOverrides,
      manualValues: nextManualValues,
      baseStep: nextBaseStep,
    });
  }, [clampOverrides, state?.baseStep, state?.manualValues, state?.steps, syncStepCollections]);

  const handleStepReorder = useCallback((sourceStep: string, targetIndex: number) => {
    const currentSteps = state?.steps || [];
    const nextSteps = moveStepToIndex(currentSteps, sourceStep, targetIndex);

    if (nextSteps === currentSteps) {
      return;
    }

    syncStepCollections({
      steps: nextSteps,
      overrides: clampOverrides,
      manualValues: state?.manualValues || {},
      baseStep: state?.baseStep || "",
    });
  }, [clampOverrides, state?.baseStep, state?.manualValues, state?.steps, syncStepCollections]);

  return {
    // Context
    localWizzardState,
    setLocalWizzardState,

    // Handlers
    handleBaseStepChange,
    handleRemSizeChange,
    handleMinBaseChange,
    handleMaxBaseChange,
    handleStepEnabledChange,
    clearMinBase,
    clearMaxBase,
    handleManualValueChange,
    handleStepRename,
    handleAddStep,
    handleDeleteStep,
    handleStepReorder,

    // Re-export utility for UI
    appendUnit,
  };
}

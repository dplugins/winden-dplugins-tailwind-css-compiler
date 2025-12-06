import { useState, useEffect } from 'react';
import { calculateClampsForFeature, type ClampsState, type FeatureConfig } from '@/utils/clampCalculations';
import type { WizzardState } from '@/types/wizzard';

/**
 * Feature type for clamp calculations
 */
export type ClampFeature = 'fontSize' | 'spacing' | 'borderRadius';

/**
 * Return type for useClampCalculator hook
 */
export interface UseClampCalculatorReturn {
  clamps: ClampsState;
  setClamps: React.Dispatch<React.SetStateAction<ClampsState>>;
  clampOverrides: ClampsState;
  setClampOverrides: React.Dispatch<React.SetStateAction<ClampsState>>;
}

/**
 * Custom hook for calculating fluid clamp values
 *
 * Consolidates fontSize, spacing, and borderRadius clamp calculations
 * into a single reusable hook.
 *
 * @param feature - The feature type: 'fontSize', 'spacing', or 'borderRadius'
 * @param wizzardState - Current Wizzard state
 * @returns Object containing clamps, setClamps, clampOverrides, and setClampOverrides
 *
 * @example
 * ```typescript
 * const fontSize = useClampCalculator('fontSize', localWizzardState);
 * const spacing = useClampCalculator('spacing', localWizzardState);
 * const borderRadius = useClampCalculator('borderRadius', localWizzardState);
 *
 * // Use in component
 * <ScaleCalculator
 *   clamps={fontSize.clamps}
 *   setClamps={fontSize.setClamps}
 * />
 * ```
 */
export const useClampCalculator = (
  feature: ClampFeature,
  wizzardState: WizzardState | null
): UseClampCalculatorReturn => {
  // Initialize empty state
  const [clamps, setClamps] = useState<ClampsState>({});
  const [clampOverrides, setClampOverrides] = useState<ClampsState>({});

  // Calculate clamps when wizard state changes
  useEffect(() => {
    if (!wizzardState) {
      return;
    }

    const featureState = wizzardState[feature];
    if (!featureState) {
      return;
    }

    // Check for saved overrides and merge with calculated defaults
    let initialOverrides: ClampsState = {};

    if (featureState.overrides && Object.keys(featureState.overrides).length > 0) {
      // Use saved overrides as base
      initialOverrides = { ...featureState.overrides };
    }

    // If no overrides and no steps, nothing to calculate
    if (!featureState.steps || featureState.steps.length === 0) {
      return;
    }

    // Build feature config for calculation
    const config: FeatureConfig = {
      steps: featureState.steps,
      baseStep: featureState.baseStep || 'base',
      minBaseSize: featureState.minBaseSize,
      maxBaseSize: featureState.maxBaseSize,
      minScaleRatio: featureState.minScaleRatio,
      maxScaleRatio: featureState.maxScaleRatio,
      minScreenSize: featureState.minScreenSize,
      maxScreenSize: featureState.maxScreenSize,
      useRem: featureState.useRem,
      remSize: featureState.remSize,
      decimalPlaces: featureState.decimalPlaces,
      disableFluid: featureState.disableFluid,
    };

    // Calculate defaults using scale ratios
    const calculatedClamps = calculateClampsForFeature(config);

    // Merge saved overrides with calculated defaults
    // This ensures we have all the proper structure while preserving saved values
    const mergedClamps: ClampsState = {};
    featureState.steps.forEach(step => {
      // Only use saved override values if they are not empty strings
      // This prevents marking calculated values as "custom"
      const hasMinOverride = initialOverrides[step]?.minBase && initialOverrides[step].minBase !== "";
      const hasMaxOverride = initialOverrides[step]?.maxBase && initialOverrides[step].maxBase !== "";

      mergedClamps[step] = {
        enabled: initialOverrides[step]?.enabled ?? calculatedClamps[step]?.enabled ?? true,
        // ✅ ALWAYS use calculated values - they reflect current disableFluid setting
        value: calculatedClamps[step]?.value || initialOverrides[step]?.value || "",
        fluidClamp: calculatedClamps[step]?.fluidClamp || initialOverrides[step]?.fluidClamp || "",
        minBase: hasMinOverride ? initialOverrides[step].minBase : "",
        maxBase: hasMaxOverride ? initialOverrides[step].maxBase : "",
      };
    });

    setClampOverrides(mergedClamps);
    setClamps(mergedClamps);
  }, [
    feature,
    wizzardState?.[feature]?.steps,
    wizzardState?.[feature]?.overrides,
    wizzardState?.[feature]?.minBaseSize,
    wizzardState?.[feature]?.maxBaseSize,
    wizzardState?.[feature]?.minScaleRatio,
    wizzardState?.[feature]?.maxScaleRatio,
    wizzardState?.[feature]?.minScreenSize,
    wizzardState?.[feature]?.maxScreenSize,
    wizzardState?.[feature]?.useRem,
    wizzardState?.[feature]?.remSize,
    wizzardState?.[feature]?.decimalPlaces,
    wizzardState?.[feature]?.baseStep,
    wizzardState?.[feature]?.disableFluid,
  ]);

  return {
    clamps,
    setClamps,
    clampOverrides,
    setClampOverrides,
  };
};

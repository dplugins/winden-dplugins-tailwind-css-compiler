// Import Static color values
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

import React, { useEffect, useState, useContext } from "react";
import {
  Wrapper,
  Sidebar,
  Content,
  SidebarSeparator,
} from "../../components/layout/Layout";
import { Input } from "@el/Input";
import InputWithResetButton from "@el/InputWithResetButton";
import { Checkbox } from "@el/Checkbox";
import { Switch } from "@el/Switch";
import RadioButton from "@el/RadioButton";
import SegmentedControl from "@el/SegmentedControl";
import ScaleValuesGroup from "./ScaleValuesGroup";

import { ScaleBuilders } from "./ScaleBuilders";
import { WizzardContext } from "@hooks/wizzardContext"; // Ensure this import is present

interface ClampOverride {
  enabled: boolean;
  value: string;
  fluidClamp: string;
  minBase: string;
  maxBase: string;
}

interface ClampInfo extends ClampOverride {
  hasCustomMin?: boolean;
  hasCustomMax?: boolean;
}

interface MinMaxValue {
  min: string | null;
  max: string | null;
}

interface ScaleState {
  steps?: string[];
  overrides?: Record<string, ClampOverride>;
  disableFluid?: boolean;
  useRem?: boolean;
  remSize?: number;
  minBaseSize?: number;
  minScaleRatio?: number;
  minScreenSize?: number;
  maxBaseSize?: number;
  maxScaleRatio?: number;
  maxScreenSize?: number;
  baseStep?: string;
  decimalPlaces?: number;
  extend?: boolean;
}

interface StateUpdate {
  key: string;
  value: any;
}

interface ScaleCalculatorProps {
  label: string;
  font?: boolean;
  spacing?: boolean;
  borderRadius?: boolean;
  state: ScaleState;
  updateState: (key: string, value: any) => void;
  updateStates: (updates: StateUpdate[]) => void;
  clampOverrides: Record<string, ClampOverride>;
  setClampOverrides: (overrides: Record<string, ClampOverride> | ((prev: Record<string, ClampOverride>) => Record<string, ClampOverride>)) => void;
  clamps: Record<string, ClampInfo>;
  setClamps: (clamps: Record<string, ClampInfo> | ((prev: Record<string, ClampInfo>) => Record<string, ClampInfo>)) => void;
}

/**
 * Scale calculator component for fluid typography and spacing
 * @param label - Label for the scale type
 * @param font - Whether this is a font scale
 * @param spacing - Whether this is a spacing scale
 * @param borderRadius - Whether this is a border radius scale
 * @param state - Current scale state
 * @param updateState - Callback to update a single state value
 * @param updateStates - Callback to update multiple state values
 * @param clampOverrides - Clamp override values
 * @param setClampOverrides - Callback to set clamp overrides
 * @param clamps - Calculated clamp values
 * @param setClamps - Callback to set calculated clamps
 */
const ScaleCalculator: React.FC<ScaleCalculatorProps> = ({
  label,
  font,
  spacing,
  borderRadius,
  state,
  updateState,
  updateStates,
  clampOverrides,
  setClampOverrides,
  clamps,
  setClamps,
}) => {
  const { localWizzardState, setLocalWizzardState } =
    useContext(WizzardContext); // Access the context here

  // Local state to handle raw steps input
  const [rawStepsInput, setRawStepsInput] = useState(
    state?.steps?.join(", ") || ""
  );

  // Initialize raw steps input when steps change
  useEffect(() => {
    setRawStepsInput(state?.steps?.join(", ") || "");
  }, [state?.steps]);

  /**
   * Calculate base size for a step
   * @param baseSize - Base size value
   * @param ratio - Scale ratio
   * @param stepIndex - Index of the step
   * @param baseIndex - Index of the base step
   * @returns Calculated pixel value
   */
  const calculateBaseSize = (
    baseSize: number,
    ratio: number,
    stepIndex: number,
    baseIndex: number
  ): number => {
    const stepDifference = stepIndex - baseIndex;
    const pixelValue = baseSize * Math.pow(ratio, stepDifference);
    return pixelValue;
  };

  /**
   * Handle steps input change
   */
  const handleStepsChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const input = e.target.value;
    setRawStepsInput(input);
  };

  /**
   * Handle steps input blur (finalize changes)
   */
  const handleStepsBlur = (): void => {
    let trimmedInput = rawStepsInput.replace(/,\s*$/, "");
    const newSteps = trimmedInput.split(",").map((step) => step.trim());

    updateState("steps", newSteps);

    // Update clampOverrides to include new steps
    setClampOverrides((prevOverrides) => {
      const updatedOverrides: Record<string, ClampOverride> = {};
      newSteps.forEach((step) => {
        updatedOverrides[step] = {
          enabled: prevOverrides?.[step]?.enabled ?? true,
          value: prevOverrides?.[step]?.value || "",
          fluidClamp: prevOverrides?.[step]?.fluidClamp || "",
          minBase: prevOverrides?.[step]?.minBase || "",
          maxBase: prevOverrides?.[step]?.maxBase || "",
        };
      });
      return updatedOverrides;
    });

    // Update clamps to include new steps
    setClamps((prevClamps) => {
      const updatedClamps: Record<string, ClampInfo> = {};
      newSteps.forEach((step) => {
        updatedClamps[step] = {
          enabled: prevClamps?.[step]?.enabled ?? true,
          value: prevClamps?.[step]?.value || "",
          fluidClamp: prevClamps?.[step]?.fluidClamp || "",
          minBase: prevClamps?.[step]?.minBase || "",
          maxBase: prevClamps?.[step]?.maxBase || "",
        };
      });
      return updatedClamps;
    });
  };

  /**
   * Handle base step change
   */
  const handleBaseStepChange = (value: string): void => {
    updateState("baseStep", value);
  };

  /**
   * Handle REM size change
   */
  const handleRemSizeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    updateState("remSize", parseFloat(e.target.value));
  };

  /**
   * Handle clamp override value change
   */
  const handleClampOverrideChange = (step: string, value: string): void => {
    const newOverrides = {
      ...clampOverrides,
      [step]: { ...clampOverrides?.[step], value },
    };
    setClampOverrides(newOverrides);

    // Save overrides to state
    updateState("overrides", newOverrides);
  };

  /**
   * Handle minimum base value change
   */
  const handleMinBaseChange = (step: string, value: string): void => {
    const newOverrides = {
      ...clampOverrides,
      [step]: { ...clampOverrides?.[step], minBase: value },
    };
    setClampOverrides(newOverrides);
    updateState("overrides", newOverrides);
  };

  /**
   * Handle maximum base value change
   */
  const handleMaxBaseChange = (step: string, value: string): void => {
    const newOverrides = {
      ...clampOverrides,
      [step]: { ...clampOverrides?.[step], maxBase: value },
    };
    setClampOverrides(newOverrides);
    updateState("overrides", newOverrides);
  };

  /**
   * Handle clamp enabled/disabled toggle
   */
  const handleClampEnabledChange = (step: string, enabled: boolean): void => {
    const newOverrides = {
      ...clampOverrides,
      [step]: { ...clampOverrides?.[step], enabled },
    };
    setClampOverrides(newOverrides);

    // Save the enabled state to the parent state
    updateState("overrides", newOverrides);
  };

  /**
   * Clear override for a step
   */
  const clearOverride = (step: string): void => {
    const newOverrides = {
      ...clampOverrides,
      [step]: { ...clampOverrides?.[step], value: "" },
    };
    setClampOverrides(newOverrides);

    // Save cleared override to state
    updateState("overrides", newOverrides);
  };

  /**
   * Handle manual value change in manual mode
   */
  const handleManualValueChange = (step: string, field: string, value: string): void => {
    const newManualValues = {
      ...state?.manualValues,
      [step]: {
        ...state?.manualValues?.[step],
        enabled: state?.manualValues?.[step]?.enabled ?? true,
        [field]: value,
      },
    };
    updateState("manualValues", newManualValues);
  };

  /**
   * Round number to specified decimal places
   */
  const roundNumber = (number: number): string => {
    const factor = Math.pow(10, state?.decimalPlaces ?? 2);
    const rounded = Math.round(number * factor) / factor;
    return Number.isInteger(rounded)
      ? rounded.toFixed(0)
      : rounded.toFixed(state?.decimalPlaces ?? 2);
  };

  /**
   * Calculate fluid clamp CSS function
   * @param minSize - Minimum size in pixels
   * @param maxSize - Maximum size in pixels
   * @param minScreen - Minimum screen size
   * @param maxScreen - Maximum screen size
   * @returns CSS clamp function string
   */
  const calculateFluidClamp = (
    minSize: number,
    maxSize: number,
    minScreen: number,
    maxScreen: number
  ): string => {
    // Calculate slope and intercept using pixel values first
    const slope = (maxSize - minSize) / (maxScreen - minScreen);
    const intercept = minSize - slope * minScreen;

    // Convert to vi units (multiply by 100)
    const slopeVi = slope * 100;

    if (state?.useRem) {
      // Convert pixel values to REM
      const minSizeRem = minSize / (state?.remSize || 16);
      const maxSizeRem = maxSize / (state?.remSize || 16);
      const interceptRem = intercept / (state?.remSize || 16);

      return `clamp(${roundNumber(minSizeRem)}rem, ${roundNumber(
        slopeVi
      )}vi + ${roundNumber(interceptRem)}rem, ${roundNumber(maxSizeRem)}rem)`;
    } else {
      return `clamp(${roundNumber(minSize)}px, ${roundNumber(
        slopeVi
      )}vi + ${roundNumber(intercept)}px, ${roundNumber(maxSize)}px)`;
    }
  };

  const baseIndex = state?.steps?.indexOf(state?.baseStep || "") || 0;

  useEffect(() => {
    // Skip auto-calculation in manual mode - user provides all values manually
    if (state?.manualMode) {
      return;
    }

    const _clamps: Record<string, ClampInfo> = {};
    state?.steps?.forEach((step, index) => {
      // Calculate the default values first
      const calculatedMinBase = roundNumber(
        calculateBaseSize(
          state?.minBaseSize || 16,
          state?.minScaleRatio || 1,
          index,
          baseIndex
        )
      );

      // Check if the stored override is actually different from calculated
      // This determines if user has customized the value
      const hasCustomMin = clampOverrides?.[step]?.minBase &&
                          clampOverrides[step].minBase !== "" &&
                          clampOverrides[step].minBase !== calculatedMinBase;

      const minBase = hasCustomMin ? clampOverrides[step].minBase : calculatedMinBase;

      let maxBase: string | null = null;
      let defaultClamp: string | null = null;
      let fluidClamp: string | null = null;
      let hasCustomMax = false;

      if (!state?.disableFluid) {
        const calculatedMaxBase = roundNumber(
          calculateBaseSize(
            state?.maxBaseSize || 16,
            state?.maxScaleRatio || 1,
            index,
            baseIndex
          )
        );

        // Check if the stored override is actually different from calculated
        hasCustomMax = clampOverrides?.[step]?.maxBase &&
                      clampOverrides[step].maxBase !== "" &&
                      clampOverrides[step].maxBase !== calculatedMaxBase;

        maxBase = hasCustomMax ? clampOverrides[step].maxBase : calculatedMaxBase;

        // Generate clamp from min/max values
        defaultClamp = calculateFluidClamp(
          parseFloat(minBase),
          parseFloat(maxBase),
          state?.minScreenSize || 320,
          state?.maxScreenSize || 1920
        );

        // If min/max have been customized, always use the recalculated clamp
        // Otherwise, use custom value override if provided
        if (hasCustomMin || hasCustomMax) {
          fluidClamp = defaultClamp;  // Always use recalculated value when min/max are customized
        } else {
          fluidClamp = clampOverrides?.[step]?.value || defaultClamp;
        }
      } else {
        defaultClamp = `${minBase}${state?.useRem ? `rem` : `px`}`;
        fluidClamp = defaultClamp;
      }

      _clamps[step] = {
        enabled: clampOverrides?.[step]?.enabled ?? true,
        value: (hasCustomMin || hasCustomMax) ? defaultClamp : (clampOverrides?.[step]?.value || defaultClamp || ""),
        fluidClamp: fluidClamp || "",
        minBase: minBase,
        maxBase: maxBase || "",
        hasCustomMin: hasCustomMin,
        hasCustomMax: hasCustomMax,
      };
    });

    const stepValues = Object.keys(_clamps).map((key) => _clamps[key]?.fluidClamp);
    const minMaxValues: MinMaxValue[] = Object.keys(_clamps).map((key) => ({
      min: _clamps[key]?.minBase
        ? `${_clamps[key]?.minBase}px`
        : null,
      max: _clamps[key]?.maxBase
        ? `${_clamps[key]?.maxBase}px`
        : null,
    }));

    setClamps(_clamps);
    updateStates([
      {
        key: "stepValues",
        value: stepValues,
      },
      {
        key: "minMaxValues",
        value: minMaxValues,
      },
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
    clampOverrides,
  ]);

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
    <>
      <Wrapper>
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

          {showBuildersIntegrationHeader() ? (
            <SidebarSeparator label="Builders integration" />
          ) : null}

          {font && (
            <>
              {Object.keys(dynamicFontSizeFSE)?.length ? (
                <Checkbox
                  label="Include FSE Sizes"
                  checked={localWizzardState?.extendFontSizesFSE ?? false}
                  onCheckedChange={(checked) => {
                    const _state = { ...localWizzardState };
                    _state.extendFontSizesFSE = checked;
                    setLocalWizzardState(_state);
                  }}
                />
              ) : null}
              {Object.keys(dynamicFontSizeBricks)?.length ? (
                <Checkbox
                  label="Include Bricks Sizes"
                  checked={localWizzardState?.extendFontSizesBricks ?? false}
                  onCheckedChange={(checked) => {
                    const _state = { ...localWizzardState };
                    _state.extendFontSizesBricks = checked;
                    setLocalWizzardState(_state);
                  }}
                />
              ) : null}
              {Object.keys(dynamicFontSizeOxygen)?.length ? (
                <Checkbox
                  label="Include Oxygen Sizes"
                  checked={localWizzardState?.extendFontSizesOxygen ?? false}
                  onCheckedChange={(checked) => {
                    const _state = { ...localWizzardState };
                    _state.extendFontSizesOxygen = checked;
                    setLocalWizzardState(_state);
                  }}
                />
              ) : null}
            </>
          )}
          {spacing && (
            <>
              {Object.keys(dynamicSpacingFSE)?.length ? (
                <Checkbox
                  label="Include FSE Spacing"
                  checked={localWizzardState?.extendSpacingFSE ?? false}
                  onCheckedChange={(checked) => {
                    const _state = { ...localWizzardState };
                    _state.extendSpacingFSE = checked;
                    setLocalWizzardState(_state);
                  }}
                />
              ) : null}
              {Object.keys(dynamicSpacingBricks)?.length ? (
                <Checkbox
                  label="Include Bricks Spacing"
                  checked={localWizzardState?.extendSpacingBricks ?? false}
                  onCheckedChange={(checked) => {
                    const _state = { ...localWizzardState };
                    _state.extendSpacingBricks = checked;
                    setLocalWizzardState(_state);
                  }}
                />
              ) : null}
              {Object.keys(dynamicSpacingOxygen)?.length ? (
                <Checkbox
                  label="Include Oxygen Spacing"
                  checked={localWizzardState?.extendSpacingOxygen ?? false}
                  onCheckedChange={(checked) => {
                    const _state = { ...localWizzardState };
                    _state.extendSpacingOxygen = checked;
                    setLocalWizzardState(_state);
                  }}
                />
              ) : null}
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
                  const _state = { ...localWizzardState };
                  _state.includeUtilitySizes = checked;
                  setLocalWizzardState(_state);
                }}
                label="Include Utility Sizes"
              />
              {localWizzardState?.includeUtilitySizes && (
                <div className="mt-2 text-xs text-foreground/60">
                  {spacing && (
                    <div className="space-y-0.5 border border-solid border-border rounded-sm ml-[1.5rem]">
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">0 → 0</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">px → 1px</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">auto → auto</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">full → 100%</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">screen → 100vh</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">svw → 100svw</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">lvw → 100lvw</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">dvw → 100dvw</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">min → min-content</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">max → max-content</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">fit → fit-content</div>
                    </div>
                  )}
                  {borderRadius && (
                    <div className="space-y-0.5 border border-solid border-border rounded-sm ml-[1.5rem]">
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">full → calc(infinity * 1px)</div>
                      <div className=" border-b border-b-solid border-border p-1 px-2  ">none → 0</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Sidebar>
        <Content>
          {/* Show calculation inputs in wizard mode, or screen sizes in manual+fluid mode */}
          {!state?.manualMode ? (
            <>
              {!state?.disableFluid ? (
                <div className="flex gap-12">

                  <ScaleValuesGroup
                    title={font ? "Font Size" : spacing ? "Space Size" : "Base Size"}
                    minValue={state?.minBaseSize}
                    maxValue={state?.maxBaseSize}
                    onChangeMin={(value) => updateState("minBaseSize", value)}
                    onChangeMax={(value) => updateState("maxBaseSize", value)}
                  />
                  <ScaleValuesGroup
                    title="Aspect Ratio"
                    type="select"
                    minValue={state?.minScaleRatio}
                    maxValue={state?.maxScaleRatio}
                    onChangeMin={(value) => updateState("minScaleRatio", value)}
                    onChangeMax={(value) => updateState("maxScaleRatio", value)}
                  />
                  <ScaleValuesGroup
                    title="Screen Sizes"
                    minValue={state?.minScreenSize}
                    maxValue={state?.maxScreenSize}
                    onChangeMin={(value) => updateState("minScreenSize", value)}
                    onChangeMax={(value) => updateState("maxScreenSize", value)}
                  />
                </div>
              ) : (
              <div className="flex gap-12">
                  <ScaleValuesGroup
                    title={font ? "Font Size" : spacing ? "Space Size" : "Base Size"}
                    minValue={state?.minBaseSize}
                    onChangeMin={(value) => updateState("minBaseSize", value)}
                    hideMax
                  />
                  <ScaleValuesGroup
                    title="Aspect Ratio"
                    type="select"
                    minValue={state?.minScaleRatio}
                    onChangeMin={(value) => updateState("minScaleRatio", value)}
                    hideMax
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* Manual mode: show screen sizes only if fluid is enabled */}
              {!state?.disableFluid && (
                <div className="flex gap-12">
                  <ScaleValuesGroup
                    title="Screen Sizes"
                    minValue={state?.minScreenSize}
                    maxValue={state?.maxScreenSize}
                    onChangeMin={(value) => updateState("minScreenSize", value)}
                    onChangeMax={(value) => updateState("maxScreenSize", value)}
                  />
                </div>
              )}
            </>
          )}

          <div className="mb-12 flex w-full flex-col gap-6">
            <h2 className="text-2xl font-bold">Steps</h2>
            <Input
              label="Steps (comma separated):"
              type="text"
              value={rawStepsInput}
              onChange={handleStepsChange}
              onBlur={handleStepsBlur}
            />
          </div>

          <div className="col-span-2 flex flex-col pt-4">
            <h2 className="mb-4 text-2xl font-bold">Calculated Sizes</h2>

            <div className="flex w-full flex-col gap-4">
              {state?.steps?.map((step, stepIndex) => {
                const isStepEnabled = clampOverrides?.[step]?.enabled ?? true;
                const appendUnit = (value: string | number | undefined | null): string | null => {
                  if (value === undefined || value === null || value === "") {
                    return null;
                  }
                  if (typeof value === "string" && /[a-zA-Z%]/.test(value)) {
                    return value;
                  }
                  // Always use px for display values (preview uses the actual calculated values)
                  return `${value}px`;
                };

                const minFontSizeValue = state?.manualMode
                  ? appendUnit(state?.manualValues?.[step]?.minValue || state?.manualValues?.[step]?.value)
                  : appendUnit(clamps[step]?.minBase);
                const maxFontSizeValue = state?.manualMode
                  ? appendUnit(state?.manualValues?.[step]?.maxValue)
                  : appendUnit(clamps[step]?.maxBase);
                const isLastStep =
                  stepIndex === (state?.steps?.length ?? 0) - 1;

                return (
                  <div
                    key={step}
                    className={`flex items-center gap-4 border-b border-border border-opacity-30 pb-4 overflow-hidden min-h-[100px] ${
                      isLastStep ? "border-b-0 pb-0" : ""
                    }`}
                  >
                    {!state?.manualMode && (
                      <RadioButton
                        name="baseStep"
                        checked={state?.baseStep === step}
                        onChange={() => handleBaseStepChange(step)}
                        label=""
                      />
                    )}
                    <div className="rounded-md border border-border bg-base-2 p-1 !max-w-[350px] !min-w-[350px] !w-[350px] flex items-center gap-1">

                        <div
                          className={`flex w-full gap-1 ${
                            isStepEnabled ? "" : "opacity-50"
                          }`}
                        >
                          <div className="relative flex w-full flex-col gap-1">
                            <label className="absolute -top-6 text-xs font-medium text-foreground/50">
                              {state?.disableFluid ? step.toUpperCase() : `MIN: ${step.toUpperCase()}`}
                            </label>
                            {state?.manualMode ? (
                              <Input
                                type="number"
                                value={state?.disableFluid ? (state?.manualValues?.[step]?.value || "") : (state?.manualValues?.[step]?.minValue || "")}
                                onChange={(e) => handleManualValueChange(step, state?.disableFluid ? 'value' : 'minValue', e.target.value)}
                                disabled={!isStepEnabled}
                                placeholder="Enter min value"
                                className="w-full"
                              />
                            ) : (
                              <InputWithResetButton
                                value={clamps[step]?.minBase || ""}
                                disabled={!isStepEnabled}
                                onChange={(e) =>
                                  handleMinBaseChange(step, e.target.value)
                                }
                                onReset={() => {
                                  const newOverrides = {
                                    ...clampOverrides,
                                    [step]: {
                                      ...clampOverrides?.[step],
                                      minBase: "",
                                    },
                                  };
                                  setClampOverrides(newOverrides);
                                  updateState("overrides", newOverrides);
                                }}
                                showReset={!!clamps[step]?.hasCustomMin}
                                className="w-full"
                                placeholder={`${clamps[step]?.minBase}px`}
                              />
                            )}
                          </div>
                          {!state?.disableFluid && (
                            <div className="relative flex w-full flex-col gap-1">
                              <label className="absolute -top-6 text-xs font-medium text-foreground/50">
                                MAX: {step.toUpperCase()}
                              </label>
                              {state?.manualMode ? (
                                <Input
                                  type="number"
                                  value={state?.manualValues?.[step]?.maxValue || ""}
                                  onChange={(e) => handleManualValueChange(step, 'maxValue', e.target.value)}
                                  disabled={!isStepEnabled}
                                  placeholder="Enter max value"
                                  className="w-full"
                                />
                              ) : (
                                <InputWithResetButton
                                  value={clamps[step]?.maxBase || ""}
                                  disabled={!isStepEnabled}
                                  onChange={(e) =>
                                    handleMaxBaseChange(step, e.target.value)
                                  }
                                  onReset={() => {
                                    const newOverrides = {
                                      ...clampOverrides,
                                      [step]: {
                                        ...clampOverrides?.[step],
                                        maxBase: "",
                                      },
                                    };
                                    setClampOverrides(newOverrides);
                                    updateState("overrides", newOverrides);
                                  }}
                                  showReset={!!clamps[step]?.hasCustomMax}
                                  className="w-full"
                                  placeholder={`${clamps[step]?.maxBase}px`}
                                />
                              )}
                            </div>
                          )}
                        </div>
                        {!state?.manualMode && (
                          <Switch
                            checked={clampOverrides?.[step]?.enabled ?? true}
                            className="ml-4"
                            onCheckedChange={(checked) =>
                              handleClampEnabledChange(step, checked)
                            }
                            aria-label={`Enable ${step} clamp`}
                          />
                        )}

                    </div>

                    {font && (
                      <div className="relative min-w-0 flex-1 overflow-hidden">
                        {!state?.disableFluid && maxFontSizeValue ? (
                          <>
                            <div
                              className="flex items-baseline opacity-10"
                              style={{
                                minHeight: `calc(${maxFontSizeValue} + 0.5rem)`
                              }}
                            >
                              <p
                                className="!m-0 text-contrast"
                                style={{
                                  fontSize: maxFontSizeValue,
                                  lineHeight: 1,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                MAX: The quick brown fox jumps over the lazy dog.
                              </p>
                            </div>
                            <div
                              className="absolute top-0 flex items-baseline"
                              style={{
                                minHeight: `calc(${maxFontSizeValue} + 1rem)`
                              }}
                            >
                              <p
                                className="!m-0 text-contrast"
                                style={{
                                  fontSize: maxFontSizeValue,
                                  lineHeight: 1,
                                  textIndent: '-99999px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                M
                              </p>
                              <p
                                className="!m-0 text-contrast"
                                style={{
                                  fontSize: minFontSizeValue,
                                  lineHeight: 1,
                                  whiteSpace: 'nowrap',
                                  paddingLeft: `calc(${maxFontSizeValue} / 20)`
                                }}
                              >
                                MIN: The quick brown fox jumps over the lazy dog.
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-baseline">
                            <p
                              className="!m-0 text-element"
                              style={{
                                fontSize: minFontSizeValue,
                                lineHeight: 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              The quick brown fox jumps over the lazy dog.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {spacing && (
                      <>
                        <span className="text-base-foreground text-xs font-medium">{step}</span>
                        <div className="relative flex items-end">
                          {!state?.disableFluid && (
                            <div
                              className="aspect-square bg-element opacity-50"
                              style={{
                                width: maxFontSizeValue,
                              }}
                            ></div>
                          )}
                          <div
                            className="aspect-square bg-element opacity-50"
                            style={{
                              width: minFontSizeValue,
                              position: !state?.disableFluid ? 'absolute' : 'relative',
                              bottom: 0,
                              left: 0,
                            }}
                          ></div>
                        </div>
                      </>
                    )}

                    {borderRadius && (
                      <>
                        <span className="text-base-foreground text-xs font-medium">{step}</span>
                        <div className="relative flex items-end">
                          {!state?.disableFluid && (
                            <div
                              className="aspect-square bg-element opacity-50"
                              style={{
                                width: maxFontSizeValue,
                                borderTopRightRadius: maxFontSizeValue,
                              }}
                            ></div>
                          )}
                          <div
                            className="aspect-square bg-element opacity-50"
                            style={{
                              width: minFontSizeValue,
                              borderTopRightRadius: minFontSizeValue,
                              position: !state?.disableFluid ? 'absolute' : 'relative',
                              bottom: 0,
                              left: 0,
                            }}
                          ></div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {font && (
            <>
              {localWizzardState?.extendFontSizesFSE &&
                Object.keys(dynamicFontSizeFSE)?.length ? (
                <ScaleBuilders
                  title="FSE Preview"
                  entries={dynamicFontSizeFSE}
                  spacing={spacing}
                  font={font}
                />
              ) : null}

              {localWizzardState?.extendFontSizesBricks &&
                Object.keys(dynamicFontSizeBricks)?.length ? (
                <ScaleBuilders
                  title="Bricks Preview"
                  entries={dynamicFontSizeBricks}
                  spacing={spacing}
                  font={font}
                />
              ) : null}

              {localWizzardState?.extendFontSizesOxygen &&
                Object.keys(dynamicFontSizeOxygen)?.length ? (
                <ScaleBuilders
                  title="Oxygen Preview"
                  entries={dynamicFontSizeOxygen}
                  spacing={spacing}
                  font={font}
                />
              ) : null}
            </>
          )}
          {spacing && (
            <>
              {localWizzardState?.extendSpacingFSE &&
                Object.keys(dynamicSpacingFSE)?.length ? (
                <ScaleBuilders
                  title="FSE Preview"
                  entries={dynamicSpacingFSE}
                  spacing={spacing}
                  font={font}
                />
              ) : null}

              {localWizzardState?.extendSpacingBricks &&
                Object.keys(dynamicSpacingBricks)?.length ? (
                <ScaleBuilders
                  title="Bricks Preview"
                  entries={dynamicSpacingBricks}
                  spacing={spacing}
                  font={font}
                />
              ) : null}

              {localWizzardState?.extendSpacingOxygen &&
                Object.keys(dynamicSpacingOxygen)?.length ? (
                <ScaleBuilders
                  title="Oxygen Preview"
                  entries={dynamicSpacingOxygen}
                  spacing={spacing}
                  font={font}
                />
              ) : null}
            </>
          )}
        </Content>
      </Wrapper>
    </>
  );
};

export default ScaleCalculator;

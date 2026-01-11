/**
 * Scale Calculator Component
 * Refactored to use extracted hooks and sub-components
 */

import React from "react";
import { Wrapper, Content } from "../../components/layout/Layout";
import { Input } from "@el/Input";
import ScaleValuesGroup from "./ScaleValuesGroup";
import { ScaleBuilders } from "./ScaleBuilders";
import { ScaleCalculatorSidebar } from "./ScaleCalculatorSidebar";
import { ScaleStepRow } from "./ScaleStepRow";
import { useScaleCalculator } from "./useScaleCalculator";

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

import type { ScaleCalculatorProps } from "./types";

/**
 * Scale calculator component for fluid typography and spacing
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
  const {
    localWizzardState,
    setLocalWizzardState,
    rawStepsInput,
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
    appendUnit,
  } = useScaleCalculator({
    state,
    updateState,
    updateStates,
    clampOverrides,
    setClampOverrides,
    clamps,
    setClamps,
  });

  return (
    <Wrapper>
      <ScaleCalculatorSidebar
        label={label}
        font={font}
        spacing={spacing}
        borderRadius={borderRadius}
        state={state}
        updateState={updateState}
        localWizzardState={localWizzardState}
        setLocalWizzardState={setLocalWizzardState}
        handleRemSizeChange={handleRemSizeChange}
      />
      <Content>
        {/* Wizard mode: Show calculation inputs */}
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

        {/* Steps Input */}
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

        {/* Calculated Sizes */}
        <div className="col-span-2 flex flex-col pt-4">
          <h2 className="mb-4 text-2xl font-bold">Calculated Sizes</h2>

          <div className="flex w-full flex-col gap-4">
            {state?.steps?.map((step, stepIndex) => {
              const isStepEnabled = clampOverrides?.[step]?.enabled ?? true;

              const minFontSizeValue = state?.manualMode
                ? appendUnit(state?.manualValues?.[step]?.minValue || state?.manualValues?.[step]?.value)
                : appendUnit(clamps[step]?.minBase);

              const maxFontSizeValue = state?.manualMode
                ? appendUnit(state?.manualValues?.[step]?.maxValue)
                : appendUnit(clamps[step]?.maxBase);

              const isLastStep = stepIndex === (state?.steps?.length ?? 0) - 1;

              return (
                <ScaleStepRow
                  key={step}
                  step={step}
                  stepIndex={stepIndex}
                  isLastStep={isLastStep}
                  font={font}
                  spacing={spacing}
                  borderRadius={borderRadius}
                  state={state}
                  clamps={clamps}
                  clampOverrides={clampOverrides}
                  isStepEnabled={isStepEnabled}
                  minFontSizeValue={minFontSizeValue}
                  maxFontSizeValue={maxFontSizeValue}
                  onBaseStepChange={handleBaseStepChange}
                  onMinBaseChange={handleMinBaseChange}
                  onMaxBaseChange={handleMaxBaseChange}
                  onClampEnabledChange={handleClampEnabledChange}
                  onManualValueChange={handleManualValueChange}
                  onClearMinBase={clearMinBase}
                  onClearMaxBase={clearMaxBase}
                />
              );
            })}
          </div>
        </div>

        {/* Builder Previews */}
        {font && (
          <>
            {localWizzardState?.extendFontSizesFSE &&
              Object.keys(dynamicFontSizeFSE)?.length > 0 && (
                <ScaleBuilders
                  title="FSE Preview"
                  entries={dynamicFontSizeFSE}
                  spacing={spacing}
                  font={font}
                />
              )}

            {localWizzardState?.extendFontSizesBricks &&
              Object.keys(dynamicFontSizeBricks)?.length > 0 && (
                <ScaleBuilders
                  title="Bricks Preview"
                  entries={dynamicFontSizeBricks}
                  spacing={spacing}
                  font={font}
                />
              )}

            {localWizzardState?.extendFontSizesOxygen &&
              Object.keys(dynamicFontSizeOxygen)?.length > 0 && (
                <ScaleBuilders
                  title="Oxygen Preview"
                  entries={dynamicFontSizeOxygen}
                  spacing={spacing}
                  font={font}
                />
              )}
          </>
        )}

        {spacing && (
          <>
            {localWizzardState?.extendSpacingFSE &&
              Object.keys(dynamicSpacingFSE)?.length > 0 && (
                <ScaleBuilders
                  title="FSE Preview"
                  entries={dynamicSpacingFSE}
                  spacing={spacing}
                  font={font}
                />
              )}

            {localWizzardState?.extendSpacingBricks &&
              Object.keys(dynamicSpacingBricks)?.length > 0 && (
                <ScaleBuilders
                  title="Bricks Preview"
                  entries={dynamicSpacingBricks}
                  spacing={spacing}
                  font={font}
                />
              )}

            {localWizzardState?.extendSpacingOxygen &&
              Object.keys(dynamicSpacingOxygen)?.length > 0 && (
                <ScaleBuilders
                  title="Oxygen Preview"
                  entries={dynamicSpacingOxygen}
                  spacing={spacing}
                  font={font}
                />
              )}
          </>
        )}
      </Content>
    </Wrapper>
  );
};

export default ScaleCalculator;

/**
 * Scale Calculator Component
 * Refactored to use extracted hooks and sub-components
 */

import React, { useCallback, useState } from "react";
import { Wrapper, Content } from "../../components/layout/Layout";
import { Button } from "@el/Button";
import { ScaleBuilders } from "./ScaleBuilders";
import { ScaleCalculatorSidebar } from "./ScaleCalculatorSidebar";
import { ScalePreviewList } from "./ScalePreviewList";
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
  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const {
    localWizzardState,
    setLocalWizzardState,
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
  } = useScaleCalculator({
    state,
    updateState,
    updateStates,
    clampOverrides,
    setClampOverrides,
    clamps,
    setClamps,
  });

  const valueColumnLabel = state?.disableFluid
    ? (font ? "Font Size" : spacing ? "Space Size" : borderRadius ? "Radius" : "Value")
    : "Min";
  const showMaxColumn = !state?.disableFluid;
  const steps = state?.steps || [];

  const resetDragState = useCallback(() => {
    setDraggedStep(null);
    setDropIndex(null);
  }, []);

  const handleDropZoneDragOver = (targetIndex: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (draggedStep) {
      setDropIndex(targetIndex);
    }
  };

  const handleDropZoneDrop = (targetIndex: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (draggedStep) {
      handleStepReorder(draggedStep, targetIndex);
    }

    resetDragState();
  };

  const renderDropZone = (targetIndex: number) => {
    const isActive = draggedStep !== null && dropIndex === targetIndex;

    return (
      <div
        key={`drop-zone-${targetIndex}`}
        className={`overflow-hidden transition-all ${
          draggedStep
            ? (isActive ? "h-9 opacity-100" : "h-2 opacity-100")
            : "pointer-events-none h-0 opacity-0"
        }`}
      >
        <div
          className={`flex h-full w-full items-center justify-center border-dashed text-[11px] font-medium uppercase tracking-wide transition-all ${
            isActive
              ? "border-y border-foreground/40 bg-foreground/5 text-foreground/80"
              : "border-transparent text-transparent"
          }`}
          onDragOver={handleDropZoneDragOver(targetIndex)}
          onDragEnter={handleDropZoneDragOver(targetIndex)}
          onDrop={handleDropZoneDrop(targetIndex)}
        >
          <span>{isActive ? "Drop Here" : "Move Step Here"}</span>
        </div>
      </div>
    );
  };

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
        {/* Calculated Sizes */}
        <div className="col-span-2 flex flex-col pt-4">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Calculated Sizes</h2>
            <Button variant="outline" size="sm" onClick={() => handleAddStep()}>
              + Add Step
            </Button>
          </div>

          <div className="flex w-full flex-col">
            {!!state?.steps?.length ? (
              <div className="rounded-lg border border-border bg-base-2">
                <div className="border-b border-border px-4 py-3">
                  <div className="flex items-end gap-4 text-xs font-semibold uppercase tracking-wide text-foreground/60">
                    {!state?.manualMode ? (
                      <div className="flex w-16 shrink-0 justify-center text-center">Default</div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-end gap-4 overflow-x-auto">
                        <div className="min-w-[220px] flex-1">Name</div>
                        <div className="min-w-[180px] flex-1">{showMaxColumn ? "Min" : valueColumnLabel}</div>
                        {showMaxColumn && (
                          <div className="min-w-[180px] flex-1">Max</div>
                        )}
                        <div className="w-20 shrink-0 text-center">Enabled</div>
                        <div className="w-16 shrink-0 text-center">Delete</div>
                      </div>
                    </div>
                  </div>
                </div>

                {steps.map((step, index) => {
                  const isStepEnabled = state?.manualMode
                    ? (state?.manualValues?.[step]?.enabled ?? true)
                    : (clampOverrides?.[step]?.enabled ?? true);

                  return (
                    <React.Fragment key={step}>
                      {renderDropZone(index)}
                      <ScaleStepRow
                        step={step}
                        isDragging={draggedStep === step}
                        showTopBorder={index > 0}
                        font={font}
                        spacing={spacing}
                        borderRadius={borderRadius}
                        state={state}
                        clamps={clamps}
                        isStepEnabled={isStepEnabled}
                        onBaseStepChange={handleBaseStepChange}
                        onStepRename={handleStepRename}
                        onMinBaseChange={handleMinBaseChange}
                        onMaxBaseChange={handleMaxBaseChange}
                        onStepEnabledChange={handleStepEnabledChange}
                        onManualValueChange={handleManualValueChange}
                        onClearMinBase={clearMinBase}
                        onClearMaxBase={clearMaxBase}
                        onDeleteStep={handleDeleteStep}
                        onStepDragStart={setDraggedStep}
                        onStepDragEnd={resetDragState}
                      />
                    </React.Fragment>
                  );
                })}

                {renderDropZone(steps.length)}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
                <p className="mb-4 text-sm text-foreground/60">
                  No steps yet. Add your first step to start building the scale.
                </p>
                <Button variant="default" onClick={() => handleAddStep()}>
                  + Add First Step
                </Button>
              </div>
            )}
          </div>

          <ScalePreviewList
            steps={state?.steps || []}
            state={state}
            clamps={clamps}
            font={font}
            spacing={spacing}
            borderRadius={borderRadius}
          />
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

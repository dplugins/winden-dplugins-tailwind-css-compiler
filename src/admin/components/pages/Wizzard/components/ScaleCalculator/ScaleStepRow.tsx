/**
 * Scale Step Row
 * Editable step row for calculator tables
 */

import React, { useEffect, useState } from "react";
import { Button } from "@el/Button";
import { Input } from "@el/Input";
import InputWithResetButton from "@el/InputWithResetButton";
import { Switch } from "@el/Switch";
import RadioButton from "@el/RadioButton";
import { ReactComponent as DeleteOutlineOutlinedIcon } from "@/assets/icons/DeleteOutlineOutlinedIcon.svg";

import type { ClampInfo, ScaleState } from "./types";

interface ScaleStepRowProps {
  step: string;
  isDragging: boolean;
  showTopBorder?: boolean;
  font?: boolean;
  spacing?: boolean;
  borderRadius?: boolean;
  state: ScaleState;
  clamps: Record<string, ClampInfo>;
  isStepEnabled: boolean;
  onBaseStepChange: (value: string) => void;
  onStepRename: (currentStep: string, nextStepName: string) => boolean;
  onMinBaseChange: (step: string, value: string) => void;
  onMaxBaseChange: (step: string, value: string) => void;
  onStepEnabledChange: (step: string, enabled: boolean) => void;
  onManualValueChange: (step: string, field: string, value: string) => void;
  onClearMinBase: (step: string) => void;
  onClearMaxBase: (step: string) => void;
  onDeleteStep: (step: string) => void;
  onStepDragStart: (step: string) => void;
  onStepDragEnd: () => void;
}

const ScaleStepRowImpl: React.FC<ScaleStepRowProps> = ({
  step,
  isDragging,
  showTopBorder = false,
  font,
  spacing,
  borderRadius,
  state,
  clamps,
  isStepEnabled,
  onBaseStepChange,
  onStepRename,
  onMinBaseChange,
  onMaxBaseChange,
  onStepEnabledChange,
  onManualValueChange,
  onClearMinBase,
  onClearMaxBase,
  onDeleteStep,
  onStepDragStart,
  onStepDragEnd,
}) => {
  const [draftStepName, setDraftStepName] = useState(step);

  useEffect(() => {
    setDraftStepName(step);
  }, [step]);

  const commitStepName = () => {
    const didRename = onStepRename(step, draftStepName);
    if (!didRename) {
      setDraftStepName(step);
    }
  };

  const sizeLabel = font
    ? "Font Size"
    : spacing
      ? "Space Size"
      : borderRadius
        ? "Radius"
        : "Value";

  const valueLabel = state?.disableFluid ? sizeLabel : "MIN";
  const showMaxField = !state?.disableFluid;

  return (
    <div
      className={`group relative bg-base-2 px-4 py-4 transition-colors ${
        showTopBorder ? "border-t border-border" : ""
      } ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", step);
          onStepDragStart(step);
        }}
        onDragEnd={() => {
          onStepDragEnd();
        }}
        className="absolute -left-[12px]! top-1/2 z-10 flex h-10 w-6 -translate-y-1/2 cursor-grab items-center justify-center rounded-md border border-input bg-base-1 text-foreground/60 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing"
        aria-label={`Drag to reorder ${step}`}
        title="Drag to reorder"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="6" cy="4" r="1.5" />
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="6" cy="8" r="1.5" />
          <circle cx="10" cy="8" r="1.5" />
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="10" cy="12" r="1.5" />
        </svg>
      </div>

      <div className="flex items-center gap-4">
        {!state?.manualMode ? (
          <div className="flex w-16 shrink-0 items-center justify-center">
            <RadioButton
              name="baseStep"
              checked={state?.baseStep === step}
              onChange={() => onBaseStepChange(step)}
              label=""
            />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-4 overflow-x-auto">
            <div className="min-w-[220px] flex-1">
              <Input
                type="text"
                value={draftStepName}
                onChange={(e) => setDraftStepName(e.target.value)}
                onBlur={commitStepName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitStepName();
                    (e.target as HTMLInputElement).blur();
                  }

                  if (e.key === "Escape") {
                    setDraftStepName(step);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                aria-label={`${step} name`}
              />
            </div>

            <div className="min-w-[180px] flex-1">
              <div className={`flex w-full flex-col gap-2 ${!isStepEnabled ? "opacity-50" : ""}`}>
                {state?.manualMode ? (
                  <Input
                    type="number"
                    value={
                      state?.disableFluid
                        ? (state?.manualValues?.[step]?.value || "")
                        : (state?.manualValues?.[step]?.minValue || "")
                    }
                    onChange={(e) => onManualValueChange(
                      step,
                      state?.disableFluid ? "value" : "minValue",
                      e.target.value
                    )}
                    disabled={!isStepEnabled}
                    placeholder={`Enter ${valueLabel.toLowerCase()}`}
                    className="w-full"
                    aria-label={`${step} ${valueLabel.toLowerCase()}`}
                  />
                ) : (
                  <InputWithResetButton
                    value={clamps[step]?.minBase || ""}
                    disabled={!isStepEnabled}
                    onChange={(e) => onMinBaseChange(step, e.target.value)}
                    onReset={() => onClearMinBase(step)}
                    showReset={!!clamps[step]?.hasCustomMin}
                    className="w-full"
                    placeholder={clamps[step]?.minBase || ""}
                    ariaLabel={`${step} ${valueLabel.toLowerCase()}`}
                  />
                )}
              </div>
            </div>

            {showMaxField && (
              <div className="min-w-[180px] flex-1">
                <div className={`flex w-full flex-col gap-2 ${!isStepEnabled ? "opacity-50" : ""}`}>
                  {state?.manualMode ? (
                    <Input
                      type="number"
                      value={state?.manualValues?.[step]?.maxValue || ""}
                      onChange={(e) => onManualValueChange(step, "maxValue", e.target.value)}
                      disabled={!isStepEnabled}
                      placeholder="Enter max"
                      className="w-full"
                      aria-label={`${step} max`}
                    />
                  ) : (
                    <InputWithResetButton
                      value={clamps[step]?.maxBase || ""}
                      disabled={!isStepEnabled}
                      onChange={(e) => onMaxBaseChange(step, e.target.value)}
                      onReset={() => onClearMaxBase(step)}
                      showReset={!!clamps[step]?.hasCustomMax}
                      className="w-full"
                      placeholder={clamps[step]?.maxBase || ""}
                      ariaLabel={`${step} max`}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex w-20 shrink-0 items-center justify-center">
              <Switch
                checked={isStepEnabled}
                onCheckedChange={(checked) => onStepEnabledChange(step, checked)}
                aria-label={`Enable ${step}`}
              />
            </div>

            <div className="flex w-16 shrink-0 items-center justify-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onDeleteStep(step)}
                className="!text-danger"
                aria-label={`Delete ${step}`}
                title="Delete step"
              >
                <DeleteOutlineOutlinedIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ScaleStepRow = React.memo(ScaleStepRowImpl);
ScaleStepRow.displayName = "ScaleStepRow";

export default ScaleStepRow;

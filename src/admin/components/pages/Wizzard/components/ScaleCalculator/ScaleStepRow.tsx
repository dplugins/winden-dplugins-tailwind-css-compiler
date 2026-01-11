/**
 * Scale Step Row
 * Individual step row with inputs and preview
 */

import React from "react";
import { Input } from "@el/Input";
import InputWithResetButton from "@el/InputWithResetButton";
import { Switch } from "@el/Switch";
import RadioButton from "@el/RadioButton";

import type { ClampInfo, ClampOverride, ScaleState, ManualValue } from "./types";

interface ScaleStepRowProps {
  step: string;
  stepIndex: number;
  isLastStep: boolean;
  font?: boolean;
  spacing?: boolean;
  borderRadius?: boolean;
  state: ScaleState;
  clamps: Record<string, ClampInfo>;
  clampOverrides: Record<string, ClampOverride>;
  isStepEnabled: boolean;
  minFontSizeValue: string | null;
  maxFontSizeValue: string | null;
  onBaseStepChange: (value: string) => void;
  onMinBaseChange: (step: string, value: string) => void;
  onMaxBaseChange: (step: string, value: string) => void;
  onClampEnabledChange: (step: string, enabled: boolean) => void;
  onManualValueChange: (step: string, field: string, value: string) => void;
  onClearMinBase: (step: string) => void;
  onClearMaxBase: (step: string) => void;
}

export const ScaleStepRow: React.FC<ScaleStepRowProps> = ({
  step,
  stepIndex,
  isLastStep,
  font,
  spacing,
  borderRadius,
  state,
  clamps,
  clampOverrides,
  isStepEnabled,
  minFontSizeValue,
  maxFontSizeValue,
  onBaseStepChange,
  onMinBaseChange,
  onMaxBaseChange,
  onClampEnabledChange,
  onManualValueChange,
  onClearMinBase,
  onClearMaxBase,
}) => {
  return (
    <div
      className={`flex items-center gap-4 border-b border-border border-opacity-30 pb-4 overflow-hidden min-h-[100px] ${
        isLastStep ? "border-b-0 pb-0" : ""
      }`}
    >
      {!state?.manualMode && (
        <RadioButton
          name="baseStep"
          checked={state?.baseStep === step}
          onChange={() => onBaseStepChange(step)}
          label=""
        />
      )}
      <div className="rounded-md border border-border bg-base-2 p-1 !max-w-[350px] !min-w-[350px] !w-[350px] flex items-center gap-1">
        <div
          className={`flex w-full gap-1 ${isStepEnabled ? "" : "opacity-50"}`}
        >
          <div className="relative flex w-full flex-col gap-1">
            <label className="absolute -top-6 text-xs font-medium text-foreground/50">
              {state?.disableFluid ? step.toUpperCase() : `MIN: ${step.toUpperCase()}`}
            </label>
            {state?.manualMode ? (
              <Input
                type="number"
                value={state?.disableFluid
                  ? (state?.manualValues?.[step]?.value || "")
                  : (state?.manualValues?.[step]?.minValue || "")}
                onChange={(e) => onManualValueChange(
                  step,
                  state?.disableFluid ? 'value' : 'minValue',
                  e.target.value
                )}
                disabled={!isStepEnabled}
                placeholder="Enter min value"
                className="w-full"
              />
            ) : (
              <InputWithResetButton
                value={clamps[step]?.minBase || ""}
                disabled={!isStepEnabled}
                onChange={(e) => onMinBaseChange(step, e.target.value)}
                onReset={() => onClearMinBase(step)}
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
                  onChange={(e) => onManualValueChange(step, 'maxValue', e.target.value)}
                  disabled={!isStepEnabled}
                  placeholder="Enter max value"
                  className="w-full"
                />
              ) : (
                <InputWithResetButton
                  value={clamps[step]?.maxBase || ""}
                  disabled={!isStepEnabled}
                  onChange={(e) => onMaxBaseChange(step, e.target.value)}
                  onReset={() => onClearMaxBase(step)}
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
            onCheckedChange={(checked) => onClampEnabledChange(step, checked)}
            aria-label={`Enable ${step} clamp`}
          />
        )}
      </div>

      {/* Font Preview */}
      {font && (
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {!state?.disableFluid && maxFontSizeValue ? (
            <>
              <div
                className="flex items-baseline opacity-10"
                style={{ minHeight: `calc(${maxFontSizeValue} + 0.5rem)` }}
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
                style={{ minHeight: `calc(${maxFontSizeValue} + 1rem)` }}
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
                    fontSize: minFontSizeValue || undefined,
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
                  fontSize: minFontSizeValue || undefined,
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

      {/* Spacing Preview */}
      {spacing && (
        <>
          <span className="text-base-foreground text-xs font-medium">{step}</span>
          <div className="relative flex items-end">
            {!state?.disableFluid && (
              <div
                className="aspect-square bg-element opacity-50"
                style={{ width: maxFontSizeValue || undefined }}
              />
            )}
            <div
              className="aspect-square bg-element opacity-50"
              style={{
                width: minFontSizeValue || undefined,
                position: !state?.disableFluid ? 'absolute' : 'relative',
                bottom: 0,
                left: 0,
              }}
            />
          </div>
        </>
      )}

      {/* Border Radius Preview */}
      {borderRadius && (
        <>
          <span className="text-base-foreground text-xs font-medium">{step}</span>
          <div className="relative flex items-end">
            {!state?.disableFluid && (
              <div
                className="aspect-square bg-element opacity-50"
                style={{
                  width: maxFontSizeValue || undefined,
                  borderTopRightRadius: maxFontSizeValue || undefined,
                }}
              />
            )}
            <div
              className="aspect-square bg-element opacity-50"
              style={{
                width: minFontSizeValue || undefined,
                borderTopRightRadius: minFontSizeValue || undefined,
                position: !state?.disableFluid ? 'absolute' : 'relative',
                bottom: 0,
                left: 0,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ScaleStepRow;

/**
 * Scale Preview List
 * Separate preview block for calculated scale rows
 */

import React from "react";

import { getStepDisplayValues } from "./calculations";
import type { ClampInfo, ScaleState } from "./types";

interface ScalePreviewListProps {
  steps: string[];
  state: ScaleState;
  clamps: Record<string, ClampInfo>;
  font?: boolean;
  spacing?: boolean;
  borderRadius?: boolean;
}

export const ScalePreviewList: React.FC<ScalePreviewListProps> = ({
  steps,
  state,
  clamps,
  font,
  spacing,
  borderRadius,
}) => {
  if (!steps.length) {
    return null;
  }

  return (
    <div className="mt-12 flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Preview</h2>

      <div className="flex flex-col rounded-lg border border-border bg-transparent">
        {steps.map((step, index) => {
          const { minValue, maxValue } = getStepDisplayValues(step, state, clamps);
          const isStepEnabled = state?.manualMode
            ? (state?.manualValues?.[step]?.enabled ?? true)
            : (clamps?.[step]?.enabled ?? true);

          if (font) {
            return (
              <div
                key={step}
                className={`p-4 ${index > 0 ? "border-t border-border" : ""} ${
                  isStepEnabled ? "" : "opacity-40"
                }`}
              >
                <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-foreground/50">
                  {step}
                </span>

                {!state?.disableFluid && maxValue ? (
                  <div className="relative overflow-hidden">
                    <div
                      className="flex items-baseline opacity-15"
                      style={{ minHeight: `calc(${maxValue} + 0.75rem)` }}
                    >
                      <p
                        className="!m-0 text-contrast"
                        style={{
                          fontSize: maxValue,
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        MAX: The quick brown fox jumps over the lazy dog.
                      </p>
                    </div>
                    <div
                      className="absolute top-0 flex items-baseline"
                      style={{ minHeight: `calc(${maxValue} + 0.75rem)` }}
                    >
                      <p
                        className="!m-0 text-contrast"
                        style={{
                          fontSize: maxValue,
                          lineHeight: 1,
                          textIndent: "-99999px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        M
                      </p>
                      <p
                        className="!m-0 text-contrast"
                        style={{
                          fontSize: minValue || undefined,
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                          paddingLeft: `calc(${maxValue} / 20)`,
                        }}
                      >
                        MIN: The quick brown fox jumps over the lazy dog.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p
                    className="!m-0 text-contrast"
                    style={{
                      fontSize: minValue || undefined,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    The quick brown fox jumps over the lazy dog.
                  </p>
                )}
              </div>
            );
          }

          if (spacing || borderRadius) {
            return (
              <div
                key={step}
                className={`p-4 ${index > 0 ? "border-t border-border" : ""} ${
                  isStepEnabled ? "" : "opacity-40"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                    {step}
                  </span>
                  <span className="text-xs text-foreground/50">
                    {minValue || "0"}
                    {!state?.disableFluid && maxValue ? ` to ${maxValue}` : ""}
                  </span>
                </div>

                <div className="relative flex min-h-[96px] items-end">
                  {!state?.disableFluid && maxValue ? (
                    <div
                      className="aspect-square bg-element opacity-20"
                      style={{
                        width: maxValue,
                        borderTopRightRadius: borderRadius ? maxValue : undefined,
                      }}
                    />
                  ) : null}

                  <div
                    className="aspect-square bg-element"
                    style={{
                      width: minValue || undefined,
                      borderTopRightRadius: borderRadius ? minValue || undefined : undefined,
                      position: !state?.disableFluid && maxValue ? "absolute" : "relative",
                      bottom: 0,
                      left: 0,
                    }}
                  />
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default ScalePreviewList;

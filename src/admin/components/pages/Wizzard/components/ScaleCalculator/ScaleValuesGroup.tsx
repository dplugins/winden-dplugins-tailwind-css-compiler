import React, { useEffect, useId, useState } from "react";
import { scaleOptions } from "../const/scaleConstants";

import { Input } from "@el/Input";
import InputWithResetButton from "@el/InputWithResetButton";
import { Label } from "@el/Label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@el/Select";

/**
 * Check if a value exists in the preset scale options
 * @param value - Value to check
 * @returns Whether the value is a preset ratio
 */
const hasPresetRatio = (value: number | string | undefined | null): boolean =>
  scaleOptions.some((option) =>
    typeof option === "number"
      ? Number(option) === Number(value)
      : option === value
  );

interface RatioFieldProps {
  label: string;
  value: number | string | undefined | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  fallbackValue?: number;
}

/**
 * Field for selecting or entering a custom ratio value
 */
const RatioField: React.FC<RatioFieldProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  fallbackValue = 1,
}) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const rawId = useId();
  const fieldId = `ratio-${rawId.replace(/:/g, "")}`;

  useEffect(() => {
    if (value === undefined || value === null || value === "") {
      setIsCustom(false);
      setCustomValue("");
      return;
    }

    const isPreset = hasPresetRatio(value);
    setIsCustom(!isPreset);
    setCustomValue(!isPreset ? String(value) : "");
  }, [value]);

  if (isCustom) {
    return (
      <div className="relative flex w-full flex-col gap-2 !grow">
        <Label className="absolute -top-6 text-xs uppercase text-foreground/50">
          {label}
        </Label>
        <InputWithResetButton
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            const nextValue = parseFloat(e.target.value);
            if (!Number.isNaN(nextValue)) {
              onChange(nextValue);
            } else {
              onChange(fallbackValue);
            }
          }}
          onReset={() => {
            setIsCustom(false);
            setCustomValue("");
            onChange(fallbackValue);
          }}
          showReset
          disabled={disabled}
        />
      </div>
    );
  }

  const selectValue =
    value === undefined || value === null || value === ""
      ? ""
      : hasPresetRatio(value)
      ? String(value)
      : "Custom";

  return (
    <div className="relative flex w-full flex-col gap-2 !grow">
      <Label
        className="absolute -top-6 text-xs uppercase text-foreground/50"
        htmlFor={fieldId}
      >
        {label}
      </Label>
      <Select
        value={selectValue}
        onValueChange={(selected) => {
          if (selected === "Custom") {
            setIsCustom(true);
            setCustomValue(
              value !== undefined && value !== null ? String(value) : ""
            );
            return;
          }

          const parsed = parseFloat(selected);
          if (!Number.isNaN(parsed)) {
            setIsCustom(false);
            setCustomValue("");
            onChange(parsed);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger id={fieldId}>
          <SelectValue placeholder="Select a ratio" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {scaleOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

interface NumberFieldProps {
  label: string;
  value: number | undefined | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Number input field with px unit label
 */
const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  disabled = false
}) => {
  return (
    <div className="flex w-full flex-col gap-2 relative">
      <Input
        label={label}
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="!pr-[2rem]"
      />
      <span className="absolute right-3 z-10 top-1/2 -translate-y-1/2 text-sm text-foreground/50 pointer-events-none">
        px
      </span>
    </div>
  );
};

interface ScaleValuesGroupProps {
  title: string;
  minLabel?: string;
  maxLabel?: string;
  minValue: number | string | undefined | null;
  maxValue?: number | string | undefined | null;
  onChangeMin: (value: number) => void;
  onChangeMax?: (value: number) => void;
  type?: "number" | "select";
  hideMax?: boolean;
  disabled?: boolean;
}

/**
 * Group of min/max value inputs for scale configuration
 * @param title - Title for the group
 * @param minLabel - Label for minimum value field
 * @param maxLabel - Label for maximum value field
 * @param minValue - Current minimum value
 * @param maxValue - Current maximum value
 * @param onChangeMin - Callback when minimum changes
 * @param onChangeMax - Callback when maximum changes
 * @param type - Field type (number or select)
 * @param hideMax - Whether to hide the maximum field
 * @param disabled - Whether fields are disabled
 */
const ScaleValuesGroup: React.FC<ScaleValuesGroupProps> = ({
  title,
  minLabel = "Min",
  maxLabel = "Max",
  minValue,
  maxValue,
  onChangeMin,
  onChangeMax,
  type = "number",
  hideMax = false,
  disabled = false,
}) => {
  const fieldClassName = [
    "grid w-full gap-1 p-1 bg-base-2 border border-border rounded-md",
    hideMax ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
  ].join(" ");

  return (
    <div className="mb-12 flex w-full flex-col gap-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className={fieldClassName}>
        {type === "select" ? (
          <RatioField
            label={minLabel}
            value={minValue}
            onChange={onChangeMin}
            disabled={disabled}
          />
        ) : (
          <NumberField
            label={minLabel}
            value={minValue as number}
            onChange={onChangeMin}
            disabled={disabled}
          />
        )}
        {!hideMax &&
          onChangeMax &&
          (type === "select" ? (
            <RatioField
              label={maxLabel}
              value={maxValue}
              onChange={onChangeMax}
              disabled={disabled}
            />
          ) : (
            <NumberField
              label={maxLabel}
              value={maxValue as number}
              onChange={onChangeMax}
              disabled={disabled}
            />
          ))}
      </div>
    </div>
  );
};

export default ScaleValuesGroup;

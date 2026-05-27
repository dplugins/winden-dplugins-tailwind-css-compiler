/**
 * Color Entry Component
 * UI-only component for managing individual colors with shades
 * All calculations and state logic handled by useColorEntry hook
 */

import React from "react";
import clsx from "clsx";
import tinycolor from "tinycolor2";
import ShadeCurveEditor from "./ShadeCurveEditor";
import ShadesList from "./ShadesList";
import ColorSwatchEditor from "./ColorSwatchEditor";
import { useColorEntry } from "./useColorEntry";
import { Button } from "@el/Button";
import { Input } from "@el/Input";
import { Checkbox } from "@el/Checkbox";
import { ReactComponent as LockOutlinedIcon } from "@/assets/icons/LockOutlinedIcon.svg";
import { ReactComponent as LockOpenOutlinedIcon } from "@/assets/icons/LockOpenOutlinedIcon.svg";
import { ReactComponent as DeleteOutlineOutlinedIcon } from "@/assets/icons/DeleteOutlineOutlinedIcon.svg";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@el/Select";
import type { ColorEntry as ColorEntryType } from "@/types/wizzard";

interface DividerProps {
  className?: string;
}

const Divider: React.FC<DividerProps> = ({ className = "" }) => (
  <div className={`bg-border w-[2px] min-w-[2px] h-full ${className}`} />
);

interface ColorEntryProps {
  entry: ColorEntryType;
  onRemove: () => void;
  updateColorEntry: (id: number, updatedEntry: Partial<ColorEntryType>) => void;
  onEditingChange: (isEditing: boolean, id: number) => void;
  autoFocusName?: boolean;
}

const ColorEntry: React.FC<ColorEntryProps> = ({
  entry,
  onRemove,
  updateColorEntry,
  onEditingChange,
  autoFocusName,
}) => {
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (autoFocusName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [autoFocusName]);
  const {
    // Color state
    color,
    setColor,
    hsl,
    setHsl,
    inputValue,
    setInputValue,

    // Shade state
    shades,
    baseIndex,
    lightnessCurve,
    saturationCurve,
    hueCurve,
    shadesList,
    enableShades,
    setEnableShades,

    // UI state
    colorName,
    isLocked,
    isExpanded,
    colorFormat,
    setColorFormat,

    // Derived values
    isSystemLocked,
    colorSource,
    isSpecialUtility,
    activeTab,

    // Handlers
    updateColor,
    handleInputBlur,
    handleKeyDown,
    handleColorNameChange,
    handleDelete,
    toggleLock,
    toggleExpand,
    handleShadesChange,
    handleCurveChange,
    handleResetCurve,

    // Utilities
    isValidColorInput,
    getPlaceholderText,
    getSpecialUtilityAbbreviation,
  } = useColorEntry({
    entry,
    updateColorEntry,
    onEditingChange,
    onRemove,
  });

  return (
    <div
      className={clsx(
        "flex flex-col p-2 last:border-b-0",
        isExpanded && "border-b border-input"
      )}
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="flex gap-4">
          <div className="flex items-center w-full border border-input rounded-md">
            {/* Color Swatch or Special Utility Indicator */}
            {isSpecialUtility ? (
              <div className="h-10 w-12 min-w-12 rounded-md flex items-center justify-center bg-base-2 text-muted-foreground text-xs font-mono ml-[1px]">
                {getSpecialUtilityAbbreviation(entry.utilityValue ?? '')}
              </div>
            ) : (
              <ColorSwatchEditor
                color={color}
                hsl={hsl}
                activeTab={activeTab}
                setHsl={setHsl}
                setColor={setColor}
                updateColor={updateColor}
                entry={entry}
                shadesList={shadesList}
                updateColorEntry={updateColorEntry}
                title="Main Color"
                position="left-0"
                colorFormat={colorFormat}
                readOnly={isSystemLocked}
              />
            )}

            {/* Color Value Input */}
            <div className="grow flex w-full max-w-[150px]">
              <Input
                id="hex-value"
                type="text"
                value={entry.utilityValue || inputValue}
                onChange={(e) => !isSystemLocked && setInputValue(e.target.value)}
                onBlur={!isSystemLocked ? handleInputBlur : undefined}
                onKeyDown={!isSystemLocked ? handleKeyDown : undefined}
                disabled={isSystemLocked}
                className={`!border-none grow ${
                  !isValidColorInput(inputValue) && inputValue.length > 0
                    ? "text-red-500"
                    : ""
                }`}
                placeholder={getPlaceholderText(colorFormat)}
                title={
                  isSystemLocked
                    ? `${colorSource} color (read-only)`
                    : `Enter color in ${colorFormat.toUpperCase()} format or color name`
                }
              />
            </div>

            <Divider />

            {/* Color Name Input */}
            <div className="relative flex items-center grow w-full">
              <Input
                ref={nameInputRef}
                id="color-name"
                type="text"
                value={colorName}
                onChange={handleColorNameChange}
                disabled={isLocked || isSystemLocked}
                className="!border-none grow"
                placeholder="Color name"
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                data-bwignore="true"
                data-form-type="other"
                title={isSystemLocked ? `${colorSource} color` : undefined}
              />
              {colorSource && (
                <span className="absolute right-2 text-xs px-2 py-1 bg-base-3 rounded text-muted-foreground">
                  {colorSource}
                </span>
              )}
              {!isSystemLocked && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleLock}
                  className="absolute right-2 z-50!"
                >
                  {isLocked ? (
                    <LockOutlinedIcon style={{ fontSize: "1.2rem" }} />
                  ) : (
                    <LockOpenOutlinedIcon style={{ fontSize: "1.2rem" }} />
                  )}
                </button>
              )}
            </div>

            {/* Format Selector and Expand Toggle */}
            {!isSystemLocked && (
              <>
                <Divider />
                <Select
                  value={colorFormat}
                  onValueChange={(value) =>
                    setColorFormat(value as "hex" | "rgb" | "hsl" | "oklch")
                  }
                >
                  <SelectTrigger className="w-full !border-none">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hex">HEX</SelectItem>
                    <SelectItem value="rgb">RGB</SelectItem>
                    <SelectItem value="hsl">HSL</SelectItem>
                    <SelectItem value="oklch">OKLCH</SelectItem>
                  </SelectContent>
                </Select>

                <Divider />

                <button
                  onClick={toggleExpand}
                  className={clsx(
                    "h-full aspect-square flex items-center justify-center rounded-r-md hover:bg-base-3 hover:text-foreground",
                    isExpanded && "bg-foreground text-base"
                  )}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.8457 4C10.6956 4 11.3846 4.68903 11.3848 5.53809V16.3076C11.3848 17.2869 10.9952 18.2265 10.3027 18.9189C9.61035 19.6111 8.67142 20 7.69238 20C6.71312 20 5.7735 19.6114 5.08105 18.9189C4.38861 18.2265 4 17.2869 4 16.3076V5.53809C4.0002 4.68833 4.68915 4.0002 5.53809 4H9.8457ZM18.4609 12.6152C19.31 12.6152 19.9998 13.3035 20 14.1533V18.4619C19.9997 19.3109 19.3108 20 18.4609 20H10.9482C11.0254 19.9327 11.1 19.8621 11.1738 19.7891L18.3467 12.6152H18.4609ZM7.69238 15.3848C7.4476 15.3848 7.21314 15.4822 7.04004 15.6553C6.86695 15.8284 6.76955 16.0628 6.76953 16.3076C6.76953 16.5524 6.86693 16.7869 7.04004 16.96C7.21315 17.1331 7.44757 17.2305 7.69238 17.2305C7.93717 17.2304 8.17163 17.1331 8.34473 16.96C8.51779 16.7869 8.61523 16.5524 8.61523 16.3076C8.61521 16.0628 8.51782 15.8284 8.34473 15.6553C8.17163 15.4822 7.93717 15.3848 7.69238 15.3848ZM13.7842 5.63086C14.192 5.63091 14.5836 5.79372 14.8721 6.08203L17.917 9.12793C18.2053 9.41643 18.3672 9.80793 18.3672 10.2158C18.3672 10.6237 18.2053 11.0152 17.917 11.3037L12.6064 16.6133C12.6121 16.5122 12.6143 16.4103 12.6143 16.3076V6.16309L12.6963 6.08203C12.9848 5.79368 13.3763 5.63086 13.7842 5.63086Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Delete Button */}
          {!isSystemLocked && (
            <Button
              variant="outline"
              className="!text-danger px-3 h-full"
              size="lg"
              onClick={handleDelete}
            >
              <DeleteOutlineOutlinedIcon />
            </Button>
          )}
        </div>

        {/* Collapsed Shades Preview */}
        {!isExpanded && enableShades && (
          <div className="flex rounded-md overflow-hidden">
            {shadesList
              .filter((shade) => shade.isEnabled)
              .map((shade, index) => (
                <div key={index} className="flex w-full h-4">
                  <div className="h-full w-full" style={{ background: shade.hex }} />
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Expanded Shades Editor */}
      {isExpanded && (
        <div className="my-8 flex flex-col gap-8">
          <Checkbox
            label="Enable shades"
            checked={enableShades}
            onCheckedChange={setEnableShades}
          />

          {enableShades && (
            <>
              <ShadeCurveEditor
                baseColor={tinycolor(color).toHexString()}
                shadeCount={shades}
                baseIndex={baseIndex}
                lightnessCurve={lightnessCurve}
                saturationCurve={saturationCurve}
                hueCurve={hueCurve}
                onCurveChange={handleCurveChange}
                onResetCurve={handleResetCurve}
              />

              <div className="border border-input rounded-md p-4">
                <ShadesList
                  entry={entry}
                  shadesList={shadesList}
                  updateColorEntry={updateColorEntry}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ColorEntry;

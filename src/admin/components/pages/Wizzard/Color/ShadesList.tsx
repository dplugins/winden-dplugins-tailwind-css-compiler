import React, { useState, useEffect, useCallback, memo } from "react";
import tinycolor from "tinycolor2";
import InputWithResetButton from "@el/InputWithResetButton";
import { Checkbox } from "@el/Checkbox";
import RadioButton from "@el/RadioButton";
import ColorSwatchEditor from "./ColorSwatchEditor";
import { parseColorInput, getColorDisplayString } from "./colorModelsConvert";

interface Shade {
  name: string | number;
  hex: string;
  isEnabled: boolean;
  isDefault: boolean;
  isCustom?: boolean;
}

interface ColorEntry {
  id: number | string;
  name: string;
  hex?: string;
  colorFormat?: string;
  originalGeneratedColors?: string[];
  isMainColorChange?: boolean;
  shades?: Shade[];
}

interface ShadesListProps {
  entry: ColorEntry;
  shadesList: Shade[];
  updateColorEntry: (id: number | string, updates: Partial<ColorEntry>) => void;
}

/**
 * List of color shades with individual editing capabilities
 * @param entry - Color entry object
 * @param shadesList - Array of shade objects
 * @param updateColorEntry - Callback to update color entry
 */
const ShadesList: React.FC<ShadesListProps> = memo(({ entry, shadesList, updateColorEntry }) => {
  // Add null checking to prevent map error
  const safeShadesList = shadesList || [];

  const [modifiedShades, setModifiedShades] = useState<boolean[]>(
    safeShadesList.map(() => false)
  );

  // Track the original generated colors (baseline for reset functionality)
  const [originalGeneratedColors, setOriginalGeneratedColors] = useState<string[]>(() => {
    return entry.originalGeneratedColors || safeShadesList.map(shade => shade.hex);
  });

  // Local state for input values (formatted according to colorFormat)
  const [inputValues, setInputValues] = useState<string[]>(() => {
    const colorFormat = entry.colorFormat || "hex";
    return safeShadesList.map(shade => getColorDisplayString(shade.hex, colorFormat));
  });

  // Track which inputs are being actively edited
  const [editingInputs, setEditingInputs] = useState<boolean[]>(() => {
    return safeShadesList.map(() => false);
  });

  // Track which shades have been individually modified
  const [individuallyModifiedShades, setIndividuallyModifiedShades] = useState<boolean[]>(() => {
    return safeShadesList.map(() => false);
  });

  // Handle main color changes - reset all tracking
  useEffect(() => {
    if (entry.isMainColorChange) {
      // Reset all tracking states
      setModifiedShades(safeShadesList.map(() => false));
      setIndividuallyModifiedShades(safeShadesList.map(() => false));
      setEditingInputs(safeShadesList.map(() => false));

      // Update baseline colors to the new generated ones
      const newOriginalColors = entry.originalGeneratedColors || safeShadesList.map(shade => shade.hex);
      setOriginalGeneratedColors(newOriginalColors);

      // Update input values
      setInputValues(safeShadesList.map(shade => getColorDisplayString(shade.hex, entry.colorFormat || "hex")));

      // Clear the flag to prevent repeated resets
      // updateColorEntry merges objects, so explicitly set the flag to false instead of deleting it
      updateColorEntry(entry.id, { isMainColorChange: false });
    }
  }, [entry.isMainColorChange, safeShadesList, entry.originalGeneratedColors, entry.id, updateColorEntry, entry.colorFormat]);

  // Handle regular shades list updates (not from main color changes)
  useEffect(() => {
    if (!entry.isMainColorChange) {
      // Update input values when shades list changes (but preserve tracking)
      setInputValues(safeShadesList.map(shade => getColorDisplayString(shade.hex, entry.colorFormat || "hex")));

      // Update original colors if they don't exist
      if (!entry.originalGeneratedColors) {
        const newOriginalColors = safeShadesList.map(shade => shade.hex);
        setOriginalGeneratedColors(newOriginalColors);
      }
    }
  }, [safeShadesList, entry.originalGeneratedColors, entry.isMainColorChange, entry.colorFormat]);

  // Handle color format changes - update all input values to new format
  useEffect(() => {
    const colorFormat = entry.colorFormat || "hex";
    const newInputValues = safeShadesList.map(shade => getColorDisplayString(shade.hex, colorFormat));
    setInputValues(newInputValues);
  }, [entry.colorFormat, safeShadesList]);

  /**
   * Handle input change for shade name
   */
  const handleInputChange = (index: number, value: string, type: string): void => {
    if (type === "name") {
      const newModifiedShades = [...modifiedShades];
      newModifiedShades[index] = value !== safeShadesList[index].name.toString();
      setModifiedShades(newModifiedShades);

      let shadeList = [...safeShadesList];
      shadeList = shadeList.map((shade, idx) => {
        if (idx === index) {
          return { ...shade, name: value };
        }
        return shade;
      });
      updateColorEntry(entry.id, { ...entry, shades: shadeList });
    }
  };

  /**
   * Reset shade name to default
   */
  const handleReset = (index: number): void => {
    const newModifiedShades = [...modifiedShades];
    newModifiedShades[index] = false;
    setModifiedShades(newModifiedShades);

    let shadeList = [...safeShadesList];
    shadeList = shadeList.map((shade, idx) => {
      if (idx === index) {
        return { ...shade, name: (index + 1) * 100 };
      }
      return shade;
    });
    updateColorEntry(entry.id, { ...entry, shades: shadeList });
  };

  /**
   * Handle radio button change for default shade
   */
  const handleRadioChange = (index: number): void => {
    let shadeList = [...safeShadesList];
    shadeList = shadeList.map((shade, idx) => ({
      ...shade,
      isDefault: idx === index
    }));
    updateColorEntry(entry.id, { ...entry, shades: shadeList });
  };

  /**
   * Handle checkbox change for enabling/disabling shade
   */
  const handleCheckBoxChange = (index: number): void => {
    let shadeList = [...safeShadesList];
    shadeList = shadeList.map((shade, idx) => {
      if (idx === index) {
        return { ...shade, isEnabled: !shade.isEnabled };
      }
      return shade;
    });
    updateColorEntry(entry.id, { ...entry, shades: shadeList });
  };

  /**
   * Handle shade color change from color picker
   */
  const handleShadeColorChange = (shade: Shade, index: number, newColor: string): void => {
    const newHexColor = tinycolor(newColor).toHexString();

    let updatedShadesList = [...safeShadesList];
    updatedShadesList[index] = {
      ...updatedShadesList[index],
      hex: newHexColor,
      isCustom: true  // Mark as manually customized so it persists on reload
    };

    // Preserve the original generated colors - don't overwrite them
    // This is an individual shade change, not a main color change
    updateColorEntry(entry.id, {
      ...entry,
      shades: updatedShadesList
      // Don't include originalGeneratedColors - preserve existing baseline
    });

    // Also update local hex values to keep input in sync
    const newInputValues = [...inputValues];
    newInputValues[index] = getColorDisplayString(newHexColor, entry.colorFormat || "hex");
    setInputValues(newInputValues);

    // Mark this shade as individually modified
    const newIndividuallyModifiedShades = [...individuallyModifiedShades];
    newIndividuallyModifiedShades[index] = true;
    setIndividuallyModifiedShades(newIndividuallyModifiedShades);

  };

  /**
   * Handle hex input change (debounced)
   */
  const handleHexInputChange = (index: number, value: string): void => {

    // Mark this input as being edited
    const newEditingInputs = [...editingInputs];
    newEditingInputs[index] = true;
    setEditingInputs(newEditingInputs);

    // Update local state immediately for responsive typing
    const newInputValues = [...inputValues];
    newInputValues[index] = value;
    setInputValues(newInputValues);
  };

  /**
   * Handle hex input on blur (when user finishes typing)
   */
  const handleHexInputBlur = (index: number): void => {
    const value = inputValues[index];

    // Mark this input as no longer being edited
    const newEditingInputs = [...editingInputs];
    newEditingInputs[index] = false;
    setEditingInputs(newEditingInputs);

    // Try parsing with enhanced color parser
    const parsedColor = parseColorInput(value);
    if (parsedColor && parsedColor.isValid()) {
      let updatedShadesList = [...safeShadesList];
      updatedShadesList[index] = {
        ...updatedShadesList[index],
        hex: parsedColor.toHexString(),
        isCustom: true  // Mark as manually customized so it persists on reload
      };

      // This is an individual shade change, preserve original generated colors
      updateColorEntry(entry.id, {
        ...entry,
        shades: updatedShadesList
        // Don't include originalGeneratedColors - preserve existing baseline
      });

      // Update local input to show the hex format for consistency
      const newInputValues = [...inputValues];
      newInputValues[index] = getColorDisplayString(parsedColor.toHexString(), entry.colorFormat || "hex");
      setInputValues(newInputValues);

      // Mark this shade as individually modified
      const newIndividuallyModifiedShades = [...individuallyModifiedShades];
      newIndividuallyModifiedShades[index] = true;
      setIndividuallyModifiedShades(newIndividuallyModifiedShades);

    } else {
      // Reset to original value if invalid
      const newInputValues = [...inputValues];
      newInputValues[index] = getColorDisplayString(safeShadesList[index].hex, entry.colorFormat || "hex");
      setInputValues(newInputValues);
    }
  };

  /**
   * Handle input focus to track editing
   */
  const handleHexInputFocus = (index: number): void => {
    const newEditingInputs = [...editingInputs];
    newEditingInputs[index] = true;
    setEditingInputs(newEditingInputs);
  };

  /**
   * Reset hex color to original generated color
   */
  const handleHexReset = (index: number): void => {

    // Get the original generated color (the baseline from main color generation)
    const originalGeneratedColor = originalGeneratedColors[index];

    if (!originalGeneratedColor) {
      console.error('No original generated color found for index:', index);
      return;
    }

    // Reset to original generated color
    let updatedShadesList = [...safeShadesList];
    updatedShadesList[index] = {
      ...updatedShadesList[index],
      hex: originalGeneratedColor,
      isCustom: false  // Clear custom flag since we're resetting to generated
    };

    // This is a reset, not an individual modification, so preserve original colors
    updateColorEntry(entry.id, {
      ...entry,
      shades: updatedShadesList
      // Don't include originalGeneratedColors - preserve existing baseline
    });

    // Also update local input values
    const newInputValues = [...inputValues];
    newInputValues[index] = getColorDisplayString(originalGeneratedColor, entry.colorFormat || "hex");
    setInputValues(newInputValues);

    // Mark as no longer being edited
    const newEditingInputs = [...editingInputs];
    newEditingInputs[index] = false;
    setEditingInputs(newEditingInputs);

    // Mark this shade as no longer individually modified
    const newIndividuallyModifiedShades = [...individuallyModifiedShades];
    newIndividuallyModifiedShades[index] = false;
    setIndividuallyModifiedShades(newIndividuallyModifiedShades);

  };

  /**
   * Check if a color has been modified from its original
   */
  const isColorModified = (index: number): boolean => {
    // A shade is considered modified if it has been individually changed
    // from its original generated color
    const currentInputValue = inputValues[index];
    // Convert input value back to hex for comparison since it might be in different format
    const currentHex = parseColorInput(currentInputValue)?.toHexString() || safeShadesList[index]?.hex;
    const originalGeneratedHex = originalGeneratedColors[index];
    const actualShadeHex = safeShadesList[index]?.hex;
    const isBeingEdited = editingInputs[index];
    const wasIndividuallyModified = individuallyModifiedShades[index];

    /**
     * Helper function to check if two colors are visually the same (tolerance for precision differences)
     */
    const areColorsSimilar = (hex1: string, hex2: string, tolerance: number = 3): boolean => {
      if (!hex1 || !hex2) return false;
      const color1 = tinycolor(hex1).toRgb();
      const color2 = tinycolor(hex2).toRgb();

      const rDiff = Math.abs(color1.r - color2.r);
      const gDiff = Math.abs(color1.g - color2.g);
      const bDiff = Math.abs(color1.b - color2.b);

      return rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance;
    };

    // A color is modified if:
    // 1. It was marked as individually modified, OR
    // 2. Current hex differs significantly from original generated hex, OR
    // 3. Actual shade hex differs significantly from original generated hex, OR
    // 4. Currently being edited (to keep reset button visible during editing)
    const isModified = wasIndividuallyModified ||
      !areColorsSimilar(currentHex, originalGeneratedHex) ||
      !areColorsSimilar(actualShadeHex, originalGeneratedHex) ||
      isBeingEdited;

    return isModified;
  };

  return (
    <div className="flex flex-col gap-2">
      {safeShadesList.map((shade, index) => {
        const isMatched =
          tinycolor(shade.hex).toHexString().toLowerCase() ===
          tinycolor(entry.hex || '').toHexString().toLowerCase();

        return (
          <div
            key={index}
            className="hover:outline-solid flex w-full items-center gap-8 rounded-full hover:outline hover:outline-foreground"
          >
            <div
              className="rounded-md "
              style={{
                ...(isMatched && {
                  outline: "2px solid #9e9e9e",
                  outlineOffset: "2px",
                }),
              }}>
              <ColorSwatchEditor
                color={inputValues[index]}
                hsl={tinycolor(inputValues[index]).toHsl()}
                activeTab="HSL"
                setHsl={() => { }} // Not needed for shade editing
                setColor={() => { }} // Not needed for shade editing
                updateColor={() => { }} // Not needed for shade editing
                entry={entry}
                shadesList={safeShadesList}
                updateColorEntry={updateColorEntry}
                title={`Shade ${index + 1}`}
                position="left-0"
                onColorChange={(newColor) => handleShadeColorChange(shade, index, newColor)}
                colorFormat={entry.colorFormat || "hex"}
              />
            </div>
            <div className="flex w-full items-center gap-4 pl-2">
              <InputWithResetButton
                className="w-full min-w-[250px]"
                value={inputValues[index]}
                onChange={(e) => handleHexInputChange(index, e.target.value)}
                onReset={() => handleHexReset(index)}
                onBlur={() => handleHexInputBlur(index)}
                onFocus={() => handleHexInputFocus(index)}
                showReset={isColorModified(index)}
                disabled={!shade.isEnabled}
                placeholder="HEX, RGB, HSL, OKLCH"
                title="Enter color in any format: #527C9D, rgb(82 124 157), hsl(206deg 31% 47%), oklch(0.57 0.12 206)"
              />

              <Checkbox
                checked={shade.isEnabled}
                onCheckedChange={() => handleCheckBoxChange(index)}
              />
              <RadioButton
                name="shade-radio"
                checked={shade.isDefault}
                onChange={() => handleRadioChange(index)}
              />
            </div>

            <InputWithResetButton
              className="w-full max-w-[150px]"
              value={shade.name.toString()}
              onChange={(e) => handleInputChange(index, e.target.value, "name")}
              onReset={() => handleReset(index)}
              showReset={modifiedShades[index]}
            />


          </div>
        );
      })}
    </div>
  );
});

// Display name for React DevTools
ShadesList.displayName = 'ShadesList';

export default ShadesList;

/**
 * useColorEntry Hook
 * Thin React wrapper around pure calculation functions
 * Manages state and wires up calculations to UI
 */

import { useState, useEffect, useCallback, useContext } from "react";
import tinycolor from "tinycolor2";
import { WizzardContext } from "@hooks/wizzardContext";
import {
  parseHexToHsl,
  roundRgbColor,
  generateColorShades,
  createUpdatedEntry,
  getColorNameFromHex,
  parseAndValidateColor,
  getColorDisplayString,
  isValidColorInput,
  getPlaceholderText,
  getColorSourceLabel,
  isSpecialUtilityColor,
  isSystemLockedColor,
  getSpecialUtilityAbbreviation,
} from "./colorEntryCalculations";
import type { RGB, HSL } from "./colorEntryCalculations";
import type { ColorEntry as ColorEntryType, ColorShade } from "@/types/wizzard";

interface UseColorEntryProps {
  entry: ColorEntryType;
  updateColorEntry: (id: number, updatedEntry: Partial<ColorEntryType>) => void;
  onEditingChange: (isEditing: boolean, id: number) => void;
  onRemove: () => void;
}

export function useColorEntry({
  entry,
  updateColorEntry,
  onEditingChange,
  onRemove,
}: UseColorEntryProps) {
  const { localWizzardState, setLocalWizzardState } = useContext(WizzardContext);

  // Color state
  const [color, setColor] = useState<RGB>(tinycolor(entry.hex).toRgb());
  const [hsl, setHsl] = useState<HSL>(parseHexToHsl(entry.hex));
  const [inputValue, setInputValue] = useState<string>(
    (entry as any).utilityValue || getColorDisplayString(entry.hex, entry.colorFormat || "hex")
  );

  // Shade state
  const [shades, setShades] = useState<number>(entry?.shades?.length ?? 10);
  const [minLightness, setMinLightness] = useState<number>(entry.minLightness ?? 5);
  const [maxLightness, setMaxLightness] = useState<number>(entry.maxLightness ?? 95);
  const [shadesList, setShadesList] = useState<ColorShade[]>(entry.shades || []);
  const [enableShades, setEnableShades] = useState<boolean>(
    entry.enableShades !== undefined ? entry.enableShades : true
  );
  const [reverseShades, setReverseShades] = useState<boolean>(
    entry.reverseShades !== undefined ? entry.reverseShades : false
  );

  // UI state
  const [colorName, setColorName] = useState<string>(entry?.name || "Unknown");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(entry.isLocked || false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [colorFormat, setColorFormat] = useState<'hex' | 'rgb' | 'hsl' | 'oklch'>(
    entry.colorFormat || "hex"
  );

  // Derived values
  const isSystemLocked = isSystemLockedColor(entry);
  const colorSource = getColorSourceLabel(entry);
  const isSpecialUtility = isSpecialUtilityColor(entry);
  const activeTab = colorFormat === "rgb" ? "RGB" : "HSL";

  // Sync HSL when entry hex changes
  useEffect(() => {
    setHsl(parseHexToHsl(entry.hex));
  }, [entry.hex]);

  // Update input value when entry hex or color format changes
  useEffect(() => {
    setInputValue(getColorDisplayString(entry.hex, colorFormat));
  }, [entry.hex, colorFormat]);

  // Keep local shades list in sync with entry from context/store
  useEffect(() => {
    if (entry.shades) {
      setShadesList(entry.shades);
    }
  }, [entry.shades]);

  // Update entry when settings change
  useEffect(() => {
    updateColorEntry(entry.id, {
      ...entry,
      name: colorName,
      isLocked,
      colorFormat,
      enableShades,
      reverseShades,
    });
  }, [colorName, isLocked, colorFormat, enableShades, reverseShades]);

  // Update input value when color format changes
  useEffect(() => {
    if (color) {
      const hexColor = tinycolor(color).toHexString();
      setInputValue(getColorDisplayString(hexColor, colorFormat));
    }
  }, [colorFormat, color]);

  // --- Core Functions ---

  const updateShades = useCallback(
    (
      hexColor: string,
      shadesCount: number,
      minLight: number,
      maxLight: number,
      additionalUpdates: Partial<ColorEntryType> | null = null
    ) => {
      const generatedShades = generateColorShades(
        hexColor,
        shadesCount,
        minLight,
        maxLight,
        shadesList
      );

      setShadesList(generatedShades);

      const entryUpdate = createUpdatedEntry(entry, generatedShades, {
        minLightness: minLight,
        maxLightness: maxLight,
        isLocked,
        colorFormat,
        ...(additionalUpdates?.name && { colorName: additionalUpdates.name }),
        ...(additionalUpdates?.hex && { hexColor: additionalUpdates.hex }),
      });

      // Merge additional updates if provided
      const finalUpdate = additionalUpdates
        ? { ...entryUpdate, ...additionalUpdates }
        : entryUpdate;

      updateColorEntry(entry.id, finalUpdate);
    },
    [entry, shadesList, isLocked, colorFormat, updateColorEntry]
  );

  const updateColor = useCallback(
    (newColor: RGB) => {
      const hexColor = tinycolor(newColor).toHexString();
      const roundedColor = roundRgbColor(newColor);

      setColor(roundedColor);
      setInputValue(getColorDisplayString(hexColor, colorFormat));

      if (!isLocked) {
        setColorName(getColorNameFromHex(hexColor));
      }

      updateShades(hexColor, shades, minLightness, maxLightness, {
        ...entry,
        name: isLocked ? entry.name : getColorNameFromHex(hexColor),
        hex: hexColor,
        isLocked,
        colorFormat,
      });
    },
    [entry, shades, minLightness, maxLightness, isLocked, colorFormat, updateShades]
  );

  // --- Event Handlers ---

  const handleColorInputChange = useCallback(
    (value: string) => {
      const parsedRgb = parseAndValidateColor(value);
      if (parsedRgb) {
        updateColor(parsedRgb);
      } else {
        setInputValue(value);
        setColorName("Invalid Color");
      }
    },
    [updateColor]
  );

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      handleColorInputChange(e.target.value.trim());
    },
    [handleColorInputChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleColorInputChange(e.currentTarget.value.trim());
      }
    },
    [handleColorInputChange]
  );

  const handleColorChange = useCallback(
    (newColor: { hex: string }) => {
      updateColor(tinycolor(newColor.hex).toRgb());
    },
    [updateColor]
  );

  const handleClose = useCallback(() => {
    setIsEditing(false);
    onEditingChange(false, entry.id);
  }, [entry.id, onEditingChange]);

  const handleColorNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setColorName(e.target.value);
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    onEditingChange(true, entry.id);
  }, [entry.id, onEditingChange]);

  const handleDelete = useCallback(() => {
    const confirmed = window.confirm(`Are you sure you want to delete the color "${colorName}"?`);
    if (confirmed) {
      onRemove();
      handleClose();
    }
  }, [colorName, onRemove, handleClose]);

  const toggleLock = useCallback(() => {
    setIsLocked((prev) => !prev);
  }, []);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleShadesChange = useCallback(
    (value: number) => {
      setShades(value);
      updateShades(tinycolor(color).toHexString(), value, minLightness, maxLightness);
    },
    [color, minLightness, maxLightness, updateShades]
  );

  const handleMinLightnessChange = useCallback(
    (value: number) => {
      setMinLightness(value);
      updateShades(tinycolor(color).toHexString(), shades, value, maxLightness);
    },
    [color, shades, maxLightness, updateShades]
  );

  const handleMaxLightnessChange = useCallback(
    (value: number) => {
      setMaxLightness(value);
      updateShades(tinycolor(color).toHexString(), shades, minLightness, value);
    },
    [color, shades, minLightness, updateShades]
  );

  return {
    // Context
    localWizzardState,
    setLocalWizzardState,

    // Color state
    color,
    setColor,
    hsl,
    setHsl,
    inputValue,
    setInputValue,

    // Shade state
    shades,
    minLightness,
    maxLightness,
    shadesList,
    enableShades,
    setEnableShades,
    reverseShades,
    setReverseShades,

    // UI state
    colorName,
    isEditing,
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
    handleColorInputChange,
    handleInputBlur,
    handleKeyDown,
    handleColorChange,
    handleClose,
    handleColorNameChange,
    handleEdit,
    handleDelete,
    toggleLock,
    toggleExpand,
    handleShadesChange,
    handleMinLightnessChange,
    handleMaxLightnessChange,

    // Utilities
    isValidColorInput,
    getPlaceholderText,
    getSpecialUtilityAbbreviation,
  };
}

/**
 * useColorEntry Hook
 * Thin React wrapper around pure calculation functions.
 * Manages state and wires up shade generation (curve-based) to UI.
 */

import { useState, useEffect, useCallback, useContext, useRef } from "react";
import tinycolor from "tinycolor2";
import { WizzardContext } from "@hooks/wizzardContext";
import {
  parseHexToHsl,
  roundRgbColor,
  generateColorShades,
  createUpdatedEntry,
  resolveEntryCurves,
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
import {
  createDefaultCurveHandles,
  normalizeCurveHandles,
  getShadeBaseIndexForColor,
  type CurveProperty,
  type ShadeCurveHandles,
} from "./shadeCurves";
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
    entry.utilityValue || getColorDisplayString(entry.hex, entry.colorFormat || "hex")
  );

  // Shade state
  const initialShadeCount = entry?.shades?.length ?? 11;
  const initialCurves = resolveEntryCurves(entry, initialShadeCount);

  const [shades, setShades] = useState<number>(initialShadeCount);
  const [baseIndex, setBaseIndex] = useState<number>(initialCurves.baseIndex);
  const [lightnessCurve, setLightnessCurve] = useState<ShadeCurveHandles>(initialCurves.lightnessCurve);
  const [saturationCurve, setSaturationCurve] = useState<ShadeCurveHandles>(initialCurves.saturationCurve);
  const [hueCurve, setHueCurve] = useState<ShadeCurveHandles>(initialCurves.hueCurve);
  const [shadesList, setShadesList] = useState<ColorShade[]>(entry.shades || []);
  const [enableShades, setEnableShades] = useState<boolean>(
    entry.enableShades !== undefined ? entry.enableShades : true
  );
  const [reverseShades, setReverseShades] = useState<boolean>(
    entry.reverseShades !== undefined ? entry.reverseShades : false
  );

  // UI state
  const [colorName, setColorName] = useState<string>(entry?.name ?? "Unknown");
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

  useEffect(() => {
    setHsl(parseHexToHsl(entry.hex));
  }, [entry.hex]);

  useEffect(() => {
    setInputValue(getColorDisplayString(entry.hex, colorFormat));
  }, [entry.hex, colorFormat]);

  useEffect(() => {
    if (entry.shades) {
      setShadesList(entry.shades);
    }
  }, [entry.shades]);

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
      nextBaseIndex: number,
      nextLightnessCurve: ShadeCurveHandles,
      nextSaturationCurve: ShadeCurveHandles,
      nextHueCurve: ShadeCurveHandles,
      additionalUpdates: Partial<ColorEntryType> | null = null
    ) => {
      const generatedShades = generateColorShades(
        hexColor,
        shadesCount,
        nextBaseIndex,
        nextLightnessCurve,
        nextSaturationCurve,
        nextHueCurve,
        shadesList
      );

      setShadesList(generatedShades);

      const entryUpdate = createUpdatedEntry(entry, generatedShades, {
        baseIndex: nextBaseIndex,
        lightnessCurve: nextLightnessCurve,
        saturationCurve: nextSaturationCurve,
        hueCurve: nextHueCurve,
        isLocked,
        colorFormat,
        ...(additionalUpdates?.name && { colorName: additionalUpdates.name }),
        ...(additionalUpdates?.hex && { hexColor: additionalUpdates.hex }),
      });

      const finalUpdate = additionalUpdates
        ? (() => {
            const { shades: _s, originalGeneratedColors: _o, ...safe } = additionalUpdates as Partial<ColorEntryType> & {
              shades?: ColorShade[];
              originalGeneratedColors?: string[];
            };
            return { ...entryUpdate, ...safe };
          })()
        : entryUpdate;

      if (typeof updateColorEntry === 'function') {
        updateColorEntry(entry.id, finalUpdate);
      }
    },
    [entry, shadesList, isLocked, colorFormat, updateColorEntry]
  );

  const updateColor = useCallback(
    (newColor: RGB) => {
      const hexColor = tinycolor(newColor).toHexString();
      const roundedColor = roundRgbColor(newColor);
      const currentEntryHex = tinycolor(entry.hex).toHexString();
      const nextColorName = isLocked ? entry.name : getColorNameFromHex(hexColor);
      const hasHexChanged = hexColor !== currentEntryHex;
      const hasNameChanged = entry.name !== nextColorName;

      if (!hasHexChanged && !hasNameChanged) {
        return;
      }

      setColor(roundedColor);
      setInputValue(getColorDisplayString(hexColor, colorFormat));

      if (!isLocked) {
        setColorName(nextColorName);
      }

      const nextBaseIndex = getShadeBaseIndexForColor(hexColor, shades);
      setBaseIndex(nextBaseIndex);

      updateShades(hexColor, shades, nextBaseIndex, lightnessCurve, saturationCurve, hueCurve, {
        name: nextColorName,
        hex: hexColor,
        isLocked,
        colorFormat,
      });
    },
    [entry, shades, lightnessCurve, saturationCurve, hueCurve, isLocked, colorFormat, updateShades]
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
    const newName = e.target.value;
    setColorName(newName);
    if (typeof updateColorEntry === 'function') {
      updateColorEntry(entry.id, { name: newName });
    }
  }, [entry.id, updateColorEntry]);

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
    setIsLocked((prev) => {
      const newValue = !prev;
      if (typeof updateColorEntry === 'function') {
        updateColorEntry(entry.id, { isLocked: newValue });
      }
      return newValue;
    });
  }, [entry.id, updateColorEntry]);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleEnableShadesChange = useCallback((checked: boolean) => {
    setEnableShades(checked);
    if (typeof updateColorEntry === 'function') {
      updateColorEntry(entry.id, { enableShades: checked });
    }
  }, [entry.id, updateColorEntry]);

  // Debounced regeneration (curve drag fires many updates)
  const shadeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedUpdateShades = useCallback(
    (
      hexColor: string,
      count: number,
      nextBaseIndex: number,
      nextLightness: ShadeCurveHandles,
      nextSaturation: ShadeCurveHandles,
      nextHue: ShadeCurveHandles
    ) => {
      if (shadeDebounceRef.current) {
        clearTimeout(shadeDebounceRef.current);
      }
      shadeDebounceRef.current = setTimeout(() => {
        updateShades(hexColor, count, nextBaseIndex, nextLightness, nextSaturation, nextHue);
      }, 60);
    },
    [updateShades]
  );

  useEffect(() => {
    return () => {
      if (shadeDebounceRef.current) clearTimeout(shadeDebounceRef.current);
    };
  }, []);

  const handleShadesChange = useCallback(
    (value: number) => {
      setShades(value);
      debouncedUpdateShades(
        tinycolor(color).toHexString(),
        value,
        baseIndex,
        lightnessCurve,
        saturationCurve,
        hueCurve
      );
    },
    [color, baseIndex, lightnessCurve, saturationCurve, hueCurve, debouncedUpdateShades]
  );

  const handleCurveChange = useCallback(
    (property: CurveProperty, curve: ShadeCurveHandles) => {
      const normalized = normalizeCurveHandles(curve, shades, baseIndex);
      let nextLightness = lightnessCurve;
      let nextSaturation = saturationCurve;
      let nextHue = hueCurve;
      if (property === "lightness") {
        nextLightness = normalized;
        setLightnessCurve(normalized);
      } else if (property === "saturation") {
        nextSaturation = normalized;
        setSaturationCurve(normalized);
      } else {
        nextHue = normalized;
        setHueCurve(normalized);
      }
      debouncedUpdateShades(
        tinycolor(color).toHexString(),
        shades,
        baseIndex,
        nextLightness,
        nextSaturation,
        nextHue
      );
    },
    [color, shades, baseIndex, lightnessCurve, saturationCurve, hueCurve, debouncedUpdateShades]
  );

  const handleResetCurve = useCallback(
    (property: CurveProperty) => {
      const defaults = createDefaultCurveHandles(shades, baseIndex);
      handleCurveChange(property, defaults);
    },
    [shades, baseIndex, handleCurveChange]
  );

  return {
    localWizzardState,
    setLocalWizzardState,

    color,
    setColor,
    hsl,
    setHsl,
    inputValue,
    setInputValue,

    shades,
    baseIndex,
    lightnessCurve,
    saturationCurve,
    hueCurve,
    shadesList,
    enableShades,
    setEnableShades: handleEnableShadesChange,
    reverseShades,
    setReverseShades,

    colorName,
    isEditing,
    isLocked,
    isExpanded,
    colorFormat,
    setColorFormat,

    isSystemLocked,
    colorSource,
    isSpecialUtility,
    activeTab,

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
    handleCurveChange,
    handleResetCurve,

    isValidColorInput,
    getPlaceholderText,
    getSpecialUtilityAbbreviation,
  };
}

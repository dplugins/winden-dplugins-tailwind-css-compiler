// Import Static color values
import {
  dynamicColorsFSE,
  dynamicColorGroupsFSE,
  dynamicColorsBricks,
  dynamicColorsOxygen,
} from "@/dynamicData/colors";
import { tailwindDefaultColors } from "@/constants/tailwindColors";
import { oklchToHex } from "@/utils/oklchToHex";

import React, { useState, useCallback, useMemo, useContext } from "react";
import ColorEntry from "./ColorEntry";
import { colorPresets } from "./colorPresets";
import { generateColorShades } from "./colorEntryCalculations";
import { createDefaultCurveHandles, getShadeBaseIndexForColor } from "./shadeCurves";
import ColorsBuilders from "./ColorsBuilders";
import TailwindColorSelector from "./TailwindColorSelector";
// Components
import { Button } from "@el/Button";
import { ArrowButton } from "@el/ArrowButton";
import { Checkbox } from "@el/Checkbox";
import { Tooltip, TooltipTrigger, TooltipContent } from "@el/Tooltip";

// Layout
import {
  Wrapper,
  Sidebar,
  SidebarSeparator,
  Content,
} from "../components/layout/Layout";

import classnames from "classnames";

import { WizzardContext } from "@hooks/wizzardContext";
import type { ColorEntry as ColorEntryType, WizzardState } from "@/types/wizzard";

// --- Color reducer ---
type ColorAction =
  | { type: 'SET_COLORS'; colors: ColorEntryType[] }
  | { type: 'REMOVE_COLOR'; id: number }
  | { type: 'UPDATE_COLOR'; id: number; patch: Partial<ColorEntryType> };

function applyColorAction(entries: ColorEntryType[], action: ColorAction): ColorEntryType[] {
  switch (action.type) {
    case 'SET_COLORS':
      return action.colors;
    case 'REMOVE_COLOR':
      return entries.filter(e => e.id !== action.id);
    case 'UPDATE_COLOR':
      return entries.map(e => e.id === action.id ? { ...e, ...action.patch } : e);
  }
}

interface ColorProps {
  /** Label for the sidebar */
  label?: string;
}

/**
 * Color management component for the Wizzard
 * Handles color palette creation, presets, and builder integrations
 */
const Color: React.FC<ColorProps> = ({ label }) => {
  const { localWizzardState, setLocalWizzardState } =
    useContext(WizzardContext);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  const dispatchColor = useCallback((action: ColorAction) => {
    setLocalWizzardState((prevState) => ({
      ...prevState,
      colorEntries: applyColorAction(prevState?.colorEntries ?? [], action),
    }));
  }, [setLocalWizzardState]);

  const setColorEntries = useCallback(
    (colors: ColorEntryType[]) => dispatchColor({ type: 'SET_COLORS', colors }),
    [dispatchColor]
  );

  const removeColorEntry = useCallback(
    (id: number) => dispatchColor({ type: 'REMOVE_COLOR', id }),
    [dispatchColor]
  );

  const updateColorEntry = useCallback(
    (id: number, patch: Partial<ColorEntryType>) => dispatchColor({ type: 'UPDATE_COLOR', id, patch }),
    [dispatchColor]
  );

  const toggleFlag = useCallback(
    <K extends keyof WizzardState>(key: K, value: WizzardState[K]) => {
      setLocalWizzardState((prev) => ({ ...prev, [key]: value }));
    },
    [setLocalWizzardState]
  );

  const handleEditingChange = useCallback((editing: boolean, entryId: number) => {
    setIsEditing(editing);
    setEditingEntryId(editing ? entryId : null);
  }, []);

  const renderArrowButton = useCallback(
    (presetName: keyof typeof colorPresets, label: string) => (
      <ArrowButton
        variant="outline"
        className="w-full"
        onClick={() =>
          colorPresets[presetName](
            localWizzardState?.colorEntries ?? [],
            setColorEntries
          )
        }
      >
        {label}
      </ArrowButton>
    ),
    [localWizzardState?.colorEntries, setColorEntries]
  );

  const wrapperClass = useMemo(
    () =>
      classnames({
        "border-0 bg-transparent !p-0 !shadow-none": isEditing,
      }),
    [isEditing]
  );

  const contentClass = useMemo(
    () =>
      classnames("!overflow-visible", {
        "m-0 border-0 bg-transparent !p-0 !shadow-none": isEditing,
      }),
    [isEditing]
  );

  const [newlyAddedId, setNewlyAddedId] = useState<number | null>(null);

  const addColorEntry = () => {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const baseHex = '#06b6d4';
    const baseIndex = getShadeBaseIndexForColor(baseHex, 11);
    const lightnessCurve = createDefaultCurveHandles(11, baseIndex);
    const saturationCurve = createDefaultCurveHandles(11, baseIndex);
    const hueCurve = createDefaultCurveHandles(11, baseIndex);
    const newEntry: ColorEntryType = {
      id,
      name: '',
      hex: baseHex,
      colorFormat: 'hex',
      baseIndex,
      lightnessCurve,
      saturationCurve,
      hueCurve,
      shades: generateColorShades(baseHex, 11, baseIndex, lightnessCurve, saturationCurve, hueCurve),
      isLocked: false,
      enableShades: true,
      reverseShades: false,
    };
    setColorEntries([...(localWizzardState?.colorEntries ?? []), newEntry]);
    setNewlyAddedId(id);
  };

  // Build combined colors array for display
  const allDisplayColors = useMemo(() => {
    const colors = [...(localWizzardState?.colorEntries ?? [])];

    // Add utility colors if enabled
    if (localWizzardState?.includeUtilityColors) {
      colors.push(
        { id: 999992, name: 'white', hex: '#ffffff', isUtility: true, locked: true, enableShades: false, utilityValue: 'white' },
        { id: 999993, name: 'black', hex: '#000000', isUtility: true, locked: true, enableShades: false, utilityValue: 'black' },
        { id: 999991, name: 'transparent', hex: 'rgba(0, 0, 0, 0)', isUtility: true, locked: true, enableShades: false, utilityValue: 'transparent' },
        { id: 999995, name: 'inherit', hex: 'inherit', isUtility: true, locked: true, enableShades: false, utilityValue: 'inherit' },
        { id: 999994, name: 'current', hex: 'currentColor', isUtility: true, locked: true, enableShades: false, utilityValue: 'currentColor' }
      );
    }

    // Add selected Tailwind colors if any
    if (localWizzardState?.includeTailwindColors && localWizzardState.includeTailwindColors.length > 0) {
      let idCounter = 999500;
      localWizzardState.includeTailwindColors.forEach((colorName) => {
        const tailwindColor = tailwindDefaultColors[colorName];
        if (tailwindColor) {
          // Convert OKLCH shades to a format similar to custom colors
          // Keep OKLCH in shades for CSS output
          const shades = Object.entries(tailwindColor).map(([shadeName, oklchValue]) => ({
            name: shadeName,
            hex: oklchValue as string, // Store OKLCH as-is for CSS generation
            isEnabled: true,
            isDefault: false,
          }));

          // Get the 500 shade as the base color (middle/primary shade)
          const baseColorOklch = tailwindColor['500'] || tailwindColor['600'] || Object.values(tailwindColor)[5];

          // Convert OKLCH to HEX for display (tinycolor can't parse OKLCH)
          const baseColorHex = oklchToHex(baseColorOklch);

          colors.push({
            id: idCounter++,
            name: colorName,
            hex: baseColorHex, // Use HEX for color display/swatch
            shades,
            isTailwind: true,
            locked: true,
            enableShades: true,
            reverseShades: false,
          });
        }
      });
    }

    // Add FSE colors if enabled
    if (localWizzardState?.extendColorsFSE && Object.keys(dynamicColorsFSE)?.length) {
      const fseColors = dynamicColorGroupsFSE && Object.keys(dynamicColorGroupsFSE)?.length
        ? dynamicColorGroupsFSE
        : dynamicColorsFSE;

      let idCounter = 999900;
      Object.entries(fseColors).forEach(([name, value]) => {
        if (typeof value === 'string') {
          colors.push({ id: idCounter++, name, hex: value, isFSE: true, locked: true, enableShades: false });
        } else if (Array.isArray(value)) {
          value.forEach((item: { slug?: string; color: string }) => {
            colors.push({ id: idCounter++, name: item.slug || name, hex: item.color, isFSE: true, locked: true, enableShades: false });
          });
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([shade, hex]) => {
            colors.push({ id: idCounter++, name: `${name}-${shade}`, hex: hex as string, isFSE: true, locked: true, enableShades: false });
          });
        }
      });
    }

    // Add Bricks colors if enabled
    if (localWizzardState?.extendColorsBricks && Object.keys(dynamicColorsBricks)?.length) {
      let idCounter = 999800;
      Object.entries(dynamicColorsBricks).forEach(([name, value]) => {
        if (typeof value === 'string') {
          colors.push({ id: idCounter++, name, hex: value, isBricks: true, locked: true, enableShades: false });
        } else if (Array.isArray(value)) {
          value.forEach((item: { slug?: string; color: string }) => {
            colors.push({ id: idCounter++, name: item.slug || name, hex: item.color, isBricks: true, locked: true, enableShades: false });
          });
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([shade, hex]) => {
            colors.push({ id: idCounter++, name: `${name}-${shade}`, hex: hex as string, isBricks: true, locked: true, enableShades: false });
          });
        }
      });
    }

    // Add Oxygen colors if enabled
    if (localWizzardState?.extendColorsOxygen && Object.keys(dynamicColorsOxygen)?.length) {
      let idCounter = 999700;
      Object.entries(dynamicColorsOxygen).forEach(([name, value]) => {
        if (typeof value === 'string') {
          colors.push({ id: idCounter++, name, hex: value, isOxygen: true, locked: true, enableShades: false });
        } else if (Array.isArray(value)) {
          value.forEach((item: { slug?: string; color: string }) => {
            colors.push({ id: idCounter++, name: item.slug || name, hex: item.color, isOxygen: true, locked: true, enableShades: false });
          });
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([shade, hex]) => {
            colors.push({ id: idCounter++, name: `${name}-${shade}`, hex: hex as string, isOxygen: true, locked: true, enableShades: false });
          });
        }
      });
    }

    return colors;
  }, [
    localWizzardState?.colorEntries,
    localWizzardState?.includeUtilityColors,
    localWizzardState?.includeTailwindColors,
    localWizzardState?.extendColorsFSE,
    localWizzardState?.extendColorsBricks,
    localWizzardState?.extendColorsOxygen
  ]);

  return (
    <>
      <Wrapper className={wrapperClass}>
        {!isEditing && (
          <Sidebar label={label}>
            <div className="space-y-4">
              {renderArrowButton("all", "Load Preset")}
            </div>

            <div className="space-y-4">
              <TailwindColorSelector
                selectedColors={localWizzardState?.includeTailwindColors ?? []}
                onSelectionChange={(colors) => toggleFlag('includeTailwindColors', colors)}
                extendColors={localWizzardState?.extendColors ?? true}
                includeUtilityColors={localWizzardState?.includeUtilityColors ?? false}
                onUtilityColorsChange={(checked) => toggleFlag('includeUtilityColors', checked)}
              />
            </div>

            <SidebarSeparator label="Use design tokens from page builders" />

            {Object.keys(dynamicColorsFSE)?.length ? (
              <Checkbox
                label="Use FSE colors"
                checked={localWizzardState?.extendColorsFSE}
                onCheckedChange={(checked) => toggleFlag('extendColorsFSE', checked as boolean)}
              />
            ) : null}
            {Object.keys(dynamicColorsBricks)?.length ? (
              <Checkbox
                label="Use Bricks colors"
                checked={localWizzardState?.extendColorsBricks}
                onCheckedChange={(checked) => toggleFlag('extendColorsBricks', checked as boolean)}
              />
            ) : null}
            {Object.keys(dynamicColorsOxygen)?.length ? (
              <Checkbox
                label="Use Oxygen colors"
                checked={localWizzardState?.extendColorsOxygen}
                onCheckedChange={(checked) => toggleFlag('extendColorsOxygen', checked as boolean)}
              />
            ) : null}

            <SidebarSeparator label="Keep tailwind default colors" />

            <Checkbox
              label="Extend"
              checked={localWizzardState?.extendColors}
              onCheckedChange={(checked) => toggleFlag('extendColors', checked as boolean)}
            />
          </Sidebar>
        )}
        <Content className={contentClass}>
          {allDisplayColors.length > 0 && (
            <div className="mb-8 flex flex-col gap-0 border border-input rounded-md">
              {allDisplayColors.map((entry) =>
                isEditing ? (
                  editingEntryId === entry.id && (
                    <ColorEntry
                      key={entry.id}
                      entry={entry}
                      onRemove={() => removeColorEntry(entry.id)}
                      updateColorEntry={updateColorEntry}
                      onEditingChange={handleEditingChange}
                      autoFocusName={entry.id === newlyAddedId}
                    />
                  )
                ) : (
                  <ColorEntry
                    key={entry.id}
                    entry={entry}
                    onRemove={() => removeColorEntry(entry.id)}
                    updateColorEntry={updateColorEntry}
                    onEditingChange={handleEditingChange}
                    autoFocusName={entry.id === newlyAddedId}
                  />
                )
              )}
            </div>
          )}

          {!isEditing && (
            <Button onClick={addColorEntry} size="lg" variant="default">
              + Add Color
            </Button>
          )}
        </Content>
      </Wrapper>
    </>
  );
};

export default Color;

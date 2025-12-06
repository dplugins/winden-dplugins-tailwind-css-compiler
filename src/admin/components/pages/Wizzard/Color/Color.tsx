// Import Static color values
import {
  dynamicColorsFSE,
  dynamicColorGroupsFSE,
  dynamicColorsBricks,
  dynamicColorsOxygen,
} from "@/dynamicData/colors";

import React, { useState, useCallback, useMemo, useContext } from "react";
import ColorEntry from "./ColorEntry";
import { colorPresets } from "./colorPresets";
import ColorsBuilders from "./ColorsBuilders";
import ColorsUtility from "./ColorsUtility";
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
import type { ColorEntry as ColorEntryType } from "@/types/wizzard";

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

  const setColorEntries = (colors: ColorEntryType[]) => {
    const _state = { ...localWizzardState };
    _state.colorEntries = colors;
    setLocalWizzardState(_state);
  };

  const removeColorEntry = (id: number) => {
    setColorEntries(
      (localWizzardState?.colorEntries ?? []).filter((entry) => entry.id !== id)
    );
  };

  const updateColorEntry = (id: number, updatedEntry: Partial<ColorEntryType>) => {
    setColorEntries(
      (localWizzardState?.colorEntries ?? []).map((entry) =>
        entry.id === id ? { ...entry, ...updatedEntry } : entry
      )
    );
  };

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
      classnames({
        "m-0 border-0 bg-transparent !p-0 !shadow-none": isEditing,
      }),
    [isEditing]
  );

  const addColorEntry = () => {
    colorPresets.tahiti(localWizzardState?.colorEntries ?? [], setColorEntries);
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
          value.forEach((item: any) => {
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
          value.forEach((item: any) => {
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
          value.forEach((item: any) => {
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Checkbox
                      label="Include Utility Colors"
                      checked={localWizzardState?.includeUtilityColors}
                      onCheckedChange={(checked) => {
                        const _state = { ...localWizzardState };
                        _state.includeUtilityColors = checked as boolean;
                        setLocalWizzardState(_state);
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  white, black, transparent, current, inherit, auto
                </TooltipContent>
              </Tooltip>
            </div>

            <SidebarSeparator label="Builders integration" />

            {Object.keys(dynamicColorsFSE)?.length ? (
              <Checkbox
                label="Include FSE Colors"
                checked={localWizzardState?.extendColorsFSE}
                onCheckedChange={(checked) => {
                  const _state = { ...localWizzardState };
                  _state.extendColorsFSE = checked as boolean;
                  setLocalWizzardState(_state);
                }}
              />
            ) : null}
            {Object.keys(dynamicColorsBricks)?.length ? (
              <Checkbox
                label="Include Bricks Colors"
                checked={localWizzardState?.extendColorsBricks}
                onCheckedChange={(checked) => {
                  const _state = { ...localWizzardState };
                  _state.extendColorsBricks = checked as boolean;
                  setLocalWizzardState(_state);
                }}
              />
            ) : null}
            {Object.keys(dynamicColorsOxygen)?.length ? (
              <Checkbox
                label="Include Oxygen Colors"
                checked={localWizzardState?.extendColorsOxygen}
                onCheckedChange={(checked) => {
                  const _state = { ...localWizzardState };
                  _state.extendColorsOxygen = checked as boolean;
                  setLocalWizzardState(_state);
                }}
              />
            ) : null}

            <SidebarSeparator label="Keep tailwind default colors" />

            <Checkbox
              label="Extend"
              checked={localWizzardState?.extendColors}
              onCheckedChange={(checked) => {
                const _state = { ...localWizzardState };
                _state.extendColors = checked as boolean;
                setLocalWizzardState(_state);
              }}
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
                    />
                  )
                ) : (
                  <ColorEntry
                    key={entry.id}
                    entry={entry}
                    onRemove={() => removeColorEntry(entry.id)}
                    updateColorEntry={updateColorEntry}
                    onEditingChange={handleEditingChange}
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

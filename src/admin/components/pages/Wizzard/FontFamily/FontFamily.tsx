import React, { useState, useContext } from "react";
import {
  Wrapper,
  Sidebar,
  Content,
  SidebarSeparator,
} from "../components/layout/Layout";
import { Checkbox } from "@el/Checkbox";
import { ArrowButton } from "@el/ArrowButton";
import ListWithButton from "../components/layout/ListWithButton";
import { fontPresets } from "./fontPresets";

import { WizzardContext } from "@hooks/wizzardContext";

import {
  dynamicFontFamilyFSE,
  dynamicFontFamilyBricks,
  dynamicFontFamilyOxygen,
  dynamicFontHero,
} from "@/dynamicData/fontFamily";

import { DynamicFontFamily } from "./DynamicFontFamily";

interface FontFamilyEntry {
  name: string;
  value: string | string[];
}

interface FontFamilyProps {
  label: string;
}

/**
 * Font family configuration component
 * @param label - Label for the sidebar
 */
const FontFamily: React.FC<FontFamilyProps> = ({ label }) => {
  const { localWizzardState, setLocalWizzardState } =
    useContext(WizzardContext);
  const [isDisabled, setIsDisabled] = useState(false);

  /**
   * Update a font family entry
   */
  const updateFontFamily = (index: number, updates: Partial<FontFamilyEntry>): void => {
    const updatedList = [...(localWizzardState?.fontFamily ?? [])];
    updatedList[index] = { ...updatedList[index], ...updates };

    const _state = { ...localWizzardState };
    _state.fontFamily = updatedList;
    setLocalWizzardState(_state);
  };

  /**
   * Handle name change for font family
   */
  const handleNameChange = (index: number, name: string): void => {
    updateFontFamily(index, { name });
  };

  /**
   * Handle value change for font family
   */
  const handleValueChange = (index: number, value: string): void => {
    const formattedValue = value
      .split(",")
      .map((v) => v.trim())
      .join(", ");
    updateFontFamily(index, { value: formattedValue });
  };

  /**
   * Add a new font family
   */
  const addFontFamily = (): void => {
    const newFontFamily: FontFamilyEntry = { name: "", value: "" };

    const _state = { ...localWizzardState };
    _state.fontFamily = [
      ...(localWizzardState?.fontFamily ?? []),
      newFontFamily,
    ];
    setLocalWizzardState(_state);
  };

  /**
   * Delete a font family by index
   */
  const deleteFontFamily = (index: number): void => {
    const updatedList = [...(localWizzardState?.fontFamily ?? [])];
    updatedList.splice(index, 1);

    const _state = { ...localWizzardState };
    _state.fontFamily = updatedList;
    setLocalWizzardState(_state);
  };

  /**
   * Load preset font families
   */
  const loadPreset = (preset: FontFamilyEntry[]): void => {
    const _state = { ...localWizzardState };
    _state.fontFamily = preset;
    setLocalWizzardState(_state);
  };

  /**
   * Toggle extend font family flag
   */
  const toggleExtend = (isChecked: boolean): void => {
    const _state = { ...localWizzardState };
    _state.extendFontFamily = isChecked;
    setLocalWizzardState(_state);
  };

  /**
   * Import font families from clipboard
   */
  const importFontFamiliesFromClipboard = async (): Promise<void> => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const newFontFamilies = parseClipboardText(clipboardText);
      const _state = { ...localWizzardState };
      _state.fontFamily = [
        ...(localWizzardState?.fontFamily ?? []),
        ...newFontFamilies,
      ];
      setLocalWizzardState(_state);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  };

  /**
   * Parse clipboard text into font families
   */
  const parseClipboardText = (text: string): FontFamilyEntry[] => {
    const lines = text.split("\n");
    return lines
      .map((line) => {
        const match = line.match(/'([^']+)': '([^']+)'/);
        if (match) {
          return { name: match[1], value: match[2] };
        }
        return null;
      })
      .filter(Boolean) as FontFamilyEntry[]; // Remove null values
  };

  return (
    <>
      <Wrapper>
        <Sidebar label={label}>
          <div className="space-y-4">
            <ArrowButton
              variant="outline"
              className="w-full text-left"
              onClick={() => loadPreset(fontPresets.preset1)}
            >
              Load Preset: Title, Body
            </ArrowButton>
            <ArrowButton
              variant="outline"
              className="w-full text-left"
              onClick={() => loadPreset(fontPresets.preset2)}
            >
              Load Preset: Title, SubTitle, Body
            </ArrowButton>
            {/* <ArrowButton
              variant="outline"
              className="w-full text-left"
              onClick={importFontFamiliesFromClipboard}
            >
              Import Font Families from Clipboard
            </ArrowButton> */}
          </div>

          <SidebarSeparator label="Use design tokens from page builders" />
          {Object.keys(dynamicFontFamilyFSE)?.length ? (
            <Checkbox
              label="Use FSE font families"
              checked={localWizzardState?.extendFontFamilyFSE}
              onCheckedChange={(checked) => {
                const _state = { ...localWizzardState };
                _state.extendFontFamilyFSE = checked as boolean;
                setLocalWizzardState(_state);
              }}
            />
          ) : null}
          {Object.keys(dynamicFontFamilyBricks)?.length ? (
            <Checkbox
              label="Use Bricks font families"
              checked={localWizzardState?.extendFontFamilyBricks}
              onCheckedChange={(checked) => {
                const _state = { ...localWizzardState };
                _state.extendFontFamilyBricks = checked as boolean;
                setLocalWizzardState(_state);
              }}
            />
          ) : null}
          {Object.keys(dynamicFontFamilyOxygen)?.length ? (
            <Checkbox
              label="Use Oxygen font families"
              checked={localWizzardState?.extendFontFamilyOxygen}
              onCheckedChange={(checked) => {
                const _state = { ...localWizzardState };
                _state.extendFontFamilyOxygen = checked as boolean;
                setLocalWizzardState(_state);
              }}
            />
          ) : null}
          {Object.keys(dynamicFontHero)?.length ? (
            <Checkbox
              label="Include Font Hero"
              checked={localWizzardState?.extendFontHero}
              onCheckedChange={(checked) => {
                const _state = { ...localWizzardState };
                _state.extendFontHero = checked as boolean;
                setLocalWizzardState(_state);
              }}
            />
          ) : null}

          <SidebarSeparator label="Keep tailwind default font families" />
          <Checkbox
            label="Extend"
            checked={localWizzardState?.extendFontFamily ?? false}
            onCheckedChange={(checked) => toggleExtend(checked as boolean)}
            disabled={isDisabled}
          />
        </Sidebar>
        <Content>
          <ListWithButton
            items={localWizzardState?.fontFamily ?? []}
            onNameChange={handleNameChange}
            onValueChange={handleValueChange}
            onDelete={deleteFontFamily}
            onAddNew={addFontFamily}
            label1="Font Name"
            label2="Font Value"
            labelButton="Font Family"
          />

          {localWizzardState?.extendFontFamilyFSE &&
          Object.keys(dynamicFontFamilyFSE)?.length ? (
            <DynamicFontFamily
              title="FSE Preview"
              entries={dynamicFontFamilyFSE}
            />
          ) : null}
          {localWizzardState?.extendFontFamilyBricks &&
          Object.keys(dynamicFontFamilyBricks)?.length ? (
            <DynamicFontFamily
              title="Bricks Preview"
              entries={dynamicFontFamilyBricks}
            />
          ) : null}
          {localWizzardState?.extendFontFamilyOxygen &&
          Object.keys(dynamicFontFamilyOxygen)?.length ? (
            <DynamicFontFamily
              title="Oxygen Preview"
              entries={dynamicFontFamilyOxygen}
            />
          ) : null}
          {localWizzardState?.extendFontHero &&
          Object.keys(dynamicFontHero)?.length ? (
            <DynamicFontFamily
              title="Font Hero Preview"
              entries={dynamicFontHero}
            />
          ) : null}
        </Content>
      </Wrapper>
    </>
  );
};

export default FontFamily;

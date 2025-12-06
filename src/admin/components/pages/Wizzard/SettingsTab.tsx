import React, { useContext } from "react";
import { Wrapper, Sidebar, Content } from "./components/layout/Layout";
import { Checkbox } from "@el/Checkbox";
import { WizzardContext, defaultWizzardState } from "@hooks/wizzardContext";

interface Setting {
  key: string;
  label: string;
}

const settings: Setting[] = [
  { key: "colorsActive", label: "Colors" },
  { key: "fontSizesActive", label: "Font Sizes" },
  { key: "fontFamilyActive", label: "Font Family" },
  { key: "spacesActive", label: "Spaces" },
  { key: "borderRadiusActive", label: "Border Radius" },
  { key: "breakpointsActive", label: "Breakpoints" },
];

/**
 * Calculate fluid typography/spacing clamp values
 */
function calculateClamp(
  minBase: number,
  maxBase: number,
  minScreen: number,
  maxScreen: number,
  useRem: boolean,
  remSize: number,
  decimalPlaces: number
): string {
  const minSize = useRem ? minBase / remSize : minBase;
  const maxSize = useRem ? maxBase / remSize : maxBase;
  const unit = useRem ? 'rem' : 'px';

  const slope = (maxSize - minSize) / (maxScreen - minScreen);
  const intersection = -minScreen * slope + minSize;

  const min = minSize.toFixed(decimalPlaces) + unit;
  const max = maxSize.toFixed(decimalPlaces) + unit;
  const preferred = `${intersection.toFixed(decimalPlaces)}${unit} + ${(slope * 100).toFixed(2)}vi`;

  return `clamp(${min}, ${preferred}, ${max})`;
}

interface SettingsTabProps {
  label: string;
  onStateChange?: () => void;
  setClampsFontSize?: (clamps: any) => void;
  setClampsSpacing?: (clamps: any) => void;
  setClampsBorderRadius?: (clamps: any) => void;
}

/**
 * Settings tab for enabling/disabling wizard features
 * @param label - Tab label
 */
const SettingsTab: React.FC<SettingsTabProps> = ({
  label,
  onStateChange,
  setClampsFontSize,
  setClampsSpacing,
  setClampsBorderRadius
}) => {
  const { localWizzardState, setLocalWizzardState } =
    useContext(WizzardContext);

  return (
    <>
      <Wrapper>
        <Sidebar label={label}>
          <div className="space-y-4">
            {settings.map(({ key, label }) => (
              <Checkbox
                key={key}
                label={label}
                checked={localWizzardState?.[key as keyof typeof localWizzardState] as boolean}
                onCheckedChange={() => {
                  const _state = { ...localWizzardState };
                  const currentValue = localWizzardState?.[key as keyof typeof localWizzardState] as boolean;
                  const newValue = !currentValue;

                  _state[key as keyof typeof _state] = newValue;

                  // Initialize defaults when enabling features
                  if (newValue) {
                    if (key === 'fontSizesActive') {
                      if (!_state.fontSize?.steps?.length) {
                        _state.fontSize = { ...defaultWizzardState.fontSize };
                      }

                      // Calculate overrides with clamp values
                      if (_state.fontSize?.steps?.length && !_state.fontSize?.overrides) {
                        const baseIndex = _state.fontSize.steps.indexOf(_state.fontSize.baseStep || "base");
                        const baseStepIndex = baseIndex >= 0 ? baseIndex : Math.floor(_state.fontSize.steps.length / 2);

                        const overrides: any = {};
                        _state.fontSize.steps.forEach((step: string, index: number) => {
                          const stepDifference = index - baseStepIndex;
                          const minBase = _state.fontSize.minBaseSize * Math.pow(_state.fontSize.minScaleRatio, stepDifference);
                          const maxBase = _state.fontSize.maxBaseSize * Math.pow(_state.fontSize.maxScaleRatio, stepDifference);

                          const clampValue = calculateClamp(
                            minBase,
                            maxBase,
                            _state.fontSize.minScreenSize,
                            _state.fontSize.maxScreenSize,
                            _state.fontSize.useRem,
                            _state.fontSize.remSize,
                            _state.fontSize.decimalPlaces
                          );

                          overrides[step] = {
                            enabled: true,
                            value: clampValue,
                            fluidClamp: clampValue,
                            minBase: minBase.toFixed(_state.fontSize.decimalPlaces),
                            maxBase: maxBase.toFixed(_state.fontSize.decimalPlaces)
                          };
                        });
                        _state.fontSize.overrides = overrides;

                        // Update the clamps in the parent component
                        if (setClampsFontSize) {
                          setClampsFontSize(overrides);
                        }
                      }

                      // Ensure extend properties are set to true by default
                      if (_state.extendFontSizesFSE === undefined) _state.extendFontSizesFSE = false;
                      if (_state.extendFontSizesBricks === undefined) _state.extendFontSizesBricks = false;
                      if (_state.extendFontSizesOxygen === undefined) _state.extendFontSizesOxygen = false;
                    } else if (key === 'spacesActive') {
                      if (!_state.spacing?.steps?.length) {
                        _state.spacing = { ...defaultWizzardState.spacing };
                      }

                      // Calculate overrides with clamp values
                      if (_state.spacing?.steps?.length && !_state.spacing?.overrides) {
                        const baseIndex = _state.spacing.steps.indexOf(_state.spacing.baseStep || "base");
                        const baseStepIndex = baseIndex >= 0 ? baseIndex : Math.floor(_state.spacing.steps.length / 2);

                        const overrides: any = {};
                        _state.spacing.steps.forEach((step: string, index: number) => {
                          const stepDifference = index - baseStepIndex;
                          const minBase = _state.spacing.minBaseSize * Math.pow(_state.spacing.minScaleRatio, stepDifference);
                          const maxBase = _state.spacing.maxBaseSize * Math.pow(_state.spacing.maxScaleRatio, stepDifference);

                          const clampValue = calculateClamp(
                            minBase,
                            maxBase,
                            _state.spacing.minScreenSize,
                            _state.spacing.maxScreenSize,
                            _state.spacing.useRem,
                            _state.spacing.remSize,
                            _state.spacing.decimalPlaces
                          );

                          overrides[step] = {
                            enabled: true,
                            value: clampValue,
                            fluidClamp: clampValue,
                            minBase: minBase.toFixed(_state.spacing.decimalPlaces),
                            maxBase: maxBase.toFixed(_state.spacing.decimalPlaces)
                          };
                        });
                        _state.spacing.overrides = overrides;

                        // Update the clamps in the parent component
                        if (setClampsSpacing) {
                          setClampsSpacing(overrides);
                        }
                      }

                      // Ensure extend properties are set to true by default
                      if (_state.extendSpacingFSE === undefined) _state.extendSpacingFSE = false;
                      if (_state.extendSpacingBricks === undefined) _state.extendSpacingBricks = false;
                      if (_state.extendSpacingOxygen === undefined) _state.extendSpacingOxygen = false;
                    } else if (key === 'borderRadiusActive') {
                      if (!_state.borderRadius?.steps?.length) {
                        _state.borderRadius = { ...defaultWizzardState.borderRadius };
                      }

                      // Calculate overrides with clamp values
                      if (_state.borderRadius?.steps?.length && !_state.borderRadius?.overrides) {
                        const baseIndex = _state.borderRadius.steps.indexOf(_state.borderRadius.baseStep || "base");
                        const baseStepIndex = baseIndex >= 0 ? baseIndex : Math.floor(_state.borderRadius.steps.length / 2);

                        const overrides: any = {};
                        _state.borderRadius.steps.forEach((step: string, index: number) => {
                          const stepDifference = index - baseStepIndex;
                          const minBase = _state.borderRadius.minBaseSize * Math.pow(_state.borderRadius.minScaleRatio, stepDifference);
                          const maxBase = _state.borderRadius.maxBaseSize * Math.pow(_state.borderRadius.maxScaleRatio, stepDifference);

                          const clampValue = calculateClamp(
                            minBase,
                            maxBase,
                            _state.borderRadius.minScreenSize,
                            _state.borderRadius.maxScreenSize,
                            _state.borderRadius.useRem,
                            _state.borderRadius.remSize,
                            _state.borderRadius.decimalPlaces
                          );

                          overrides[step] = {
                            enabled: true,
                            value: clampValue,
                            fluidClamp: clampValue,
                            minBase: minBase.toFixed(_state.borderRadius.decimalPlaces),
                            maxBase: maxBase.toFixed(_state.borderRadius.decimalPlaces)
                          };
                        });
                        _state.borderRadius.overrides = overrides;

                        // Update the clamps in the parent component
                        if (setClampsBorderRadius) {
                          setClampsBorderRadius(overrides);
                        }
                      }

                      // Ensure extend properties are set to true by default
                      if (_state.extendBorderRadius === undefined) _state.extendBorderRadius = defaultWizzardState.extendBorderRadius;
                      if (_state.extendBorderRadiusFSE === undefined) _state.extendBorderRadiusFSE = false;
                      if (_state.extendBorderRadiusBricks === undefined) _state.extendBorderRadiusBricks = false;
                      if (_state.extendBorderRadiusOxygen === undefined) _state.extendBorderRadiusOxygen = false;
                    } else if (key === 'colorsActive') {
                      // Ensure extend properties are set to true by default
                      if (_state.extendColors === undefined) _state.extendColors = defaultWizzardState.extendColors;
                      if (_state.includeUtilityColors === undefined) _state.includeUtilityColors = defaultWizzardState.includeUtilityColors;
                      if (_state.extendColorsFSE === undefined) _state.extendColorsFSE = false;
                      if (_state.extendColorsBricks === undefined) _state.extendColorsBricks = false;
                      if (_state.extendColorsOxygen === undefined) _state.extendColorsOxygen = false;
                    } else if (key === 'fontFamilyActive') {
                      // Ensure extend properties are set to true by default
                      if (_state.extendFontFamily === undefined) _state.extendFontFamily = defaultWizzardState.extendFontFamily;
                      if (_state.extendFontFamilyFSE === undefined) _state.extendFontFamilyFSE = false;
                      if (_state.extendFontFamilyBricks === undefined) _state.extendFontFamilyBricks = false;
                      if (_state.extendFontFamilyOxygen === undefined) _state.extendFontFamilyOxygen = false;
                      if (_state.extendFontHero === undefined) _state.extendFontHero = false;
                    } else if (key === 'breakpointsActive') {
                      // Ensure extend properties are set to true by default
                      if (_state.extendBreakpoints === undefined) _state.extendBreakpoints = defaultWizzardState.extendBreakpoints;
                      if (_state.desktopFirst === undefined) _state.desktopFirst = defaultWizzardState.desktopFirst;
                      if (_state.extendScreensFSE === undefined) _state.extendScreensFSE = false;
                      if (_state.extendScreensBricks === undefined) _state.extendScreensBricks = false;
                      if (_state.extendScreensOxygen === undefined) _state.extendScreensOxygen = false;
                    }
                  }

                  setLocalWizzardState(_state);

                  // Trigger config regeneration in parent component
                  if (onStateChange) {
                    setTimeout(() => onStateChange(), 10);
                  }
                }}
              />
            ))}
          </div>
        </Sidebar>
        <Content className="bg-base-foreground dark:bg-black">
          <div
            id="code-preview"
            className="w-full overflow-hidden rounded bg-base-foreground text-sm text-base-1/60 dark:bg-black dark:!text-base-foreground"
            dangerouslySetInnerHTML={{
              __html: `<pre>${localWizzardState?.configCode ?? ""}</pre>`,
            }}
          ></div>
        </Content>
      </Wrapper>
    </>
  );
};

export default SettingsTab;

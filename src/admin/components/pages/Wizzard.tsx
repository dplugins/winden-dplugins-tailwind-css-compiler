import { useEffect, useContext, useRef, useCallback, useMemo } from "react";

// Components
import * as Tabs from "@radix-ui/react-tabs";
import WizzardTabs, { generateTabConfig } from "./Wizzard/WizzardTabs";
import WizzardContent from "./Wizzard/WizzardContent";

// Utilities
import { useClampCalculator } from "@hooks/useClampCalculator";
import { useActiveTab } from "@hooks/useActiveTab";
import { generateWizzardConfig } from "@/utils/wizzardConfigManager";

import { WizzardContext, defaultWizzardState } from "@hooks/wizzardContext";

const Wizzard = () => {
  /**
   * State
   */
  const { localWizzardState, setLocalWizzardState } = useContext(
    WizzardContext
  ) as WizzardContextType;

  // Data is loaded and kept in sync via the App-level useWizzardContent hook

  // Use custom hook for clamp calculations (replaces ~240 lines of duplicated code)
  const fontSize = useClampCalculator('fontSize', localWizzardState);
  const spacing = useClampCalculator('spacing', localWizzardState);
  const borderRadius = useClampCalculator('borderRadius', localWizzardState);

  // Keep a ref to the current wizard state for use in callbacks
  const wizardStateRef = useRef(localWizzardState);
  useEffect(() => {
    wizardStateRef.current = localWizzardState;
  }, [localWizzardState]);

  // Generate tab configuration based on active features (memoized)
  const tabConfig = useMemo(() => generateTabConfig(localWizzardState), [
    localWizzardState?.colorsActive,
    localWizzardState?.fontSizesActive,
    localWizzardState?.fontFamilyActive,
    localWizzardState?.spacesActive,
    localWizzardState?.borderRadiusActive,
    localWizzardState?.breakpointsActive,
  ]);

  // Manage active tab state with custom hook
  const { activeTab, setActiveTab } = useActiveTab({
    localWizzardState,
    setLocalWizzardState,
    tabConfig,
  });

  /**
   * Regenerate Tailwind config from current Wizzard state
   *
   * Uses utility functions to process colors, builder extensions, and generate
   * the final @theme configuration. Simplified from ~210 lines to ~20 lines.
   *
   * @param shouldSave - Whether to save the generated config to database
   */
  const regenerateConfig = useCallback((shouldSave = false) => {
    // Use the ref to get the current state, not the closure
    const currentState = wizardStateRef.current;

    // Generate config using utility functions
    const config = generateWizzardConfig({
      wizzardState: currentState,
      clampsFontSize: fontSize.clamps,
      clampsSpacing: spacing.clamps,
      clampsBorderRadius: borderRadius.clamps,
    });

    // Update state with new config
    const _state = { ...currentState };
    _state.configCode = config;
    setLocalWizzardState(_state);

    // Note: We don't auto-save here to avoid conflicts with the Backups system.
    // The wizard state is saved to winden_editor['wizzard'] when the user clicks
    // the main Save button. The winden_wizzard_state option is reserved for backups only.
  }, [fontSize.clamps, spacing.clamps, borderRadius.clamps, setLocalWizzardState]);

  // Track if clamps have been initialized
  const clampsInitialized = useRef(false);

  // Create a stable hash of all config dependencies to reduce re-render checks
  // This replaces a 30+ dependency array with a single computed value
  const configDependencyHash = useMemo(() => {
    if (!localWizzardState) return '';

    // Serialize all config-affecting values into a stable string
    return JSON.stringify({
      // Breakpoints
      breakpoints: localWizzardState.breakpoints,
      extendBreakpoints: localWizzardState.extendBreakpoints,
      desktopFirst: localWizzardState.desktopFirst,
      breakpointsActive: localWizzardState.breakpointsActive,

      // Font Family
      fontFamily: localWizzardState.fontFamily,
      extendFontFamily: localWizzardState.extendFontFamily,
      fontFamilyActive: localWizzardState.fontFamilyActive,

      // Colors
      colorEntries: localWizzardState.colorEntries,
      extendColors: localWizzardState.extendColors,
      includeUtilityColors: localWizzardState.includeUtilityColors,
      colorsActive: localWizzardState.colorsActive,

      // Spacing
      spacingClamps: spacing.clamps,
      spacingExtend: localWizzardState.spacing?.extend,
      spacesActive: localWizzardState.spacesActive,
      spacingManualMode: localWizzardState.spacing?.manualMode,
      spacingManualValues: localWizzardState.spacing?.manualValues,

      // Font Sizes
      fontSizeClamps: fontSize.clamps,
      fontSizeExtend: localWizzardState.fontSize?.extend,
      fontSizesActive: localWizzardState.fontSizesActive,
      fontSizeManualMode: localWizzardState.fontSize?.manualMode,
      fontSizeManualValues: localWizzardState.fontSize?.manualValues,

      // Border Radius
      borderRadiusClamps: borderRadius.clamps,
      borderRadiusExtend: localWizzardState.borderRadius?.extend,
      borderRadiusActive: localWizzardState.borderRadiusActive,
      borderRadiusManualMode: localWizzardState.borderRadius?.manualMode,
      borderRadiusManualValues: localWizzardState.borderRadius?.manualValues,

      // FSE Extensions
      extendColorsFSE: localWizzardState.extendColorsFSE,
      extendFontSizesFSE: localWizzardState.extendFontSizesFSE,
      extendSpacingFSE: localWizzardState.extendSpacingFSE,
      extendFontFamilyFSE: localWizzardState.extendFontFamilyFSE,
      extendScreensFSE: localWizzardState.extendScreensFSE,

      // Bricks Extensions
      extendColorsBricks: localWizzardState.extendColorsBricks,
      extendFontSizesBricks: localWizzardState.extendFontSizesBricks,
      extendSpacingBricks: localWizzardState.extendSpacingBricks,
      extendFontFamilyBricks: localWizzardState.extendFontFamilyBricks,
      extendScreensBricks: localWizzardState.extendScreensBricks,

      // Oxygen Extensions
      extendColorsOxygen: localWizzardState.extendColorsOxygen,
      extendFontSizesOxygen: localWizzardState.extendFontSizesOxygen,
      extendSpacingOxygen: localWizzardState.extendSpacingOxygen,
      extendFontFamilyOxygen: localWizzardState.extendFontFamilyOxygen,
      extendScreensOxygen: localWizzardState.extendScreensOxygen,

      // Other Extensions
      extendFontHero: localWizzardState.extendFontHero,
      includeUtilitySizes: localWizzardState.includeUtilitySizes,
    });
  }, [
    localWizzardState,
    fontSize.clamps,
    spacing.clamps,
    borderRadius.clamps,
  ]);

  // Main config regeneration - only run when config dependencies actually change
  // Reduced from 30+ dependencies to 1 stable hash for better performance
  // Added debouncing to prevent rapid successive regenerations
  useEffect(() => {
    // Skip during initial mount until clamps are initialized
    if (!clampsInitialized.current) {
      return;
    }

    // Debounce regeneration by 150ms to batch rapid changes
    const timeoutId = setTimeout(() => {
      regenerateConfig();
    }, 150);

    // Cleanup: cancel pending regeneration if dependencies change again
    return () => clearTimeout(timeoutId);
  }, [configDependencyHash, regenerateConfig]);

  const exportWizzardConfig = useCallback((state = null, name = null) => {
    const _stateToExport = state ?? localWizzardState;

    // Merge with defaults, ensuring configCode is preserved correctly
    let config = { ...defaultWizzardState, ..._stateToExport };

    // Only override configCode if it exists in the state to export
    // This prevents undefined from overriding the value
    if (_stateToExport.configCode !== undefined) {
      config.configCode = _stateToExport.configCode;
    }

    delete config.activeTab;


    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name ? `${name}-wizzard-config.json` : "wizzard-config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [localWizzardState]);

  const getTabLabelById = useCallback((id) => {
    const tab = tabConfig.find((t) => t.id === id);
    return tab?.label ?? "";
  }, [tabConfig]);

  const updateState = useCallback((
    items: Array<{ key: string; value: any }>,
    parent: string
  ) => {
    const _state: any = { ...localWizzardState };
    if (!_state?.[parent]) {
      _state[parent] = {};
    }
    items.map((item) => {
      _state[parent][item.key] = item.value;
    });
    setLocalWizzardState(_state);
  }, [localWizzardState, setLocalWizzardState]);

  // Initialize config generation after all clamps are ready
  useEffect(() => {
    // Check if we have data and haven't initialized yet
    if (!clampsInitialized.current && localWizzardState) {
      // Check if any features are active
      const hasActiveFeatures =
        localWizzardState.colorsActive ||
        localWizzardState.fontSizesActive ||
        localWizzardState.fontFamilyActive ||
        localWizzardState.spacesActive ||
        localWizzardState.borderRadiusActive ||
        localWizzardState.breakpointsActive;

      if (hasActiveFeatures) {
        // Wait a bit for all clamps to be populated
        setTimeout(() => {
          clampsInitialized.current = true;
          regenerateConfig(true); // Generate and save
        }, 100);
      } else {
        // No active features, but still generate config
        // This ensures we have a valid (empty) @theme block instead of falling back to @config
        clampsInitialized.current = true;
        regenerateConfig(true); // Generate empty config
      }
    }
  }, [
    localWizzardState?.colorsActive,
    localWizzardState?.fontSizesActive,
    localWizzardState?.fontFamilyActive,
    localWizzardState?.spacesActive,
    localWizzardState?.borderRadiusActive,
    localWizzardState?.breakpointsActive,
    fontSize.clamps,
    spacing.clamps,
    borderRadius.clamps
  ]);

  // No loading state needed - data comes from App component

  return (
    <div className="p-8" id="wizzard">
      <Tabs.Root
        className="flex gap-8 w-full"
        value={String(activeTab)}
        onValueChange={(value) => setActiveTab(Number(value))}
      >
        <WizzardTabs
          wizzardState={localWizzardState}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <WizzardContent
          wizzardState={localWizzardState}
          activeTab={activeTab}
          fontSize={fontSize}
          spacing={spacing}
          borderRadius={borderRadius}
          onStateUpdate={updateState}
          onRegenerateConfig={regenerateConfig}
          onExport={exportWizzardConfig}
          getTabLabel={getTabLabelById}
        />
      </Tabs.Root>
    </div>
  );
};

export default Wizzard;

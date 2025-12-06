# Winden Editor Architecture - Comprehensive Documentation

## Overview
Winden is a sophisticated Tailwind CSS editor for WordPress with multiple editing modes: Style Tabs (CSS/SCSS), JavaScript Config, Wizzard (GUI-based design tokens), and File Scanning for class discovery.

---

## 1. STYLE TAB SYSTEM

### Component Locations
- **StyleEditorWithTabs**: `/src/admin/components/parts/StyleEditorWithTabs.tsx`
- **StyleTabs**: `/src/admin/components/parts/StyleTabs.tsx`
- **Types**: `/src/admin/types/styleTabs.ts`

### Architecture Overview
The Style Tab system enables users to organize CSS/SCSS content into multiple logical sections with Tailwind layer directives.

### Key Data Structures

#### StyleTab Interface
```typescript
interface StyleTab {
  id: string;                    // Unique identifier (tab-{timestamp}-{random})
  name: string;                  // Display name (e.g., "Main Style", "Colors")
  content: string;               // CSS/SCSS content
  layer: LayerType;              // Tailwind @layer directive
  order: number;                 // Tab ordering
  isLocked?: boolean;            // Prevents deletion/renaming (Main Style is locked)
}

type LayerType = 'none' | 'theme' | 'base' | 'components' | 'utilities';
```

#### StyleTabsState
```typescript
interface StyleTabsState {
  tabs: StyleTab[];      // Array of all tabs
  activeTabId: string;   // Currently active tab ID
}
```

### Default Layer Options
```typescript
const DEFAULT_LAYER_OPTIONS = [
  { value: 'none', label: 'No Layer', description: 'Add CSS without any @layer wrapper' },
  { value: 'theme', label: '@layer theme', description: 'For design tokens and theme variables' },
  { value: 'base', label: '@layer base', description: 'For element defaults and resets' },
  { value: 'components', label: '@layer components', description: 'For component classes' },
  { value: 'utilities', label: '@layer utilities', description: 'For utility classes' },
];
```

### Core Functions

#### createStyleTab()
**Location**: `styleTabs.ts` line 32
**Purpose**: Factory function to create new tabs with default values
```typescript
function createStyleTab(
  name: string = 'New Style',
  layer: LayerType = 'none',
  content: string = '',
  isLocked: boolean = false
): StyleTab
```
- Generates unique ID using timestamp + random string
- Sets order to current timestamp
- Used when creating new tabs or initializing from content

#### combineStyleTabs()
**Location**: `styleTabs.ts` line 47
**Purpose**: Combines all tabs into single CSS string with layer wrappers and source comments
**Flow**:
1. Sorts tabs by order property
2. Wraps each tab's content in `@layer` directive (if not 'none')
3. Adds source comments: `/* Tab: Name (@layer directive) */`
4. Joins with double newlines

**Example Output**:
```css
/* Tab: Main Style (no layer) */
:root { --primary: #000; }

/* Tab: Colors (@layer theme) */
@layer theme {
  :root { --color-primary: #3b82f6; }
}

/* Tab: Components (@layer components) */
@layer components {
  .btn { @apply px-4 py-2 rounded; }
}
```

#### parseContentIntoTabs()
**Location**: `styleTabs.ts` line 104
**Purpose**: Parses combined CSS back into individual tabs (backward compatibility)
**Process**:
1. Uses regex to find tab markers: `/* Tab: ([^*]+?)(?:\s*\(@layer\s*(theme|base|components|utilities)\))? */`
2. Extracts tab name and layer from comments
3. Strips `@layer` wrapper from each tab's content
4. Creates "Main Style" tab for leading content (marked as locked)
5. Handles malformed content gracefully (fallback to single tab)

**Regex Pattern Analysis**:
- Captures tab name in group 1
- Captures layer type in group 2 (optional)
- Normalizes unrecognized layers to 'none'

#### stripLayerWrapper()
**Location**: `styleTabs.ts` line 84
**Purpose**: Removes @layer directive wrapper from tab content
**Logic**:
- If layer is 'none', returns trimmed content as-is
- Extracts content between first `{` and last `}`
- Handles mismatched braces gracefully

### StateEditorWithTabs Component

**Location**: `StyleEditorWithTabs.tsx`
**Responsibility**: Orchestrates tab management and Monaco editor

#### State Management
```typescript
const [tabsState, setTabsState] = useState<StyleTabsState>(() => {
  const initialTabs = parseContentIntoTabs(value);
  return {
    tabs: initialTabs,
    activeTabId: initialTabs[0]?.id || '',
  };
});
```

#### Key Effects
1. **Initialization Effect** (lines 42-52):
   - Parses incoming content into tabs on first load
   - Only runs once to prevent unnecessary re-parsing
   - Triggered by `useEffect` with `initialized` guard

2. **Parent Sync Effect** (lines 58-69):
   - Combines tabs and fires onChange callback
   - Exposes tabs and line map on window for error mapping
   - Updates `(window as any).windenStyleTabs`

#### Handler Functions
- `handleTabChange()`: Changes active tab
- `handleTabAdd()`: Creates new tab and makes it active
- `handleTabRemove()`: Removes tab (prevents last tab removal)
- `handleTabUpdate()`: Updates tab metadata (name, layer)
- `handleEditorChange()`: Updates active tab's content

#### Monaco Editor Integration
- Renders `@monaco-editor/react` Editor component
- Language: 'css' or 'scss' (configurable)
- Editor shows only active tab content
- Selections and ranges stored in context for error mapping

### StyleTabs Component

**Location**: `StyleTabs.tsx`
**Responsibility**: Tab UI and dialog for creating/editing

#### Features
1. **Tab Rendering** (lines 127-167):
   - Displays tabs sorted by order
   - Active tab highlighted with different background
   - Lock icon behavior for "Main Style" tab

2. **Tab Operations**:
   - **Create**: Dialog for name + layer selection
   - **Edit**: Double-click to edit (double-click + single-click for selection)
   - **Delete**: Hover to show X button (confirm dialog)
   - **Locked Protection**: "Main Style" tab cannot be edited/deleted

3. **Layer Badge Display** (lines 104-119):
   - Color-coded badges for layer types
   - `@layer` label in small text
   - Hidden for 'none' layer

4. **Dialog State Management** (lines 32-83):
   - Separate state for editing vs. creating
   - Resets dialog state on close
   - Validates tab name not empty

### Error Mapping Integration

**Location**: Referenced in `StyleEditorWithTabs` line 66
**Data Structure**:
```typescript
(window as any).windenStyleTabs = {
  tabs: StyleTab[],
  lineMap: TabLineMapping  // Maps errors to specific tabs
}
```

This enables the CSS compiler to report errors pointing to specific tabs and line numbers within those tabs.

---

## 2. FALLBACK CONFIG TAB (JavaScript Editor)

### Component Location
- **App.tsx**: `/src/admin/App.tsx` line 337-349
- **Settings Tab in Nav**: `/src/admin/components/navigation/Nav.tsx` line 532-569

### Architecture

The JavaScript editor is a fallback configuration method for users who prefer direct JavaScript config over the Wizzard GUI.

#### Editor Implementation
```typescript
{activeTab === 'javascript' && (
  <Editor
    height="100%"
    language="javascript"
    theme={darkMode ? "vs-dark" : "vs"}
    value={jsContent}
    onChange={(value) => setJsContent(value || '')}
    options={{
      selectOnLineNumbers: true,
      tabSize: 2
    }}
    loading={<LoadingScreen />}
  />
)}
```

### Key Differences from Wizzard
1. **Raw Code vs. GUI**:
   - JavaScript: Direct Tailwind config object editing
   - Wizzard: Visual UI with presets and builders

2. **Scope**:
   - JavaScript: Full config control (any valid Tailwind v4 config)
   - Wizzard: Predefined features (colors, spacing, fonts, breakpoints, border radius)

3. **State Management**:
   - JavaScript: Direct text content in `jsContent` state
   - Wizzard: Complex `WizzardState` with structure types

4. **Validation**:
   - JavaScript: Validated at compile time (when caching)
   - Wizzard: Real-time validation in component

### Config Saving
- Handled by `handleSave()` in `HandleSave.ts`
- Both JS and SCSS content combined for compilation
- Wizzard config takes precedence when present

---

## 3. WIZZARD TABS SYSTEM

### Main Component
**Location**: `/src/admin/components/pages/Wizzard.tsx`

### WizzardContext Setup
**Location**: `/src/admin/hooks/wizzardContext.tsx`

#### Context Provider
```typescript
export const WizzardContext = createContext<WizzardContextType | null>(null);

export const defaultWizzardState: WizzardState = {
  activeTab: 5,              // Default to Breakpoints
  configCode: "",            // Generated Tailwind config
  stateName: "",

  // Feature activation flags
  breakpointsActive: false,
  colorsActive: false,
  fontFamilyActive: false,
  spacesActive: false,
  fontSizesActive: false,
  borderRadiusActive: false,

  // Specific data for each feature
  // ... (see WizzardState type below)
};

type WizzardContextType = {
  localWizzardState: WizzardState;
  setLocalWizzardState: (state: WizzardState | ((prev: WizzardState) => WizzardState)) => void;
};
```

### WizzardState Structure
**Location**: `/src/admin/types/wizzard.d.ts`

#### Core State Shape
```typescript
interface WizzardState {
  // General
  activeTab?: number;           // Current tab ID
  configCode: string;           // Generated JavaScript config
  stateName?: string;

  // Breakpoints
  breakpoints: BreakpointEntry[];
  breakpointsActive: boolean;
  extendBreakpoints: boolean;
  desktopFirst: boolean;
  extendScreensFSE?: boolean;
  extendScreensBricks?: boolean;
  extendScreensOxygen?: boolean;

  // Font Family
  fontFamily: FontFamilyEntry[];
  fontFamilyActive: boolean;
  extendFontFamily: boolean;
  extendFontFamilyFSE?: boolean;
  extendFontFamilyBricks?: boolean;
  extendFontFamilyOxygen?: boolean;
  extendFontHero?: boolean;

  // Colors
  colorEntries: ColorEntry[];
  colorsActive: boolean;
  extendColors: boolean;
  includeUtilityColors: boolean;
  extendColorsFSE?: boolean;
  extendColorsBricks?: boolean;
  extendColorsOxygen?: boolean;

  // Font Sizes (Scale State)
  fontSize: SpaceAndFontSizeState;
  fontSizesActive: boolean;
  extendFontSizesFSE?: boolean;
  extendFontSizesBricks?: boolean;
  extendFontSizesOxygen?: boolean;

  // Spacing (Scale State)
  spacing: SpaceAndFontSizeState;
  spacesActive: boolean;
  extendSpacingFSE?: boolean;
  extendSpacingBricks?: boolean;
  extendSpacingOxygen?: boolean;

  // Border Radius (Scale State)
  borderRadius: SpaceAndFontSizeState;
  borderRadiusActive: boolean;
  extendBorderRadius: boolean;
}

// Detailed Types
interface BreakpointEntry {
  name: string;
  value: number;
}

interface FontFamilyEntry {
  name: string;
  value: string[];  // Array of font family names
}

interface ColorShade {
  name: string;      // e.g., "50", "100", "500"
  hex: string;       // Hex color value
  isEnabled: boolean;
  isDefault: boolean;  // TRUE for base color (usually 500)
}

interface ColorEntry {
  id: number;
  name: string;
  hex: string;
  minLightness: number;   // For HSL shade generation
  maxLightness: number;
  colorFormat: 'hex' | 'rgb' | 'hsl' | 'oklch';
  shades: ColorShade[];
  isLocked?: boolean;      // Prevents modification
  enableShades?: boolean;  // Toggle all shades on/off
  reverseShades?: boolean; // Reverse shade order
  originalGeneratedColors?: string[];
  isMainColorChange?: boolean;
}

interface SpaceAndFontSizeState {
  extend: boolean;
  disableFluid: boolean;          // Toggle fluid typography
  useRem: boolean;                // Use rem vs px
  remSize: number;                // Browser base font size
  minBaseSize: number;            // Mobile base size
  minScaleRatio: number;          // Mobile scale ratio
  minScreenSize: number;          // Mobile breakpoint
  maxBaseSize: number;            // Desktop base size
  maxScaleRatio: number;          // Desktop scale ratio
  maxScreenSize: number;          // Desktop breakpoint
  steps: string[];                // e.g., ["xs", "sm", "base", "md", "lg"]
  stepValues: number[];           // Pre-calculated values (deprecated)
  minMaxValues: [number, number][]; // Min/max for each step
  baseStep: string;               // Reference step for calculations
  decimalPlaces: number;
  overrides: {
    [stepName: string]: StepOverride;
  };
}

interface StepOverride {
  enabled: boolean;
  value: string;              // clamp() value
  fluidClamp: string;         // Computed clamp value
  minBase: string;            // Mobile size
  maxBase: string;            // Desktop size
}
```

### Wizzard Tab Configuration

**Location**: `Wizzard.tsx` line 365-386
```typescript
const tabConfig = [
  ...(colorsActive ? [{ id: 0, icon: ColorIcon, label: "Colors" }] : []),
  ...(fontSizesActive ? [{ id: 1, icon: FormatSizeIcon, label: "Font Sizes" }] : []),
  ...(fontFamilyActive ? [{ id: 2, icon: FontFamilyIcon, label: "Font Family" }] : []),
  ...(spacesActive ? [{ id: 3, icon: LineWeightIcon, label: "Spaces" }] : []),
  ...(borderRadiusActive ? [{ id: 4, icon: RoundedCornerIcon, label: "Border Radius" }] : []),
  ...(breakpointsActive ? [{ id: 5, icon: DevicesIcon, label: "Breakpoints" }] : []),
  { id: 6, icon: BackupIcon, label: "Backups" },
  { id: 7, icon: TuneIcon, label: "Settings" },
];
```

**Key Feature**:
- Tabs dynamically appear based on `*Active` flags
- Backups and Settings always visible
- Icons from Radix UI

### Wizzard Tab Pages (Components)

#### 1. Color Tab
**Location**: `/src/admin/components/pages/Wizzard/Color/Color.tsx`
**ID**: 0
**Props**: `{ label: string }`
**Key Components**:
- `ColorEntry`: Individual color entry editor
- `ColorSwatch`: Visual color display
- `ColorSwatchEditor`: Shade editor
- `ShadeSliders`: HSL/RGB/OKLCH sliders
- Color presets: `grey`, `tahiti` (primary), `orange` (secondary)

**Features**:
- Add/remove/edit colors
- Generate shades automatically
- Adjust shade ranges
- Include utility colors toggle
- Builder integration (FSE, Bricks, Oxygen)

#### 2. Font Sizes Tab
**Location**: `Wizzard.tsx` line 877-893
**ID**: 1
**Component**: `ScaleCalculator`
**Props**:
```typescript
{
  label: "Font Sizes",
  font: true,
  state: localWizzardState?.fontSize,
  updateState: (key, value) => updateState([{ key, value }], "fontSize"),
  updateStates: (items) => updateState(items, "fontSize"),
  clampOverrides,
  setClampOverrides,
  clamps,
  setClamps
}
```

#### 3. Font Family Tab
**Location**: `Wizzard.tsx` line 894-898
**ID**: 2
**Component**: `FontFamily`
**Props**: `{ label: string }`
**Features**:
- Add/edit/remove font families
- Comma-separated value parsing
- Dynamic font loading integration

#### 4. Spacing Tab
**Location**: `Wizzard.tsx` line 899-915
**ID**: 3
**Component**: `ScaleCalculator`
**Same as Font Sizes but for spacing**

#### 5. Border Radius Tab
**Location**: `Wizzard.tsx` line 916-932
**ID**: 4
**Component**: `ScaleCalculator`
**Same as Font Sizes but for border radius**

#### 6. Breakpoints Tab
**Location**: `Wizzard.tsx` line 933-937
**ID**: 5
**Component**: `Breakpoints`
**Props**: `{ label: string }`
**Features**:
- Add/edit/remove breakpoints
- Preset loader (Mobile First, Desktop First, Tablet)
- Extend Tailwind defaults toggle
- Desktop First toggle

#### 7. Backups Tab
**Location**: `Wizzard.tsx` line 938-945
**ID**: 6
**Component**: `Backups`
**Features**:
- Export/import wizard state as JSON
- Version control for configurations
- Restore previous states

#### 8. Settings Tab
**Location**: `Wizzard.tsx` line 946-956
**ID**: 7
**Component**: `SettingsTab`
**Props**: `{ label, onStateChange, setClamps* }`
**Features**:
- Toggle each feature on/off
- Initialize defaults when enabling
- Config code preview

### Config Generation

**Location**: `Wizzard.tsx` line 467-673
**Function**: `regenerateConfig(shouldSave = false)`

**Flow**:
1. Builds config objects from each enabled feature:
   - Colors → `colorsConfig` + `colorsBuilders`
   - Font Sizes → `fontSizesBuilders`
   - Spacing → `spacingBuilders`
   - Font Families → `fontFamilyBuilders`
   - Screens → `screensBuilders`
   - Border Radius → `borderRadiusBuilders`

2. Calls `generateTailwindConfig()` with all builders

3. Sets `configCode` in state

4. Optionally saves via `handleWizzardStateUpdate()`

**Builder Integration**:
- FSE: Full Site Editor (WordPress)
- Bricks: Bricks Builder plugin
- Oxygen: Oxygen Builder plugin
- Hero: Theme integration

---

## 4. PLAIN CLASSES AUTOCOMPLETE

### Architecture Overview
Plain classes refers to autocomplete functionality for Tailwind class names in the JavaScript/Config editor.

### Component Locations
- **App.tsx**: Main setup (line 104-115, 190-268)
- **Nav.tsx**: Autocomplete settings (line 473-509)

### Autocomplete Setup

#### Class Fetching
**Location**: `App.tsx` line 104-115
```typescript
const fetchAutocomplete = async () => {
  let response: any = null;
  if (typeof (window as any)?.tailwindifyClasses === 'function') {
    let custom_css = '@layer theme, base, components, utilities;...';
    if (wizzardContentRef?.current?.configCode?.length && 
        wizzardContentRef.current.configCode.trim().startsWith('@theme')) {
      custom_css += wizzardContentRef.current.configCode;
    }
    response = await (window as any).tailwindifyClasses(custom_css);
  }
  setAutocompleteClasses([...new Set(response?.classes?.length ? response.classes : [])]);
};
```

**Process**:
1. Calls JavaScript function `tailwindifyClasses` (from Tailwind v4 bundle)
2. Passes combined CSS (Tailwind imports + wizard config)
3. Returns list of available class names
4. Deduplicates with Set

#### Monaco Completion Provider
**Location**: `App.tsx` line 190-268
**Function**: `addSuggestions()`

**Suggestion Logic**:
1. **At `@` symbol**: Show directives
   - `@apply`, `@config`, `@layer`, `@screen`, `@tailwind`, `@theme`, `@utility`, `@variant`

2. **At `-` symbol**: Show CSS properties from `STYLES_SUGGESTIONS_V4`
   - Format: `--color-`, `--spacing-`, `--font-`, etc.

3. **Inside known suggestion context**: Show class names
   - Classes from generated autocompleteClasses array

**Monaco Provider Registration**:
```typescript
monaco.languages.registerCompletionItemProvider(language, {
  provideCompletionItems: function (model, position) {
    // Logic above...
    return { suggestions: [...] };
  }
})
```

### CSS Custom Properties Suggestions

**Location**: `/src/admin/const/stylesSuggestionsV4.ts`
```typescript
export const STYLES_SUGGESTIONS_V4: string[] = [
  '--color-',
  '--font-',
  '--text-',
  '--font-weight-',
  '--tracking-',
  '--leading-',
  '--spacing-',
  '--spacing',
  '--breakpoint-',
  '--container-',
  '--radius-',
  '--width-',
  '--min-width-',
  '--max-width-',
  '--height-',
  // ... more properties
];
```

### Settings Integration
**Location**: `Nav.tsx` line 473-509
**Settings Options**:
```typescript
autocomplete_gutenberg?: boolean;    // FSE builder
autocomplete_bricks?: boolean;       // Bricks v1
autocomplete_bricks2?: boolean;      // Bricks v2
autocomplete_oxygen?: boolean;       // Oxygen Classic
autocomplete_oxygen6?: boolean;      // Oxygen v6
autocomplete_elementor?: boolean;    // Elementor
```

**Purpose**: Enables/disables autocomplete for each builder's interface

---

## 5. FILES SCAN TAB

### Component Location
**Location**: `/src/admin/components/navigation/FilesScanTab.tsx`

### Component Structure
**Props**:
```typescript
interface FilesScanTabProps {
  settings: any;                           // Current settings
  handleChange: (field: string) => (value: any) => void;
}
```

### Features

#### 1. File Format Filter
**Location**: Lines 51-62
```typescript
<FormTokenField
  label="Scan only these file formats (leave empty to scan all)"
  value={fileFormats}
  onChange={(newFormats) => {
    setFileFormats(newFormats);
    handleChange('scan_file_formats')(newFormats);
  }}
  suggestions={['php', 'html', 'js', 'jsx', 'ts', 'tsx', 'twig']}
/>
```

**Key Points**:
- Token field for adding/removing file formats
- Pre-populated suggestions for common types
- Updates `scan_file_formats` setting
- Leave empty to scan all files

#### 2. Tree View File Browser
**Location**: Lines 64-71
```typescript
<TreeView
  selectedPaths={selectedPaths}
  onSelectionChange={handlePathSelectionChange}
  apiEndpoint={apiEndpoint}
/>
```

**Tree View Integration**:
- Component: `TreeView.tsx` (/src/admin/components/TreeView.tsx)
- Uses WordPress AJAX endpoint
- Endpoint: `wp-admin/admin-ajax.php?action=winden_browse_files`
- Includes nonce for security

**Selected Paths Data**:
```typescript
interface SelectedPath {
  path: string;      // Full file path
  type: 'file' | 'directory';
  name: string;      // Display name
}
```

#### 3. Selected Items Summary
**Location**: Lines 73-117
- Displays count of selected paths
- Shows folder icon + path + type badge
- "Clear All" button for bulk removal
- Individual remove buttons (X icon)
- Max height with scrolling

### Settings Storage
**Location**: `Nav.tsx`
**Settings Keys**:
```typescript
scan_path: string | string[];          // Selected paths (stored as array)
scan_file_formats: string[];           // File format filters
```

### Configuration in Settings
**Location**: `Nav.tsx` line 258-302
**Handlers**:
- `handleScanPathChange()`: Edit individual path
- `addScanPath()`: Add new path input
- `removeScanPath()`: Remove path
- `saveScanPaths()`: Save all paths and trigger refresh

### Automatic Ignoring
**Note**: Common development folders ignored automatically:
- `node_modules`
- `vendor`
- `.git`
- etc.

---

## 6. DATA LOADING & PERSISTENCE

### Initial Data Loading
**Location**: `App.tsx` line 84
```typescript
const { data: contentData, isLoading: isDataLoading, error: contentError } = useWizzardContent();

useEffect(() => {
  if (contentData) {
    setJsContent(contentData.javascript);
    setScssContent(contentData.scss);
    if (contentData.wizzard) {
      setLocalWizzardState(contentData.wizzard);
    }
  }
}, [contentData, setLocalWizzardState]);
```

**Hook**: `useWizzardContent()` (custom React Query hook)
**Response Type**:
```typescript
interface WizzardContentResponse {
  success: boolean;
  data: {
    javascript: string;      // Base64 encoded
    scss: string;           // Base64 encoded
    wizzard: WizzardState | null;
  };
}
```

### Saving Content
**Location**: `Nav.tsx` line 183-203
**Function**: `handleSaveAndFetchClasses()`

**Flow**:
1. Call `onSave()` from Header (triggers `handleSave()`)
2. Compile SCSS/CSS
3. Bundle with Tailwind v4
4. Send to backend
5. Fetch updated class list
6. Update cache status

**Save Handler**: `HandleSave.ts`
```typescript
export const handleSave = async (
  jsContentRef: React.MutableRefObject<string>,
  scssContentRef: React.MutableRefObject<string>,
  wizzardContentRef: React.MutableRefObject<WizzardState | null>,
  settings?: Record<string, any>
): Promise<void>
```

### Wizzard State Persistence
**Location**: `HandleSave.ts`
**Function**: `handleWizzardStateUpdate()`
- Saves wizard state to database
- Triggered on config generation (if `shouldSave = true`)
- Called in SettingsTab after feature toggle

---

## 7. INTEGRATION POINTS & WORKFLOWS

### User Workflow: Create Custom Color

1. **Tab Activation**: User enables Colors in Settings Tab
2. **State Initialization**: SettingsTab initializes `defaultWizzardState.colorEntries = []`
3. **Add Color**: Click "+ Add Color" button
4. **Color Picker**: ColorEntry component opens color editor
5. **Shade Generation**: Automatically generates shades based on HSL sliders
6. **Config Regeneration**: `regenerateConfig()` runs
7. **Save**: `handleWizzardStateUpdate()` persists to database
8. **Cache**: Classes fetched and cached

### User Workflow: Modify CSS with Tabs

1. **Tab Creation**: Click + button in StyleTabs
2. **Dialog**: Enter name and select layer (e.g., "Components", "@layer components")
3. **Edit Content**: Type CSS in Monaco editor
4. **Source Comment**: Automatically adds `/* Tab: Components (@layer components) */`
5. **Wrapper Applied**: Content wrapped in `@layer components { ... }`
6. **Combine**: `combineStyleTabs()` merges all tabs
7. **Parent Update**: `onChange()` fires with combined CSS
8. **Sync**: `useEffect` in App updates `scssContent` state

### Error Mapping Workflow

1. **Compilation Error**: Tailwind compiler reports error at line X
2. **Line Map Lookup**: Error mapper uses `windenStyleTabs.lineMap`
3. **Tab Identification**: Determines which tab caused error
4. **Location**: Shows "Tab: ComponentsLine: 15" in error message
5. **Navigation**: User can click to jump to specific tab

---

## 8. STATE MANAGEMENT PATTERNS

### Context Pattern (Wizzard)
```typescript
// Provider setup
const { localWizzardState, setLocalWizzardState } = useContext(WizzardContext);

// State updates
const updateState = (items: Array<{ key: string; value: any }>, parent: string) => {
  const _state = { ...localWizzardState };
  if (!_state?.[parent]) {
    _state[parent] = {};
  }
  items.forEach((item) => {
    _state[parent][item.key] = item.value;
  });
  setLocalWizzardState(_state);
};
```

**Advantages**:
- Global state accessible from any Wizzard tab
- Decouples child components from data structure
- Single source of truth for all features

### Ref Pattern (Content Storage)
```typescript
const jsContentRef = useRef(jsContent);
const scssContentRef = useRef(scssContent);
const wizzardContentRef = useRef<WizzardState>(localWizzardState);

useEffect(() => {
  jsContentRef.current = jsContent;
  scssContentRef.current = scssContent;
  wizzardContentRef.current = localWizzardState;
}, [jsContent, scssContent, localWizzardState]);
```

**Purpose**:
- Persist latest content for save operations
- Avoid closure issues in async handlers
- Non-triggering reference updates

---

## 9. KEY CONFIGURATION & GENERATORS

### Tailwind Config Generator
**Location**: `/src/admin/components/pages/Wizzard/utils/configGenerator.ts`
**Function**: `generateTailwindConfig()`

**Input Parameters**:
- `breakpoints`: Configured breakpoints
- `fontFamilies`: Font definitions
- `colors`: Color palette
- `spacing`: Spacing scale
- `fontSize`: Font size scale
- `borderRadius`: Border radius scale
- Builder configs (FSE, Bricks, Oxygen)
- Active feature flags

**Output**: JavaScript config string suitable for `tailwind.config.js`

### Scale Value Generation
**Location**: `Wizzard.tsx` line 32-53
**Function**: `calculateClampValue()`

**Formula** (Fluid Typography):
```javascript
const minSize = useRem ? minBase / remSize : minBase;
const maxSize = useRem ? maxBase / remSize : maxBase;
const slope = (maxSize - minSize) / (maxScreen - minScreen);
const intersection = -minScreen * slope + minSize;
const preferred = `${intersection.toFixed(dp)}${unit} + ${(slope * 100).toFixed(2)}vi`;
return `clamp(${min}, ${preferred}, ${max})`;
```

**Example**: 
- Mobile: 16px, Desktop: 19px
- Output: `clamp(1rem, 0.79rem + 1.05vi, 1.19rem)`

---

## 10. KEY FILES SUMMARY

| File | Purpose | Lines |
|------|---------|-------|
| `StyleEditorWithTabs.tsx` | Tab state + Monaco editor orchestration | 152 |
| `StyleTabs.tsx` | Tab UI + dialog management | 237 |
| `styleTabs.ts` | Tab creation, combining, parsing | 164 |
| `Wizzard.tsx` | Main wizzard page + tab routing | 964 |
| `wizzardContext.tsx` | Context provider + default state | 127 |
| `wizzard.d.ts` | Type definitions | 154 |
| `Color.tsx` | Color management page | 261 |
| `ScaleCalculator.tsx` | Font sizes/spacing/border radius UI | ~500 |
| `Breakpoints.tsx` | Breakpoints configuration | ~150 |
| `FontFamily.tsx` | Font family management | ~150 |
| `FilesScanTab.tsx` | File scanner UI | 126 |
| `Nav.tsx` | Navigation + settings modal | 600 |
| `App.tsx` | App root + tab switching | ~350 |
| `ClassFetcher.ts` | Class discovery + caching | ~200 |
| `HandleSave.ts` | Content persistence | ~200 |
| `generateConfig.ts` | Config generation utilities | ~150 |

---

## 11. COMMON OPERATIONS

### Add New Wizzard Feature Tab

1. **Define Types** in `wizzard.d.ts`
2. **Add to defaultWizzardState** in `wizzardContext.tsx`
3. **Create Tab Component** in `Wizzard/FeatureName/`
4. **Add to tabConfig** array in `Wizzard.tsx`
5. **Add to regenerateConfig()** logic
6. **Add to SettingsTab** toggle list

### Debug Style Tab Parsing

1. Check `windenStyleTabs` in browser console
2. Verify tab markers format: `/* Tab: Name (@layer directive) */`
3. Test regex with sample content
4. Check `stripLayerWrapper()` output

### Troubleshoot Config Generation

1. Inspect `localWizzardState` in WizzardContext
2. Check `configCode` string in SettingsTab preview
3. Verify builder data loaded (`dynamicColorsFSE`, etc.)
4. Test `generateTailwindConfig()` output

---

## 12. PERFORMANCE CONSIDERATIONS

### Tab Rendering
- Tabs sorted on every render (could memoize)
- Dialog state separate from tabs state (good separation)
- Content updates only active tab (efficient)

### Context Updates
- Entire state object recreated on each update
- Consider breaking into multiple contexts if state grows
- Config regeneration debounced (50ms timeout)

### Autocomplete
- Classes fetched once on load
- Script (`tailwindifyClasses`) loaded asynchronously
- Suggestion filtering happens in Monaco provider

### File Scanning
- Tree view uses pagination (WordPress AJAX)
- Common folders filtered server-side
- Format filtering reduces scan scope

---

This documentation covers the complete architecture of the Winden editor system. Each component integrates with others through clear data flows and state management patterns.

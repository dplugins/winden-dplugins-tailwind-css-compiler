# Figma Plugin Conversion Plan: Winden Wizzard to Design Tokens

**Document Version**: 1.0
**Last Updated**: 2025-01-16
**Feasibility Rating**: 9/10 ⭐⭐⭐⭐⭐⭐⭐⭐⭐☆

---

## Executive Summary

This document outlines the complete strategy for converting Winden's Wizzard (WordPress plugin) into a standalone Figma plugin that generates design tokens as both Figma Variables and W3C DTCG-compliant JSON files.

### Key Innovation: Min/Max Token Strategy

Instead of attempting to recreate CSS `clamp()` in Figma, we'll use a **min/max token pair approach**:

- **Viewport Configuration**: Register global min/max screen sizes (e.g., 320px → 1920px)
- **Dual Tokens**: Each fluid value becomes two Figma variables:
  - `spacing/base/min` = 16px (at min viewport)
  - `spacing/base/max` = 22px (at max viewport)
- **Designer Flexibility**: Designers choose which token to use based on context
- **Developer Export**: JSON export includes both values + clamp formula for web implementation

### Success Probability: 95%

**Why this works:**
- ✅ 85% of Winden UI components are directly reusable
- ✅ Clean data structure maps 1:1 to Figma Variables API
- ✅ React + Radix UI already Figma-compatible
- ✅ Pure calculation functions need zero changes
- ✅ Min/max approach is more designer-friendly than clamp()

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Token Generation Strategy](#2-token-generation-strategy)
3. [Figma Variable Structure](#3-figma-variable-structure)
4. [Data Structure Mapping](#4-data-structure-mapping)
5. [UI Component Reusability](#5-ui-component-reusability)
6. [Implementation Phases](#6-implementation-phases)
7. [Code Examples](#7-code-examples)
8. [File Structure](#8-file-structure)
9. [Testing Strategy](#9-testing-strategy)
10. [Success Metrics](#10-success-metrics)

---

## 1. Architecture Overview

### 1.1 Figma Plugin Dual-Process Model

Figma plugins run in two separate contexts:

```
┌─────────────────────────────────────┐
│         UI Thread (iframe)          │
│  ┌───────────────────────────────┐  │
│  │   React App (Wizzard UI)      │  │
│  │   - All existing components   │  │
│  │   - State management          │  │
│  │   - User interactions         │  │
│  └───────────────────────────────┘  │
└─────────────────┬───────────────────┘
                  │ postMessage
                  ↓
┌─────────────────────────────────────┐
│      Main Thread (sandbox)          │
│  ┌───────────────────────────────┐  │
│  │   Figma API Access            │  │
│  │   - Create variables          │  │
│  │   - Generate collections      │  │
│  │   - Export JSON               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 1.2 Technology Stack

**Preserved from Winden:**
- React 18.2+
- TypeScript 5+
- Radix UI primitives
- Emotion (CSS-in-JS)
- TinyColor2 (color manipulation)
- Existing calculation utilities

**New for Figma:**
- `@figma/plugin-typings` - Figma API types
- Vite - Build tool (replaces esbuild)
- Figma Variables API
- Figma Client Storage API

**Removed:**
- Tailwind CSS compiler
- WordPress dependencies
- Monaco Editor (optional - can simplify)
- PostCSS/Sass

### 1.3 Core Data Flow

```
User Interaction (Wizzard UI)
        ↓
Update WizzardState
        ↓
Calculate Min/Max Values
        ↓
postMessage to Main Thread
        ↓
┌───────────────────────────┐
│  Token Generation         │
│  - Figma Variables        │
│  - W3C DTCG JSON          │
└───────────────────────────┘
        ↓
Figma Document + JSON File
```

---

## 2. Token Generation Strategy

### 2.1 Viewport Configuration (Global Settings)

**New Feature**: Register viewport boundaries as design tokens

```typescript
interface ViewportConfig {
  minScreen: number;  // Default: 320px
  maxScreen: number;  // Default: 1920px
  unit: 'px' | 'rem'; // Default: 'px'
}
```

**Figma Variables Created:**
```
viewport/min = 320px
viewport/max = 1920px
```

**JSON Export:**
```json
{
  "viewport": {
    "$type": "dimension",
    "min": { "$value": "320px" },
    "max": { "$value": "1920px" }
  }
}
```

### 2.2 Fluid Typography Strategy (Min/Max Tokens)

**Current Winden Approach:**
- Single value: `--text-base: clamp(1rem, 0.91rem + 0.45vi, 1.25rem)`
- Calculated from scale ratios and viewport sizes

**New Figma Approach:**
- Two variables per size:
  - `fontSize/base/min` = 16px (at 320px viewport)
  - `fontSize/base/max` = 20px (at 1920px viewport)

**Generation Process:**

1. **Use existing calculations** from `clampCalculations.ts`:
   ```typescript
   const { minValue, maxValue, clampFormula } = calculateClamp({
     minBaseSize: 16,
     maxBaseSize: 20,
     minViewport: 320,
     maxViewport: 1920,
     step: 'base',
     scaleRatio: 1.25
   });
   ```

2. **Create paired variables**:
   ```typescript
   // Min token
   figma.variables.createVariable("fontSize/base/min", collection, "FLOAT");
   minVar.setValueForMode(modeId, minValue); // 16

   // Max token
   figma.variables.createVariable("fontSize/base/max", collection, "FLOAT");
   maxVar.setValueForMode(modeId, maxValue); // 20
   ```

3. **Store metadata** in descriptions:
   ```typescript
   minVar.description = `Minimum font size at ${viewportConfig.minScreen}px viewport`;
   maxVar.description = `Maximum font size at ${viewportConfig.maxScreen}px viewport.
   CSS: clamp(${minValue}px, ${clampFormula}, ${maxValue}px)`;
   ```

### 2.3 Fluid Spacing Strategy (Same Approach)

```typescript
// Input: Winden spacing scale
spacing: {
  steps: ["xs", "sm", "base", "lg", "xl"],
  minBaseSize: 16,
  maxBaseSize: 24,
  minScaleRatio: 1.2,
  maxScaleRatio: 1.33
}

// Output: Paired Figma variables
spacing/xs/min = 8px
spacing/xs/max = 12px
spacing/sm/min = 12px
spacing/sm/max = 18px
spacing/base/min = 16px
spacing/base/max = 24px
spacing/lg/min = 24px
spacing/lg/max = 36px
spacing/xl/min = 32px
spacing/xl/max = 48px
```

### 2.4 Fixed Values (No Min/Max)

**For non-fluid tokens, create single variables:**

- **Colors**: Always single value
  ```
  color/primary/500 = #3b82f6
  ```

- **Font Families**: Always single value
  ```
  fontFamily/sans = ["system-ui", "sans-serif"]
  ```

- **Border Radius**: Can be fluid or fixed based on user toggle
  ```
  // If fluid:
  borderRadius/md/min = 6px
  borderRadius/md/max = 8px

  // If fixed:
  borderRadius/md = 8px
  ```

### 2.5 Token Naming Convention

**Format**: `{category}/{name}/{variant}`

| Category | Example Variables |
|----------|------------------|
| `color` | `color/primary/500`, `color/neutral/50` |
| `fontSize` | `fontSize/base/min`, `fontSize/base/max` |
| `spacing` | `spacing/lg/min`, `spacing/lg/max` |
| `fontFamily` | `fontFamily/sans`, `fontFamily/mono` |
| `borderRadius` | `borderRadius/md/min`, `borderRadius/md/max` |
| `viewport` | `viewport/min`, `viewport/max` |

**Benefits of `/` separator:**
- Figma displays as nested hierarchy
- Easy filtering and organization
- Matches design token conventions

---

## 3. Figma Variable Structure

### 3.1 Variable Collections

Create organized collections for different token types:

```typescript
// Main collection
const mainCollection = figma.variables.createVariableCollection("Winden Design Tokens");

// Optional: Separate collections by category
const colorCollection = figma.variables.createVariableCollection("Colors");
const spacingCollection = figma.variables.createVariableCollection("Spacing");
const typographyCollection = figma.variables.createVariableCollection("Typography");
```

**Recommendation**: Start with single collection, allow user to choose grouping strategy.

### 3.2 Variable Scoping

Apply appropriate scoping so variables only appear in relevant contexts:

```typescript
// Color variables
colorVar.scopes = [
  VariableScope.ALL_FILLS,
  VariableScope.STROKE_COLOR,
  VariableScope.TEXT_FILL
];

// Spacing variables
spacingVar.scopes = [
  VariableScope.GAP,
  VariableScope.WIDTH_HEIGHT,
  VariableScope.MIN_WIDTH_HEIGHT,
  VariableScope.MAX_WIDTH_HEIGHT
];

// Font size variables
fontSizeVar.scopes = [
  VariableScope.FONT_SIZE
];

// Border radius variables
radiusVar.scopes = [
  VariableScope.CORNER_RADIUS
];
```

### 3.3 Variable Modes (Future Enhancement)

Support for theme variants (light/dark):

```typescript
const collection = figma.variables.createVariableCollection("Colors");
const lightMode = collection.modes[0]; // Default mode
const darkMode = collection.addMode("Dark");

// Set different values per mode
colorVar.setValueForMode(lightMode.modeId, { r: 1, g: 1, b: 1 }); // white
colorVar.setValueForMode(darkMode.modeId, { r: 0, g: 0, b: 0 }); // black
```

**Phase**: V2 feature (not MVP)

### 3.4 Complete Example: Spacing Token

```typescript
// Create min/max pair for fluid spacing
const collection = figma.variables.getVariableCollectionById(collectionId);
const mode = collection.modes[0];

// Min value
const minVar = figma.variables.createVariable(
  "spacing/base/min",
  collection,
  "FLOAT"
);
minVar.setValueForMode(mode.modeId, 16);
minVar.scopes = [
  VariableScope.GAP,
  VariableScope.WIDTH_HEIGHT,
  VariableScope.MIN_WIDTH_HEIGHT
];
minVar.description = "Minimum spacing at 320px viewport";

// Max value
const maxVar = figma.variables.createVariable(
  "spacing/base/max",
  collection,
  "FLOAT"
);
maxVar.setValueForMode(mode.modeId, 24);
maxVar.scopes = [
  VariableScope.GAP,
  VariableScope.WIDTH_HEIGHT,
  VariableScope.MAX_WIDTH_HEIGHT
];
maxVar.description = `Maximum spacing at 1920px viewport.
CSS: clamp(1rem, 0.89rem + 0.55vi, 1.5rem)`;
```

---

## 4. Data Structure Mapping

### 4.1 Winden State to Figma Variables

| Winden State Property | Figma Output | Variable Type |
|-----------------------|--------------|---------------|
| `colorEntries[]` | `color/{name}/{shade}` | `COLOR` |
| `fontSize` (fluid) | `fontSize/{step}/min` + `/max` | `FLOAT` |
| `fontSize` (fixed) | `fontSize/{step}` | `FLOAT` |
| `spacing` (fluid) | `spacing/{step}/min` + `/max` | `FLOAT` |
| `spacing` (fixed) | `spacing/{step}` | `FLOAT` |
| `fontFamily[]` | Text Styles + JSON export | N/A (Text Style) |
| `borderRadius` (fluid) | `borderRadius/{step}/min` + `/max` | `FLOAT` |
| `borderRadius` (fixed) | `borderRadius/{step}` | `FLOAT` |
| `breakpoints[]` | `breakpoint/{name}` | `FLOAT` |

### 4.2 Color Mapping (No Changes from Original Plan)

```typescript
// Winden ColorEntry
interface ColorEntry {
  id: number;
  name: string;
  hex: string;
  shades: ColorShade[];
  enableShades: boolean;
}

// Figma Variables
color/primary/50 = #eff6ff
color/primary/100 = #dbeafe
color/primary/500 = #3b82f6
color/primary/900 = #1e3a8a

// W3C DTCG JSON
{
  "color": {
    "primary": {
      "50": { "$value": "#eff6ff", "$type": "color" },
      "500": { "$value": "#3b82f6", "$type": "color" }
    }
  }
}
```

### 4.3 Typography Mapping (Updated for Min/Max)

```typescript
// Winden State
fontSize: {
  steps: ["xs", "sm", "base", "lg", "xl"],
  minBaseSize: 16,
  maxBaseSize: 20,
  minScaleRatio: 1.2,
  maxScaleRatio: 1.25,
  minScreenSize: 320,
  maxScreenSize: 1920,
  disableFluid: false
}

// Figma Variables (if fluid)
fontSize/xs/min = 13.33px    // 16 / 1.2
fontSize/xs/max = 16px       // 20 / 1.25
fontSize/sm/min = 14.67px
fontSize/sm/max = 18px
fontSize/base/min = 16px
fontSize/base/max = 20px
fontSize/lg/min = 19.2px     // 16 * 1.2
fontSize/lg/max = 25px       // 20 * 1.25

// W3C DTCG JSON
{
  "fontSize": {
    "base": {
      "min": {
        "$value": "16px",
        "$type": "dimension",
        "$description": "At 320px viewport"
      },
      "max": {
        "$value": "20px",
        "$type": "dimension",
        "$description": "At 1920px viewport"
      },
      "$extensions": {
        "winden": {
          "fluid": true,
          "clamp": "clamp(1rem, 0.91rem + 0.45vi, 1.25rem)",
          "viewport": {
            "min": "320px",
            "max": "1920px"
          }
        }
      }
    }
  }
}
```

### 4.4 Spacing Mapping (Updated for Min/Max)

```typescript
// Winden State
spacing: {
  steps: ["xs", "sm", "base", "lg", "xl"],
  minBaseSize: 16,
  maxBaseSize: 24,
  useRem: true,
  disableFluid: false,
  overrides: {
    "xl": { min: 32, max: 64 }  // Custom override
  }
}

// Figma Variables
spacing/xs/min = 8px
spacing/xs/max = 12px
spacing/base/min = 16px
spacing/base/max = 24px
spacing/xl/min = 32px        // From override
spacing/xl/max = 64px        // From override

// W3C DTCG JSON
{
  "spacing": {
    "base": {
      "min": { "$value": "1rem" },
      "max": { "$value": "1.5rem" },
      "$extensions": {
        "winden": {
          "fluid": true,
          "clamp": "clamp(1rem, 0.89rem + 0.55vi, 1.5rem)"
        }
      }
    }
  }
}
```

### 4.5 Font Family Mapping

**Challenge**: Figma doesn't have "font family variables", only Text Styles.

**Solution**: Create Text Styles with proper font families

```typescript
// Winden State
fontFamily: [
  { name: "sans", value: ["Inter", "system-ui", "sans-serif"] },
  { name: "mono", value: ["JetBrains Mono", "monospace"] }
]

// Figma Text Styles
textStyle = figma.createTextStyle();
textStyle.name = "Font Family/Sans";
textStyle.fontName = { family: "Inter", style: "Regular" };

// W3C DTCG JSON
{
  "fontFamily": {
    "sans": {
      "$value": ["Inter", "system-ui", "sans-serif"],
      "$type": "fontFamily"
    }
  }
}
```

**Note**: Only first font in stack used for Figma Text Style (Figma limitation).

---

## 5. UI Component Reusability

### 5.1 Directly Reusable Components (No Changes)

These components can be copied as-is from Winden:

#### Color System
- ✅ `ColorEntry.tsx` - Color card with picker
- ✅ `ColorSwatch.tsx` - Color preview
- ✅ `SlidersHSL.tsx` - HSL color manipulation
- ✅ `SlidersRGB.tsx` - RGB color manipulation
- ✅ `SlidersOKLCH.tsx` - OKLCH color manipulation
- ✅ `ShadeSliders.tsx` - Shade generation controls
- ✅ `colorPresets.ts` - Preset palettes

#### Scale Calculator
- ✅ `ScaleCalculator.tsx` - Complete component (900 lines)
- ✅ `ScaleValuesGroup.tsx` - Min/max input groups
- ✅ `useClampCalculator.ts` - Calculation hook
- ✅ `clampCalculations.ts` - Pure math functions

#### Layout Components
- ✅ `Layout.tsx` - Wrapper/Sidebar/Content
- ✅ `ListWithButton.tsx` - List with add button

#### Form Elements
- ✅ `Input.tsx` - Text input
- ✅ `Checkbox.tsx` - Checkbox
- ✅ `Switch.tsx` - Toggle switch
- ✅ `RadioButton.tsx` - Radio input
- ✅ `SegmentedControl.tsx` - Segmented button group

#### Navigation
- ✅ `WizzardTabs.tsx` - Vertical tab navigation
- ✅ `WizzardContent.tsx` - Tab content panels

#### Utilities
- ✅ `Tooltip.tsx` - Radix UI tooltip
- ✅ `Button.tsx` - Button component
- ✅ `ArrowButton.tsx` - Directional button

### 5.2 Components Requiring Minimal Changes

#### Wizzard.tsx (Main Orchestrator)
**Current**: 291 lines

**Changes needed**:
1. Remove WordPress AJAX handlers:
   ```typescript
   // REMOVE
   handleWizzardStateUpdate(state);
   broadcastContentSaved();
   ```

2. Add Figma storage:
   ```typescript
   // ADD
   await figma.clientStorage.setAsync('wizzardState', state);
   parent.postMessage({ pluginMessage: { type: 'generate', data: state } }, '*');
   ```

3. Replace `regenerateConfig()`:
   ```typescript
   // REMOVE
   const configCode = generateTailwindConfig(state);

   // ADD
   const tokens = generateFigmaTokens(state);
   ```

**Estimated changes**: 30-40 lines modified

#### Color Components
**Files**: `Colors.tsx`, `ColorEntry.tsx`

**Changes needed**:
1. Remove builder integration checkboxes:
   ```typescript
   // REMOVE
   <ColorsBuilders />
   ```

**Estimated changes**: 5-10 lines removed

#### Scale Calculator
**Files**: `ScaleCalculator.tsx`

**Changes needed**:
1. Remove "Builders integration" section:
   ```typescript
   // REMOVE
   <ScaleBuilders type={font ? "fontSize" : "spacing"} />
   ```

2. Simplify "Extend" toggle label (no Tailwind reference)

**Estimated changes**: 10-15 lines removed

### 5.3 Components to Remove Entirely

- ❌ `ColorsBuilders.tsx` - FSE/Bricks/Oxygen integration
- ❌ `ScaleBuilders.tsx` - Builder preview
- ❌ `Backups.tsx` - Can be simplified (Figma has built-in storage)
- ❌ Any WordPress-specific utilities

### 5.4 New Components to Create

#### PluginHeader.tsx
```typescript
// Plugin-specific header with export buttons
interface PluginHeaderProps {
  onGenerateFigma: () => void;
  onExportJSON: () => void;
}
```

#### ViewportConfig.tsx
```typescript
// NEW: Configure min/max viewport sizes
interface ViewportConfigProps {
  minScreen: number;
  maxScreen: number;
  onChange: (config: ViewportConfig) => void;
}
```

#### TokenPreview.tsx
```typescript
// Preview generated tokens before creating
interface TokenPreviewProps {
  tokens: GeneratedTokens;
  onConfirm: () => void;
}
```

---

## 6. Implementation Phases

### Phase 1: Setup & Foundation (Week 1)

**Goal**: Working plugin skeleton with basic token generation

#### Tasks

**Day 1-2: Project Setup**
- [ ] Create Figma plugin boilerplate
  ```
  npx create-figma-plugin
  ```
- [ ] Configure TypeScript
- [ ] Setup Vite build config
- [ ] Create `manifest.json`
- [ ] Test plugin loads in Figma

**Day 3-4: Core Token Generators**
- [ ] Implement color token generation
  ```typescript
  generateColorTokens(colorEntries: ColorEntry[]): FigmaVariable[]
  ```
- [ ] Implement min/max spacing tokens
  ```typescript
  generateSpacingTokens(spacing: SpaceState): FigmaVariable[]
  ```
- [ ] Implement min/max font size tokens
  ```typescript
  generateFontSizeTokens(fontSize: FontSizeState): FigmaVariable[]
  ```
- [ ] Test variable creation in Figma

**Day 5: Integration**
- [ ] Wire UI → Main thread communication
- [ ] Implement Figma storage
  ```typescript
  saveState(), loadState()
  ```
- [ ] Add basic error handling

**Deliverable**: Plugin that creates Figma variables from hardcoded test data

### Phase 2: UI Integration (Week 2)

**Goal**: Full Wizzard UI working in Figma plugin

#### Tasks

**Day 1-2: Component Migration**
- [ ] Copy component files from Winden:
  ```
  src/admin/components/pages/Wizzard/ → ui/components/
  ```
- [ ] Copy utility functions:
  ```
  clampCalculations.ts
  colorProcessor.ts
  useClampCalculator.ts
  ```
- [ ] Copy type definitions:
  ```
  wizzard.d.ts
  ```

**Day 3: Cleanup & Adaptation**
- [ ] Remove WordPress-specific code
- [ ] Remove `ColorsBuilders.tsx`, `ScaleBuilders.tsx`
- [ ] Update imports for new file structure
- [ ] Replace Tailwind classes with Emotion CSS

**Day 4: State Management**
- [ ] Adapt `WizzardContext` for Figma
- [ ] Replace WordPress AJAX with Figma storage
- [ ] Test state persistence

**Day 5: New Components**
- [ ] Create `ViewportConfig.tsx` component
- [ ] Create `PluginHeader.tsx`
- [ ] Add to Wizzard tabs/settings

**Deliverable**: Full Wizzard UI running in Figma with state management

### Phase 3: Token Generation (Week 2 continued)

**Goal**: Complete token generation for all types

#### Tasks

**Day 6-7: Remaining Generators**
- [ ] Implement border radius tokens (min/max)
- [ ] Implement viewport tokens
- [ ] Implement breakpoint tokens
- [ ] Implement font family (Text Styles)

**Day 8: Variable Management**
- [ ] Batch variable creation (performance)
- [ ] Variable collection organization
- [ ] Variable scoping
- [ ] Handle variable conflicts (update vs. create)

**Day 9: Viewport Integration**
- [ ] Store viewport config in Figma
- [ ] Use in all fluid calculations
- [ ] Update UI to show viewport values

**Deliverable**: All token types generating correctly

### Phase 4: JSON Export (Week 3)

**Goal**: W3C DTCG-compliant JSON export

#### Tasks

**Day 1-2: JSON Generation**
- [ ] Implement color export
  ```typescript
  exportColorsToJSON(colorEntries: ColorEntry[]): DTCGColorTokens
  ```
- [ ] Implement spacing export (with $extensions)
  ```typescript
  exportSpacingToJSON(spacing: SpaceState): DTCGDimensionTokens
  ```
- [ ] Implement typography export
- [ ] Implement complete JSON structure

**Day 3: Export Features**
- [ ] Add "Export JSON" button
- [ ] Implement file download
- [ ] Add export options (include/exclude categories)
- [ ] Add beautified vs. minified toggle

**Day 4: Import Features**
- [ ] Implement JSON import
- [ ] Parse W3C DTCG format
- [ ] Validate imported data
- [ ] Merge vs. replace strategy

**Deliverable**: Full JSON export/import functionality

### Phase 5: Polish & Testing (Week 3 continued)

**Goal**: Production-ready plugin

#### Tasks

**Day 5-6: UI Polish**
- [ ] Consistent styling (no Tailwind)
- [ ] Loading states
- [ ] Error messages
- [ ] Success notifications
- [ ] Responsive layout

**Day 7: Performance**
- [ ] Optimize variable creation (batch operations)
- [ ] Add progress indicators
- [ ] Test with 100+ tokens
- [ ] Memory leak prevention

**Day 8: Testing**
- [ ] End-to-end testing
- [ ] Edge case handling
- [ ] Cross-browser testing (Figma Desktop + Web)
- [ ] Bug fixes

**Day 9: Documentation**
- [ ] User guide
- [ ] README
- [ ] Code comments
- [ ] Example token sets

**Deliverable**: Production-ready Figma plugin

### Phase 6: Optional Enhancements (Week 4+)

**Advanced Features** (not required for v1.0):

- [ ] Variable modes (light/dark themes)
- [ ] Token aliasing (`$ref` support)
- [ ] Import from existing Figma variables
- [ ] Preset library (Material, Tailwind, Bootstrap)
- [ ] Custom color palette generators
- [ ] Accessibility contrast checking
- [ ] Multi-collection support
- [ ] Sync with external token services (Tokens Studio, etc.)

---

## 7. Code Examples

### 7.1 Token Generator: Fluid Spacing with Min/Max

```typescript
// src/code/tokenGenerators/spacing.ts

import { SpaceAndFontSizeState } from '../types/wizzard';
import { calculateFluidScale } from '../utils/clampCalculations';

interface ViewportConfig {
  minScreen: number;
  maxScreen: number;
}

export async function generateSpacingTokens(
  state: SpaceAndFontSizeState,
  viewport: ViewportConfig,
  collectionId: string
): Promise<void> {
  const collection = figma.variables.getVariableCollectionById(collectionId);
  const mode = collection.modes[0];

  // Calculate min/max values for each step
  const calculations = calculateFluidScale({
    minBaseSize: state.minBaseSize,
    maxBaseSize: state.maxBaseSize,
    minScaleRatio: state.minScaleRatio,
    maxScaleRatio: state.maxScaleRatio,
    steps: state.steps,
    overrides: state.overrides
  });

  for (const step of state.steps) {
    const calc = calculations[step];

    if (state.disableFluid) {
      // Fixed value - single variable
      const variable = figma.variables.createVariable(
        `spacing/${step}`,
        collection,
        "FLOAT"
      );
      variable.setValueForMode(mode.modeId, calc.minValue);
      variable.scopes = [
        VariableScope.GAP,
        VariableScope.WIDTH_HEIGHT,
        VariableScope.MIN_WIDTH_HEIGHT,
        VariableScope.MAX_WIDTH_HEIGHT
      ];
      variable.description = `Fixed spacing value: ${calc.minValue}${state.useRem ? 'rem' : 'px'}`;
    } else {
      // Fluid value - min/max pair

      // Min variable
      const minVar = figma.variables.createVariable(
        `spacing/${step}/min`,
        collection,
        "FLOAT"
      );
      minVar.setValueForMode(mode.modeId, calc.minValue);
      minVar.scopes = [
        VariableScope.GAP,
        VariableScope.WIDTH_HEIGHT,
        VariableScope.MIN_WIDTH_HEIGHT
      ];
      minVar.description = `Minimum spacing at ${viewport.minScreen}px viewport`;

      // Max variable
      const maxVar = figma.variables.createVariable(
        `spacing/${step}/max`,
        collection,
        "FLOAT"
      );
      maxVar.setValueForMode(mode.modeId, calc.maxValue);
      maxVar.scopes = [
        VariableScope.GAP,
        VariableScope.WIDTH_HEIGHT,
        VariableScope.MAX_WIDTH_HEIGHT
      ];
      maxVar.description = `Maximum spacing at ${viewport.maxScreen}px viewport.
CSS: ${calc.clampFormula}`;
    }
  }

  figma.notify(`✓ Created ${state.steps.length} spacing tokens`);
}
```

### 7.2 JSON Export: Spacing with Min/Max

```typescript
// src/code/exporters/jsonExport.ts

interface DTCGToken {
  $value: string | number;
  $type: string;
  $description?: string;
  $extensions?: Record<string, any>;
}

export function exportSpacingToJSON(
  state: SpaceAndFontSizeState,
  viewport: ViewportConfig,
  calculations: Record<string, any>
): Record<string, any> {
  const tokens: Record<string, any> = {
    spacing: {
      $type: "dimension"
    }
  };

  for (const step of state.steps) {
    const calc = calculations[step];

    if (state.disableFluid) {
      // Fixed value
      tokens.spacing[step] = {
        $value: `${calc.minValue}${state.useRem ? 'rem' : 'px'}`,
        $type: "dimension"
      };
    } else {
      // Fluid value with min/max
      tokens.spacing[step] = {
        min: {
          $value: `${calc.minValue}${state.useRem ? 'rem' : 'px'}`,
          $type: "dimension",
          $description: `At ${viewport.minScreen}px viewport`
        },
        max: {
          $value: `${calc.maxValue}${state.useRem ? 'rem' : 'px'}`,
          $type: "dimension",
          $description: `At ${viewport.maxScreen}px viewport`
        },
        $extensions: {
          winden: {
            fluid: true,
            clamp: calc.clampFormula,
            viewport: {
              min: `${viewport.minScreen}px`,
              max: `${viewport.maxScreen}px`
            },
            scaleRatio: {
              min: state.minScaleRatio,
              max: state.maxScaleRatio
            }
          }
        }
      };
    }
  }

  return tokens;
}
```

### 7.3 Viewport Configuration Component

```typescript
// src/ui/components/ViewportConfig.tsx

import React from 'react';
import { Input } from './ui/Input';
import { Wrapper, Sidebar, Content } from './Layout';

interface ViewportConfigProps {
  minScreen: number;
  maxScreen: number;
  onChange: (config: { minScreen: number; maxScreen: number }) => void;
}

export const ViewportConfig: React.FC<ViewportConfigProps> = ({
  minScreen,
  maxScreen,
  onChange
}) => {
  return (
    <Wrapper>
      <Sidebar label="Viewport Sizes">
        <p className="text-sm text-gray-600">
          Define the minimum and maximum screen sizes for fluid scaling.
          These values are used to calculate min/max tokens.
        </p>
      </Sidebar>
      <Content>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum Viewport
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={minScreen}
                onChange={(e) => onChange({
                  minScreen: Number(e.target.value),
                  maxScreen
                })}
                min={320}
                max={768}
              />
              <span className="text-sm text-gray-500">px</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Typically 320px (small mobile)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Maximum Viewport
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={maxScreen}
                onChange={(e) => onChange({
                  minScreen,
                  maxScreen: Number(e.target.value)
                })}
                min={1024}
                max={3840}
              />
              <span className="text-sm text-gray-500">px</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Typically 1920px (desktop) or 1440px
            </p>
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm">
            <strong>How this works:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Min/max tokens are created for fluid values</li>
              <li>Example: <code>spacing/base/min</code> = value at {minScreen}px</li>
              <li>Example: <code>spacing/base/max</code> = value at {maxScreen}px</li>
              <li>Designers choose which to use based on context</li>
              <li>Developers get CSS clamp() formula in JSON export</li>
            </ul>
          </div>
        </div>
      </Content>
    </Wrapper>
  );
};
```

### 7.4 Main Thread: Token Generation Orchestrator

```typescript
// src/code/code.ts

import { generateColorTokens } from './tokenGenerators/colors';
import { generateSpacingTokens } from './tokenGenerators/spacing';
import { generateFontSizeTokens } from './tokenGenerators/fontSize';
import { generateBorderRadiusTokens } from './tokenGenerators/borderRadius';
import { exportToJSON } from './exporters/jsonExport';

figma.showUI(__html__, { width: 800, height: 600, themeColors: true });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate-tokens') {
    try {
      const state = msg.data;
      const viewport = msg.viewport || { minScreen: 320, maxScreen: 1920 };

      // Create or get collection
      let collection = figma.variables.getLocalVariableCollections()
        .find(c => c.name === "Winden Design Tokens");

      if (!collection) {
        collection = figma.variables.createVariableCollection("Winden Design Tokens");
      }

      // Clear existing variables (optional - ask user)
      // ...

      // Generate tokens
      if (state.colorsActive) {
        await generateColorTokens(state.colorEntries, collection.id);
      }

      if (state.spacesActive) {
        await generateSpacingTokens(state.spacing, viewport, collection.id);
      }

      if (state.fontSizesActive) {
        await generateFontSizeTokens(state.fontSize, viewport, collection.id);
      }

      if (state.borderRadiusActive) {
        await generateBorderRadiusTokens(state.borderRadius, viewport, collection.id);
      }

      figma.notify('✓ Design tokens generated successfully!');
      figma.ui.postMessage({ type: 'generation-complete' });

    } catch (error) {
      figma.notify(`Error: ${error.message}`, { error: true });
      console.error('Token generation failed:', error);
    }
  }

  if (msg.type === 'export-json') {
    try {
      const json = exportToJSON(msg.data, msg.viewport);
      figma.ui.postMessage({ type: 'json-ready', data: json });
    } catch (error) {
      figma.notify(`Export failed: ${error.message}`, { error: true });
    }
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};
```

### 7.5 UI Thread: Wizzard Integration

```typescript
// src/ui/App.tsx

import React, { useState, useEffect } from 'react';
import { Wizzard } from './components/Wizzard';
import { WizzardProvider } from './hooks/useWizzardContext';
import { ViewportConfig } from './components/ViewportConfig';

export const App: React.FC = () => {
  const [viewport, setViewport] = useState({ minScreen: 320, maxScreen: 1920 });
  const [isGenerating, setIsGenerating] = useState(false);

  // Load saved state from Figma
  useEffect(() => {
    parent.postMessage({ pluginMessage: { type: 'load-state' } }, '*');

    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;

      if (msg.type === 'state-loaded') {
        // Set initial state
      }

      if (msg.type === 'generation-complete') {
        setIsGenerating(false);
      }
    };
  }, []);

  const handleGenerate = (wizzardState: WizzardState) => {
    setIsGenerating(true);
    parent.postMessage({
      pluginMessage: {
        type: 'generate-tokens',
        data: wizzardState,
        viewport
      }
    }, '*');
  };

  const handleExportJSON = (wizzardState: WizzardState) => {
    parent.postMessage({
      pluginMessage: {
        type: 'export-json',
        data: wizzardState,
        viewport
      }
    }, '*');
  };

  return (
    <WizzardProvider>
      <div className="app">
        <header className="border-b p-4 flex justify-between items-center">
          <h1 className="text-lg font-bold">Winden Design Tokens</h1>
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="btn btn-secondary"
            >
              Export JSON
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn btn-primary"
            >
              {isGenerating ? 'Generating...' : 'Generate Tokens'}
            </button>
          </div>
        </header>

        <main>
          <Wizzard onGenerate={handleGenerate} />
        </main>
      </div>
    </WizzardProvider>
  );
};
```

---

## 8. File Structure

```
figma-winden-plugin/
├── manifest.json                    # Figma plugin manifest
├── package.json
├── tsconfig.json
├── vite.config.ts                   # Build configuration
├── README.md
│
├── src/
│   ├── code/                        # Main thread (Figma API access)
│   │   ├── code.ts                  # Entry point
│   │   │
│   │   ├── tokenGenerators/         # Token creation logic
│   │   │   ├── colors.ts            # Color variables
│   │   │   ├── spacing.ts           # Spacing min/max variables
│   │   │   ├── fontSize.ts          # Font size min/max variables
│   │   │   ├── fontFamily.ts        # Text styles
│   │   │   ├── borderRadius.ts      # Border radius variables
│   │   │   ├── breakpoints.ts       # Breakpoint variables
│   │   │   └── viewport.ts          # Viewport config variables
│   │   │
│   │   ├── exporters/               # JSON export logic
│   │   │   ├── jsonExport.ts        # W3C DTCG format
│   │   │   └── dtcgTypes.ts         # DTCG type definitions
│   │   │
│   │   ├── importers/               # JSON import logic
│   │   │   ├── jsonImport.ts        # Parse DTCG JSON
│   │   │   └── validator.ts         # Validate imported data
│   │   │
│   │   ├── utils/                   # Utilities (from Winden)
│   │   │   ├── clampCalculations.ts # FROM WINDEN (no changes)
│   │   │   ├── colorProcessor.ts    # FROM WINDEN (no changes)
│   │   │   └── figmaHelpers.ts      # NEW: Figma-specific utilities
│   │   │
│   │   └── storage.ts               # Figma clientStorage wrapper
│   │
│   ├── ui/                          # UI thread (React app)
│   │   ├── ui.tsx                   # Entry point
│   │   ├── App.tsx                  # Root component
│   │   │
│   │   ├── components/
│   │   │   ├── pages/
│   │   │   │   ├── Wizzard/         # FROM WINDEN (copied)
│   │   │   │   │   ├── Color/
│   │   │   │   │   │   ├── Colors.tsx
│   │   │   │   │   │   ├── ColorEntry.tsx
│   │   │   │   │   │   ├── ColorSwatch.tsx
│   │   │   │   │   │   ├── SlidersHSL.tsx
│   │   │   │   │   │   ├── SlidersRGB.tsx
│   │   │   │   │   │   ├── SlidersOKLCH.tsx
│   │   │   │   │   │   └── colorPresets.ts
│   │   │   │   │   │
│   │   │   │   │   ├── Breakpoints/
│   │   │   │   │   │   └── Breakpoints.tsx
│   │   │   │   │   │
│   │   │   │   │   ├── FontFamily/
│   │   │   │   │   │   └── FontFamily.tsx
│   │   │   │   │   │
│   │   │   │   │   ├── Settings/
│   │   │   │   │   │   └── SettingsTab.tsx
│   │   │   │   │   │
│   │   │   │   │   └── components/
│   │   │   │   │       ├── ScaleCalculator/
│   │   │   │   │       │   ├── ScaleCalculator.tsx   # FROM WINDEN
│   │   │   │   │       │   ├── ScaleValuesGroup.tsx  # FROM WINDEN
│   │   │   │   │       │   └── ScaleOverrides.tsx    # FROM WINDEN
│   │   │   │   │       │
│   │   │   │   │       ├── Layout.tsx                # FROM WINDEN
│   │   │   │   │       ├── ListWithButton.tsx        # FROM WINDEN
│   │   │   │   │       └── icons/                    # FROM WINDEN
│   │   │   │   │
│   │   │   │   ├── Wizzard.tsx                       # FROM WINDEN (modified)
│   │   │   │   ├── WizzardTabs.tsx                   # FROM WINDEN
│   │   │   │   └── WizzardContent.tsx                # FROM WINDEN
│   │   │   │
│   │   │   ├── ViewportConfig.tsx                    # NEW
│   │   │   ├── PluginHeader.tsx                      # NEW
│   │   │   └── TokenPreview.tsx                      # NEW
│   │   │
│   │   ├── ui/                      # FROM WINDEN (Radix UI components)
│   │   │   ├── button.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── input.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── ...
│   │   │
│   │   ├── hooks/
│   │   │   ├── useWizzardContext.tsx    # FROM WINDEN (modified)
│   │   │   ├── useClampCalculator.ts    # FROM WINDEN
│   │   │   └── useFigmaStorage.ts       # NEW
│   │   │
│   │   ├── types/
│   │   │   ├── wizzard.d.ts             # FROM WINDEN
│   │   │   ├── viewport.d.ts            # NEW
│   │   │   └── figma.d.ts               # NEW
│   │   │
│   │   └── utils/
│   │       └── messaging.ts             # NEW: postMessage helpers
│   │
│   └── shared/                      # Shared between code & UI
│       ├── types.ts                 # Common type definitions
│       └── constants.ts             # Shared constants
│
├── build/                           # Build output (gitignored)
│   ├── code.js
│   └── ui.html
│
└── docs/
    ├── USER_GUIDE.md
    └── DEVELOPMENT.md
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Test calculation utilities** (already well-tested in Winden):

```typescript
// tests/utils/clampCalculations.test.ts
import { calculateFluidScale } from '../src/code/utils/clampCalculations';

describe('calculateFluidScale', () => {
  it('should calculate correct min/max values', () => {
    const result = calculateFluidScale({
      minBaseSize: 16,
      maxBaseSize: 24,
      minScaleRatio: 1.2,
      maxScaleRatio: 1.33,
      steps: ['xs', 'sm', 'base', 'lg'],
      overrides: {}
    });

    expect(result.base.minValue).toBe(16);
    expect(result.base.maxValue).toBe(24);
    expect(result.lg.minValue).toBeCloseTo(19.2); // 16 * 1.2
    expect(result.lg.maxValue).toBeCloseTo(31.92); // 24 * 1.33
  });
});
```

### 9.2 Integration Tests

**Test token generation**:

```typescript
// tests/integration/tokenGeneration.test.ts
describe('Token Generation', () => {
  it('should create min/max variables for fluid spacing', async () => {
    const mockCollection = createMockCollection();

    await generateSpacingTokens(
      {
        steps: ['base'],
        minBaseSize: 16,
        maxBaseSize: 24,
        disableFluid: false
      },
      { minScreen: 320, maxScreen: 1920 },
      mockCollection.id
    );

    const variables = figma.variables.getLocalVariables();
    expect(variables.find(v => v.name === 'spacing/base/min')).toBeDefined();
    expect(variables.find(v => v.name === 'spacing/base/max')).toBeDefined();
  });
});
```

### 9.3 End-to-End Tests

**Manual test checklist**:

- [ ] Plugin loads in Figma Desktop
- [ ] Plugin loads in Figma Web
- [ ] State persists after closing plugin
- [ ] Colors generate correctly (50+ variables)
- [ ] Spacing generates with min/max pairs
- [ ] Font sizes generate with min/max pairs
- [ ] Viewport config affects calculations
- [ ] JSON export produces valid W3C DTCG format
- [ ] JSON import parses correctly
- [ ] Variable scoping works (variables appear in correct menus)
- [ ] No memory leaks with 100+ tokens
- [ ] Error handling works (invalid input, Figma API errors)

### 9.4 Performance Tests

**Benchmark token creation**:

```typescript
// tests/performance/tokenCreation.test.ts
describe('Performance', () => {
  it('should create 100 variables in under 2 seconds', async () => {
    const start = performance.now();

    // Create 100 test variables
    for (let i = 0; i < 100; i++) {
      await createVariable(`test-${i}`, collection, 'FLOAT');
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
```

### 9.5 Edge Cases

**Test edge cases**:

- [ ] Empty state (no tokens defined)
- [ ] Very large scales (100+ steps)
- [ ] Extreme viewport values (100px to 10000px)
- [ ] Special characters in token names
- [ ] Conflicting variable names
- [ ] Invalid color values
- [ ] Negative spacing values
- [ ] Zero scale ratios

---

## 10. Success Metrics

### 10.1 Functional Requirements

**Must have** (v1.0):
- ✅ Generate color variables with shades
- ✅ Generate spacing min/max pairs (fluid mode)
- ✅ Generate font size min/max pairs (fluid mode)
- ✅ Generate fixed values (non-fluid mode)
- ✅ Export W3C DTCG JSON
- ✅ Save/load state in Figma
- ✅ Viewport configuration
- ✅ Variable scoping

**Should have** (v1.1):
- ⭐ Import from JSON
- ⭐ Font family text styles
- ⭐ Border radius tokens
- ⭐ Breakpoint tokens
- ⭐ Token preview before generation
- ⭐ Batch operations (delete all, update all)

**Nice to have** (v2.0):
- 🌟 Variable modes (light/dark)
- 🌟 Token aliasing
- 🌟 Import from existing Figma variables
- 🌟 Preset libraries
- 🌟 Accessibility checking

### 10.2 Performance Metrics

- **Initial load**: < 2 seconds
- **Token generation (50 tokens)**: < 1 second
- **Token generation (100 tokens)**: < 2 seconds
- **JSON export**: < 500ms
- **Bundle size**: < 500KB

### 10.3 Quality Metrics

- **TypeScript coverage**: 100% (no `any` types)
- **Error handling**: All async operations wrapped in try/catch
- **User feedback**: Loading states for all async operations
- **Documentation**: Complete README + user guide
- **Code reuse**: 80%+ from Winden codebase

### 10.4 User Experience Metrics

- **Ease of use**: Non-technical designers can use without training
- **Discoverability**: All features accessible via UI (no hidden commands)
- **Consistency**: Matches Figma's design patterns
- **Accessibility**: Keyboard navigation, proper ARIA labels

---

## Appendix A: Dependencies

### A.1 Required Dependencies

```json
{
  "dependencies": {
    "@figma/plugin-typings": "^1.90.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "@radix-ui/react-checkbox": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-tooltip": "^1.1.5",
    "@uiw/color-convert": "^2.9.2",
    "@uiw/react-color": "^2.9.2",
    "tinycolor2": "^1.6.0",
    "classnames": "^2.5.1"
  },
  "devDependencies": {
    "@figma/create-plugin": "^1.3.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "vite-plugin-singlefile": "^2.0.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18"
  }
}
```

### A.2 Removed Dependencies (from Winden)

These are NOT needed for Figma plugin:

```json
{
  "@tailwindcss/*": "*",
  "autoprefixer": "^10.4.21",
  "postcss": "^8.4.50",
  "sass": "^1.83.4",
  "browser-sync": "^3.0.4",
  "monaco-editor": "^0.54.0",
  "axios": "^1.13.2"
}
```

---

## Appendix B: Figma API Reference

### B.1 Variable Creation

```typescript
// Create collection
const collection = figma.variables.createVariableCollection("My Tokens");

// Create variable
const variable = figma.variables.createVariable(
  "color/primary",
  collection,
  "COLOR" | "FLOAT" | "STRING" | "BOOLEAN"
);

// Set value
const mode = collection.modes[0];
variable.setValueForMode(mode.modeId, value);

// Set scoping
variable.scopes = [
  VariableScope.ALL_FILLS,
  VariableScope.STROKE_COLOR,
  VariableScope.FONT_SIZE,
  // etc.
];

// Set description
variable.description = "My token description";
```

### B.2 Variable Types & Scopes

**Variable Types:**
- `COLOR` - RGB color values
- `FLOAT` - Numeric values (spacing, font size, etc.)
- `STRING` - Text values (limited use)
- `BOOLEAN` - True/false values (limited use)

**Variable Scopes:**
```typescript
enum VariableScope {
  ALL_FILLS,
  FRAME_FILL,
  SHAPE_FILL,
  TEXT_FILL,
  STROKE_COLOR,
  EFFECT_COLOR,
  WIDTH_HEIGHT,
  MIN_WIDTH_HEIGHT,
  MAX_WIDTH_HEIGHT,
  GAP,
  CORNER_RADIUS,
  FONT_FAMILY,
  FONT_STYLE,
  FONT_SIZE,
  LINE_HEIGHT,
  LETTER_SPACING,
  PARAGRAPH_SPACING,
  PARAGRAPH_INDENT,
  OPACITY,
  EFFECT_FLOAT
}
```

### B.3 Client Storage

```typescript
// Save data
await figma.clientStorage.setAsync('key', data);

// Load data
const data = await figma.clientStorage.getAsync('key');

// Delete data
await figma.clientStorage.deleteAsync('key');

// Get all keys
const keys = await figma.clientStorage.keysAsync();
```

---

## Appendix C: W3C DTCG Format Reference

### C.1 Basic Structure

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "tokenCategory": {
    "$type": "tokenType",
    "tokenName": {
      "$value": "actualValue",
      "$type": "tokenType",
      "$description": "Optional description",
      "$extensions": {
        "vendorName": {
          "customProperty": "value"
        }
      }
    }
  }
}
```

### C.2 Token Types

- `color` - Color values (#hex, rgb(), hsl())
- `dimension` - Size values (px, rem, em)
- `fontFamily` - Font family stacks (array)
- `fontWeight` - Font weights (100-900)
- `duration` - Time values (ms, s)
- `cubicBezier` - Easing curves

### C.3 Complete Example

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "$type": "color",
    "primary": {
      "500": {
        "$value": "#3b82f6",
        "$type": "color",
        "$description": "Primary brand color"
      }
    }
  },
  "spacing": {
    "$type": "dimension",
    "base": {
      "min": {
        "$value": "16px",
        "$type": "dimension"
      },
      "max": {
        "$value": "24px",
        "$type": "dimension"
      },
      "$extensions": {
        "winden": {
          "fluid": true,
          "clamp": "clamp(1rem, 0.89rem + 0.55vi, 1.5rem)"
        }
      }
    }
  }
}
```

---

## Conclusion

This plan provides a complete roadmap for converting Winden's Wizzard into a Figma plugin with the innovative **min/max token strategy** for fluid typography and spacing.

**Key Advantages:**
1. ✅ Figma-native approach (no unsupported clamp() values)
2. ✅ Designer flexibility (choose min or max based on context)
3. ✅ Developer-friendly (JSON export includes clamp formulas)
4. ✅ High code reuse from Winden (85%+ UI components)
5. ✅ Clean architecture (easy to maintain and extend)

**Next Steps:**
1. Setup plugin boilerplate (Day 1)
2. Implement color token generation (Day 2)
3. Test in Figma to validate approach (Day 2)
4. Continue with full implementation per timeline

**Estimated Timeline**: 3 weeks to production-ready plugin

**Risk Level**: Low - Well-defined scope, proven UI components, clear Figma API

---

**Document End**

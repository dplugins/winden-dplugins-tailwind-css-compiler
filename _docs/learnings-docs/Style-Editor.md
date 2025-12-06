# Style Editor - Multi-Tab CSS/SCSS System

The Style Editor is Winden's powerful CSS/SCSS authoring environment with support for multiple tabs, layer directives, and seamless Tailwind v4 integration.

---

## Table of Contents
- [Overview](#overview)
- [Creating and Managing Tabs](#creating-and-managing-tabs)
- [Layer Directives](#layer-directives)
- [Tab Splitting System](#tab-splitting-system)
- [CSS Preprocessor Support](#css-preprocessor-support)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Style Editor provides a multi-tab interface for organizing your CSS/SCSS code. Each tab can target specific Tailwind layers (@layer directive) for proper cascade control.

### Key Features

- **Multiple Tabs** - Organize CSS into logical sections
- **Layer Support** - Target Tailwind's theme, base, components, utilities layers
- **SCSS/CSS** - Choose between CSS or SCSS preprocessor
- **Monaco Editor** - Full-featured code editor with IntelliSense
- **Auto-Combination** - Tabs automatically combine on save
- **Persistent Storage** - Tabs preserved in WordPress database

---

## Creating and Managing Tabs

### Adding a New Tab

1. Click the **"+"** button in the tab bar
2. Enter a tab name (e.g., "Components", "Utilities", "Custom")
3. Select a layer directive:
   - **theme** - Design tokens, CSS variables
   - **base** - Reset styles, element defaults
   - **components** - Reusable component classes
   - **utilities** - Single-purpose utility classes
   - **none** - No layer (custom CSS)
4. Click **"Create"**

### Renaming a Tab

1. Right-click on the tab name
2. Select **"Rename"**
3. Enter the new name
4. Press Enter or click outside to save

### Deleting a Tab

1. Click the **"×"** icon on the tab
2. Confirm deletion in the dialog
3. Content is permanently removed (use Backups to restore)

### Reordering Tabs

Click and drag tabs to reorder them. Tab order determines the final CSS output order.

---

## Layer Directives

Tailwind CSS v4 uses `@layer` directives to control CSS cascade order. Winden's tab system integrates seamlessly with this architecture.

### Understanding Layers

```
┌─────────────────────────────────────┐
│ @layer theme                        │  ← Design tokens, variables
├─────────────────────────────────────┤
│ @layer base                         │  ← Element resets, defaults
├─────────────────────────────────────┤
│ @layer components                   │  ← Component classes
├─────────────────────────────────────┤
│ @layer utilities                    │  ← Utility classes (highest priority)
└─────────────────────────────────────┘
```

**Cascade Order:** theme → base → components → utilities

### Layer Examples

#### @layer theme

Define CSS variables and design tokens:

```css
/* Tab: Design Tokens (@layer theme) */

@layer theme {
  :root {
    --color-brand: #3b82f6;
    --color-accent: #10b981;
    --spacing-section: 4rem;
  }
}
```

#### @layer base

Reset or style HTML elements:

```css
/* Tab: Base Styles (@layer base) */

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }

  h1, h2, h3 {
    @apply font-bold text-gray-900;
  }

  a {
    @apply text-blue-600 hover:text-blue-800;
  }
}
```

#### @layer components

Create reusable component classes:

```css
/* Tab: Components (@layer components) */

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-colors;
  }

  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }
}
```

#### @layer utilities

Add custom utility classes:

```css
/* Tab: Utilities (@layer utilities) */

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  .scrollbar-hide {
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
}
```

### No Layer (Custom CSS)

For CSS that shouldn't be in any layer:

```css
/* Tab: Third-Party Overrides (no layer) */

/* Override plugin styles */
.some-plugin-class {
  color: red !important;
}

/* Print styles */
@media print {
  .no-print {
    display: none;
  }
}
```

---

## Tab Splitting System

Winden uses a special marker syntax to split your combined CSS into separate tabs.

### Tab Marker Format

```css
/* Tab: [Name] (@layer [directive]) */
```

**Examples:**
```css
/* Tab: Components (@layer components) */
/* Tab: Base Styles (@layer base) */
/* Tab: Custom (no layer) */
```

### How It Works

#### 1. Combined Output (Saved to Database)

When you save, all tabs combine into a single CSS string:

```css
/* Tab: Theme (@layer theme) */
@layer theme {
  :root {
    --color-primary: #3b82f6;
  }
}

/* Tab: Components (@layer components) */
@layer components {
  .btn {
    @apply px-4 py-2 rounded;
  }
}

/* Tab: Utilities (@layer utilities) */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

#### 2. Parsing Back to Tabs (On Load)

When you reopen the editor, Winden parses the markers and recreates tabs:

```
Tab 1: "Theme" (@layer theme)
Tab 2: "Components" (@layer components)
Tab 3: "Utilities" (@layer utilities)
```

### Tab Combination Rules

**Order:** Tabs combine in the order they appear in the tab bar

**Structure:**
```
[Tab Marker]
@layer [directive] {
  [Tab Content]
}
```

**Example Output:**
```css
/* Tab: Base (@layer base) */
@layer base {
  body {
    @apply bg-white;
  }
}

/* Tab: Components (@layer components) */
@layer components {
  .card {
    @apply rounded shadow;
  }
}
```

### Manual Splitting

You can manually split content by adding markers in the editor:

```css
/* Tab: Part 1 (@layer components) */
.component-a {
  @apply p-4;
}

/* Tab: Part 2 (@layer utilities) */
.utility-x {
  @apply block;
}
```

On next reload, these will become separate tabs.

---

## CSS Preprocessor Support

### Switching Preprocessor

**Settings → Editor → CSS Preprocessor**
- **None (CSS)** - Standard CSS only
- **SCSS** - Sass/SCSS syntax with nesting, variables, mixins

### SCSS Features

#### Nesting

```scss
.card {
  @apply bg-white rounded p-6;

  .card-title {
    @apply text-xl font-bold mb-2;
  }

  .card-body {
    @apply text-gray-700;

    p {
      @apply mb-4;

      &:last-child {
        @apply mb-0;
      }
    }
  }

  &:hover {
    @apply shadow-lg;
  }
}
```

#### Variables

```scss
$primary-color: #3b82f6;
$spacing-lg: 2rem;

.btn-primary {
  background: $primary-color;
  padding: $spacing-lg;
}
```

#### Mixins

```scss
@mixin button-base {
  @apply px-4 py-2 rounded font-medium;
  transition: all 0.2s;
}

.btn {
  @include button-base;
}

.btn-large {
  @include button-base;
  @apply px-6 py-3 text-lg;
}
```

#### Functions

```scss
@function lighten-color($color, $amount) {
  @return mix(white, $color, $amount);
}

.btn-light {
  background: lighten-color(#3b82f6, 20%);
}
```

### SCSS + Tailwind @apply

You can combine SCSS features with Tailwind's `@apply`:

```scss
@layer components {
  .nav {
    @apply flex items-center gap-4;

    .nav-item {
      @apply px-3 py-2 rounded;

      &:hover {
        @apply bg-gray-100;
      }

      &.active {
        @apply bg-blue-500 text-white;
      }
    }
  }
}
```

---

## Best Practices

### 1. Organize by Purpose

Create tabs based on what the styles do:

```
✅ Good Structure:
- Theme (design tokens)
- Base (element defaults)
- Layout (page structure)
- Components (reusable UI)
- Utilities (helpers)

❌ Avoid:
- Page 1, Page 2, Page 3 (not descriptive)
- Random, Misc, Other (too vague)
```

### 2. Use Appropriate Layers

Put styles in the correct layer for proper cascade:

```css
/* ✅ Correct */
@layer base {
  body { @apply bg-white; }  /* Element default */
}

@layer components {
  .btn { @apply px-4 py-2; }  /* Component class */
}

@layer utilities {
  .text-balance { text-wrap: balance; }  /* Utility helper */
}

/* ❌ Wrong */
@layer utilities {
  body { @apply bg-white; }  /* Elements should be in base */
}

@layer base {
  .btn { @apply px-4 py-2; }  /* Components should be in components */
}
```

### 3. Keep Tabs Focused

Each tab should have a single responsibility:

```
✅ Good:
- Tab "Buttons" - Only button styles
- Tab "Cards" - Only card styles
- Tab "Typography" - Only text styles

❌ Avoid:
- Tab "Stuff" - Buttons, cards, forms, navigation (too much)
```

### 4. Use Comments

Add comments to explain complex styles:

```css
@layer components {
  /* Card component with hover lift effect */
  .card {
    @apply bg-white rounded-lg shadow p-6;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .card:hover {
    @apply shadow-xl;
    transform: translateY(-4px);
  }
}
```

### 5. Avoid Deep Nesting (SCSS)

Keep nesting shallow for maintainability:

```scss
/* ✅ Good - 2-3 levels max */
.nav {
  .nav-item {
    &:hover {
      @apply bg-gray-100;
    }
  }
}

/* ❌ Avoid - too deep */
.nav {
  .nav-list {
    .nav-item {
      .nav-link {
        .nav-icon {
          /* 5 levels deep! */
        }
      }
    }
  }
}
```

### 6. Layer Order in Output

Ensure tabs output in the correct order:

```
1. Theme tab first (design tokens)
2. Base tab second (element resets)
3. Components tab third (component classes)
4. Utilities tab last (utility classes)
```

This matches Tailwind's cascade order.

---

## Common Patterns

### Pattern 1: Design System with Tabs

```
Tab: Theme (@layer theme)
├─ CSS variables
└─ Design tokens

Tab: Base (@layer base)
├─ Element resets
└─ Typography defaults

Tab: Components (@layer components)
├─ Buttons
├─ Cards
├─ Forms
└─ Navigation

Tab: Utilities (@layer utilities)
└─ Custom utilities
```

**Example:**

```css
/* Tab: Theme (@layer theme) */
@layer theme {
  :root {
    --color-primary: #3b82f6;
    --color-secondary: #10b981;
    --spacing-section: 4rem;
  }
}

/* Tab: Base (@layer base) */
@layer base {
  body {
    @apply font-sans text-gray-900;
  }
}

/* Tab: Components (@layer components) */
@layer components {
  .btn {
    @apply px-4 py-2 rounded font-medium;
  }
}

/* Tab: Utilities (@layer utilities) */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

### Pattern 2: Plugin Integration

```css
/* Tab: Plugins (@layer theme) */
@import "tailwindcss";
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";

/* Tab: Theme (@layer theme) */
@layer theme {
  /* Custom design tokens */
}

/* Tab: Components (@layer components) */
@layer components {
  /* Custom components */
}
```

### Pattern 3: Responsive Design

```css
/* Tab: Responsive (@layer components) */
@layer components {
  .container-custom {
    @apply px-4;

    @media (min-width: 768px) {
      @apply px-8;
    }

    @media (min-width: 1024px) {
      @apply px-12 max-w-7xl mx-auto;
    }
  }
}
```

### Pattern 4: Dark Mode Support

```css
/* Tab: Dark Mode (@layer base) */
@layer base {
  :root {
    --color-bg: white;
    --color-text: black;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-bg: #1f2937;
      --color-text: white;
    }
  }

  body {
    background: var(--color-bg);
    color: var(--color-text);
  }
}
```

### Pattern 5: Component Variants (SCSS)

```scss
/* Tab: Button Variants (@layer components) */
@layer components {
  .btn {
    @apply px-4 py-2 rounded font-medium transition-colors;

    &.btn-primary {
      @apply bg-blue-600 text-white hover:bg-blue-700;
    }

    &.btn-secondary {
      @apply bg-gray-200 text-gray-900 hover:bg-gray-300;
    }

    &.btn-lg {
      @apply px-6 py-3 text-lg;
    }

    &.btn-sm {
      @apply px-2 py-1 text-sm;
    }
  }
}
```

---

## Troubleshooting

### Tabs Not Splitting Correctly

**Problem:** Tabs aren't parsing when you reload the editor.

**Solution:** Check marker format:

```css
/* ✅ Correct */
/* Tab: Components (@layer components) */

/* ❌ Wrong - missing colon */
/* Tab Components (@layer components) */

/* ❌ Wrong - missing @layer */
/* Tab: Components */

/* ❌ Wrong - typo in @layer */
/* Tab: Components (@layer component) */
```

### Styles Not Applying in Correct Order

**Problem:** Utility classes aren't overriding component classes.

**Solution:** Ensure layer order is correct:

```css
/* ✅ Correct order */
/* Tab: Base (@layer base) */
/* Tab: Components (@layer components) */
/* Tab: Utilities (@layer utilities) */

/* ❌ Wrong order */
/* Tab: Utilities (@layer utilities) */  ← Utilities first
/* Tab: Components (@layer components) */
```

### SCSS Not Compiling

**Problem:** SCSS syntax errors or features not working.

**Solution:**
1. Check **Settings → Editor → CSS Preprocessor** is set to "SCSS"
2. Verify SCSS syntax is correct
3. Check browser console for compilation errors
4. Save and reload the editor

### Tab Content Disappearing

**Problem:** Tab content lost after save.

**Solution:**
1. Check if tab marker is valid
2. Ensure content is between markers
3. Use **Wizzard → Backups** to restore lost content
4. Always test by reloading after creating new tabs

### @layer Not Working

**Problem:** Layer directives don't affect cascade.

**Solution:**
1. Ensure you imported Tailwind: `@import "tailwindcss";`
2. Check layer name spelling: `theme`, `base`, `components`, `utilities` (no typos)
3. Verify layers are declared: `@layer theme, base, components, utilities;`
4. Clear Tailwind cache: Run `clearTailwindCache()` in console

---

## Advanced: Tab Data Structure

### Tab Object

```typescript
interface StyleTab {
  id: string;              // Unique ID (e.g., "tab-1234567890")
  name: string;            // Display name (e.g., "Components")
  content: string;         // CSS/SCSS content
  layer?: string;          // Layer directive (theme|base|components|utilities)
}
```

### Tab State

```typescript
interface StyleTabsState {
  tabs: StyleTab[];        // Array of all tabs
  activeTabId: string;     // Currently selected tab ID
}
```

### Tab Creation

```typescript
const newTab = createStyleTab(
  "Components",              // name
  "@layer components { }",   // content
  "components"               // layer
);
```

### Tab Combination

```typescript
const combined = combineStyleTabs([tab1, tab2, tab3]);
// Returns:
// /* Tab: tab1.name (@layer tab1.layer) */
// @layer tab1.layer {
//   tab1.content
// }
// /* Tab: tab2.name (@layer tab2.layer) */
// @layer tab2.layer {
//   tab2.content
// }
```

### Tab Parsing

```typescript
const tabs = parseContentIntoTabs(combinedCSS);
// Splits combined CSS back into StyleTab[]
```

---

## Next Steps

- Learn about [Wizzard visual design tokens](Wizzard-Overview.md)
- Understand [JavaScript Config for advanced customization](JavaScript-Config.md)
- Explore [Plugin integration](Plugins.md)
- Check [Plain Classes autocomplete](Plain-Classes.md)

---

**Need Help?**
If you have questions about the Style Editor, consult the [FAQ](FAQ.md) or reach out to Winden support.

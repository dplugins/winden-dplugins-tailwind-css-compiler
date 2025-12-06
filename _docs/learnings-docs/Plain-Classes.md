# Plain Classes: Autocomplete System

Winden's Plain Classes feature provides intelligent autocomplete for Tailwind CSS classes directly in your page builder editors (Gutenberg, Bricks, Oxygen, Elementor).

---

## Table of Contents
- [Overview](#overview)
- [Enabling Autocomplete](#enabling-autocomplete)
- [How It Works](#how-it-works)
- [Using Autocomplete](#using-autocomplete)
- [Supported Builders](#supported-builders)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

---

## Overview

Plain Classes autocomplete suggests Tailwind utility classes as you type in page builder class inputs, making it faster and easier to apply styles.

### Key Features

- **Real-Time Suggestions** - Classes appear as you type
- **Context-Aware** - Shows relevant classes based on input
- **Breakpoint Support** - Suggests `sm:`, `md:`, `lg:`, etc.
- **Custom Classes** - Includes your custom colors, spacing, fonts
- **Builder Integration** - Works in Gutenberg, Bricks, Oxygen, Elementor

### Benefits

✅ **Faster Development** - No need to memorize class names
✅ **Fewer Typos** - Select from valid classes only
✅ **Discover Classes** - Find utilities you didn't know existed
✅ **Consistent Naming** - Use correct Tailwind syntax

---

## Enabling Autocomplete

### Step 1: Open Settings

1. Click **Settings** (gear icon) in Winden Editor
2. Go to **Builders** tab

### Step 2: Enable for Your Builder

Toggle autocomplete for your page builder:

```
☑ Gutenberg (FSE)
☑ Bricks Builder
☑ Bricks Builder 2.0
☑ Oxygen Builder Classic
☑ Oxygen Builder 6
☑ Elementor Builder
```

**Note:** You can enable multiple builders if you use more than one.

### Step 3: Save Settings

Click **Save** or press **Cmd+S / Ctrl+S**.

### Step 4: Reload Builder

Refresh your page builder editor to activate autocomplete.

---

## How It Works

### Architecture

```
User Types in Class Input
    ↓
Winden Detects Input Context
    ↓
Queries Available Classes
    ↓
Filters Based on Input
    ↓
Shows Autocomplete Dropdown
    ↓
User Selects Class
    ↓
Class Applied to Element
```

### Class Sources

Autocomplete suggestions come from:

1. **Tailwind Core** - All built-in utilities
2. **Wizzard Tokens** - Custom colors, fonts, spacing
3. **Custom CSS** - Classes from Style tab
4. **Breakpoints** - Responsive prefixes
5. **Variants** - Hover, focus, dark mode, etc.

### Intelligent Filtering

Winden provides context-aware suggestions:

**Example 1: Color Classes**
```
User types: "bg-"
Suggestions:
- bg-white
- bg-black
- bg-transparent
- bg-primary-500  (if you added "primary" color)
- bg-red-500
- bg-blue-600
...
```

**Example 2: Responsive Classes**
```
User types: "md:"
Suggestions:
- md:block
- md:flex
- md:grid
- md:hidden
...
```

**Example 3: Custom Values**
```
You added: spacing "section" = 4rem

User types: "pt-"
Suggestions:
- pt-0
- pt-1
- pt-section  ← Your custom value
- pt-4
...
```

---

## Using Autocomplete

### In Gutenberg (FSE)

1. Select a block
2. Go to **Advanced** → **Additional CSS class(es)**
3. Start typing: `flex`
4. Autocomplete dropdown appears
5. Arrow keys to navigate, Enter to select
6. Or keep typing and press Space to accept

### In Bricks Builder

1. Select an element
2. Click **CSS Classes** input
3. Start typing
4. Dropdown shows suggestions
5. Click or press Enter to select

### In Bricks Builder 2.0

1. Select an element
2. In the **Styles** panel, find **CSS Classes**
3. Type in the input field
4. Suggestions appear automatically
5. Select with mouse or keyboard

### In Oxygen Builder

1. Select an element
2. Go to **Advanced** → **CSS Classes**
3. Type in the class input
4. Autocomplete dropdown shows
5. Select your class

### In Elementor

1. Select a widget
2. Go to **Advanced** → **CSS Classes**
3. Start typing
4. Suggestions appear
5. Choose from the list

---

## Autocomplete Contexts

### 1. Directive Suggestions (@)

When you type `@` in the Style tab:

```
User types: "@"
Suggestions:
- @import
- @theme
- @layer
- @plugin
- @media
- @apply
```

### 2. Property Suggestions (-)

When you type `--` (CSS custom property):

```
User types: "--"
Suggestions:
- --color-primary-500
- --spacing-section
- --font-sans
```

### 3. Class Name Suggestions

When typing in class inputs:

```
User types: "text-"
Suggestions:
- text-xs
- text-sm
- text-base
- text-lg
- text-primary-500
- text-center
- text-left
```

---

## Supported Builders

### Gutenberg (FSE)

**Status:** ✅ Fully Supported

**Location:** Advanced → Additional CSS class(es)

**Features:**
- Block editor classes
- Reusable blocks
- Template editor
- Site editor

**Activation:**
Settings → Builders → ☑ Gutenberg (FSE)

---

### Bricks Builder

**Status:** ✅ Fully Supported

**Location:** CSS Classes input

**Features:**
- Element classes
- Template classes
- Global classes
- Conditions support

**Activation:**
Settings → Builders → ☑ Bricks Builder

---

### Bricks Builder 2.0

**Status:** ✅ Fully Supported

**Location:** Styles panel → CSS Classes

**Features:**
- New UI integration
- Global styles
- Design library
- Component classes

**Activation:**
Settings → Builders → ☑ Bricks Builder 2.0

---

### Oxygen Builder

**Status:** ✅ Fully Supported (Classic & v6)

**Location:** Advanced → CSS Classes

**Features:**
- Element classes
- Template classes
- Global classes
- Conditions

**Activation:**
- Classic: Settings → Builders → ☑ Oxygen Builder Classic
- V6: Settings → Builders → ☑ Oxygen Builder 6

---

### Elementor

**Status:** ✅ Fully Supported

**Location:** Advanced → CSS Classes

**Features:**
- Widget classes
- Column classes
- Section classes
- Global widgets

**Activation:**
Settings → Builders → ☑ Elementor Builder

---

## Customization

### Adding Custom Classes to Autocomplete

**Method 1: Via Wizzard**

Custom tokens automatically appear:

```
1. Add color "brand" in Wizzard
2. Autocomplete now includes:
   - bg-brand-500
   - text-brand-500
   - border-brand-500
```

**Method 2: Via Style Tab**

Classes defined in `@layer components` appear:

```css
@layer components {
  .btn {
    @apply px-4 py-2 rounded;
  }
}
```

Autocomplete now includes: `btn`

**Method 3: Via JavaScript Config**

Extend theme in JavaScript Config:

```javascript
export default {
  theme: {
    extend: {
      spacing: {
        huge: '10rem'
      }
    }
  }
}
```

Autocomplete now includes: `p-huge`, `m-huge`, etc.

### Excluding Classes from Autocomplete

**Currently not supported.** All generated classes appear in autocomplete.

**Workaround:** Use descriptive names to identify internal-only classes:

```css
/* Will appear in autocomplete */
.component-internal-btn { }

/* Users know to avoid "internal" classes */
```

### Custom Breakpoints in Autocomplete

Add custom breakpoints:

```
1. Wizzard → Breakpoints
2. Add "tablet" = 768px
3. Autocomplete now suggests: tablet:flex, tablet:grid, etc.
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| **Open autocomplete** | Start typing |
| **Navigate down** | ↓ or Tab |
| **Navigate up** | ↑ or Shift+Tab |
| **Select** | Enter |
| **Close** | Esc |
| **Accept and continue** | Space |

---

## Best Practices

### 1. Enable Only Active Builders

Don't enable autocomplete for builders you don't use:

```
✅ If using Bricks only:
☑ Bricks Builder
☐ Gutenberg
☐ Oxygen
☐ Elementor
```

**Why:** Reduces unnecessary JavaScript loading.

### 2. Use Semantic Custom Classes

Name custom tokens descriptively:

```
✅ Good:
- primary-500 (autocomplete: bg-primary-500)
- section (autocomplete: pt-section)

❌ Avoid:
- x (autocomplete: bg-x ← unclear)
- temp (autocomplete: pt-temp ← unclear)
```

### 3. Learn Common Patterns

Memorize frequently used prefixes:

```
Layout:
- flex, grid, block, inline

Spacing:
- p-, m-, space-, gap-

Sizing:
- w-, h-, max-, min-

Colors:
- bg-, text-, border-

Typography:
- font-, text-, leading-, tracking-
```

### 4. Combine with Tailwind Docs

Autocomplete shows class names, not full documentation. Reference [Tailwind docs](https://tailwindcss.com) for:
- What each class does
- Available modifiers
- Best practices

---

## Troubleshooting

### Autocomplete Not Appearing

**Problem:** Type in class input, no suggestions show.

**Solution:**
1. Check Settings → Builders → Ensure your builder is enabled
2. Refresh the page builder editor
3. Clear browser cache
4. Check browser console for JavaScript errors

### Custom Classes Not Showing

**Problem:** Added color in Wizzard but `bg-brand-500` doesn't appear.

**Solution:**
1. Save Wizzard changes (Cmd+S)
2. Reload page builder
3. Wait a few seconds for classes to regenerate
4. Try typing again

### Wrong Classes Suggested

**Problem:** Autocomplete suggests incorrect or outdated classes.

**Solution:**
1. Clear Tailwind cache: `clearTailwindCache()`
2. Reload page builder
3. Ensure you're using latest Winden version

### Autocomplete Slow

**Problem:** Dropdown takes several seconds to appear.

**Solution:**
1. Reduce number of custom tokens (colors, spacing)
2. Check if you have very large CSS in Style tab
3. Clear browser cache
4. Disable unused builders in Settings

### Conflicts with Builder's Own Autocomplete

**Problem:** Builder has its own class suggestions conflicting with Winden.

**Solution:**
1. Disable builder's native autocomplete (if possible)
2. Or disable Winden autocomplete for that builder
3. Report issue to Winden support

---

## Advanced: Autocomplete API

### Global Object

Autocomplete data is exposed globally:

```javascript
// Available class list
window.winden_autocomplete_classes

// Available breakpoints
window.winden_autocomplete_screens

// Refresh autocomplete data
window.autoExtractBreakpoints()
```

### Manual Refresh

If autocomplete data seems stale:

```javascript
// In browser console
window.autoExtractBreakpoints()
```

This refetches and rebuilds the class list.

### Custom Integration

For custom integrations (advanced):

```javascript
// Listen for autocomplete ready event
document.addEventListener('winden:autocomplete:ready', (e) => {
  console.log('Autocomplete loaded', e.detail.classes);
});
```

---

## Next Steps

- Learn about [Wizzard for custom tokens](Wizzard-Overview.md)
- Explore [Style Editor for custom classes](Style-Editor.md)
- Check [Files Scan for class detection](Files-Scan.md)

---

**Need Help?**
If you have questions about autocomplete, consult the [FAQ](FAQ.md) or reach out to Winden support.

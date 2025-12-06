# Wizzard: Colors

The Colors tab in Wizzard provides a visual interface for managing your Tailwind color palette with automatic shade generation and real-time preview.

---

## Table of Contents
- [Overview](#overview)
- [Adding Colors](#adding-colors)
- [Shade Generation](#shade-generation)
- [Editing Colors](#editing-colors)
- [Color Formats](#color-formats)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Colors tab lets you create and manage custom color palettes without writing code. Each color automatically generates a full shade scale (50-950) using intelligent algorithms.

### Key Features

- **Visual Color Picker** - Choose colors with RGB, HSL, or HEX picker
- **Automatic Shade Generation** - Creates 50, 100, 200... 950 shades
- **Live Preview** - See colors in real-time
- **Name Validation** - Prevents invalid color names
- **Export to CSS** - Generates `@theme` CSS variables

---

## Adding Colors

### Step 1: Open Colors Tab

1. Open Winden Editor
2. Click **Wizzard** in the sidebar
3. Select **Colors** tab

### Step 2: Add a New Color

1. Click the **"+ Add Color"** button
2. Enter a color name (e.g., "brand", "accent", "primary")
3. Choose a base color using the color picker
4. Click **"Save"** or press **Enter**

### Step 3: View Generated Shades

The system automatically generates 10 shades:
- **50** - Lightest
- **100, 200, 300, 400** - Light variants
- **500** - Your base color
- **600, 700, 800, 900** - Dark variants
- **950** - Darkest

**Example:**
```
Input: brand = #3b82f6 (blue)

Generated:
├─ brand-50:  #eff6ff  (very light blue)
├─ brand-100: #dbeafe
├─ brand-200: #bfdbfe
├─ brand-300: #93c5fd
├─ brand-400: #60a5fa
├─ brand-500: #3b82f6  ← Your input color
├─ brand-600: #2563eb
├─ brand-700: #1d4ed8
├─ brand-800: #1e40af
├─ brand-900: #1e3a8a
└─ brand-950: #172554  (very dark blue)
```

---

## Shade Generation

### How Shade Generation Works

Winden uses a sophisticated algorithm to generate shades that:
- Maintain color harmony
- Ensure sufficient contrast
- Work well for both light and dark modes
- Follow Tailwind's shade naming convention

### Shade Scale Reference

| Shade | Typical Use | Example |
|-------|-------------|---------|
| **50** | Very light backgrounds | `bg-brand-50` |
| **100** | Light backgrounds, hover states | `bg-brand-100` |
| **200** | Borders, light text | `border-brand-200` |
| **300** | Placeholder text, disabled states | `text-brand-300` |
| **400** | Secondary buttons, icons | `bg-brand-400` |
| **500** | Primary actions, your base color | `bg-brand-500` |
| **600** | Hover states, darker actions | `hover:bg-brand-600` |
| **700** | Active states, focused elements | `focus:ring-brand-700` |
| **800** | Dark mode backgrounds | `dark:bg-brand-800` |
| **900** | Very dark backgrounds, text | `text-brand-900` |
| **950** | Darkest shade, highest contrast | `bg-brand-950` |

### Customizing Generated Shades

If you don't like the auto-generated shades:

1. Click the color swatch to expand shades
2. Click on any individual shade
3. Adjust using the color picker
4. The shade will be locked to your custom value

**Note:** Locking a shade prevents it from regenerating when you change the base color.

---

## Editing Colors

### Rename a Color

1. Click the **edit icon** (pencil) next to the color name
2. Enter the new name
3. Press **Enter** or click outside to save

**Important:** Renaming a color updates all references in your CSS.

### Change Base Color

1. Click the color swatch
2. Use the color picker to choose a new color
3. All shades regenerate automatically (unless locked)

### Delete a Color

1. Click the **trash icon** next to the color
2. Confirm deletion
3. The color and all its shades are removed

**Warning:** Deleting colors may break existing styles if you're using them in your HTML.

### Reorder Colors

Click and drag colors to reorder them in the palette. This affects the order in the exported CSS.

---

## Color Formats

### Supported Input Formats

You can input colors in multiple formats:

**HEX:**
```
#3b82f6
#3B82F6 (case insensitive)
3b82f6 (without #)
```

**RGB:**
```
rgb(59, 130, 246)
59, 130, 246
```

**HSL:**
```
hsl(217, 91%, 60%)
217, 91%, 60%
```

**Named Colors:**
```
blue
red
cornflowerblue
```

### Output Format

Colors are exported as CSS custom properties in `@theme`:

```css
@theme {
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-200: #bfdbfe;
  --color-brand-300: #93c5fd;
  --color-brand-400: #60a5fa;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-800: #1e40af;
  --color-brand-900: #1e3a8a;
  --color-brand-950: #172554;
}
```

These can be used in Tailwind utilities:
```html
<div class="bg-brand-500 text-white">
  <button class="bg-brand-600 hover:bg-brand-700">Click me</button>
</div>
```

---

## Best Practices

### 1. Use Semantic Names

Choose names that describe purpose, not appearance:

```
✅ Good:
- primary
- secondary
- accent
- success
- warning
- danger

❌ Avoid:
- blue
- red
- green
```

**Why:** If you change your brand from blue to purple, "primary" still makes sense, but "blue" doesn't.

### 2. Limit Your Palette

Don't add too many colors:

```
✅ Recommended:
- primary (brand color)
- secondary (accent color)
- success (green)
- warning (yellow)
- danger (red)
- neutral (gray)

Total: ~6 colors = ~60 shade variables
```

**Why:** Too many colors create decision fatigue and inconsistent designs.

### 3. Choose Saturated Base Colors

Select vibrant colors (500 shade) for better shade generation:

```
✅ Good base colors:
- #3b82f6 (saturated blue)
- #10b981 (saturated green)
- #ef4444 (saturated red)

❌ Poor base colors:
- #a0aec0 (too gray, low saturation)
- #f7fafc (too light)
- #1a202c (too dark)
```

**Why:** Saturated mid-tone colors produce better shade scales.

### 4. Test Contrast

Ensure sufficient contrast for accessibility:

```html
<!-- ✅ Good - dark text on light background -->
<div class="bg-brand-50 text-brand-900">
  High contrast, readable text
</div>

<!-- ❌ Poor - similar shades, low contrast -->
<div class="bg-brand-400 text-brand-500">
  Low contrast, hard to read
</div>
```

**Rule of Thumb:**
- Use 50-300 for light backgrounds
- Use 600-950 for dark backgrounds or text
- Avoid adjacent shades for text/background combinations

### 5. Consider Dark Mode

Plan for both light and dark themes:

```html
<!-- Light mode: dark text on light bg -->
<div class="bg-brand-50 text-brand-900 dark:bg-brand-900 dark:text-brand-50">
  Content that works in both modes
</div>
```

---

## Common Patterns

### Pattern 1: Brand Color Palette

```
Colors:
├─ primary (your main brand color)
├─ secondary (complementary color)
└─ accent (highlight color)

Usage:
- primary-500: Main buttons, links
- primary-100: Light backgrounds
- primary-900: Dark text
- secondary-500: Secondary actions
- accent-500: Call-to-action elements
```

### Pattern 2: Semantic Status Colors

```
Colors:
├─ success (#10b981 - green)
├─ warning (#f59e0b - amber)
├─ danger (#ef4444 - red)
└─ info (#3b82f6 - blue)

Usage:
- success-500: Success messages, completed states
- warning-500: Warning alerts, pending states
- danger-500: Error messages, destructive actions
- info-500: Informational messages, help text
```

### Pattern 3: Neutral Grayscale

```
Colors:
└─ neutral (#6b7280 - gray)

Usage:
- neutral-50: Very light backgrounds
- neutral-100: Card backgrounds
- neutral-200: Borders
- neutral-400: Placeholder text
- neutral-600: Body text
- neutral-900: Headings
```

### Pattern 4: Multi-Brand System

For white-label or multi-tenant apps:

```
Colors:
├─ brand-a (Client A's brand)
├─ brand-b (Client B's brand)
└─ brand-c (Client C's brand)

Usage:
<div class="bg-brand-a-500">Client A theme</div>
<div class="bg-brand-b-500">Client B theme</div>
```

---

## Troubleshooting

### Shades Look Too Similar

**Problem:** Generated shades don't have enough variation.

**Solution:**
1. Choose a more saturated base color
2. Avoid very light colors (#f0f0f0) or very dark colors (#1a1a1a)
3. Use colors in the middle of the spectrum
4. Manually adjust problematic shades

### Color Name Not Working

**Problem:** Color name won't save or shows error.

**Solution:**
Check color name rules:
- Use only lowercase letters, numbers, hyphens
- Start with a letter
- No spaces or special characters

```
✅ Valid:
- primary
- brand-blue
- color1

❌ Invalid:
- Primary (uppercase)
- brand blue (space)
- @color (special char)
- 1color (starts with number)
```

### Colors Not Applying in HTML

**Problem:** Using `bg-brand-500` doesn't work.

**Solution:**
1. Save your Wizzard changes (Cmd+S / Ctrl+S)
2. Ensure the color name matches exactly
3. Check browser console for errors
4. Try clearing cache: `clearTailwindCache()`

### Too Many Shades Generated

**Problem:** Don't need all 11 shades (50-950).

**Solution:**
This is expected behavior. Tailwind generates all shades for flexibility. You don't need to use all of them. Common usage:
- 50, 100, 200 for backgrounds
- 500 for primary actions
- 700, 900 for text and dark mode

### Dark Mode Colors Look Wrong

**Problem:** Shades don't work well for dark mode.

**Solution:**
Use inverted shades in dark mode:

```html
<!-- Light mode: light bg, dark text -->
<!-- Dark mode: dark bg, light text -->
<div class="bg-brand-50 text-brand-900 dark:bg-brand-900 dark:text-brand-50">
  Content
</div>
```

---

## Advanced: Shade Generation Algorithm

### How Winden Generates Shades

1. **Input:** You provide a base color (e.g., `#3b82f6`)
2. **Lightness Analysis:** Winden determines if your color is light, medium, or dark
3. **Shade Calculation:**
   - Shades 50-400: Lighten the color incrementally
   - Shade 500: Your base color
   - Shades 600-950: Darken the color incrementally
4. **Saturation Adjustment:** Lighter shades get reduced saturation, darker shades get increased saturation
5. **Output:** 11 harmonious shades

### Manual Override

To override specific shades:

1. Click the color to expand shades
2. Click a specific shade swatch
3. Choose a custom color
4. The shade is now "locked" and won't regenerate

**Locked vs Generated:**
- **Generated:** Automatically updates when base color changes
- **Locked:** Stays fixed to your custom value

To unlock a shade:
1. Click the shade
2. Click "Reset to Generated"
3. Shade will regenerate based on base color

---

## Export and Import

### Export Color Palette

1. Click **"Export"** in the Colors tab
2. Choose format:
   - **CSS Variables** - `@theme` format for Tailwind v4
   - **JavaScript** - Config object for JavaScript Config tab
   - **JSON** - Portable format for sharing

**Example CSS Export:**
```css
@theme {
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-950: #172554;
}
```

### Import Color Palette

1. Click **"Import"** in the Colors tab
2. Paste CSS variables, JavaScript config, or JSON
3. Click **"Import"**
4. Colors are added to your palette

**Supports:**
- Winden exports
- Tailwind config objects
- CSS custom properties
- JSON color data

---

## Next Steps

- Learn about [Font Sizes in Wizzard](Wizzard-Font-Sizes.md)
- Explore [Spacing configuration](Wizzard-Spacing.md)
- Understand [Breakpoints setup](Wizzard-Breakpoints.md)
- Check [Wizzard overview](Wizzard-Overview.md)

---

**Need Help?**
If you have questions about color management, consult the [FAQ](FAQ.md) or reach out to Winden support.

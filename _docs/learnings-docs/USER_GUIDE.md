# Winden Editor - User Guide

Welcome to Winden! This guide explains all the features and how to use them.

## Overview

Winden is a powerful Tailwind CSS editor for WordPress with four main editing modes:

1. **Style Editor** - Write and organize CSS/SCSS in tabs
2. **JavaScript Config** - Advanced users: direct configuration
3. **Wizzard** - Visual design token builder
4. **Settings** - Configure editor behavior

---

## Style Editor (CSS/SCSS Tab)

### What It Does
Organize your CSS/SCSS code into logical tabs with Tailwind layer support.

### How to Use

#### Creating Tabs
1. Click the **+** button in the tab bar
2. Enter a tab name (e.g., "Colors", "Typography", "Layout")
3. Select a Tailwind layer:
   - **No Layer**: Plain CSS without wrapper
   - **@layer theme**: For design tokens and variables
   - **@layer base**: For element defaults and resets
   - **@layer components**: For component classes
   - **@layer utilities**: For utility classes
4. Click **Add Tab**

#### Editing Tab Content
1. Click a tab to select it
2. Write CSS/SCSS in the editor below
3. Changes save automatically when you click **Save**

#### Managing Tabs
- **Switch tabs**: Click any tab name
- **Edit tab**: Double-click a tab name to change its settings
- **Delete tab**: Hover over a tab and click the X button
  - Note: You must keep at least one tab

#### Tab Markers
Each tab automatically gets a comment showing its name and layer:
```css
/* Tab: Colors (@layer theme) */
@layer theme {
  /* Your CSS here */
}
```

### Best Practices
- Use **@layer theme** for design tokens and CSS variables
- Use **@layer components** for reusable component styles
- Use **@layer utilities** for utility classes
- Keep **No Layer** for CSS that shouldn't be wrapped

---

## JavaScript Config Tab

### What It Does
For advanced users who want direct control over Tailwind configuration.

### When to Use
- You're familiar with Tailwind config syntax
- You need features not available in Wizzard
- You prefer raw code over visual builders

### How to Use
1. Click the **JavaScript** tab at the top
2. Write or paste your Tailwind configuration
3. Use Tailwind v4 syntax
4. Click **Save** when done

### Available Autocomplete
Start typing and you'll see suggestions for:
- `@apply`, `@config`, `@layer`, `@screen`, `@tailwind`, `@theme`, `@utility`, `@variant`
- CSS custom properties like `--color-`, `--spacing-`, `--font-`

---

## Wizzard Tab

The Wizzard is a visual builder for creating design tokens. Enable features in the **Settings** tab.

### Available Features

#### 1. Colors
**What it does**: Create a complete color palette with automatic shade generation

**How to use**:
1. Click the **Colors** tab (appears after enabling in Settings)
2. Click **+ Add Color**
3. Enter a color name (e.g., "Primary", "Secondary")
4. Pick your base color
5. Adjust the shade range if needed
6. Shades generate automatically

**Color Formats**:
- Hex (#FF0000)
- RGB (255, 0, 0)
- HSL (0°, 100%, 50%)
- OKLCH (for modern color spaces)

**Built-in Presets**:
- **Load Preset: Neutrals** - Grey color palette
- **Load Preset: Primary** - Tahiti blue palette
- **Load Preset: Secondary** - Orange palette

**Options**:
- **Include Utility Colors** - Adds white, black, transparent, inherit
- **Include Builder Colors** - Pull colors from your page builder

#### 2. Font Sizes
**What it does**: Create fluid typography scales using CSS clamp()

**How to use**:
1. Click the **Font Sizes** tab
2. Adjust the scale settings:
   - **Steps**: Define size levels (xs, sm, base, md, lg, etc.)
   - **Min/Max Size**: Mobile and desktop base sizes
   - **Scale Ratio**: How much each step grows
3. Toggle **Disable Fluid** for static sizes instead of responsive
4. Check the generated clamp() values in each step

**Understanding Clamp Values**:
`clamp(1rem, 0.79rem + 1.05vi, 1.19rem)` means:
- Minimum: 1rem on small screens
- Preferred: Scales between screens
- Maximum: 1.19rem on large screens

#### 3. Font Family
**What it does**: Define custom font families

**How to use**:
1. Click the **Font Family** tab
2. Click **+ Add Font Family**
3. Enter font name (e.g., "Brand Sans")
4. Enter fonts separated by commas: `"Poppins", "Arial", sans-serif`
5. Fonts are available in your Tailwind config

#### 4. Spacing
**What it does**: Create fluid responsive spacing scales

**Same as Font Sizes** - defines sizes for padding, margins, gaps, etc.

#### 5. Border Radius
**What it does**: Create responsive border radius scales

**Same as Font Sizes** - defines sizes for rounded corners

#### 6. Breakpoints
**What it does**: Define responsive design breakpoints

**How to use**:
1. Click the **Breakpoints** tab
2. Add breakpoints by entering name and pixel value
3. Use preset systems:
   - Mobile First (sm, md, lg, xl, 2xl)
   - Desktop First (2xl, xl, lg, md, sm)
4. Options:
   - **Extend**: Keep Tailwind's default breakpoints
   - **Desktop First**: Use max-width instead of min-width

#### 7. Backups
**What it does**: Export and import Wizzard configurations

**How to use**:
- **Export**: Click the download button to save your config as JSON
- **Import**: Click upload and select a previously exported file

#### 8. Settings
**What it does**: Enable/disable features and see generated config

**How to use**:
1. Check boxes to enable features you want
2. When you enable a feature, defaults are created
3. The generated JavaScript config displays below
4. Copy and use this config elsewhere if needed

---

## Files Scan Tab

### What It Does
Tell Winden which files to scan when discovering available CSS classes.

### How to Use

#### File Format Filter
1. Add file formats to scan (php, html, js, jsx, ts, tsx, twig)
2. Leave empty to scan all files

#### Select Folders/Files to Scan
1. Use the folder browser to navigate your site
2. Click folders or files to select them
3. Selected items appear below

#### Clear Selections
- Click **Clear All** to deselect everything

### What Gets Ignored Automatically
- node_modules
- vendor
- .git
- Other common development folders

### Why This Matters
Winden scans these files to find all available Tailwind classes and autocomplete them.

---

## Top Navigation

### Save Button
Saves all your changes (Style tabs, Wizzard, JavaScript config).

### Cache Status
- **Cached**: Your CSS has been compiled and is ready
- **No Cache**: Click Save to generate
- **Cache Error**: Your CSS has issues - check the error message

### Settings Gear Icon
Opens the Settings dialog for:
- **Builders Tab**: Enable autocomplete for different page builders
- **Editor Tab**: Choose CSS or SCSS, developer options
- **Files Scan Tab**: Configure which files to scan
- **License Tab**: Manage your license

### Dark Mode Toggle
Switches the editor between light and dark themes.

---

## Autocomplete (Code Hints)

### In JavaScript Config Tab
Start typing and Winden suggests:

1. **Tailwind Directives** - Type `@`
   - @apply, @config, @layer, @screen, @tailwind, @theme, etc.

2. **CSS Properties** - Type `-`
   - --color-, --spacing-, --font-size-, --font-weight-, etc.

3. **Class Names** - Type a class name
   - Shows all available Tailwind classes from your config

### In Style Editor
Same autocomplete features for your CSS/SCSS.

---

## Settings Dialog

### Builders Tab
Enable autocomplete in your page builder:
- Gutenberg (FSE)
- Bricks Builder (v1 and v2)
- Oxygen Builder (Classic and v6)
- Elementor

### Dequeue Styles
Remove Tailwind from page builders to use only Winden's version:
- Dequeue from Gutenberg
- Dequeue from Bricks
- Dequeue from Oxygen

### Editor Tab
- **CSS Preprocessor**: Choose CSS or SCSS
- **Register Wizzard Data in FSE**: Include Wizzard tokens in WordPress theme
- **Disable Dev Mode**: Production mode - hides dev tools
- **Fold Sidebar**: Collapse sidebar for more space

### Files Scan Tab
Configure which files and folders to scan for class discovery.

### License Tab
View and manage your Winden license.

---

## Workflows

### Create a Custom Color Palette

1. Click **Settings** in Wizzard
2. Check **Colors**
3. Click **Colors** tab
4. Load a preset or click **+ Add Color**
5. Add your colors one by one
6. Adjust the shade ranges if needed
7. Click **Save** at the top

Your colors are now available as Tailwind classes:
- `bg-primary-100`, `bg-primary-500`, `bg-primary-900`
- `text-primary-500`
- `border-primary-300`
- etc.

### Create a Fluid Font Scale

1. Click **Settings** in Wizzard
2. Check **Font Sizes**
3. Click **Font Sizes** tab
4. Adjust these settings:
   - Mobile size: 16px
   - Desktop size: 19px
   - Scale ratio: 1.2 (each step 20% larger)
5. Add or remove steps (xs, sm, base, md, lg, etc.)
6. Click **Save**

Now text scales responsively:
- `text-sm`, `text-base`, `text-lg` automatically adjust for mobile vs. desktop

### Organize CSS into Tabs

1. Click the **Style** tab
2. Click the **+** button
3. Create tabs:
   - "Layout" with @layer base
   - "Components" with @layer components
   - "Utilities" with @layer utilities
4. Write your CSS in each tab
5. Click **Save** when done

Winden combines them automatically with proper layer ordering.

---

## Common Questions

**Q: What's the difference between Wizzard and Style Editor?**
A: Wizzard is a visual builder for design tokens (colors, sizes, fonts). Style Editor is for writing raw CSS/SCSS.

**Q: Can I use both Wizzard and Style Editor?**
A: Yes! They work together. Wizzard generates config, Style Editor adds custom CSS.

**Q: What does "Extend" mean?**
A: When enabled, your values are added to Tailwind's defaults instead of replacing them.

**Q: What's @layer for?**
A: It controls CSS specificity. Use @layer to ensure your styles don't conflict.

**Q: Do I need to manually save?**
A: Yes, click **Save** at the top after making changes.

**Q: What's the difference between @layer theme vs. @layer base?**
A: Use theme for design tokens and variables. Use base for element defaults.

**Q: Can I use SCSS instead of CSS?**
A: Yes, go to Settings → Editor Tab → CSS Preprocessor and choose SCSS.

---

## Tips & Tricks

1. **Use Color Presets**: Clicking "Load Preset" saves lots of time
2. **Copy Generated Config**: The Settings tab shows the generated JavaScript config - copy it if you need to use it elsewhere
3. **Keyboard Shortcut**: Press Ctrl+S (Cmd+S on Mac) to save quickly
4. **Dark Mode**: Toggle dark mode for comfortable late-night editing
5. **Builder Integration**: Enable your page builder in settings for autocomplete help
6. **Test Your Classes**: After saving, check that your classes appear in your page builder

---

## Getting Help

If something isn't working:

1. Check the **Cache Status** at the top - errors show there
2. Try clicking **Save** again
3. Check the **Settings** to ensure your page builder is enabled
4. Look at the **Files Scan** tab to ensure files are being scanned

---

**Last Updated**: November 2025
**Version**: Winden v4 (Tailwind v4)

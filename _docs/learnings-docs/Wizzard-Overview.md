# Wizzard: Visual Design Token Builder

Wizzard is Winden's visual interface for managing Tailwind design tokens without writing code. It provides dedicated tabs for colors, typography, spacing, and more.

---

## Table of Contents
- [What is Wizzard](#what-is-wizzard)
- [Available Tabs](#available-tabs)
- [Getting Started](#getting-started)
- [How Wizzard Works](#how-wizzard-works)
- [Wizzard vs JavaScript Config](#wizzard-vs-javascript-config)
- [Best Practices](#best-practices)

---

## What is Wizzard

Wizzard is a no-code design system builder that generates Tailwind CSS configuration through a visual interface.

### Key Benefits

- **No Coding Required** - Visual UI for design tokens
- **Automatic Shade Generation** - Colors generate 50-950 shades automatically
- **Live Preview** - See changes in real-time
- **Builder Integration** - Works with FSE, Bricks, Oxygen, Elementor
- **Export Options** - Convert to JavaScript config when needed

### Who Should Use Wizzard

✅ **Perfect For:**
- Designers managing design tokens
- Developers who prefer visual tools
- Teams standardizing design systems
- Projects with simple to moderate customization needs

❌ **Consider JavaScript Config Instead If:**
- You need complex programmatic logic
- You're using custom Tailwind plugins with complex config
- You have existing `tailwind.config.js` to migrate
- You need dynamic/computed values

---

## Available Tabs

### 1. Colors
Manage your color palette with automatic shade generation.

**[→ Full Documentation](Wizzard-Colors.md)**

**Key Features:**
- Visual color picker
- Automatic 50-950 shade generation
- Semantic naming
- Export to CSS variables

**Quick Example:**
```
Add color "primary" with value #3b82f6
Generates: primary-50, primary-100, ... primary-950
```

---

### 2. Font Sizes
Create responsive typography scales with fluid sizing.

**[→ Full Documentation](Wizzard-Font-Sizes.md)**

**Key Features:**
- Fixed or fluid (responsive) sizes
- Line height configuration
- CSS `clamp()` formulas for fluid typography
- Preview with sample text

**Quick Example:**
```
Size: lg
Desktop: 1.125rem (18px)
Mobile: 1rem (16px)
Generates: text-lg with fluid scaling
```

---

### 3. Font Family
Configure custom font stacks.

**[→ Full Documentation](Wizzard-Font-Family.md)**

**Key Features:**
- Add Google Fonts or custom fonts
- Fallback font stacks
- Font weight variants
- Automatic font loading

**Quick Example:**
```
Family: sans
Fonts: Inter, system-ui, sans-serif
Usage: font-sans
```

---

### 4. Spacing
Define spacing scale for padding, margin, gaps.

**[→ Full Documentation](Wizzard-Spacing.md)**

**Key Features:**
- Custom spacing values
- Rem/px conversion
- Negative values support
- Extend or override defaults

**Quick Example:**
```
Add: section = 4rem
Usage: pt-section, mb-section
```

---

### 5. Border Radius
Manage border radius values.

**[→ Full Documentation](Wizzard-Border-Radius.md)**

**Key Features:**
- Custom radius values
- Visual preview
- Rem/px units
- Preset values

**Quick Example:**
```
Add: card = 1rem
Usage: rounded-card
```

---

### 6. Breakpoints
Configure responsive breakpoints.

**[→ Full Documentation](Wizzard-Breakpoints.md)**

**Key Features:**
- Custom breakpoint names and values
- Mobile-first or desktop-first
- Container queries support
- Preview at different sizes

**Quick Example:**
```
Add: tablet = 768px
Usage: tablet:grid-cols-2
```

---

### 7. Backups
Restore previous configurations.

**[→ Full Documentation](Wizzard-Backups.md)**

**Key Features:**
- Auto-save on every change
- Timestamp-based versions
- Preview before restore
- Export/import backups

**Quick Example:**
```
View list of saved versions
Restore from 2 hours ago
```

---

### 8. Settings
Configure Wizzard behavior and integrations.

**[→ Full Documentation](Wizzard-Settings.md)**

**Key Features:**
- Enable/disable Wizzard
- Builder integration toggles
- Export to JavaScript config
- Clear all data

---

## Getting Started

### Step 1: Open Wizzard

1. Open Winden Editor
2. Click **"Wizzard"** in the sidebar
3. Choose a tab (start with **Colors**)

### Step 2: Add Design Tokens

**Example: Add a Brand Color**

1. Go to **Colors** tab
2. Click **"+ Add Color"**
3. Name: `primary`
4. Color: `#3b82f6`
5. Click **Save**

Result: `primary-50` through `primary-950` are now available.

### Step 3: Use in HTML

```html
<button class="bg-primary-500 text-white hover:bg-primary-600">
  Click me
</button>
```

### Step 4: Save and Compile

1. Press **Cmd+S** (Mac) or **Ctrl+S** (Windows)
2. Winden compiles your changes
3. Styles are immediately available

---

## How Wizzard Works

### Architecture

```
User Input (Wizzard UI)
    ↓
React State (WizzardContext)
    ↓
Generate CSS (@theme directives)
    ↓
Combine with Styles tab
    ↓
Tailwind Compiler (browser-based)
    ↓
Compiled CSS Output
```

### Data Flow

1. **User adds color in Wizzard**
   - UI: Color picker shows `#3b82f6`
   - State: Stored in `WizzardContext.colors`

2. **Save triggered (Cmd+S)**
   - Wizzard generates CSS:
     ```css
     @theme {
       --color-primary-500: #3b82f6;
     }
     ```
   - Saved to WordPress database

3. **Compilation**
   - Browser-based Tailwind compiler processes CSS
   - Generates utility classes: `bg-primary-500`, `text-primary-500`, etc.

4. **Usage**
   - Classes available in HTML
   - Autocomplete suggests `primary-500`

### Storage

**Where Wizzard Data is Stored:**

- **Database:** `wp_options` table, key `winden_editor`
- **Format:** JSON object with sections:
  ```json
  {
    "wizzard": {
      "colors": [...],
      "fontSizes": [...],
      "spacing": [...],
      "configCode": "..generated CSS.."
    }
  }
  ```

**Generated CSS Location:**
- Combined with **Styles** tab content
- Processed by Tailwind compiler
- Output written to `wp_options.winden_compiled_css`

---

## Wizzard vs JavaScript Config

### When to Use Each

| Scenario | Use Wizzard | Use JavaScript Config |
|----------|-------------|----------------------|
| **Simple color palette** | ✅ Yes | ❌ Overkill |
| **Responsive font sizes** | ✅ Yes | ❌ Complex |
| **Custom Tailwind plugins** | ❌ No | ✅ Yes |
| **Computed values** | ❌ No | ✅ Yes |
| **Team without devs** | ✅ Yes | ❌ Too technical |
| **Migrating from v3** | ❌ No | ✅ Yes |

### Can You Use Both?

**Not recommended.** Wizzard and JavaScript Config conflict. Choose one:

**Option 1: Use Wizzard**
- Enable Wizzard in Settings
- Manage design tokens visually
- JavaScript Config is ignored

**Option 2: Use JavaScript Config**
- Disable Wizzard in Settings → Wizzard → Disable
- Write config manually
- Wizzard UI is disabled

**Option 3: Migration Path**
- Build in Wizzard
- Export to JavaScript Config (Settings → Export)
- Disable Wizzard
- Continue in JavaScript

---

## Best Practices

### 1. Start with Core Tokens

Build your design system in this order:

```
1. Colors (brand, semantic)
2. Font Sizes (typography scale)
3. Font Family (typeface stack)
4. Spacing (layout rhythm)
5. Border Radius (roundness)
6. Breakpoints (responsive design)
```

### 2. Use Semantic Names

```
✅ Good:
- primary, secondary, accent
- success, warning, danger
- heading, body, caption

❌ Avoid:
- blue, red, green
- 18px, 24px, 32px
- big, medium, small
```

### 3. Leverage Auto-Generation

Let Wizzard do the work:

```
Input:
- Color: primary = #3b82f6
- Font Size: lg = 1.125rem

Generated:
- primary-50, primary-100, ... primary-950 (11 shades)
- text-lg with fluid scaling
```

### 4. Save Often

- Press **Cmd+S / Ctrl+S** frequently
- Wizzard auto-backs up on save
- Use **Backups** tab to restore if needed

### 5. Test Responsively

- Check design tokens at different breakpoints
- Use browser DevTools responsive mode
- Preview on actual devices

### 6. Export Before Major Changes

Before making big changes:

1. Go to **Wizzard → Settings**
2. Click **"Export Configuration"**
3. Save JSON backup locally
4. Make changes
5. Restore from export if needed

---

## Common Workflows

### Workflow 1: Building a Brand Palette

1. **Add primary brand color**
   - Colors tab → Add `primary` → `#3b82f6`

2. **Add semantic colors**
   - Add `success` → `#10b981`
   - Add `warning` → `#f59e0b`
   - Add `danger` → `#ef4444`

3. **Add neutral**
   - Add `neutral` → `#6b7280`

4. **Save and use**
   ```html
   <button class="bg-primary-500 hover:bg-primary-600">Primary</button>
   <div class="text-success-700">Success message</div>
   ```

### Workflow 2: Typography System

1. **Add font family**
   - Font Family tab → Add `sans` → `Inter, system-ui`

2. **Configure font sizes**
   - Font Sizes tab
   - Add `xs` → 0.75rem
   - Add `sm` → 0.875rem
   - Add `base` → 1rem
   - Add `lg` → 1.125rem
   - Add `xl` → 1.25rem

3. **Use in HTML**
   ```html
   <h1 class="font-sans text-xl">Heading</h1>
   <p class="font-sans text-base">Body text</p>
   ```

### Workflow 3: Responsive Spacing

1. **Add spacing values**
   - Spacing tab
   - Add `section` → 4rem
   - Add `container` → 1280px

2. **Use with breakpoints**
   ```html
   <section class="py-section">
     <div class="max-w-container mx-auto">
       Content
     </div>
   </section>
   ```

---

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| **Save** | Cmd+S | Ctrl+S |
| **Close dialog** | Esc | Esc |
| **Next tab** | Cmd+] | Ctrl+] |
| **Previous tab** | Cmd+[ | Ctrl+[ |

---

## Troubleshooting

### Changes Not Appearing

**Problem:** Made changes in Wizzard but don't see them in HTML.

**Solution:**
1. Save changes (Cmd+S)
2. Check browser console for errors
3. Clear cache: `clearTailwindCache()`
4. Reload the page

### Wizzard Disabled/Grayed Out

**Problem:** Can't access Wizzard tabs.

**Solution:**
1. Go to **Settings → Wizzard**
2. Toggle **"Enable Wizzard"** to ON
3. Wizzard is disabled if JavaScript Config is active

### Lost Configuration

**Problem:** Accidentally deleted colors/fonts.

**Solution:**
1. Go to **Wizzard → Backups**
2. Find recent backup (auto-saved on each save)
3. Click **"Restore"**
4. Your configuration is recovered

### Export Not Working

**Problem:** Export button doesn't download file.

**Solution:**
1. Check browser pop-up blocker
2. Try different export format (JSON, CSS, JavaScript)
3. Copy exported text manually
4. Check browser console for errors

---

## Next Steps

Explore individual Wizzard tabs:
- [Colors](Wizzard-Colors.md)
- [Font Sizes](Wizzard-Font-Sizes.md)
- [Font Family](Wizzard-Font-Family.md)
- [Spacing](Wizzard-Spacing.md)
- [Border Radius](Wizzard-Border-Radius.md)
- [Breakpoints](Wizzard-Breakpoints.md)
- [Backups](Wizzard-Backups.md)
- [Settings](Wizzard-Settings.md)

Or learn about:
- [JavaScript Config](JavaScript-Config.md) for advanced customization
- [Style Editor](Style-Editor.md) for CSS organization
- [Plugins](Plugins.md) for Tailwind plugin integration

---

**Need Help?**
If you have questions about Wizzard, consult the [FAQ](FAQ.md) or reach out to Winden support.

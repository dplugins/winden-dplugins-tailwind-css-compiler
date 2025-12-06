# ESM Plugins: Loading External Plugins from CDN

Learn how to use third-party Tailwind plugins like DaisyUI, Flowbite, and custom plugins via ESM imports from CDN.

---

## Table of Contents
- [Overview](#overview)
- [Built-in vs CDN Plugins](#built-in-vs-cdn-plugins)
- [Loading via @plugin Directive](#loading-via-plugin-directive)
- [Popular Plugin Examples](#popular-plugin-examples)
- [DaisyUI Complete Guide](#daisyui-complete-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

Winden's browser-based compiler can load Tailwind plugins from CDN using the `@plugin` directive. This allows you to use any Tailwind plugin without npm installation.

### ESM (ES Modules)

ESM is the modern JavaScript module format using `import`/`export`:

```javascript
// ESM format
export default function myPlugin() {
  // ...
}
```

**vs CommonJS:**
```javascript
// CommonJS format
module.exports = function myPlugin() {
  // ...
}
```

Most CDNs provide ESM versions of plugins.

---

## Built-in vs CDN Plugins

### Built-in Plugins (Pre-bundled)

These plugins are already included with Winden:

```css
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/container-queries";
```

✅ **No internet required**
✅ **Instant loading**
✅ **Optimized bundle size**

See [Plugins.md](Plugins.md) for built-in plugin documentation.

### CDN Plugins (External)

Load plugins from CDN using full URLs:

```css
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.js";
```

⚠️ **Requires internet connection**
⚠️ **Slower initial load**
⚠️ **May have CORS restrictions**

Use CDN plugins when:
- Plugin not bundled with Winden
- You want the latest version from npm
- Testing plugins before bundling

---

## Loading via @plugin Directive

### Syntax

```css
@plugin "URL_TO_PLUGIN";
```

### Where to Add

Add `@plugin` directives in the **Style tab**:

1. Open Winden Editor
2. Go to **Styles** tab
3. Add at the top, after `@import "tailwindcss"`:

```css
@import "tailwindcss";

/* Load external plugins */
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.js";

/* Your custom styles */
@layer components {
  /* ... */
}
```

### Plugin Order

Load plugins in this order:

```css
@import "tailwindcss";

/* 1. Built-in plugins */
@plugin "@tailwindcss/forms";

/* 2. External component libraries */
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.js";

/* 3. Custom utility plugins */
@plugin "https://cdn.example.com/custom-plugin.js";

/* 4. Your custom CSS */
@layer components {
  /* ... */
}
```

---

## Popular Plugin Examples

### DaisyUI (Component Library)

```css
@import "tailwindcss";
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.js";
```

See [DaisyUI Complete Guide](#daisyui-complete-guide) below.

### Flowbite (Component Library)

```css
@import "tailwindcss";
@plugin "https://cdn.jsdelivr.net/npm/flowbite@2/plugin.js";
```

### Tailwind CSS Animations

```css
@import "tailwindcss";
@plugin "https://cdn.jsdelivr.net/npm/tailwindcss-animate@1/dist/index.js";
```

### Tailwind CSS Gradients

```css
@import "tailwindcss";
@plugin "https://cdn.jsdelivr.net/npm/@tailwindcss/gradients@0/dist/index.js";
```

### Custom Plugin from GitHub

```css
@import "tailwindcss";
@plugin "https://cdn.jsdelivr.net/gh/username/repo@main/plugin.js";
```

---

## DaisyUI Complete Guide

DaisyUI is a popular component library for Tailwind CSS with pre-styled components.

### Step 1: Load DaisyUI Plugin

```css
@import "tailwindcss";
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.js";
```

**CDN Options:**

**jsDelivr (Recommended):**
```css
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.js";
```

**unpkg:**
```css
@plugin "https://unpkg.com/daisyui@4/dist/full.js";
```

**Specific Version:**
```css
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.js";
```

### Step 2: Use DaisyUI Components

DaisyUI components are applied via class names:

#### Button

```html
<button class="btn">Button</button>
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-accent">Accent</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-link">Link</button>
```

#### Card

```html
<div class="card w-96 bg-base-100 shadow-xl">
  <figure><img src="image.jpg" alt="Album"/></figure>
  <div class="card-body">
    <h2 class="card-title">Card Title</h2>
    <p>Card description goes here</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Buy Now</button>
    </div>
  </div>
</div>
```

#### Alert

```html
<div class="alert alert-info">
  <svg>...</svg>
  <span>New update available!</span>
</div>

<div class="alert alert-success">
  <span>Your purchase has been confirmed!</span>
</div>

<div class="alert alert-warning">
  <span>Warning: Invalid email address!</span>
</div>

<div class="alert alert-error">
  <span>Error! Task failed successfully.</span>
</div>
```

#### Modal

```html
<!-- Button to open modal -->
<button class="btn" onclick="my_modal.showModal()">Open Modal</button>

<!-- Modal -->
<dialog id="my_modal" class="modal">
  <div class="modal-box">
    <h3 class="font-bold text-lg">Hello!</h3>
    <p class="py-4">Press ESC key or click outside to close</p>
    <div class="modal-action">
      <form method="dialog">
        <button class="btn">Close</button>
      </form>
    </div>
  </div>
</dialog>
```

#### Navbar

```html
<div class="navbar bg-base-100">
  <div class="flex-1">
    <a class="btn btn-ghost text-xl">Brand</a>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1">
      <li><a>Link 1</a></li>
      <li><a>Link 2</a></li>
      <li>
        <details>
          <summary>Parent</summary>
          <ul class="p-2 bg-base-100 rounded-t-none">
            <li><a>Link 1</a></li>
            <li><a>Link 2</a></li>
          </ul>
        </details>
      </li>
    </ul>
  </div>
</div>
```

### Step 3: Configure DaisyUI (Optional)

Configure DaisyUI via JavaScript Config tab:

```javascript
export default {
  daisyui: {
    themes: ["light", "dark", "cupcake"],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
}
```

**Configuration Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `themes` | `["light", "dark"]` | Theme names to include |
| `darkTheme` | `"dark"` | Dark mode theme name |
| `base` | `true` | Include base styles |
| `styled` | `true` | Include component styles |
| `utils` | `true` | Include utility classes |
| `prefix` | `""` | Class name prefix (e.g., "daisy-") |

### Step 4: DaisyUI Themes

Apply themes with `data-theme` attribute:

```html
<!-- Light theme -->
<html data-theme="light">

<!-- Dark theme -->
<html data-theme="dark">

<!-- Cupcake theme -->
<html data-theme="cupcake">
```

**Available Themes:**
- light, dark, cupcake, bumblebee, emerald, corporate, synthwave, retro, cyberpunk, valentine, halloween, garden, forest, aqua, lofi, pastel, fantasy, wireframe, black, luxury, dracula, cmyk, autumn, business, acid, lemonade, night, coffee, winter, dim, nord, sunset

**Dynamic Theme Switching:**

```html
<select class="select" onchange="document.documentElement.setAttribute('data-theme', this.value)">
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="cupcake">Cupcake</option>
</select>
```

### DaisyUI Resources

- **Official Docs:** https://daisyui.com
- **Components:** https://daisyui.com/components/
- **Themes:** https://daisyui.com/docs/themes/

---

## Plugin Configuration

### Configuration via JavaScript Config

Some plugins accept configuration options:

```javascript
// JavaScript Config tab
export default {
  plugins: [
    // This won't work for CDN plugins - see note below
  ],

  // Instead, configure via plugin-specific config:
  daisyui: {
    themes: ["light", "dark"],
    darkTheme: "dark",
  },
}
```

**Note:** When loading plugins via `@plugin` directive in CSS, you cannot pass configuration options directly. Instead:

1. Add plugin configuration to JavaScript Config
2. Plugin reads its config from the main config object

### Configuration via @plugin Directive (Tailwind v4)

**Note:** Plugin configuration in `@plugin` directive is still experimental:

```css
/* May not work with all plugins */
@plugin "https://cdn.example.com/plugin.js" {
  option: "value";
}
```

**Recommendation:** Use JavaScript Config for plugin settings.

---

## CDN Options

### jsDelivr (Recommended)

**Pros:**
✅ Fast global CDN
✅ Automatic npm package mirroring
✅ Version locking
✅ CORS enabled

**Syntax:**
```css
/* Latest version */
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.js";

/* Specific version */
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.js";

/* GitHub repo */
@plugin "https://cdn.jsdelivr.net/gh/username/repo@main/file.js";
```

### unpkg

**Pros:**
✅ Simple syntax
✅ Npm package mirroring

**Cons:**
⚠️ Slower than jsDelivr
⚠️ Less reliable uptime

**Syntax:**
```css
/* Latest version */
@plugin "https://unpkg.com/daisyui@4/dist/full.js";

/* Specific version */
@plugin "https://unpkg.com/daisyui@4.12.10/dist/full.js";
```

### CDNJS

**Pros:**
✅ Popular libraries
✅ Well-maintained

**Cons:**
⚠️ Smaller package selection
⚠️ Manual updates

**Syntax:**
```css
@plugin "https://cdnjs.cloudflare.com/ajax/libs/plugin-name/version/plugin.min.js";
```

---

## Troubleshooting

### Plugin Not Loading

**Problem:** Plugin classes don't work.

**Solution:**
1. Check browser console for errors
2. Verify CDN URL is correct (visit in browser)
3. Ensure `@import "tailwindcss"` comes before `@plugin`
4. Check CORS errors (try different CDN)
5. Clear cache: `clearTailwindCache()`

### CORS Errors

**Problem:** "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

**Solution:**
1. Switch to jsDelivr (has CORS enabled):
   ```css
   @plugin "https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.js";
   ```
2. Or use unpkg:
   ```css
   @plugin "https://unpkg.com/daisyui@4/dist/full.js";
   ```

### Plugin Conflicts

**Problem:** Multiple plugins conflict with each other.

**Solution:**
1. Load plugins in correct order
2. Check for duplicate classes
3. Use plugin-specific prefixes if available
4. Disable conflicting plugins

### Slow Loading

**Problem:** Plugin takes long to load from CDN.

**Solution:**
1. Use specific version (not @latest):
   ```css
   /* ✅ Fast - cached version */
   @plugin "https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.js";

   /* ❌ Slow - always fetches latest */
   @plugin "https://cdn.jsdelivr.net/npm/daisyui@latest/dist/full.js";
   ```
2. Switch to faster CDN (jsDelivr)
3. Consider bundling plugin if used frequently

### Plugin Version Mismatch

**Problem:** Plugin behaves differently than documentation.

**Solution:**
Use specific version matching the docs:

```css
/* Documentation says v4.12.10 */
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.js";
```

### Module Not Found

**Problem:** "Module not found" or "Cannot find module" error.

**Solution:**
1. Check plugin export format (needs ESM):
   ```javascript
   // ✅ ESM export (works)
   export default function() { }

   // ❌ CommonJS (may not work)
   module.exports = function() { }
   ```
2. Some plugins have separate ESM builds:
   ```css
   /* Use .esm.js or .mjs file */
   @plugin "https://cdn.jsdelivr.net/npm/plugin@1/dist/plugin.esm.js";
   ```

---

## Best Practices

### 1. Pin Plugin Versions

```css
/* ✅ Good - specific version */
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.js";

/* ❌ Avoid - unpredictable updates */
@plugin "https://cdn.jsdelivr.net/npm/daisyui@latest/dist/full.js";
```

### 2. Load Plugins at Top

```css
@import "tailwindcss";

/* Plugins first */
@plugin "@tailwindcss/forms";
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.js";

/* Then your styles */
@layer components {
  /* ... */
}
```

### 3. Test Before Deploying

1. Test plugin in development
2. Verify classes work in production
3. Check browser console for errors
4. Test on different browsers

### 4. Document Plugin Usage

Add comments for team members:

```css
@import "tailwindcss";

/*
 * External Plugins:
 * - DaisyUI v4.12.10 (component library)
 * - Docs: https://daisyui.com
 */
@plugin "https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.js";
```

### 5. Consider Bundling for Production

For frequently used plugins, consider bundling them with Winden:

1. Test plugin via CDN
2. Request bundling in Winden updates
3. Or create custom build

---

## Advanced: Creating Custom ESM Plugins

### Plugin Structure

```javascript
// custom-plugin.js
export default function customPlugin({ addUtilities, theme }) {
  addUtilities({
    '.text-balance': {
      'text-wrap': 'balance',
    },
    '.scrollbar-hide': {
      'scrollbar-width': 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    },
  });
}
```

### Hosting Custom Plugin

**Option 1: GitHub + jsDelivr**

1. Upload `custom-plugin.js` to GitHub repo
2. Use jsDelivr CDN:
   ```css
   @plugin "https://cdn.jsdelivr.net/gh/username/repo@main/custom-plugin.js";
   ```

**Option 2: Self-host**

1. Upload to your server
2. Load via full URL:
   ```css
   @plugin "https://yoursite.com/plugins/custom-plugin.js";
   ```

**Important:** Ensure CORS headers are set:
```
Access-Control-Allow-Origin: *
```

---

## Next Steps

- Check [built-in plugins](Plugins.md)
- Learn [Style tab organization](Style-Editor.md)
- Explore [Wizzard for design tokens](Wizzard-Overview.md)

---

**Need Help?**
If you have questions about ESM plugins, consult the [FAQ](FAQ.md) or reach out to Winden support.

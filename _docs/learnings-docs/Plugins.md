# Tailwind CSS Plugins in Winden

Winden uses **Tailwind CSS v4** with official Tailwind CSS plugins pre-bundled for optimal performance. This guide shows you how to enable and configure them using Tailwind v4's native `@plugin` directive.

---

## Table of Contents
- [Available Bundled Plugins](#available-bundled-plugins)
- [How to Add Plugins](#how-to-add-plugins)
- [Plugin Configuration](#plugin-configuration)
- [Built-in Features](#built-in-features)
- [Using CDN Plugins](#using-cdn-plugins-advanced)
- [Troubleshooting](#troubleshooting)

---

## Available Bundled Plugins

Winden is built on **Tailwind CSS v4.1.17** and includes the following official plugins:

| Plugin | Version | Purpose | Notes |
|--------|---------|---------|-------|
| **@tailwindcss/forms** | v0.5.10 (v3) | Beautiful form styles out of the box | v3 plugin, compatible with v4 |
| **@tailwindcss/typography** | v0.5.19 (v3) | Prose classes for rich text content | v3 plugin, compatible with v4 |
| **@tailwindcss/container-queries** | v0.1.1 (v3) | Container-based responsive design | **Built-in to v4** - plugin included for compatibility |

**Important Notes:**
- Winden uses **Tailwind CSS v4.1.17** with the v4 PostCSS engine
- Container queries are **native to Tailwind v4** - you don't need the plugin, but it's included for backward compatibility
- The Forms and Typography plugins are v3 versions that work with v4
- All plugins are pre-loaded and don't require npm installation or CDN imports
- Plugins are compiled directly into Winden's browser-based compiler

---

## How to Add Plugins

### Step 1: Open the Styles Tab

1. Open the **Winden Editor**
2. Navigate to the **Styles** tab (CSS/SCSS editor)
3. Scroll to the top of your CSS content

### Step 2: Add the @plugin Directive

Add the `@plugin` directive at the top of your CSS file, after any `@import` statements:

```css
@import "tailwindcss";

/* Add bundled plugins (only add what you need) */
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";

/* Container queries are built into v4 - no plugin needed! */

/* Your custom styles below */
```

**Note:** The `@tailwindcss/container-queries` plugin is shown in some examples for backward compatibility, but **container queries are built into Tailwind v4** and work without the plugin.

### Step 3: Save and Compile

1. Press **Cmd+S** (Mac) or **Ctrl+S** (Windows) to save
2. Winden will automatically recompile with the plugins enabled
3. The plugin utilities and styles are now available in your HTML

---

## Plugin Configuration

### Forms Plugin (@tailwindcss/forms)

The Forms plugin provides beautiful, consistent styling for form elements.

#### Basic Usage (No Configuration)

```css
@plugin "@tailwindcss/forms";
```

This applies the default "base" strategy, which globally styles all form elements.

#### Configuration Options

**Strategy: Base (Default)**
Applies global styles to all form inputs automatically:

```css
@plugin "@tailwindcss/forms" {
  strategy: "base";
}
```

**Strategy: Class**
Opt-in approach using utility classes like `form-input`, `form-checkbox`:

```css
@plugin "@tailwindcss/forms" {
  strategy: "class";
}
```

With class strategy, you must explicitly add classes:

```html
<input type="text" class="form-input rounded-md border-gray-300" />
<input type="checkbox" class="form-checkbox text-indigo-600" />
<select class="form-select rounded-md">...</select>
```

#### Supported Form Elements

The Forms plugin normalizes styling for:
- Text inputs: `text`, `email`, `password`, `number`, `url`, `search`, `tel`
- Date/time inputs: `date`, `datetime-local`, `month`, `week`, `time`
- Select dropdowns (single and multiple)
- Textareas
- Checkboxes and radio buttons

#### Important Notes

- Form elements must include a `type` attribute for styling to work
- Use `focus:ring` utilities for custom focus states
- Combine with Tailwind utilities for further customization

---

### Typography Plugin (@tailwindcss/typography)

The Typography plugin adds beautiful typographic defaults for rich text content (markdown, CMS content, etc.).

#### Basic Usage

```css
@plugin "@tailwindcss/typography";
```

Then apply the `prose` class to your content:

```html
<article class="prose lg:prose-xl">
  <h1>Article Title</h1>
  <p>Beautiful typography with proper spacing, colors, and styling.</p>
</article>
```

#### Configuration: Custom Class Name

Change the default `prose` class name:

```css
@plugin "@tailwindcss/typography" {
  className: "wysiwyg";
}
```

Now use `wysiwyg` instead of `prose`:

```html
<article class="wysiwyg lg:wysiwyg-xl">
  <h1>Article Title</h1>
</article>
```

#### Size Modifiers

Available size scales for responsive typography:

```html
<!-- Small (14px) -->
<article class="prose-sm">...</article>

<!-- Base (16px, default) -->
<article class="prose">...</article>

<!-- Large (18px) -->
<article class="prose-lg">...</article>

<!-- XL (20px) -->
<article class="prose-xl">...</article>

<!-- 2XL (24px) -->
<article class="prose-2xl">...</article>
```

#### Color Themes

Choose from 5 grayscale palettes:

```html
<article class="prose prose-slate">...</article>
<article class="prose prose-gray">...</article>
<article class="prose prose-zinc">...</article>
<article class="prose prose-neutral">...</article>
<article class="prose prose-stone">...</article>
```

#### Dark Mode Support

Invert colors for dark backgrounds:

```html
<article class="prose dark:prose-invert">
  <h1>Looks great in dark mode</h1>
</article>
```

#### Element-Specific Styling

Customize individual elements:

```html
<article class="prose prose-a:text-blue-600 prose-img:rounded-xl prose-headings:underline">
  <h1>Custom styled heading</h1>
  <a href="#">Blue links</a>
  <img src="image.jpg" alt="Rounded images" />
</article>
```

#### Excluding Content from Prose

Use `not-prose` to exclude sections:

```html
<article class="prose">
  <p>This paragraph is styled.</p>

  <aside class="not-prose">
    <div class="bg-blue-500 p-4">
      This section is NOT styled by prose
    </div>
  </aside>

  <p>Back to prose styling.</p>
</article>
```

#### Remove Max-Width Constraint

By default, prose has `max-w-65ch`. Override it:

```html
<article class="prose max-w-none">
  Full-width article content
</article>
```

---

### Container Queries (@tailwindcss/container-queries)

Enables responsive design based on parent container size instead of viewport size.

**Important:** In Tailwind v4, container queries are **built-in natively** and work without any plugin. You can use them directly in your HTML without adding the `@plugin` directive.

#### Using Container Queries in v4 (Recommended - No Plugin Needed)

Simply use the container query utilities directly:

```html
<div class="@container">
  <div class="@sm:text-lg @md:text-xl @lg:text-2xl">
    This text size responds to parent container width
  </div>
</div>
```

No `@plugin` directive needed - it's built into v4!

#### Legacy Plugin Usage (Optional)

If you're migrating from v3 or need backward compatibility:

```css
@plugin "@tailwindcss/container-queries";
```

This loads the v3 plugin, but in v4 it's redundant since the functionality is native.

#### Mark Containers

```html
<div class="@container">
  <div class="@sm:text-lg @md:text-xl @lg:text-2xl">
    This text size responds to parent container width
  </div>
</div>
```

#### Available Breakpoints

**In Tailwind v4**, container query breakpoints use the `@` prefix:

**Minimum width queries:**
- `@xs` - Extra small containers (320px)
- `@sm` - Small containers (384px)
- `@md` - Medium containers (448px)
- `@lg` - Large containers (512px)
- `@xl` - Extra large containers (576px)
- `@2xl` through `@7xl` - Larger sizes

**Maximum width queries:**
- `@max-xs`, `@max-sm`, `@max-md`, etc.

**Note:** v4 uses `@sm`, `@md`, etc. while the v3 plugin used `@min-sm`, `@min-md`. Both syntaxes work in Winden for compatibility.

#### Named Containers

Create named containers for precise targeting:

```html
<div class="@container/sidebar">
  <nav class="@lg/sidebar:flex @lg/sidebar:flex-col">
    Navigation that responds to sidebar width
  </nav>
</div>

<div class="@container/main">
  <article class="@lg/main:grid @lg/main:grid-cols-2">
    Article that responds to main content area width
  </article>
</div>
```

#### Practical Example: Card Grid

```html
<div class="@container">
  <!-- Single column on small containers -->
  <div class="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-4">
    <div class="card">Card 1</div>
    <div class="card">Card 2</div>
    <div class="card">Card 3</div>
  </div>
</div>
```

---

## Built-in Features

The following features are **built into Tailwind CSS v4** and don't require plugin installation:

### Aspect Ratio (Built-in)

Control aspect ratio of elements directly:

```html
<!-- Standard ratios -->
<img class="aspect-square" src="image.jpg" />
<img class="aspect-video" src="video.jpg" />
<img class="aspect-auto" src="image.jpg" />

<!-- Custom ratios -->
<img class="aspect-[4/3]" src="image.jpg" />
<img class="aspect-[21/9]" src="wide.jpg" />
```

#### Custom Aspect Ratios in Theme

Define custom ratios in your CSS:

```css
@theme {
  --aspect-cinema: 21 / 9;
  --aspect-portrait: 3 / 4;
}
```

Then use them:

```html
<img class="aspect-cinema" src="movie.jpg" />
<img class="aspect-portrait" src="portrait.jpg" />
```

#### Responsive Aspect Ratios

```html
<iframe
  class="aspect-video md:aspect-square lg:aspect-[16/10]"
  src="https://youtube.com/embed/..."
></iframe>
```

---

## Using CDN Plugins (Advanced)

If you need a plugin that's not bundled with Winden, you can load it from a CDN.

### Syntax

```css
@plugin "https://cdn.jsdelivr.net/npm/@tailwindcss/plugin-name@version/index.js";
```

### Example: Loading from CDN

```css
@import "tailwindcss";

/* Load custom plugin from CDN */
@plugin "https://unpkg.com/@tailwindcss/line-clamp@0.4.4/src/index.js";

/* Your styles */
```

### Important Notes

- CDN plugins require internet connection
- May have slower initial load than bundled plugins
- Ensure CORS is properly configured on CDN
- Bundle plugins for production when possible

---

## Troubleshooting

### Plugin Not Working

**Check Console for Errors**

1. Open browser DevTools (F12)
2. Check Console tab for error messages
3. Look for plugin loading errors

**Common Issues:**

1. **Missing `@import "tailwindcss"`**
   ```css
   /* ❌ Wrong - missing import */
   @plugin "@tailwindcss/forms";

   /* ✅ Correct */
   @import "tailwindcss";
   @plugin "@tailwindcss/forms";
   ```

2. **Incorrect plugin name**
   ```css
   /* ❌ Wrong - missing @ prefix */
   @plugin "tailwindcss/forms";

   /* ✅ Correct */
   @plugin "@tailwindcss/forms";
   ```

3. **Typo in plugin name**
   ```css
   /* ❌ Wrong */
   @plugin "@tailwindcss/form";

   /* ✅ Correct */
   @plugin "@tailwindcss/forms";
   ```

### Plugin Styles Not Applying

**Forms Plugin:**
- Ensure form elements have `type` attribute
- Check if you're using "class" strategy and forgot to add classes
- Verify no conflicting CSS overriding plugin styles

**Typography Plugin:**
- Ensure you added the `prose` class to container
- Check for conflicting global styles
- Try adding `!important` with `prose-a:!text-blue-600` if needed

**Container Queries:**
- Verify parent has `@container` class
- Check that child uses container query variants (`@sm:`, `@md:`, etc.)
- In v4, container queries work natively without the plugin
- Browser must support container queries (all modern browsers do)

### Verify Plugin is Loaded

Add a test element to check if plugin is working:

**Forms Test:**
```html
<input type="email" placeholder="test@example.com" />
```
If styled automatically, Forms plugin is working.

**Typography Test:**
```html
<div class="prose">
  <p>Test paragraph</p>
</div>
```
If paragraph has proper typography styling, plugin is working.

**Container Queries Test:**
```html
<div class="@container">
  <div class="@sm:bg-blue-500">
    This should have blue background when container is large enough
  </div>
</div>
```

### Clear Winden Cache

If plugins still don't work after adding them:

1. Open browser console (F12)
2. Run: `clearTailwindCache()`
3. Refresh the page
4. Re-save your Winden content (Cmd+S / Ctrl+S)

### Check Plugin Version Compatibility

Winden uses **Tailwind CSS v4.1.17** with v3-compatible plugins:

- **Forms** and **Typography** plugins are v3 versions that work with v4
- **Container queries** are built into v4 natively
- If you encounter issues:
  1. Verify you're using the latest Winden version
  2. Check that plugin syntax matches v4 conventions
  3. For container queries, try using v4 native syntax (`@sm:`, `@md:`) instead of v3 syntax (`@min-sm:`, `@min-md:`)
  4. Report issues at your Winden support channel

---

## Best Practices

### 1. Only Load Plugins You Need

Don't add all plugins by default. Only include what you actually use:

```css
@import "tailwindcss";

/* ✅ Only load what you need */
@plugin "@tailwindcss/typography";

/* ❌ Don't load unused plugins */
/* @plugin "@tailwindcss/forms"; */
/* @plugin "@tailwindcss/container-queries"; */
```

### 2. Plugin Order Matters

Load plugins in this order for best results:

```css
@import "tailwindcss";

/* 1. Base plugins (forms) */
@plugin "@tailwindcss/forms";

/* 2. Content plugins (typography) */
@plugin "@tailwindcss/typography";

/* 3. Container queries are built-in to v4 - no plugin needed! */

/* 4. Your custom CSS */
```

### 3. Configure Once, Use Everywhere

Set plugin configuration at the top level:

```css
@import "tailwindcss";

@plugin "@tailwindcss/forms" {
  strategy: "class";
}

@plugin "@tailwindcss/typography" {
  className: "prose";
}

/* Now these settings apply globally */
```

### 4. Document Your Plugin Usage

Add comments to help team members understand what plugins are enabled:

```css
@import "tailwindcss";

/*
 * Plugins Enabled:
 * - Forms (class strategy) - Requires explicit form-* classes
 * - Typography (prose) - Use prose class for rich text
 */
@plugin "@tailwindcss/forms" { strategy: "class"; }
@plugin "@tailwindcss/typography";
```

---

## Examples: Complete Configurations

### Blog with Rich Content

```css
@import "tailwindcss";

/* Typography for article content */
@plugin "@tailwindcss/typography";

/* Forms for comment sections */
@plugin "@tailwindcss/forms" {
  strategy: "base";
}

/* Custom theme */
@theme {
  --color-brand: #3b82f6;
}
```

HTML:
```html
<article class="prose lg:prose-xl dark:prose-invert">
  <h1>Blog Post Title</h1>
  <p>Article content here...</p>
</article>

<form class="mt-8">
  <input type="email" placeholder="Email for updates" />
  <button type="submit">Subscribe</button>
</form>
```

### Dashboard with Responsive Cards

```css
@import "tailwindcss";

/* Container queries are built-in to v4 - no plugin needed! */

/* Forms for filters */
@plugin "@tailwindcss/forms" {
  strategy: "class";
}
```

HTML:
```html
<div class="@container">
  <div class="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-4">
    <div class="card">
      <h3>Card 1</h3>
      <p class="@sm:hidden">Compact view</p>
      <p class="@sm:block hidden">Detailed view</p>
    </div>
  </div>
</div>
```

### Form-Heavy Application

```css
@import "tailwindcss";

/* Forms with class strategy for granular control */
@plugin "@tailwindcss/forms" {
  strategy: "class";
}

/* Typography for help text and documentation */
@plugin "@tailwindcss/typography";
```

HTML:
```html
<form class="space-y-4">
  <input type="text" class="form-input w-full" />
  <select class="form-select w-full">...</select>
  <textarea class="form-textarea w-full" rows="4"></textarea>

  <div class="prose prose-sm">
    <p>Help text with proper typography</p>
  </div>
</form>
```

---

## Next Steps

- Explore [Tailwind CSS official documentation](https://tailwindcss.com) for more plugin features
- Check [Winden Documentation](../README.md) for editor features
- Join the Winden community for tips and support

---

**Need Help?**
If you encounter issues with plugins, please report them at the Winden support forum or GitHub repository.

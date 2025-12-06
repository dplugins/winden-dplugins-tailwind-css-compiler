# Files Scan: Class Detection System

The Files Scan feature allows Winden to detect Tailwind classes used in your theme files, ensuring all classes are compiled even if they're not in WordPress posts/pages.

---

## Table of Contents
- [Overview](#overview)
- [Enabling Files Scan](#enabling-files-scan)
- [Configuring Scan Paths](#configuring-scan-paths)
- [File Format Filters](#file-format-filters)
- [How Scanning Works](#how-scanning-works)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

WordPress themes often contain Tailwind classes in template files (PHP, Twig, JS) that Winden's default crawler doesn't detect. Files Scan solves this by scanning your theme directories for class usage.

### When to Use Files Scan

✅ **Enable Files Scan If:**
- You have a custom theme with Tailwind classes in templates
- You use Twig, Timber, or Blade templates
- You have JavaScript files with dynamic classes
- Classes appear in theme files but aren't compiled

❌ **Disable Files Scan If:**
- You only use page builders (Bricks, Oxygen, Elementor)
- All your classes are in posts/pages (Gutenberg)
- You want to reduce scan time on large sites

### How It Works

```
1. User enables Files Scan
2. Specifies scan paths (e.g., /wp-content/themes/mytheme)
3. Selects file formats (php, twig, js)
4. Winden scans these files for class="" attributes
5. Detected classes are compiled with Tailwind
6. Classes available in all templates
```

---

## Enabling Files Scan

### Step 1: Open Settings

1. Click **Settings** (gear icon) in Winden Editor
2. Go to **Files Scan** tab

### Step 2: Enable Scanning

Toggle **"Enable Files Scan"** to ON.

### Step 3: Configure Paths

See [Configuring Scan Paths](#configuring-scan-paths) below.

### Step 4: Select File Formats

See [File Format Filters](#file-format-filters) below.

### Step 5: Save

Click **Save** or press **Cmd+S / Ctrl+S**.

---

## Configuring Scan Paths

### Understanding Paths

Scan paths are relative to your WordPress root directory.

**WordPress Structure:**
```
/
├── wp-content/
│   ├── themes/
│   │   └── mytheme/        ← Scan this
│   ├── plugins/
│   │   └── myplugin/       ← Or this
│   └── uploads/
├── wp-admin/
└── wp-includes/
```

### Adding a Single Path

**Example: Scan active theme**

1. Click **"+ Add Path"**
2. Enter: `/wp-content/themes/mytheme`
3. Click **Add**

**Result:** Winden scans all files in your theme directory.

### Adding Multiple Paths

You can scan multiple directories:

```
Path 1: /wp-content/themes/mytheme
Path 2: /wp-content/themes/child-theme
Path 3: /wp-content/plugins/custom-plugin
```

**Use Case:** Scan both parent and child theme.

### Path Patterns

#### Scan Entire Theme

```
/wp-content/themes/mytheme
```

Scans all subdirectories recursively.

#### Scan Specific Folder

```
/wp-content/themes/mytheme/templates
```

Only scans `templates/` directory.

#### Scan Multiple Themes

```
/wp-content/themes/theme-one
/wp-content/themes/theme-two
```

Useful for multisite or theme development.

### Auto-Ignored Directories

Winden automatically skips these folders:

```
node_modules/
vendor/
.git/
dist/
build/
cache/
uploads/
```

**Why:** These folders rarely contain Tailwind classes and slow down scanning.

### Relative vs Absolute Paths

**Relative to WordPress root:**
```
✅ /wp-content/themes/mytheme
✅ /wp-content/plugins/myplugin
```

**Absolute filesystem paths:**
```
❌ /var/www/html/wp-content/themes/mytheme
❌ C:\xampp\htdocs\wp-content\themes\mytheme
```

**Always use relative paths** starting with `/wp-content/`.

---

## File Format Filters

### Available Formats

Select which file types to scan:

```
☑ PHP (.php)
☑ HTML (.html, .htm)
☑ JavaScript (.js, .jsx)
☑ TypeScript (.ts, .tsx)
☑ Twig (.twig)
☑ Vue (.vue)
```

### Format Selection Tips

**Include formats you use:**

```
Theme using PHP templates:
☑ PHP

Theme using Twig (Timber):
☑ PHP
☑ Twig

Theme using React components:
☑ JavaScript
☑ JSX
☑ TypeScript
☑ TSX

Theme using Vue:
☑ Vue
☑ JavaScript
```

**Exclude formats you don't use:**

```
If no JavaScript with classes:
☐ JavaScript
☐ JSX
☐ TypeScript
☐ TSX
```

**Why:** Reduces scan time and false positives.

### Format Examples

#### PHP Templates

```php
<!-- /wp-content/themes/mytheme/header.php -->
<header class="bg-white shadow-md p-4">
  <nav class="flex items-center justify-between">
    <?php wp_nav_menu(); ?>
  </nav>
</header>
```

Winden scans and compiles: `bg-white`, `shadow-md`, `p-4`, `flex`, `items-center`, `justify-between`

#### Twig Templates (Timber)

```twig
{# /wp-content/themes/mytheme/views/header.twig #}
<header class="bg-primary-500 text-white p-6">
  <h1 class="text-3xl font-bold">{{ site.name }}</h1>
</header>
```

Winden detects: `bg-primary-500`, `text-white`, `p-6`, `text-3xl`, `font-bold`

#### JavaScript (React/JSX)

```jsx
// /wp-content/themes/mytheme/src/components/Button.jsx
export const Button = () => (
  <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
    Click me
  </button>
);
```

Winden finds: `bg-blue-500`, `hover:bg-blue-700`, `text-white`, `font-bold`, `py-2`, `px-4`, `rounded`

#### Vue Components

```vue
<!-- /wp-content/themes/mytheme/src/components/Card.vue -->
<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-xl font-semibold mb-2">{{ title }}</h2>
  </div>
</template>
```

Winden extracts: `bg-white`, `rounded-lg`, `shadow-md`, `p-6`, `text-xl`, `font-semibold`, `mb-2`

---

## How Scanning Works

### Scan Process

```
1. User saves Winden content (Cmd+S)
2. Winden triggers class crawl
3. ClassCrawler checks if Files Scan enabled
4. If enabled, ScanCrawler runs:
   a. Reads scan paths from settings
   b. Filters files by format
   c. Searches for class="" and className="" attributes
   d. Extracts class names
   e. Returns unique class list
5. Classes merged with other sources (posts, pages, builders)
6. Combined list sent to Tailwind compiler
7. CSS generated for all detected classes
```

### Detection Patterns

Winden looks for these patterns:

#### HTML/PHP class Attribute

```php
class="flex items-center"
class='bg-white p-4'
class="text-{{ color }}-500"  <!-- Dynamic classes -->
```

#### JSX className Attribute

```jsx
className="grid grid-cols-3"
className='hover:bg-blue-500'
className={`bg-${color}-500`}  // Template literals
```

#### Vue/Twig class Binding

```vue
class="container mx-auto"
:class="{ 'bg-red-500': error }"
```

### Dynamic Classes

**Partial detection:**

```php
<!-- ✅ Detected -->
class="bg-blue-500"

<!-- ⚠️  Partially detected -->
class="bg-<?php echo $color; ?>-500"
<!-- Winden sees: "bg-", "-500" but not full class -->

<!-- ❌ Not detected -->
<?php echo 'class="bg-' . $color . '-500"'; ?>
<!-- Class attribute itself is dynamic -->
```

**Solution for dynamic classes:** Use [Safelist](Plugins.md#safelist) to force compilation.

---

## Best Practices

### 1. Scan Only Necessary Directories

```
✅ Good:
/wp-content/themes/mytheme/templates
/wp-content/themes/mytheme/src

❌ Too broad:
/wp-content
/
```

**Why:** Scanning too much increases build time.

### 2. Select Relevant File Formats

```
✅ If using PHP templates only:
☑ PHP
☐ JavaScript
☐ TypeScript

✅ If using React components:
☑ JavaScript
☑ JSX
☑ TypeScript
☑ TSX
```

**Why:** Irrelevant formats slow down scanning.

### 3. Avoid Scanning Build Directories

```
❌ Don't scan:
/wp-content/themes/mytheme/node_modules
/wp-content/themes/mytheme/dist
/wp-content/themes/mytheme/build
```

**Why:** These contain compiled code, not source files.

**Note:** Winden auto-ignores these, but explicit paths still work.

### 4. Use Child Theme Path

If using a child theme:

```
Parent: /wp-content/themes/parent-theme
Child:  /wp-content/themes/child-theme

Scan both:
Path 1: /wp-content/themes/parent-theme
Path 2: /wp-content/themes/child-theme
```

### 5. Rescan After Theme Changes

After updating theme files:

1. Open Winden Editor
2. Save (Cmd+S) to trigger rescan
3. Classes from new files are compiled

**Or use Force Full Crawl:**
1. Settings → Statistics
2. Click **"Force Full Crawl"**

---

## Performance Considerations

### Scan Time

Scan time depends on:
- **Number of files** - More files = longer scan
- **File size** - Larger files take longer
- **File formats** - More formats = more processing

**Typical scan times:**
```
Small theme (50 files):    1-2 seconds
Medium theme (200 files):  3-5 seconds
Large theme (500+ files):  10-15 seconds
```

### Optimization Tips

**1. Limit scan paths:**
```
✅ Scan only templates:
/wp-content/themes/mytheme/templates

❌ Scan entire theme:
/wp-content/themes/mytheme
```

**2. Reduce file formats:**
```
✅ Only formats you use:
☑ PHP
☐ JavaScript

❌ All formats:
☑ PHP
☑ HTML
☑ JavaScript
☑ TypeScript
☑ Twig
```

**3. Use incremental crawl:**
Winden's incremental crawler only rescans changed files.

---

## Common Use Cases

### Use Case 1: Custom Theme with PHP Templates

**Theme Structure:**
```
/wp-content/themes/mytheme/
├── header.php
├── footer.php
├── single.php
├── archive.php
└── templates/
    ├── hero.php
    └── card.php
```

**Configuration:**
```
Enable Files Scan: ON
Scan Path: /wp-content/themes/mytheme
File Formats: ☑ PHP
```

---

### Use Case 2: Timber/Twig Theme

**Theme Structure:**
```
/wp-content/themes/timber-theme/
├── views/
│   ├── base.twig
│   ├── single.twig
│   └── components/
│       ├── card.twig
│       └── button.twig
└── functions.php
```

**Configuration:**
```
Enable Files Scan: ON
Scan Path: /wp-content/themes/timber-theme/views
File Formats: ☑ Twig, ☑ PHP
```

---

### Use Case 3: React Theme with JSX

**Theme Structure:**
```
/wp-content/themes/react-theme/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── Button.jsx
│   └── App.jsx
└── build/  (ignore this)
```

**Configuration:**
```
Enable Files Scan: ON
Scan Path: /wp-content/themes/react-theme/src
File Formats: ☑ JavaScript, ☑ JSX
```

---

### Use Case 4: Plugin with Custom Templates

**Plugin Structure:**
```
/wp-content/plugins/myplugin/
├── templates/
│   ├── form.php
│   └── dashboard.php
└── myplugin.php
```

**Configuration:**
```
Enable Files Scan: ON
Scan Path: /wp-content/plugins/myplugin/templates
File Formats: ☑ PHP
```

---

## Troubleshooting

### Classes Not Being Compiled

**Problem:** Classes in theme files aren't working.

**Solution:**
1. Check Files Scan is enabled
2. Verify scan path is correct
3. Ensure file format is selected
4. Check class syntax:
   ```php
   <!-- ✅ Correct -->
   class="bg-blue-500"

   <!-- ❌ Wrong -->
   class='bg-blue-500'  (single quotes work but less common)
   ```
5. Force full crawl (Settings → Statistics)

### Scan Takes Too Long

**Problem:** Files Scan causes long save times.

**Solution:**
1. Reduce scan paths to specific directories
2. Deselect unused file formats
3. Ensure build directories are excluded
4. Consider disabling Files Scan if not needed

### Dynamic Classes Not Detected

**Problem:** Classes with PHP variables aren't compiled.

**Example:**
```php
class="bg-<?php echo $color; ?>-500"
```

**Solution:**
Use safelist to force compilation:

```css
/* In Style tab */
@layer utilities {
  /* Force compile all color variants */
  .bg-red-500,
  .bg-blue-500,
  .bg-green-500 {
    /* Tailwind generates these */
  }
}
```

Or use JavaScript Config safelist (Tailwind v4):
```javascript
export default {
  safelist: ['bg-red-500', 'bg-blue-500', 'bg-green-500']
}
```

### Wrong Files Being Scanned

**Problem:** Winden scans files you don't want.

**Solution:**
Make scan path more specific:

```
❌ Too broad:
/wp-content/themes/mytheme

✅ More specific:
/wp-content/themes/mytheme/templates
/wp-content/themes/mytheme/src
```

### Permission Errors

**Problem:** "Permission denied" error in browser console.

**Solution:**
1. Check file permissions on theme directory
2. Ensure WordPress can read theme files
3. Contact hosting provider if needed

---

## Advanced: File Tree Browser

The Files Scan tab includes a visual file tree browser.

### Using the File Tree

1. Go to **Settings → Files Scan**
2. Click **"Browse Files"**
3. Navigate through your WordPress directory
4. Check folders to include in scan
5. Uncheck folders to exclude
6. Click **"Apply Selection"**

### File Tree Features

- **Folder Icons** - Visual directory structure
- **File Count** - Shows number of files in each folder
- **Auto-Ignore** - Grays out node_modules, vendor, .git
- **Search** - Filter folders by name
- **Expand/Collapse** - Navigate large directory trees

---

## Next Steps

- Learn about [Incremental Crawling](INCREMENTAL-CRAWLING.md)
- Explore [Plain Classes autocomplete](Plain-Classes.md)
- Check [Wizzard for design tokens](Wizzard-Overview.md)

---

**Need Help?**
If you have questions about Files Scan, consult the [FAQ](FAQ.md) or reach out to Winden support.

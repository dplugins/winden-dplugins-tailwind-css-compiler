# Winden: How Does It Work?

Winden provides full integration of **Tailwind CSS v4** for WordPress, enabling centralized design token management, real-time CSS compilation, and seamless integration with popular page builders (Gutenberg/FSE, Bricks, Oxygen, Elementor, and more).

## Overview

Winden operates in two modes:

1. **Development Mode** - Full browser-based compilation with instant preview as you add classes
2. **Production Mode** - Pre-compiled, purged CSS for optimal performance

## Browser-Based Compilation

Winden uses **Tailwind CSS v4.1** which compiles entirely in the browser. This eliminates the need for Node.js, build tools, or server-side compilation.

### How It Works

When you're developing your website:

1. **Compiler Loads** - The Tailwind v4 browser compiler (~950KB) loads once
2. **Real-Time Compilation** - As you add classes, CSS generates instantly
3. **LRU Caching** - Compilation results are cached to prevent redundant processing
4. **Instant Preview** - See your changes immediately without page refresh

The browser compiler provides:
- Full Tailwind v4 support including the new `@theme` directive
- SCSS preprocessing (optional)
- Bundled plugins (@tailwindcss/typography, @tailwindcss/forms, container queries)
- CDN plugin loading for third-party plugins (e.g., DaisyUI from esm.run)

### No CDN Dependencies

Unlike other solutions, Winden does **not** rely on external CDNs for core functionality. The Tailwind CSS v4 compiler and official plugins are:

- **Bundled with Winden** - Tested and shipped as part of the plugin
- **No external requests** - Works offline, no CDN dependencies
- **Version controlled** - Guaranteed compatibility with each Winden release

Only third-party plugins (like DaisyUI) are loaded from CDN when you explicitly add them.

### CSS-First Configuration

Tailwind v4 uses **CSS-first configuration** with the `@theme` directive instead of JavaScript config files:

```css
@theme {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --spacing-lg: 2rem;
  --font-family-heading: "Inter", sans-serif;
}
```

Winden's **Wizzard** (visual design token builder) generates this `@theme` configuration automatically from a user-friendly GUI.

### JavaScript Config (Legacy Fallback)

For users migrating from older Winden versions or Tailwind v3, Winden provides a **Config tab** that accepts JavaScript configuration. This serves as a fallback for:

- **Legacy plugins** that require JavaScript configuration
- **Migration path** from Tailwind v3 setups
- **Advanced use cases** not yet supported by CSS-first config

The priority order is:
1. **Wizzard** (`@theme` CSS) - Highest priority
2. **Config tab** (JavaScript) - Fallback when Wizzard doesn't cover your needs
3. **Style tabs** (CSS/SCSS) - Custom styles with `@layer` directives

For new projects, we recommend using the Wizzard and CSS-first configuration.

## Design Token Builder (Wizzard)

The Wizzard provides a visual interface to define your design system:

- **Colors** - Color palette with automatic shade generation
- **Typography** - Font sizes with fluid typography (clamp) support
- **Font Families** - Custom font family definitions
- **Spacing** - Spacing scale with fluid values
- **Border Radius** - Border radius scale
- **Breakpoints** - Custom responsive breakpoints

All changes generate CSS `@theme` configuration that Tailwind v4 uses for class generation.

## Multi-Tab Style Editor

The Style Editor allows organizing CSS/SCSS into multiple tabs with Tailwind's `@layer` directives:

- **@layer base** - Reset styles, typography defaults
- **@layer components** - Reusable component styles
- **@layer utilities** - Custom utility classes

Each tab can be assigned to a specific layer, and Winden combines them intelligently during compilation.

## Class Discovery & Compilation

Winden discovers classes from multiple sources:

1. **File Scanning** - Scans selected files (PHP, HTML, JS, JSX, TS, TSX, Twig) for class names
2. **Post Save Hook** - Extracts classes when you save posts/pages
3. **Page Builder Integration** - Hooks into Bricks, Oxygen, Elementor, Gutenberg to detect classes in real-time
4. **Real-Time Detection** - Monitors editor changes and compiles on-the-fly

### Compilation Flow

```
User adds class → Class detected → Compiler generates CSS → Styles applied instantly
```

During compilation:
1. Your `@theme` configuration (from Wizzard) is processed
2. Style tabs are combined with `@layer` directives
3. All discovered classes are compiled to CSS
4. Result is cached for performance

## Production Mode

For production sites, Winden provides optimized CSS delivery:

### Pre-Compiled CSS

When you save in the Winden admin:
1. All classes are collected from scanned files and content
2. CSS is compiled and purged (only used classes)
3. Result is saved as `output.css` (typically 10-50KB for entire site)
4. Frontend loads this single, optimized CSS file

### Benefits

- **No JavaScript overhead** - Compiler doesn't load on frontend
- **No FOUC** - CSS is ready immediately (no flash of unstyled content)
- **Better performance** - Smaller payload, faster page loads
- **Higher Lighthouse scores** - No render-blocking compilation

### Enabling Production Mode

In Settings > Production, enable "Disable Dev Mode" to:
- Load only the pre-compiled `output.css`
- Remove the browser compiler from frontend
- Eliminate development-only scripts

## Real-Time Cross-Tab Synchronization

Winden uses the **BroadcastChannel API** to sync changes across all open tabs:

1. You edit styles in the Winden admin
2. Click Save
3. All open tabs (frontend, editors, other admin tabs) receive the update
4. CSS updates instantly without page refresh

This enables a powerful workflow:
- Edit in one tab, preview in another
- See changes on frontend immediately
- Works with page builder editors too

## Page Builder Integration

Winden integrates with popular page builders:

- **Gutenberg/FSE** - Full Site Editor support
- **Bricks Builder** - v1 and v2 support
- **Oxygen Builder** - Classic and v6 support
- **Elementor** - Visual builder integration

Each integration provides:
- Autocomplete suggestions for Tailwind classes
- Real-time preview in the builder
- Class detection for compilation

## Autocomplete System

When editing in page builders, Winden provides intelligent autocomplete:

- **Tailwind Classes** - All default and custom utilities
- **Custom Classes** - From your `@layer` definitions
- **Design Tokens** - CSS custom properties from Wizzard
- **Scanned Classes** - Classes discovered from file scanning

Autocomplete uses Monaco Editor (same as VS Code) for a premium editing experience.

## Plugin Support

### Bundled Plugins (No CDN)

Winden ships with official Tailwind plugins bundled and tested:
- `@tailwindcss/typography` - Prose styling for content
- `@tailwindcss/forms` - Form element styling
- `@tailwindcss/container-queries` - Container-based responsive design

These plugins are included in the Winden package - no external CDN requests required.

### Third-Party Plugins (CDN)

You can load additional plugins from CDN when needed:
```css
@plugin "https://esm.run/daisyui@5";
```

Third-party plugins are fetched and cached on first use.

## Performance Optimizations

Winden implements several optimizations:

1. **LRU Caching** - Compilation results cached to prevent redundant work
2. **FNV-1a Hashing** - Fast hash function for cache keys
3. **Design System Caching** - Tailwind design system cached across compilations
4. **Blob URL Management** - Proper cleanup prevents memory leaks
5. **Debounced Updates** - Prevents excessive recompilation during rapid editing

## Summary

| Feature | Development | Production |
|---------|------------|------------|
| Compiler | Browser-based | Pre-compiled |
| CSS Size | Full utilities | Purged (~10-50KB) |
| Performance | Instant preview | Optimized delivery |
| FOUC | Possible | None |
| Real-time sync | Yes | No (not needed) |

Winden gives you the best of both worlds: rapid development with instant feedback, and optimized production builds for maximum performance.

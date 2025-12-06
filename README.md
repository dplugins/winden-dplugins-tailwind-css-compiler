# Winden Plugin Development Setup

## Installation

### Step 1: Composer Install

We use Composer for PHP autoloading:

```bash
composer install
```

### Step 2: NPM Install

Install all dependencies (unified package.json for both admin and compiler):

```bash
npm install
```

## Development

### Build for Development

Build admin interface and compiler (development mode with source maps):

```bash
npm run build        # Build admin + plain-classes
npm run build:compiler   # Build Tailwind compiler for browser
```

Or build everything at once:

```bash
npm run build:all    # Build admin + compiler
```

### Watch Mode

For active development with hot reload:

```bash
npm run dev          # Watch admin files + browser-sync
npm run build:compiler:watch   # Watch compiler files
```

## Production

### Build for Production

Set `NODE_ENV=production` for optimized builds (minified, no source maps):

```bash
NODE_ENV=production npm run build        # Production admin build
NODE_ENV=production npm run build:all    # Production admin + compiler
```

Or use the build script directly:

```bash
npm run build        # Uses NODE_ENV from esbuild.config.js
```

### Create Distribution Archive

Using WP-CLI (recommended):

```bash
cd wp-content/plugins/winden
wp dist-archive .
```

If using LocalWP, open site shell and run:

```bash
wp dist-archive "wp-content/plugins/winden/"
```

Or use the npm script:

```bash
npm run plugin-zip   # Builds everything and creates winden.zip
```

## Build Structure

- **Admin Interface**: `src/admin/` → `build/admin/`
- **Plain Classes**: `src/plain-classes/` → `build/plain-classes/`
- **Browser Compiler**: `src/compile-in-browser/` → `build/compile-in-browser/tailwindcss-compiler.js`

## Build System Architecture

The build system is organized into modular configuration files:

- **`esbuild.admin.config.js`** - Admin UI and Monaco Editor (with workers)
- **`esbuild.autocomplete.config.js`** - Page builder integrations (Bricks, Oxygen, Elementor, etc.)
- **`esbuild.compiler.config.mjs`** - Tailwind CSS v4 compiler for browser
- **`esbuild.plugins.js`** - Shared plugins (SVG loader, path aliases, WordPress externals)

### Build Output

```
build/
├── admin/
│   ├── index.js              # Main admin bundle
│   ├── index.css             # Admin styles
│   ├── css.worker.js         # Monaco CSS worker
│   ├── html.worker.js        # Monaco HTML worker
│   ├── ts.worker.js          # Monaco TypeScript worker
│   └── editor.worker.js      # Monaco editor worker
├── plain-classes/            # Page builder integrations
│   ├── bricks/index.js
│   ├── elementor/index.js
│   ├── gutenberg/index.js
│   └── ...
└── compile-in-browser/
    └── tailwindcss-compiler.js
```

## Available Scripts

### Development (Watch Mode)
| Script | Description |
|--------|-------------|
| `npm run dev` | Watch admin + autocomplete + browser-sync |
| `npm run start` | Watch admin + autocomplete (parallel) |
| `npm run start:admin` | Watch admin UI only |
| `npm run start:autocomplete` | Watch page builder scripts only |

### Production Build
| Script | Description |
|--------|-------------|
| `npm run build` | Build admin + autocomplete (parallel) |
| `npm run build:admin` | Build admin UI only |
| `npm run build:autocomplete` | Build page builder scripts only |
| `npm run build:compiler` | Build Tailwind compiler |
| `npm run build:compiler:watch` | Watch compiler files |
| `npm run build:all` | Build everything (admin + autocomplete + compiler) |

### Other
| Script | Description |
|--------|-------------|
| `npm run plugin-zip` | Build all + create distribution zip |
| `npm run check-updates` | Check for outdated dependencies |
| `npm run update` | Update all dependencies to latest versions |

## Features

### Parallel Building
Admin and autocomplete builds run in parallel for faster compile times.

### Monaco Editor Workers
Four separate workers provide language support:
- **css.worker.js** - CSS/SCSS/Less
- **html.worker.js** - HTML/Handlebars/Razor
- **ts.worker.js** - TypeScript/JavaScript
- **editor.worker.js** - Base editor functionality

Workers use blob-based loading to avoid CORS issues across domains.

### WordPress Externals
React, ReactDOM, and WordPress packages use global variables:
- `window.React` / `window.ReactDOM`
- `window.wp.element` / `window.wp.components`
- `window.lodash`

### Path Aliases
Configured aliases for cleaner imports:
- `@` → `src/admin`
- `@pages` → `src/admin/components/pages`
- `@components` → `src/admin/components`
- `@hooks` → `src/admin/hooks`
- `@ui` → `src/admin/components/ui`

### Current Versions
- **Tailwind CSS**: v4.1.17
- **Monaco Editor**: v0.54.0
- **React**: Provided by WordPress
- **esbuild**: v0.25.12

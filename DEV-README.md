# Winden Developer Documentation

This document is for developers who want to contribute to Winden or build it from source.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and npm
- **Composer** 2.0+
- **PHP** 8.0+
- **WordPress** 6.0+ (for testing)

---

## Quick Start

After cloning from GitHub:

```bash
# 1. Install PHP dependencies
composer install

# 2. Install Node dependencies
npm install

# 3. Build the plugin
npm run build

# 4. (Optional) Create distribution zip
npm run plugin-zip
```

The plugin is now ready to use in WordPress.

---

## File Structure

```
winden/
├── winden.php                    # Plugin entry point (27 lines)
│
├── App/                          # PHP backend (PSR-4: Winden\)
│   ├── App.php                   # Main application class
│   ├── Admin/                    # Admin area functionality
│   │   ├── Settings/             # Settings management
│   │   ├── SaveContent.php       # Content persistence
│   │   └── FileBrowser.php       # File tree API
│   ├── Assets/                   # Asset loading
│   ├── Frontend/                 # Frontend functionality
│   ├── License/                  # License management
│   ├── PageBuilder/              # Page builder integrations
│   └── Providers/                # Service providers
│
├── src/                          # Frontend source code
│   ├── admin/                    # React admin UI (TypeScript)
│   │   ├── App.tsx               # Root component
│   │   ├── components/
│   │   │   ├── pages/            # Top-level pages
│   │   │   │   ├── Wizzard.tsx            # Visual design token builder
│   │   │   │   └── StyleGuide.tsx         # Style guide viewer
│   │   │   ├── parts/            # Reusable sections
│   │   │   │   └── StyleEditorWithTabs.tsx
│   │   │   ├── navigation/       # Navigation components
│   │   │   └── ui/               # Radix UI components
│   │   ├── hooks/                # React hooks
│   │   ├── types/                # TypeScript definitions
│   │   └── utils/                # Utilities
│   │
│   ├── plain-classes/            # Page builder autocomplete
│   │   ├── bricks/               # Bricks Builder
│   │   ├── oxygen/               # Oxygen Builder
│   │   ├── gutenberg/            # Gutenberg/FSE
│   │   └── elementor/            # Elementor
│   │
│   └── compiler/                 # Tailwind v4 compiler
│       ├── index.js              # Compiler entry point
│       ├── errors.js             # Error classes
│       └── build.mjs             # Bundle config
│
├── configs/                      # Build configuration
│   ├── esbuild.admin.config.js        # Admin UI build
│   ├── esbuild.autocomplete.config.js # Autocomplete build
│   ├── esbuild.compiler.config.mjs    # Compiler build
│   ├── esbuild.plugins.js             # Shared plugins
│   └── build-scss.js                  # SCSS compiler build
│
├── build/                        # Build output (gitignored)
│   ├── admin/                    # Admin UI bundle
│   ├── plain-classes/            # Autocomplete bundles
│   ├── compiler/                 # Tailwind compiler bundle
│   └── scss-compiler/            # SCSS compiler bundle
│
├── assets/                       # Static assets
│   ├── broadcast-listener.js     # Real-time sync receiver
│   └── post-save-compile.js      # Post save hooks
│
├── vendor/                       # Composer dependencies (gitignored)
├── node_modules/                 # NPM dependencies (gitignored)
│
├── composer.json                 # PHP dependencies
├── package.json                  # Node dependencies
└── tsconfig.json                 # TypeScript config
```

---

## Build Process

Winden uses **esbuild** for JavaScript/TypeScript compilation with three parallel build configurations:

### 1. Admin UI Build

**Config**: `configs/esbuild.admin.config.js`

**Entry**: `src/admin/App.tsx`

**Output**:
- `build/admin/index.js`
- `build/admin/index.css`
- `build/admin/monaco-editor/` (4 workers)

**What it does**:
- Compiles React 18 + TypeScript admin interface
- Bundles Monaco Editor with CSS/HTML/TypeScript workers
- Processes Tailwind CSS + PostCSS + Sass
- Applies path aliases (@, @pages, @components, etc.)

**Build command**:
```bash
npm run build:admin
```

### 2. Autocomplete Build

**Config**: `configs/esbuild.autocomplete.config.js`

**Entries**: Multiple builder integrations:
- `src/plain-classes/bricks/index.js`
- `src/plain-classes/oxygen/index.js`
- `src/plain-classes/gutenberg/index.js`
- `src/plain-classes/elementor/index.js`

**Output**: `build/plain-classes/{builder}/index.js`

**What it does**:
- Compiles page builder integration scripts
- Provides Tailwind class autocomplete in builder editors
- Each builder has its own bundle

**Build command**:
```bash
npm run build:autocomplete
```

### 3. Compiler Build

**Config**: `configs/esbuild.compiler.config.mjs`

**Entry**: `src/compile-in-browser/index.js`

**Output**: `build/compiler/tailwindcss-compiler.js` (950KB)

**What it does**:
- Bundles Tailwind CSS v4.1.17 for browser execution
- Includes Dart Sass for SCSS preprocessing
- Provides `window.tailwindifyClasses()` global API
- Handles @theme directives, @layer directives, plugins

**Build command**:
```bash
npm run build:compiler
```

### 4. SCSS Compiler Build

**Config**: `configs/build-scss.js`

**Output**: `build/scss-compiler/` (minified Sass bundle)

**What it does**:
- Bundles Dart Sass compiler for browser
- Minifies with Terser
- Used by main compiler for SCSS preprocessing

**Build command**:
```bash
node configs/build-scss.js
```

---

## NPM Scripts

### Development (Watch Mode)

```bash
# All builds + browser-sync hot reload
npm run dev

# Parallel watch: admin + autocomplete + compiler
npm run start

# Individual watch modes
npm run start:admin          # Admin UI only
npm run start:autocomplete   # Autocomplete only
npm run start:compiler       # Compiler only
```

### Production Build

```bash
# Build all (admin + autocomplete)
npm run build

# Production build with minification
NODE_ENV=production npm run build

# Individual builds
npm run build:admin          # Admin UI only
npm run build:autocomplete   # Autocomplete only
npm run build:compiler       # Compiler only
```

### Distribution

```bash
# Create winden.zip for distribution
npm run plugin-zip

# Alternative: Use WP-CLI (recommended)

wp dist-archive "wp-content/plugins/winden-dplugins-tailwind-css-compiler/"
```

### Utilities

```bash
# Check outdated dependencies
npm run check-updates

# Update dependencies
npm run update
```

---

## Development Workflow

### 1. Initial Setup

```bash
git clone https://github.com/StudioWinden/winden.git
cd winden
composer install
npm install
npm run build
```

### 2. Development Server

```bash
# Start watch mode with hot reload
npm run dev
```

This will:
- Watch for file changes in `src/`
- Rebuild automatically
- Launch browser-sync at your WordPress site URL
- Inject CSS changes without refresh

### 3. Making Changes

**Frontend (React/TypeScript)**:
- Edit files in `src/admin/`
- Changes auto-rebuild in watch mode
- Check browser console for errors

**Backend (PHP)**:
- Edit files in `App/`
- After creating new classes, run:
  ```bash
  composer dump-autoload
  ```

**Compiler**:
- Edit `src/compile-in-browser/index.js`
- Rebuild with `npm run build:compiler`
- Test in browser console: `window.tailwindifyClasses`

### 4. Testing

```bash
# Build for production
NODE_ENV=production npm run build

# Test in WordPress
# - Activate plugin
# - Navigate to Settings > Winden
# - Check browser console for errors
# - Test compilation with custom CSS
```

### 5. Creating Distribution

```bash
# Option 1: NPM script
npm run plugin-zip

# Option 2: WP-CLI (recommended)
wp dist-archive . --plugin-dirname=winden

# Result: winden.zip in parent directory
```

---

## Path Aliases

The build system uses path aliases for cleaner imports:

```typescript
'@'           → 'src/admin'
'@pages'      → 'src/admin/components/pages'
'@components' → 'src/admin/components'
'@hooks'      → 'src/admin/hooks'
'@ui'         → 'src/admin/components/ui'
'@utils'      → 'src/admin/utils'
```

**Example**:
```typescript
// Instead of:
import { Wizzard } from '../../../components/pages/Wizzard';

// Use:
import { Wizzard } from '@pages/Wizzard';
```

Configured in:
- `configs/esbuild.plugins.js` (build time)
- `tsconfig.json` (TypeScript IntelliSense)

---

## Technology Stack

### Frontend
- **React** 18.3.1
- **TypeScript** 5.7.3
- **Radix UI** (primitives)
- **Monaco Editor** 0.52.2 (code editor)
- **Tailwind CSS** v4.1.17

### Build Tools
- **esbuild** 0.25.12 (bundler)
- **PostCSS** 8.5 + plugins
- **Sass** (Dart Sass via sass-embedded)
- **Terser** (minification)

### Backend
- **PHP** 8.0+
- **Composer** (PSR-4 autoloading)
- **WordPress** 6.0+

### Tailwind Compiler
- **@tailwindcss/node** 4.1.17
- **Dart Sass** (SCSS preprocessing)
- **Lightning CSS** (built into Tailwind v4)

---

## Debugging

### Browser Console

```javascript
// Check if compiler loaded
console.log(typeof window.tailwindifyClasses);

// Test compilation
window.tailwindifyClasses('@theme { --color-primary: #3b82f6; }')
  .then(css => console.log(css));

// Check Winden data
console.log(window.windenData);
```

### PHP Error Logs

**LocalWP**:
```bash
tail -f ~/Local\ Sites/yoursite/logs/php/error.log
```

**Standard WordPress**:
```bash
tail -f /path/to/wp-content/debug.log
```

Enable WordPress debug mode in `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

### Build Errors

```bash
# Verbose esbuild output
npm run build:admin -- --log-level=verbose

# TypeScript type checking (no emit)
npx tsc --noEmit
```

---

## Common Issues

### "Cannot find module" errors

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Composer autoload issues

```bash
# Regenerate autoload files
composer dump-autoload
```

### Build output missing

```bash
# Ensure build directory exists
mkdir -p build/admin build/plain-classes build/compiler

# Run full build
npm run build
```

### Monaco Editor not loading

- Check `build/admin/monaco-editor/` contains 4 worker files
- Verify no CORS errors in browser console
- Ensure `window.MonacoEnvironment` is defined

---

## Contributing

### Code Standards

**PHP**:
- PSR-4 autoloading
- WordPress Coding Standards
- Namespace: `Winden\App\*`
- File location must match namespace

**TypeScript/React**:
- Strict mode enabled
- Props interfaces required
- Max 300 lines per component
- Extract hooks for complex logic

**Security**:
- Verify nonce on all AJAX requests
- Check `current_user_can('manage_options')`
- Sanitize all input: `sanitize_text_field()`, `wp_kses_post()`
- Escape all output: `esc_html()`, `esc_attr()`, `esc_url()`

### File Naming

- **PHP**: PascalCase (match class name)
- **React Components**: PascalCase (`ColorPicker.tsx`)
- **Utilities**: camelCase (`generateConfig.ts`)
- **Types**: camelCase + `.d.ts` (`wizzard.d.ts`)
- **Hooks**: camelCase starting with `use` (`useWizzardContent.tsx`)

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes, commit
git add .
git commit -m "Add: Your feature description"

# Build before pushing
npm run build

# Push and create PR
git push origin feature/your-feature
```

---

## WordPress.org Deployment

The `build/` directory is **gitignored** but **required for WordPress.org**.

**Before submitting to WordPress.org**:

```bash
# 1. Clean build
rm -rf build
NODE_ENV=production npm run build

# 2. Verify build output
ls -la build/admin
ls -la build/plain-classes
ls -la build/compiler

# 3. Create SVN-ready copy
npm run plugin-zip
```

**SVN Structure**:
```
trunk/
├── App/
├── assets/
├── build/           # Include built files
├── configs/         # Exclude from distribution
├── src/             # Exclude from distribution
├── winden.php
├── composer.json
└── package.json     # Exclude from distribution
```

**Exclude from SVN** (add to `.svnignore`):
- `node_modules/`
- `vendor/` (Composer packages)
- `src/` (source files, already compiled)
- `configs/` (build configs)
- `.git/`
- `*.map` (source maps)

---

## Additional Resources

- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- **User Docs**: See [_docs/](_docs/) for user-facing documentation
- **AI Instructions**: See [CLAUDE.md](CLAUDE.md) for AI assistant guidance
- **Compiler Improvements**: See [COMPILER-IMPROVEMENTS.md](COMPILER-IMPROVEMENTS.md)

---

## Support

- **GitHub Issues**: https://github.com/StudioWinden/winden/issues
- **WordPress.org**: https://wordpress.org/support/plugin/winden/

---

**Last Updated**: January 2025
**Winden Version**: 2.9.4
**Tailwind CSS**: v4.1.17

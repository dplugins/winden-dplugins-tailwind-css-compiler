<div align="center">

[![][logo-url]][docs-url]

# Tailwind CSS Compiler for WordPress 

[![][version]](https://github.com/dplugins/winden/releases/latest)
[![][commit]](https://github.com/dplugins/winden)
[![][stars]](https://github.com/dplugins/winden/)

</div>

# Winden

The most powerful Tailwind CSS compiler for WordPress. Build beautiful, responsive websites with the full power of Tailwind CSS directly in your WordPress editor.



### [Website →](https://dplugins.com/downloads/winden/)

### [Documentation →](https://docs.dplugins.com/winden/)

### [Get Started →](https://docs.dplugins.com/winden/)

### [Download Latest Release →](https://github.com/dplugins/winden/releases/latest/)

## Features

- Full Tailwind CSS v4 support
- Real-time compilation
- Compile in browser
- Works with any theme or page builder
- Gutenberg integration
- Compatible with pluings
- Developer-friendly

## Integrations

- Gutenberg
- Oxygen Classic - Pro
- Oxygen 6 - Pro
- Bricks - Pro
- Elementor - Pro
- File Scanner - Pro

## Requirements

- WordPress 6.0+
- PHP 7.4+

## External Services

Winden provides optional integration with external services for loading third-party Tailwind plugins. **Core features work entirely offline** - external services are only used when explicitly configured.

### Third-Party Tailwind Plugins

When you use the `@plugin` directive with an external URL in your CSS configuration, Winden fetches the plugin module at compile time:

```css
@plugin "https://esm.sh/daisyui@5";
```

**Bundled plugins (no external requests):**
- `@tailwindcss/forms`
- `@tailwindcss/typography`
- `@tailwindcss/container-queries`

**External plugin loading:**
- Only activated when user explicitly adds a `@plugin` directive with a URL
- Supports any ESM-compatible CDN (esm.sh, unpkg, jsdelivr, etc.)
- Plugin fetching only occurs during development mode compilation
- In production mode with dev mode disabled, no external requests are made
- No user data or site information is transmitted

## License

GPL-2.0-or-later

---

## Development

### Prerequisites

- Node.js 18+ and npm
- Composer 2.0+
- PHP 8.0+
- WordPress 6.0+ (for testing)

### Quick Start

```bash
# Install PHP dependencies
composer install

# Install Node dependencies
npm install

# Build the plugin
npm run build

# Create distribution zip
npm run plugin-zip
```

### NPM Scripts

```bash
# Development (watch mode)
npm run dev              # All builds + browser-sync
npm run start            # Parallel watch: admin + autocomplete + compiler

# Production build
npm run build            # Build all
npm run build:admin      # Admin UI only
npm run build:autocomplete   # Autocomplete only
npm run build:compiler   # Compiler only
```

### WP-CLI Distribution

```bash
wp dist-archive "wp-content/plugins/winden-dplugins-tailwind-css-compiler/"
```

### File Structure

```
winden-dplugins-tailwind-css-compiler/
├── winden-dplugins-tailwind-css-compiler.php  # Plugin entry point
│
├── App/                          # PHP backend (PSR-4: Winden\)
│   ├── App.php                   # Main application class
│   ├── Admin/                    # Admin area functionality
│   │   ├── Settings/             # Settings page management
│   │   ├── Admin.php             # Admin initialization
│   │   ├── GetContent.php        # Content retrieval
│   │   ├── SaveContent.php       # Content persistence
│   │   ├── MigrationNotice.php   # Migration notices
│   │   └── TopBar.php            # Admin top bar
│   ├── Assets/                   # Asset loading & providers
│   │   ├── Providers/            # FSE, Frontend providers
│   │   ├── DequeueStyles.php     # Style dequeuing
│   │   └── MonacoEditorProvider.php
│   ├── Caching/                  # Class crawling & compilation
│   │   ├── Crawlers/             # Builder-specific crawlers
│   │   ├── AutoCompile.php       # Auto-compilation logic
│   │   └── ClassCrawler.php      # CSS class extraction
│   ├── Frontend/                 # Frontend functionality
│   ├── Helpers/                  # Utility classes
│   │   ├── Builders.php          # Builder detection
│   │   ├── BuildersIntegration.php
│   │   ├── LoadAssets.php        # Asset loading helpers
│   │   ├── Migration.php         # Migration utilities
│   │   └── Sanitization.php      # Input sanitization
│   └── Release/                  # Release management
│
├── src/                          # Frontend source code
│   ├── admin/                    # React admin UI (TypeScript)
│   ├── plain-classes/            # Page builder autocomplete
│   │   ├── gutenberg/            # Gutenberg/FSE
│   │   ├── winauto-component/    # Autocomplete component
│   │   └── winauto-styles/       # Autocomplete styles
│   ├── compiler/                 # Tailwind v4 compiler
│   └── scss-compiler/            # SCSS compilation
│
├── configs/                      # Build configuration (esbuild)
├── build/                        # Build output (gitignored)
├── assets/                       # Runtime JS assets
├── vendor/                       # Composer dependencies (gitignored)
├── node_modules/                 # NPM dependencies (gitignored)
│
├── composer.json                 # PHP dependencies
├── package.json                  # Node dependencies
└── tsconfig.json                 # TypeScript config
```

### .distignore

Files excluded from distribution:

```
.git
.github
node_modules
src
configs
*.map
.distignore
.gitignore
composer.lock
package-lock.json
tsconfig.json
DEV-README.md
CLAUDE.md
ARCHITECTURE.md
```

[docs-url]: https://docs.dplugins.com/winden/
[logo-url]: winden-logo.svg
[version]: https://img.shields.io/github/v/tag/dplugins/winden?label=Version&color=0EA5E9
[commit]: https://img.shields.io/github/last-commit/dplugins/winden?label=Last%20commit&color=0EA5E9
[stars]: https://img.shields.io/github/stars/dplugins/winden?label=GitHub%20stars&color=0EA5E9

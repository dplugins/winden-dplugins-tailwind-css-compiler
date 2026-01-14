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
- Works with any theme or page builder
- Gutenberg integration
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

# Distribution
npm run plugin-zip       # Create winden.zip
```

### WP-CLI Distribution

```bash
wp dist-archive . --plugin-dirname=winden
```

### File Structure

```
winden/
├── winden.php                    # Plugin entry point
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
│   ├── plain-classes/            # Page builder autocomplete
│   │   ├── bricks/               # Bricks Builder
│   │   ├── oxygen/               # Oxygen Builder
│   │   ├── gutenberg/            # Gutenberg/FSE
│   │   └── elementor/            # Elementor
│   └── compiler/                 # Tailwind v4 compiler
│
├── configs/                      # Build configuration
├── build/                        # Build output (gitignored)
├── assets/                       # Static assets
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
[logo-url]: windn-logo.svg
[version]: https://img.shields.io/github/v/tag/dplugins/winden?label=Version&color=0EA5E9
[commit]: https://img.shields.io/github/last-commit/dplugins/winden?label=Last%20commit&color=0EA5E9
[stars]: https://img.shields.io/github/stars/dplugins/winden?label=GitHub%20stars&color=0EA5E9

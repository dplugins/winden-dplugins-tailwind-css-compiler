# Self-Hosted SCSS Live Compiler

A completely self-hosted SCSS live compiler using the **official Dart Sass** from NPM (no CDN dependencies).

## Features

✅ **Official Dart Sass** - Uses the actively maintained, official Sass implementation from NPM  
✅ **Self-hosted** - No CDN or external dependencies  
✅ **Browser-only** - No server required, works with `file://` protocol  
✅ **Live compilation** - Real-time SCSS to CSS conversion  
✅ **Auto-updating** - Easy to update when new Sass versions are released  
✅ **Build system** - Proper src/dist setup with minification  

## Quick Start

### For Users:
1. **Download/clone** this repository
2. **Run `npm install && npm run build`** to build the project
3. **Open `dist/index.html`** in your browser
4. **Type SCSS** in the left textarea
5. **See CSS output** appear instantly on the right

### For Developers:
```bash
# Install and build
npm install
npm run build

# Update to latest Sass version
npm run update-sass
```

## File Structure

```
📁 sass-npm/
├── 📄 package.json               # NPM configuration
├── 📄 build.js                   # Build script
├── 📁 src/                       # Source files
│   ├── 📄 index.html             # Main HTML template
│   ├── 📁 assets/
│   │   └── 📄 styles.css         # CSS styles
│   ├── 📁 js/
│   │   └── 📄 sass-wrapper.js    # Browser wrapper
│   └── 📁 styles/                # Optional SCSS files
│       └── 📄 main.scss
└── 📁 dist/                      # Built files (ready to use)
    ├── 📄 index.html             # Built HTML
    ├── 📄 build-info.json        # Build information
    └── 📁 assets/
        ├── 📄 sass.dart.min.js   # Official Dart Sass (minified)
        ├── 📄 immutable.min.js   # Required dependency
        ├── 📄 styles.css         # CSS styles
        └── 📄 sass-wrapper.js    # Browser wrapper
```

## Technical Details

- **Engine**: Official Dart Sass v1.89.1 (minified)
- **Size**: ~3MB total (44% smaller than original)
- **Browser Support**: Modern browsers (ES6+)
- **Offline**: Works completely offline after first load

## Documentation

📚 **[Sass Functions Reference](sass-functions.md)** - Complete guide to all Sass built-in modules (`@use "sass:color"`, `@use "sass:math"`, etc.) with practical examples

## Build System

The build system automatically pulls the latest Sass from NPM and creates a minified, self-hosted version:

### Available Scripts:
```bash
# Main build (recommended)
npm run build              # Build everything from node_modules to dist/

# Maintenance  
npm run update-sass        # Update Sass to latest version and rebuild
npm run version-check      # Check current Sass and Immutable versions
```

### Update Process:
When a new Sass version is released:
```bash
npm run update-sass        # Updates to latest and rebuilds everything
```

## Why This Approach?

### ✅ **Official Source**
- Uses `sass.dart.js` directly from the official NPM `sass` package
- This is the **same file** that powers Sass in Node.js environments
- Automatically gets all latest Sass features and bug fixes

### ✅ **Advantages over deprecated sass.js**
- **Actively maintained** (vs unmaintained since 2019)  
- **Official implementation** (vs community port)
- **Latest Sass features** (vs outdated libsass)
- **Better performance** (vs emscripten overhead)
- **Smaller size** (vs 827KB gzipped WASM)
- **Easy updates** (vs manual WASM compilation)

### ✅ **Build Process**
- Pulls latest Sass directly from NPM during build
- Minifies for optimal size (43% reduction)
- Creates completely self-contained dist/ folder
- One command to update to latest Sass version

## License

MIT License - Uses official Dart Sass which is also MIT licensed. 
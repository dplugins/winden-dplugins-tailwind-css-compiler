# Winden Pro Migration Plan

## Overview

This document tracks the migration of pro features from the main plugin to the `/pro/` folder.

**Strategy**: Single plugin distribution with pro features disabled until license is activated.

**Namespace Convention**:
- Free: `Winden\App\...`
- Pro: `Winden\Pro\...`

---

## Migration Progress

### Phase 1: Pro Folder Structure & License System ✅ COMPLETE

- [x] Create `/pro/` folder structure
- [x] Move license system (11 files) to `pro/App/License/`
- [x] Update namespaces (`Winden\App\License` → `Winden\Pro\License`)
- [x] Update `composer.json` with `Winden\Pro\` mapping
- [x] Run `composer dump-autoload`

### Phase 2: License Manager Helper ✅ COMPLETE

- [x] Create `App/Helpers/LicenseManager.php`
- [x] Implement `isProActive()` method
- [x] Implement `getProFeatures()` method
- [x] Add caching for license status

### Phase 3: Move Page Builder Providers ✅ COMPLETE

- [x] Move `Bricks2.php` → `pro/App/Providers/`
- [x] Move `Bricks2Data.php` → `pro/App/Providers/`
- [x] Move `Oxygen.php` → `pro/App/Providers/`
- [x] Move `Oxygen6.php` → `pro/App/Providers/`
- [x] Move `Elementor.php` → `pro/App/Providers/`
- [x] Update namespaces to `Winden\Pro\Providers`
- [x] Update `Providers.php` router with license checks

### Phase 4: Move Builder Crawlers ✅ COMPLETE

- [x] Move `BricksCrawler.php` → `pro/App/Crawlers/`
- [x] Move `Bricks2Crawler.php` → `pro/App/Crawlers/`
- [x] Move `OxygenCrawler.php` → `pro/App/Crawlers/`
- [x] Move `Oxygen6Crawler.php` → `pro/App/Crawlers/`
- [x] Move `ElementorCrawler.php` → `pro/App/Crawlers/`
- [x] Move `ScanCrawler.php` → `pro/App/Crawlers/`
- [x] Update namespaces to `Winden\Pro\Crawlers`
- [x] Update `ClassCrawler.php` with conditional registration

### Phase 5: Move File Scanner ✅ COMPLETE

- [x] Move `FileBrowser.php` → `pro/App/Admin/`
- [x] Update namespaces to `Winden\Pro\Admin`
- [x] Update `Admin.php` with license checks

### Phase 6: Move Plain Classes Integrations ✅ COMPLETE

- [x] Move `src/plain-classes/bricks/` → `pro/src/plain-classes/`
- [x] Move `src/plain-classes/oxygen/` → `pro/src/plain-classes/`
- [x] Move `src/plain-classes/oxygen6/` → `pro/src/plain-classes/`
- [x] Move `src/plain-classes/elementor/` → `pro/src/plain-classes/`
- [x] Update imports to reference shared components (`winauto-component`, `winauto-styles`)
- [x] Update `esbuild.autocomplete.config.js` to build free/pro separately
- [x] Update `ProvidersHelpers.php` asset paths

### Phase 7: Update Admin UI ⏳ PENDING

- [ ] Add license status to Settings
- [ ] Conditional rendering for pro settings
- [ ] Upgrade prompts for unlicensed users

### Phase 8: Update App Bootstrap ⏳ PENDING

- [ ] Update `App.php` with `loadProFeatures()`
- [ ] Ensure graceful degradation

### Phase 9: Testing ⏳ PENDING

- [ ] Test free version (Gutenberg only)
- [ ] Test pro version (all builders)
- [ ] Test license expiry behavior

---

## Files Summary

### Files Moved to Pro (23 total)

**License System** (11 files) ✅:
```
pro/App/License/
├── License.php
├── LicenseRepository.php
├── LicenseRequest.php
├── LicenseResponse.php
├── LicenseResource.php
├── Enums/
│   ├── LicenseStatus.php
│   └── LicenseResponseStatus.php
└── Exceptions/
    ├── LicenseNotActivatedException.php
    ├── LicenseDeactivateException.php
    └── LicenseFailedResponseException.php

pro/App/Admin/
└── License.php
```

**Providers** (5 files) ✅:
```
pro/App/Providers/
├── BaseProvider.php
├── Bricks2.php
├── Bricks2Data.php
├── Oxygen.php
├── Oxygen6.php
└── Elementor.php
```

**Crawlers** (6 files) ✅:
```
pro/App/Crawlers/
├── BricksCrawler.php
├── Bricks2Crawler.php
├── OxygenCrawler.php
├── Oxygen6Crawler.php
├── ElementorCrawler.php
└── ScanCrawler.php
```

**Admin** (1 file) ✅:
```
pro/App/Admin/
└── FileBrowser.php
```

**Plain Classes** (4 folders) ✅:
```
pro/src/plain-classes/
├── bricks/
├── oxygen/
├── oxygen6/
└── elementor/
```

**Build Output** ✅:
```
pro/build/plain-classes/
├── bricks/
├── oxygen/
├── oxygen6/
└── elementor/
```

### Files Created

- [x] `App/Helpers/LicenseManager.php` - Centralized license checking

### Files Modified

- [x] `composer.json` - Added `Winden\Pro\` namespace
- [x] `App/Assets/Providers/Providers.php` - License checks for pro builders
- [x] `App/Caching/ClassCrawler.php` - Conditional crawler registration
- [x] `App/Admin/Admin.php` - Conditional file scanner loading
- [x] `App/Assets/Providers/ProvidersHelpers.php` - Pro build paths
- [x] `configs/esbuild.autocomplete.config.js` - Split free/pro builds
- [ ] `App/App.php` - Add `loadProFeatures()` (optional)

---

## Free vs Pro Features

### Free Features (Always Available)
- Gutenberg/FSE integration and autocomplete
- Frontend CSS compilation
- Wizzard (design token builder)
- Style Editor (multi-tab CSS)
- Core Tailwind v4 browser compiler
- Shared autocomplete components (`winauto-component`)

### Pro Features (License Required)
- Bricks Builder integration + autocomplete
- Oxygen Classic integration + autocomplete
- Oxygen 6 integration + autocomplete
- Elementor integration + autocomplete
- File Scanner

---

## License Check Pattern

All pro features use centralized license checking:

```php
use Winden\App\Helpers\LicenseManager;

if (LicenseManager::isProActive()) {
    // Load pro feature
}
```

---

## Build Configuration

**Free builds** → `build/`
- `build/admin/` - Admin UI
- `build/compiler/` - Tailwind compiler
- `build/plain-classes/gutenberg/` - Gutenberg autocomplete
- `build/plain-classes/winauto-component/` - Shared component

**Pro builds** → `pro/build/`
- `pro/build/plain-classes/bricks/`
- `pro/build/plain-classes/oxygen/`
- `pro/build/plain-classes/oxygen6/`
- `pro/build/plain-classes/elementor/`

---

## Testing Checklist

### Free Version Tests
- [ ] Plugin activates without errors
- [ ] Gutenberg autocomplete works
- [ ] Wizzard saves and loads correctly
- [ ] Style Editor functions properly
- [ ] Frontend CSS compiles and loads
- [ ] No PHP warnings about missing pro classes

### Pro Version Tests (License Active)
- [ ] License activation succeeds
- [ ] Bricks autocomplete works
- [ ] Oxygen autocomplete works
- [ ] Oxygen 6 autocomplete works
- [ ] Elementor autocomplete works
- [ ] File scanner is accessible
- [ ] All crawlers register correctly

### License Expiry Tests
- [ ] Expired license disables pro features
- [ ] Free features continue working
- [ ] Admin notices display correctly
- [ ] No fatal errors or warnings

---

## Rollback Plan

If issues arise:
1. Restore files from `App/License/` (keep backup before deletion)
2. Revert `composer.json` to single namespace
3. Run `composer dump-autoload`
4. Remove `/pro/` folder

---

## Distribution Plan

### Two Distribution Methods

**1. WordPress.org (Free Version)**
- Excludes `/pro/` folder entirely
- Only free features available
- No license system included
- Uses `.distignore` to exclude pro files

**2. DPlugins.com (Pro Version)**
- Includes `/pro/` folder
- License key unlocks pro features
- EDD integration for license management

### Building Distribution ZIPs

**For WordPress.org (Free):**
```bash
# Option 1: WP-CLI (Recommended)
wp dist-archive . winden-free.zip

# Option 2: Manual ZIP (excludes files in .distignore)
# The .distignore file already excludes: pro/
```

**For DPlugins (Pro):**
```bash
# Create a separate .distignore-pro or use npm script
npm run plugin-zip  # Includes pro/ folder

# Or manually create ZIP including pro/ folder
```

### .distignore Configuration

The `.distignore` file excludes pro folder for WordPress.org:

```
# Pro folder (excluded for WordPress.org free version)
pro/
```

**Files excluded from both distributions:**
- `node_modules/`
- `src/` (source files, only build/ needed)
- `.git/`
- `tests/`
- `configs/`
- Development files (composer.json, package.json, etc.)

### Distribution Workflow

**Step 1: Build all assets**
```bash
npm run build           # Build free assets
npm run build:autocomplete  # Build all autocomplete (free + pro)
```

**Step 2: Create WordPress.org ZIP**
```bash
wp dist-archive . winden.zip
# This creates ZIP WITHOUT pro/ folder
```

**Step 3: Create Pro ZIP (for DPlugins)**
```bash
# Temporarily remove pro/ from .distignore
# Or use separate .distignore-pro file
wp dist-archive . winden-pro.zip --dist-ignore-file=.distignore-pro
```

### Version Management

**Free Version (WordPress.org):**
- Version in `winden.php`: `2.9.0`
- No pro features visible
- Upgrade prompts in admin UI

**Pro Version (DPlugins):**
- Same version: `2.9.0`
- Pro features unlocked with license
- License tab in settings

### WordPress.org Compliance

**Requirements:**
- ✅ No "phone home" without user action
- ✅ All features work without external dependencies
- ✅ GPL-compatible license
- ✅ No obfuscated code
- ✅ No tracking without consent

**Free version must:**
- Work completely offline
- Not require license for core features
- Show clear upgrade path (no nagging)
- Pass WordPress.org plugin review

---

## Notes

- ✅ Original files have been removed from `App/` and `src/` after successful migration
- Pro folder included in plugin distribution (unlocked via license)
- No "phone home" without explicit user action
- WordPress.org compatible (free features work without license)
- Shared components (`winauto-component`, `winauto-styles`) stay in free folder

### Cleanup Completed (Phase 6.1)

**Files removed from original locations:**

`App/License/` folder (11 files):
- License.php, LicenseRepository.php, LicenseRequest.php, LicenseResponse.php, LicenseResource.php
- Enums/LicenseStatus.php, Enums/LicenseResponseStatus.php
- Exceptions/LicenseNotActivatedException.php, LicenseDeactivateException.php, LicenseFailedResponseException.php

`App/Admin/`:
- License.php, FileBrowser.php

`App/Assets/Providers/`:
- Bricks2.php, Bricks2Data.php, Oxygen.php, Oxygen6.php, Elementor.php

`App/Caching/Crawlers/`:
- BricksCrawler.php, Bricks2Crawler.php, OxygenCrawler.php, Oxygen6Crawler.php, ElementorCrawler.php, ScanCrawler.php

`src/plain-classes/` folders:
- bricks/, elementor/, oxygen/, oxygen6/

---

*Last Updated: December 5, 2025*

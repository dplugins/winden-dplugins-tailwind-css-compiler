# CLAUDE.md - Winden — Tailwind CSS Compiler (WordPress.org / free edition)

## What this is relative to `winden`

This is the wordpress.org free edition of the same codebase as the `winden` (pro) plugin, which has its own `CLAUDE.md` — read that first for the full architecture (browser-based Tailwind v4 compiler, Wizzard token builder, esbuild pipeline, crawler layer, compilation flow).
This file only records what is actually different here.
Do not duplicate that document.
If this file and `winden`'s CLAUDE.md ever disagree about `App/` or `src/` behavior, re-check both checkouts rather than trusting either blindly — they are supposed to be the same code.

As of this writing, `App/`, `src/`, `shared/`, and `composer.json` are byte-identical between the two checkouts.
`composer.json` still declares `"Winden\\Pro\\": "pro/App/"` even here — that path does not exist in this checkout, so anything under the `Winden\Pro\` namespace is simply unresolvable, not broken.
All call sites reach it through `LicenseManager::proFolderExists()` (`App/Helpers/LicenseManager.php`, checks for `pro/App/License/License.php`), which returns `false` when the folder is absent, so the plugin runs correctly without it — a task that appears to need Pro code (Oxygen/Bricks/Elementor/Builderius crawlers and providers, EDD licensing) is out of scope for this checkout rather than a bug to fix.

Concrete differences that do exist:
- `winden-dplugins-tailwind-css-compiler.php` vs `winden.php` — different plugin header (name, version, `Requires at least`/`Tested up to`/`Requires PHP`, text domain `winden-dplugins-tailwind-css-compiler` vs `winden`), and a different `ABSPATH` guard style.
- No `pro/` directory, no `CHANGELOG.md`, no `_docs/`.
- `readme.txt` has separate wordpress.org marketing copy — do not copy pro's readme content into it.
- `tests/*.test.ts` — the two editions have independently-added test files (e.g. `ajaxUrl.test.ts` and `oklchToHex.test.ts` here vs `colorEntryCalculations.test.ts` and `scaleCalculatorCalculations.test.ts` in pro).
  They are not kept in sync, and `tests/setup.ts` differs slightly between the two.

Historically the free edition has been first to receive small fixes ahead of pro (per project knowledge, a `get_option()`-returns-`false`-not-`null` fix in `App/Admin/GetContent.php`/`SaveContent.php` landed here first) — given the two are currently identical, treat any such gap as temporary and check both files before assuming behavior differs.

## Build

Same esbuild pipeline as pro, not `@wordpress/scripts`.

```bash
composer install && npm install    # required before first activation — see "Fresh checkout" below
npm run build                       # rm -rf build, then build:scss + parallel admin/autocomplete/compiler
npm run start                       # all three in watch mode
npm test                            # vitest run
```

## Things to know

- **Fresh checkout will not activate.**
  `vendor/autoload.php` is required at plugin load, and without `composer install` it fatals immediately.
  `build/` is not committed either, so the admin app cannot render without `npm run build` — both steps are required, neither is optional.
- **`get_option()` returns `false`, not `null`, for an unset option.**
  Any typed signature (`?array`, `?string`) fed directly from `get_option()`, `get_post_meta()`, or `get_user_meta()` is suspect — this exact defect class already caused a fresh-install TypeError and an HTTP 500 from `admin-ajax.php?action=winden_get_cache` once, in `CacheValidator::validateAndFix()`.
- **Treat `App/Database/`, `App/Helpers/LicenseManager.php`, `App/Helpers/FileWriter.php`, and `App/Release/` as high-risk.**
  Custom DB table, file writer, and (in this edition) an always-false license check — get a second look before changing these.
- **Empty-state console noise is expected, not a defect**, on a site that has never compiled: `console.warn` from `src/compiler/index.js` and `src/admin/hooks/wizzard.ts`, repeated 404s in the block editor for `/wp-content/uploads/winden/tailwind.config.js`, and `[Winden Watcher] Compilation failed` / `Failed to preload editor content`.
- **Do not "modernize" the build to `@wordpress/scripts`.** The Tailwind compiler bundle needs things the wp-scripts webpack config doesn't express.

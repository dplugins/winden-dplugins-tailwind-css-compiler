# CLAUDE.md - Winden — Tailwind CSS Compiler (WordPress.org / free edition)

## What this is relative to `winden`

This is the wordpress.org free edition of the same codebase as the `winden` (pro) plugin, which has its own `CLAUDE.md` — read that first for the full architecture (browser-based Tailwind v4 compiler, Wizzard token builder, esbuild pipeline, crawler layer, compilation flow).
This file only records what is actually different here.
Do not duplicate that document.
If this file and `winden`'s CLAUDE.md ever disagree about `App/` or `src/` behavior, re-check both checkouts rather than trusting either blindly — they are supposed to be the same code.

`App/`, `src/`, `shared/`, `configs/`, `assets/`, the npm/composer manifests, the tooling configs and the unit tests are copied from pro by the `/sync-free` skill (`~/.claude/skills/sync-free/sync.sh`), so they are byte-identical to pro at the synced commit.
Fix shared code in pro first, then sync; an edit made only here is overwritten by the next sync.
Not synced: the plugin header file, `readme.txt`, `CHANGELOG.md`, this file, `.github/`, `.distignore`, `.gitignore`.
`tests/e2e/` and pro-only unit tests (those importing `pro/`) stay in pro.
`composer.json` still declares `"Winden\\Pro\\": "pro/App/"` even here — that path does not exist in this checkout, so anything under the `Winden\Pro\` namespace is simply unresolvable, not broken.
All call sites reach it through `LicenseManager::proFolderExists()` (`App/Helpers/LicenseManager.php`, checks for `pro/App/License/License.php`), which returns `false` when the folder is absent, so the plugin runs correctly without it — a task that appears to need Pro code (Oxygen/Bricks/Elementor/Builderius crawlers and providers, EDD licensing) is out of scope for this checkout rather than a bug to fix.

Concrete differences that do exist:
- `winden-dplugins-tailwind-css-compiler.php` vs `winden.php` — different plugin header (name, version, `Requires at least`/`Tested up to`/`Requires PHP`, text domain `winden-dplugins-tailwind-css-compiler` vs `winden`), and a different `ABSPATH` guard style.
- No `pro/` directory, no `CHANGELOG.md`, no `_docs/`.
- `readme.txt` has separate wordpress.org marketing copy — do not copy pro's readme content into it.

Before the sync existed, small fixes sometimes landed here first (the `get_option()`-returns-`false` fix in `GetContent.php`/`SaveContent.php`); pro now has them, and new fixes go to pro.

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

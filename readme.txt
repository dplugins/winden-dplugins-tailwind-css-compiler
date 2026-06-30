=== Winden — Tailwind CSS Compiler with Full WordPress Integration ===
Contributors: krstivoja
Tags: tailwind, css, compiler, gutenberg, page builder
Requires at least: 6.2
Tested up to: 6.9.1
Requires PHP: 7.4
Stable tag: 1.3.5
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Tailwind CSS compiler for WordPress. Use utility classes directly in your editor.

== Description ==

Winden brings the full power of Tailwind CSS v4 to WordPress. Write utility classes directly in your editor and see them compiled in real-time.

**Features:**

* Full Tailwind CSS v4 support
* Fallback for Tailwind CSS v3 with Config support
* Real-time compilation in browser
* Works with any theme or page builder
* Gutenberg integration
* Developer-friendly

**Integrations:**

* Gutenberg (free)
* [FanCoolo WP](https://dplugins.com/downloads/fancoolo-wp/) (free)
* Oxygen Builder (pro)
* Bricks Builder (pro)
* Elementor (pro)
* Builderius (pro)

**Bundled Tailwind Plugins:**

* @tailwindcss/forms
* @tailwindcss/typography
* @tailwindcss/container-queries

**Easy migration:**
* With single copy paste of style tab you can migrate form WindPress and other tailwindcss integration to Winden keeping all the classs in block attributes

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Navigate to Winden settings to configure

== Frequently Asked Questions ==

= Does this work with my page builder? =

Winden works with Gutenberg out of the box. Pro integrations are available for Oxygen, Bricks, and Elementor.

= Do I need to know Tailwind CSS? =

Basic knowledge of Tailwind CSS classes is helpful. Visit [tailwindcss.com](https://tailwindcss.com/docs) for documentation.

= Winden Documentaion =

Visit [tailwindcss.com](https://docs.dplugins.com/winden/) for documentation.

== External Services ==

Winden provides optional integration with external services for loading third-party Tailwind plugins. Core features work entirely offline.

**Third-Party Tailwind Plugins:**

When you use the `@plugin` directive with an external URL in your CSS configuration, Winden fetches the plugin module at compile time. For example: `@plugin "https://esm.sh/daisyui@5";`

* Only activated when user explicitly adds a `@plugin` directive with a URL
* Supports any ESM-compatible CDN (esm.sh, unpkg, jsdelivr, etc.)
* Plugin fetching only occurs during development mode compilation
* In production mode with dev mode disabled, no external requests are made
* No user data or site information is transmitted

== Screenshots ==

1. Winden settings panel
2. Tailwind classes in Gutenberg

== Changelog ==

= 1.3.4 =
* Tailwindcss update to 4.3.1
* Fixed clearing cache on post save

= 1.3.2 =
* Added back "'svg-painter" in scripts dependencies so SVG custom icons are recolored

= 1.3.1 =
* Updated dependencies for build compatibility

= 1.3.0 =
Editor Experience
* Reorder & hide editor tabs - Drag tabs to rearrange or hide unused tabs
* Unsaved changes protection - Browser warns before leaving with unsaved work
* Style tab content preservation - Custom CSS now preserved when toggling tabs on/off
* Improved error visibility - Cache errors highlighted with red color and warning icon
* Better tab labels - Clearer descriptions for "Main Style" tab, removed confusing lock icon

Wizzard Design Tokens
* Welcome screen - First-time users get clear instructions and quick Settings access
* Clearer builder integration labels - "Use Bricks colors" instead of vague "Include Bricks"
* Simplified scale calculator - Replaced "mega/giga" jargon with familiar Tailwind defaults

Performance & Reliability
* Fixed cache collisions - Large config files now compile reliably without stale CSS
* Improved class detection - Removed classes now properly disappear from output
* CDN plugin loading - Automatic retry on failure with 10-second timeout
* Security improvements - Added security checks to compilation endpoints
* Tested with WordPress 7.0

Bug Fixes
* Fixed Monaco editor autocomplete appearing at wrong times
* Fixed false "content changed elsewhere" warnings
* Fixed Bricks Builder autocomplete hover issues
* Fixed Oxygen Classic integration
* Fixed color value validation and reset functionality
* Fixed rare SCSS hang when another plugin already loaded Sass
* Fixed tab visibility flash on page load
* Fixed double class instantiation issues


= 1.2.6 =
* Tailwindcss update to 4.3.0

= 1.2.5 =
* Tailwindcss update to 4.2.4

= 1.2.4 =
* Tailwindcss update to 4.2.3


= 1.2.3 =
* Fixed `getBricksThemeFontFamilies()` overwriting global `$post` during `admin_enqueue_scripts`, which prevented custom fields (meta boxes) from saving in Gutenberg for any CPT when Winden was active

= 1.2.2 =
Hotfix
* Fixed calculator
* Fixed style guide

= 1.2.1 =
Hotfix
* Pass tailwind default colors to the builders

= 1.2.0 =
Feature
* Add default colors from Wizzard

= 1.1.3 =
Bug Fixes
* Fixed color shade toggle. It was passing shades to Gutenberg regarding of the setting


= 1.1.2 =

Improvements
* Updated TailwindCSS to v4.2.1
* Updated admin scripts with npm to latest version for security reasons

= 1.1.1 =

Features
* Cache popup now have list of classes that were scanned in the process

Improvements
* Color Management
* Custom shade colors are now properly preserved during color regeneration.
* Better input validation and error handling for color names and hex values.
* Improved breakpoints caching and performance in autocomplete.
* Compiler and watcher scripts now only load for logged-in users, preventing 400 AJAX errors from anonymous visitors.

Bug Fixes
* Fixed color shade updates not reflecting base color changes.
* Improved cache popup behavior.



= 1.1.0 =

Features
* Text Class Editing Support
* Multi-Tab Save Protection If someone else (or another tab) saves while you're editing, you'll get a warning instead of your changes being silently overwritten.

Improvements
* Color Picker Visibility
* Fixed the color picker being cut off by overflow: hidden on the layout.
* Color Shade Updates
* Changing a base color now correctly updates all generated shades.
* Multi-Word Color Names
* Color names like "Blue Light" or "Blue Dark" now display correctly in the Style Guide preview.
* Smoother Shade Sliders
* Dragging shade sliders is now more responsive with less lag.
B* etter Error Messages
* Save and fetch errors now show clearer messages in the browser console. Enable WP_DEBUG to see detailed timing and diagnostic info.


= 1.0.9 =
* Improved: Tested up to WordPress 6.9.1
* Fixed: Scripts loading on frontend when user was logged out

= 1.0.8 > 1.0.0 =
* Initial release

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.0.0 =
Initial release.

=== Winden - Tailwind CSS Compiler ===
Contributors: krstivoja
Tags: tailwind, css, compiler, gutenberg, page builder
Requires at least: 6.2
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.0.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Tailwind CSS compiler for WordPress. Use utility classes directly in your editor.

== Description ==

Winden brings the full power of Tailwind CSS v4 to WordPress. Write utility classes directly in your editor and see them compiled in real-time.

**Features:**

* Full Tailwind CSS v4 support
* Real-time compilation in browser
* Works with any theme or page builder
* Gutenberg integration
* Developer-friendly

**Integrations:**

* Gutenberg (Block Editor)
* Oxygen Builder (pro)
* Bricks Builder (pro)
* Elementor (pro)

**Bundled Tailwind Plugins:**

* @tailwindcss/forms
* @tailwindcss/typography
* @tailwindcss/container-queries

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Navigate to Winden settings to configure

== Frequently Asked Questions ==

= Does this work with my page builder? =

Winden works with Gutenberg out of the box. Pro integrations are available for Oxygen, Bricks, and Elementor.

= Do I need to know Tailwind CSS? =

Basic knowledge of Tailwind CSS classes is helpful. Visit [tailwindcss.com](https://tailwindcss.com/docs) for documentation.

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

= 1.0.4 =
* Initial release

= 1.0.3 =
* Initial release

= 1.0.2 =
* Initial release

= 1.0.1 =
* Initial release

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.0.0 =
Initial release.

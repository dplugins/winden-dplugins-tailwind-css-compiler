=== Winden DPlugins - Tailwind CSS Compiler ===
Contributors: dplugins
Donate link: https://dplugins.com/
Tags: tailwind, tailwindcss, css, page builder, gutenberg
Requires at least: 6.2
Tested up to: 6.9
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Browser-based Tailwind CSS v4 compiler for WordPress. No build tools required.

== Source Code & Build Information ==

This plugin includes compiled and minified JavaScript and CSS files built from source code.

**Repository**: https://github.com/dplugins/winden

**Source Files**:
* TypeScript/JavaScript sources in /src/ directory
* SCSS sources in /src/ directory

**Compiled Assets**:
* Minified JS files in /build/ directory
* Compiled CSS files in /build/ directory

**Building from Source**:
1. Clone: https://github.com/dplugins/winden
2. npm install
3. npm run build
4. Compiled files will be generated in /build/ directory

All source code is publicly available for review and modification.


== Description ==

Winden brings the power of Tailwind CSS v4 to WordPress with a unique browser-based compilation approach. No build tools required - just install and start using Tailwind classes in your favorite page builder.

= Key Features =

* **Browser-Based Compilation** - Tailwind CSS compiles directly in your browser with zero server overhead
* **Visual Design Token Builder (Wizzard)** - Create colors, spacing, typography, and breakpoints through an intuitive GUI
* **Multi-Tab CSS Editor** - Organize your styles with Tailwind @layer directives
* **Intelligent Autocomplete** - Get class suggestions right in your page builder
* **File Scanning** - Automatically discover custom classes across your site
* **Works Everywhere** - Gutenberg/FSE, Bricks, Oxygen, Elementor support

= Supported Page Builders =

* Gutenberg / Full Site Editing (FSE)
* Bricks Builder
* Oxygen Builder
* Elementor

= How It Works =

1. Install and activate Winden
2. Configure your design tokens in the Wizzard (colors, fonts, spacing)
3. Use Tailwind classes in your page builder
4. Winden compiles everything in the browser - no build step needed

= Requirements =

* WordPress 6.3 or higher
* PHP 8.0 or higher
* Modern browser (Chrome, Firefox, Safari, Edge)

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/winden/` or install through the WordPress plugins screen
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Go to Winden in your admin menu to configure
4. Set up your design tokens in the Wizzard tab
5. Start using Tailwind classes in your content

== Frequently Asked Questions ==

= Does Winden require Node.js or npm? =

No! Winden compiles Tailwind CSS directly in your browser. No build tools, CLI, or server-side compilation needed.

= Which version of Tailwind CSS does Winden use? =

Winden uses Tailwind CSS v4, the latest version with CSS-first configuration.

= Can I use custom Tailwind plugins? =

Yes, Winden supports Tailwind plugins including @tailwindcss/forms and @tailwindcss/typography which are bundled with the plugin.

You can also use third-party Tailwind plugins via the `@plugin` directive. When you reference a plugin URL (e.g., `@plugin "https://esm.sh/daisyui@5"`), Winden fetches the plugin from the specified CDN at compile time. This is an optional feature - the core functionality works entirely offline with bundled plugins.

= Does it work with caching plugins? =

Yes. In production mode, Winden outputs compiled CSS that works with any caching solution.

= Is it compatible with my theme? =

Winden works with any WordPress theme. It adds Tailwind CSS utilities without conflicting with your theme's styles.

== External Services ==

Winden provides optional integration with external services for advanced plugin functionality. **Core features work entirely offline** - these services are only used when you explicitly configure them.

= Optional: Third-Party Tailwind Plugins =

When you use the `@plugin` directive with an external URL in your CSS configuration, Winden fetches the plugin module at compile time. This is an **opt-in feature** that requires you to explicitly add a plugin URL.

**Example usage:**
`@plugin "https://esm.sh/daisyui@5";`

**Services that may be contacted:**

* **esm.sh** (https://esm.sh) - ESM module CDN for JavaScript packages
  * Used when: You add `@plugin "https://esm.sh/..."` to your configuration
  * Data sent: HTTP request for the specified package
  * Privacy policy: https://esm.sh (open source CDN)

* **Other CDNs** - Any URL you specify in the `@plugin` directive
  * Used when: You explicitly add a plugin URL to your configuration
  * You control which services are contacted based on the URLs you configure

**Important notes:**

* The core Tailwind compilation works entirely offline with bundled plugins (@tailwindcss/forms, @tailwindcss/typography, @tailwindcss/container-queries)
* No external requests are made unless you explicitly add a `@plugin` directive with a URL
* Plugin fetching only occurs during development mode compilation
* In production mode with dev mode disabled, no external requests are made
* No user data, site data, or personal information is transmitted to these services

== Screenshots ==

1. Wizzard - Visual design token builder for colors
2. Style Editor - Multi-tab CSS editor with @layer support
3. Settings - Configure page builder integrations
4. Autocomplete - Class suggestions in page builders

== Changelog ==

= 1.0.0 =
* Initial WordPress.org release
* Tailwind CSS v4.1.17 support
* Browser-based compilation
* Visual Wizzard for design tokens
* Multi-tab style editor
* Gutenberg support
* WordPress.org compliance updates: text domain, prefix standardization, security improvements

== Upgrade Notice ==

= 1.0.0 =
Initial public release with Tailwind CSS v4 support.

/**
 * Default CSS content for Tailwind v4
 */
export const DEFAULT_CSS_CONTENT = '@layer theme, base, components, utilities;\n\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/preflight.css" layer(base);\n@import "tailwindcss/utilities.css" layer(utilities);\n\n@plugin "@tailwindcss/typography";\n@plugin "@tailwindcss/forms";\n@plugin "@tailwindcss/container-queries";\n';

/**
 * Alias for backward compatibility
 */
export const DEFAULT_CSS_CONTENT_V4 = DEFAULT_CSS_CONTENT;

/**
 * Minimum baseline used when the Style tab is hidden from the editor.
 * Skips preflight on purpose: preflight normalises away the h1/p/ul/button
 * styles Gutenberg supplies, so omitting it lets Gutenberg's own reset
 * survive. User's saved Style-tab content stays in the DB so re-enabling
 * the tab restores it.
 */
export const MINIMAL_BASE_CSS = '@layer theme, base, components, utilities;\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);\n';

/**
 * Default JavaScript configuration content
 */
export const DEFAULT_JS_CONTENT = `export default {\n    theme: {\n        extend: {\n            colors: {\n\n            }\n        }\n    },\n    corePlugins: {\n\n    }\n};`;

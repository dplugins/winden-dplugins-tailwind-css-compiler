/**
 * Default CSS content for Tailwind v4
 */
export const DEFAULT_CSS_CONTENT = '@layer theme, base, components, utilities;\n\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/preflight.css" layer(base);\n@import "tailwindcss/utilities.css" layer(utilities);\n\n@plugin "@tailwindcss/typography";\n@plugin "@tailwindcss/forms";\n';

/**
 * Alias for backward compatibility
 */
export const DEFAULT_CSS_CONTENT_V4 = DEFAULT_CSS_CONTENT;

/**
 * Default JavaScript configuration content
 */
export const DEFAULT_JS_CONTENT = `export default {\n    theme: {\n        extend: {\n            colors: {\n\n            }\n        }\n    },\n    corePlugins: {\n\n    }\n};`;

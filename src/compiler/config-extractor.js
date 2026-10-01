/**
 * Style Guide tokens, read from Tailwind's resolved theme.
 *
 * The design system is built from the same inputs the compiler uses — the
 * Tailwind import, `@config`, the Wizzard `@theme`, the Style tab — so
 * Tailwind has already applied source precedence, `--color-*: initial`
 * resets, `@theme inline` / `static` / `reference`, legacy JS-config values
 * and `theme()` calls. Nothing here parses CSS or merges sources; this file
 * only turns the flat `theme.namespace()` maps into the nested shape the
 * Style Guide UI has always consumed.
 *
 * Namespace maps are flat, so a small adapter is needed (checked on 4.3.3):
 *   - `--text-sm--line-height` appears in `--text` as `sm--line-height`
 *   - `--font-weight-*` appears in `--font` as `weight-*`
 *   - `--spacing` is a single base value under the `null` key; the scale is
 *     derived, so only named `--spacing-*` tokens are listed
 *   - a bare `--shadow` / `--radius` sits under the `null` key
 * `null` keys are skipped throughout, matching what the Style Guide showed
 * before this rewrite (it only ever listed named tokens).
 */

/** Read one namespace as `[name, value]` pairs, skipping the bare (`null`) key. */
function named(designSystem, namespace) {
  const out = [];
  for (const [key, value] of designSystem.theme.namespace(namespace).entries()) {
    if (key === null || key === undefined) continue;
    out.push([String(key), String(value).trim()]);
  }
  return out;
}

/** `[name, value]` pairs → plain object. */
const toObject = (pairs) => Object.fromEntries(pairs);

/**
 * `red-500` → `{ red: { 500 } }`, `brand` → `{ brand: { DEFAULT } }`; a color
 * with only a DEFAULT collapses to a string. Multi-word names (`blue-light`)
 * stay whole — only a trailing number is a shade.
 */
export function groupColors(pairs) {
  const colors = {};
  for (const [name, value] of pairs) {
    const parts = name.split('-');
    let base = name;
    let shade = 'DEFAULT';
    if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1])) {
      shade = parts[parts.length - 1];
      base = parts.slice(0, -1).join('-');
    }
    (colors[base] ??= {})[shade] = value;
  }
  for (const [base, shades] of Object.entries(colors)) {
    const keys = Object.keys(shades);
    if (keys.length === 1 && keys[0] === 'DEFAULT') colors[base] = shades.DEFAULT;
  }
  return colors;
}

/**
 * The Style Guide's token categories, from a resolved design system.
 * @param {import('tailwindcss').DesignSystem} designSystem
 */
export function extractThemeConfig(designSystem) {
  const text = named(designSystem, '--text');
  const font = named(designSystem, '--font');
  const spacing = named(designSystem, '--spacing');

  const subKey = (suffix) => text
    .filter(([name]) => name.endsWith(`--${suffix}`))
    .map(([name, value]) => [name.slice(0, -(suffix.length + 2)), value]);

  return {
    colors: groupColors(named(designSystem, '--color')),
    spacing: toObject(spacing),
    // `--text-*` sizes only: no `--line-height` / `--letter-spacing` sub-keys,
    // and not `--text-shadow-*`, which shares the prefix
    fontSizes: toObject(text.filter(([name]) => !name.includes('--') && !/^shadow(-|$)/.test(name))),
    breakpoints: toObject(named(designSystem, '--breakpoint')),
    // `--font-*` families only: `--font-weight-*` and `--font-*--font-feature-settings` share the prefix
    fontFamilies: toObject(font.filter(([name]) => !name.includes('--') && !/^weight(-|$)/.test(name))),
    fontWeights: toObject(named(designSystem, '--font-weight')),
    letterSpacing: toObject([...named(designSystem, '--tracking'), ...subKey('letter-spacing')]),
    lineHeights: toObject([...named(designSystem, '--leading'), ...subKey('line-height')]),
    borderRadius: toObject(named(designSystem, '--radius')),
    shadows: toObject(named(designSystem, '--shadow')),
    // width utilities run on the spacing scale plus the container sizes
    widths: toObject([...spacing, ...named(designSystem, '--container')]),
  };
}

/**
 * Convert extracted config to StyleGuide format
 * @param {Object} config - The extracted configuration
 * @returns {Object} - Configuration in StyleGuide format
 */
export function convertToStyleGuideFormat(config) {
    return {
        theme: {
            colors: config.colors,
            spacing: config.spacing,
            fontSize: config.fontSizes,
            screens: config.breakpoints,
            fontFamily: config.fontFamilies,
            fontWeight: config.fontWeights,
            letterSpacing: config.letterSpacing,
            lineHeight: config.lineHeights,
            borderRadius: config.borderRadius,
            dropShadow: config.shadows,
            width: config.widths,
            // Add default values for missing properties
            zIndex: {},
            aspectRatio: {},
            accentColor: config.colors // Use colors as accent colors
        }
    };
}

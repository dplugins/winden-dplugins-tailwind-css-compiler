# JavaScript Config - Fallback Configuration

The JavaScript Config tab provides advanced Tailwind configuration for users who need programmatic control over their design system. This is the "fallback" config that runs when Wizzard features aren't used.

---

## Table of Contents
- [Overview](#overview)
- [When to Use JavaScript Config](#when-to-use-javascript-config)
- [Config Format](#config-format)
- [Configuration Options](#configuration-options)
- [Using Plugins](#using-plugins)
- [Advanced Patterns](#advanced-patterns)
- [Migration from Wizzard](#migration-from-wizzard)
- [Troubleshooting](#troubleshooting)

---

## Overview

The JavaScript Config tab allows you to write Tailwind configuration using JavaScript syntax, similar to traditional `tailwind.config.js` files.

### Key Features

- **Full Tailwind Config API** - Access all Tailwind configuration options
- **ESM and CommonJS** - Supports both `export default` and `module.exports`
- **Plugin Support** - Use bundled plugins or load from CDN
- **Functional Configs** - Export functions for dynamic configuration
- **Browser-Based** - Executes safely in the browser without Node.js

### Wizzard vs JavaScript Config

| Feature | Wizzard | JavaScript Config |
|---------|---------|-------------------|
| **Interface** | Visual UI | Code editor |
| **Ease of Use** | Beginner-friendly | Advanced users |
| **Flexibility** | Limited to UI options | Full Tailwind API |
| **Dynamic Config** | Fixed values | Functions, calculations |
| **Best For** | Design tokens | Complex logic, plugins |

---

## When to Use JavaScript Config

### Use JavaScript Config When:

✅ **You need plugins** that require configuration
```javascript
export default {
  plugins: [
    require('@tailwindcss/forms')({ strategy: 'class' })
  ]
}
```

✅ **You need dynamic values** based on calculations
```javascript
export default {
  theme: {
    extend: {
      spacing: Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [i, `${i * 0.25}rem`])
      )
    }
  }
}
```

✅ **You need custom plugins** with complex logic
```javascript
const plugin = require('tailwindcss/plugin');

export default {
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    })
  ]
}
```

✅ **You're migrating** from a traditional Tailwind project
```javascript
// Copy your existing tailwind.config.js content
export default {
  // ... your existing config
}
```

### Use Wizzard Instead When:

❌ **You only need design tokens** (colors, fonts, spacing)
- Wizzard provides a visual interface for these

❌ **You want shade generation** for colors
- Wizzard auto-generates 50-950 shades

❌ **You need builder integration** (FSE, Bricks, Oxygen)
- Wizzard handles this automatically

---

## Config Format

### ESM Format (Recommended)

```javascript
export default {
  theme: {
    extend: {
      colors: {
        brand: '#3b82f6'
      }
    }
  }
}
```

### CommonJS Format

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#3b82f6'
      }
    }
  }
}
```

### Functional Config

```javascript
export default function() {
  return {
    theme: {
      extend: {
        colors: {
          brand: '#3b82f6'
        }
      }
    }
  }
}
```

### TypeScript-Style (No Type Checking)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        brand: '#3b82f6'
      }
    }
  }
}
```

**Note:** Type annotations are ignored but won't cause errors.

---

## Configuration Options

### Theme Extension

Extend Tailwind's default theme:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          // ... more shades
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      screens: {
        '3xl': '1920px',
      },
    },
  },
}
```

### Theme Override

Replace default theme values:

```javascript
export default {
  theme: {
    // This REPLACES Tailwind defaults, doesn't extend
    colors: {
      primary: '#3b82f6',
      secondary: '#10b981',
      // No other colors available unless you add them
    },
    spacing: {
      sm: '0.5rem',
      md: '1rem',
      lg: '2rem',
      // Only these spacing values available
    },
  },
}
```

**Warning:** Overriding without `extend` removes all Tailwind defaults.

### Content Configuration

**Note:** Content configuration is handled by Winden's crawler. This setting is ignored:

```javascript
export default {
  // ❌ Not used - Winden crawls content automatically
  content: ['./src/**/*.{html,js}'],

  // ✅ Focus on theme and plugins instead
  theme: { /* ... */ },
  plugins: [ /* ... */ ],
}
```

### Variants Configuration

Enable or disable variants:

```javascript
export default {
  variants: {
    extend: {
      backgroundColor: ['active'],
      textColor: ['visited'],
    },
  },
}
```

**Note:** Tailwind v4 handles most variants automatically. This is rarely needed.

### Core Plugins

Disable core plugins to reduce bundle size:

```javascript
export default {
  corePlugins: {
    preflight: false,  // Disable CSS reset
    container: false,  // Disable container utility
    float: false,      // Disable float utilities
  },
}
```

---

## Using Plugins

### Bundled Plugins

Winden includes these plugins pre-bundled:

```javascript
export default {
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
  ],
}
```

**Note:** You can also use these via `@plugin` directive in the Style tab (recommended for v4).

### Plugin Configuration

Configure bundled plugins:

```javascript
export default {
  plugins: [
    // Forms with class strategy
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),

    // Typography with custom class name
    require('@tailwindcss/typography')({
      className: 'wysiwyg',
    }),
  ],
}
```

### Custom Plugins

Create custom utilities:

```javascript
const plugin = require('tailwindcss/plugin');

export default {
  plugins: [
    plugin(function({ addUtilities }) {
      const newUtilities = {
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.scrollbar-hide': {
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      };

      addUtilities(newUtilities);
    }),
  ],
}
```

### CDN Plugins

Load plugins from CDN:

```javascript
export default {
  plugins: [
    // Note: CDN plugins must be loaded asynchronously
    // This requires special handling - see Advanced Patterns
  ],
}
```

**Recommendation:** Use `@plugin` directive in Style tab for CDN plugins instead:

```css
@plugin "https://cdn.example.com/plugin.js";
```

---

## Advanced Patterns

### Pattern 1: Computed Values

Generate values programmatically:

```javascript
export default {
  theme: {
    extend: {
      // Generate spacing scale: 0, 1, 2, ... 100
      spacing: Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [i, `${i * 0.25}rem`])
      ),

      // Generate grid columns: 13, 14, 15, ... 24
      gridTemplateColumns: Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => {
          const cols = i + 13;
          return [cols, `repeat(${cols}, minmax(0, 1fr))`];
        })
      ),
    },
  },
}
```

### Pattern 2: Design Tokens from Constants

Define tokens as constants:

```javascript
const colors = {
  brand: {
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
  },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    // ...
  },
};

const spacing = {
  xs: '0.5rem',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
};

export default {
  theme: {
    extend: {
      colors,
      spacing,
    },
  },
}
```

### Pattern 3: Conditional Configuration

Dynamic config based on conditions:

```javascript
const isDevelopment = true; // Could be dynamic

export default {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        ...(isDevelopment && {
          debug: '#ff0000',
        }),
      },
    },
  },
  plugins: [
    ...(isDevelopment ? [] : [
      require('@tailwindcss/forms'),
    ]),
  ],
}
```

### Pattern 4: Custom Plugin with Theme Integration

Access theme values in custom plugins:

```javascript
const plugin = require('tailwindcss/plugin');

export default {
  theme: {
    extend: {
      spacing: {
        gutter: '2rem',
      },
    },
  },
  plugins: [
    plugin(function({ addComponents, theme }) {
      addComponents({
        '.container-custom': {
          padding: theme('spacing.gutter'),
          maxWidth: theme('screens.xl'),
        },
      });
    }),
  ],
}
```

### Pattern 5: Multiple Custom Plugins

Organize plugins by purpose:

```javascript
const plugin = require('tailwindcss/plugin');

// Utilities plugin
const utilitiesPlugin = plugin(function({ addUtilities }) {
  addUtilities({
    '.text-balance': { 'text-wrap': 'balance' },
    '.scrollbar-hide': { 'scrollbar-width': 'none' },
  });
});

// Components plugin
const componentsPlugin = plugin(function({ addComponents }) {
  addComponents({
    '.btn': {
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
    },
  });
});

export default {
  plugins: [
    utilitiesPlugin,
    componentsPlugin,
  ],
}
```

---

## Migration from Wizzard

### Exporting Wizzard Config

If you've been using Wizzard and want to switch to JavaScript config:

1. Open **Wizzard → Settings**
2. Scroll to **"Export Configuration"**
3. Click **"Export as JavaScript"**
4. Copy the generated config
5. Paste into **JavaScript Config** tab

**Example Export:**

```javascript
// Generated from Wizzard on 2024-01-15
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          // ... all shades
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        // ...
      },
      spacing: {
        // ...
      },
    },
  },
}
```

### Combining Wizzard and JavaScript Config

**Not Recommended:** Using both at the same time can cause conflicts.

**Best Practice:** Choose one approach:
- **Wizzard only** - For design tokens managed visually
- **JavaScript only** - For full programmatic control

If you need both:
1. Export Wizzard config to JavaScript
2. Disable Wizzard features (Settings → Wizzard → Disable)
3. Manage everything in JavaScript config

---

## Troubleshooting

### Config Not Loading

**Problem:** JavaScript config doesn't seem to apply.

**Solution:**
1. Check browser console for syntax errors
2. Verify export statement: `export default { ... }` or `module.exports = { ... }`
3. Ensure valid JavaScript (no trailing commas in wrong places)
4. Save and reload the editor

### Syntax Errors

**Problem:** "Config loading failed" error in console.

**Solution:**
Check for common JavaScript mistakes:

```javascript
// ❌ Wrong - missing comma
export default {
  theme: {
    extend: {
      colors: { brand: '#3b82f6' }  // Missing comma here
      spacing: { lg: '2rem' }
    }
  }
}

// ✅ Correct
export default {
  theme: {
    extend: {
      colors: { brand: '#3b82f6' },  // Comma added
      spacing: { lg: '2rem' }
    }
  }
}
```

### Plugins Not Working

**Problem:** `require('@tailwindcss/forms')` shows error.

**Solution:**
Only these plugins are bundled and available:

```javascript
// ✅ Available
require('@tailwindcss/forms')
require('@tailwindcss/typography')
require('@tailwindcss/container-queries')

// ❌ Not available (use @plugin in Style tab instead)
require('@tailwindcss/aspect-ratio')  // Built-in to v4
require('daisyui')  // Use CDN approach
require('custom-plugin')  // Not bundled
```

### require() Not Defined

**Problem:** "require is not defined" error.

**Solution:**
You're using ESM syntax but calling `require()`:

```javascript
// ❌ Wrong - mixing ESM and CommonJS
export default {
  plugins: [
    require('@tailwindcss/forms')  // require in ESM
  ]
}

// ✅ Correct - use require in CommonJS
module.exports = {
  plugins: [
    require('@tailwindcss/forms')
  ]
}

// ✅ Or use ESM throughout
import forms from '@tailwindcss/forms';  // This won't work in browser

// ✅ Best - use @plugin directive in Style tab instead
export default {
  theme: { /* ... */ }
  // No plugins here - use @plugin in Style tab
}
```

### Values Not Overriding Wizzard

**Problem:** JavaScript config values don't override Wizzard.

**Solution:**
Wizzard takes precedence. To use JavaScript config:

1. Open **Settings → Wizzard**
2. Toggle **"Disable Wizzard"**
3. JavaScript config will now be used

Or export Wizzard config and manage in JavaScript.

### Theme Override Removes Defaults

**Problem:** Setting `theme: { colors: {...} }` removes all Tailwind colors.

**Solution:**
Use `extend` to keep defaults:

```javascript
// ❌ Wrong - removes all default colors
export default {
  theme: {
    colors: {
      brand: '#3b82f6'  // Only 'brand' color available
    }
  }
}

// ✅ Correct - extends default colors
export default {
  theme: {
    extend: {
      colors: {
        brand: '#3b82f6'  // Adds to default colors
      }
    }
  }
}
```

### Functional Config Not Executing

**Problem:** Exported function doesn't run.

**Solution:**
Ensure you're returning a config object:

```javascript
// ❌ Wrong - not returning anything
export default function() {
  {
    theme: { /* ... */ }
  }
}

// ✅ Correct - explicit return
export default function() {
  return {
    theme: { /* ... */ }
  }
}

// ✅ Also correct - arrow function
export default () => ({
  theme: { /* ... */ }
})
```

---

## Best Practices

### 1. Use Extend, Not Override

Always extend the default theme unless you have a specific reason to override:

```javascript
// ✅ Recommended
export default {
  theme: {
    extend: {
      colors: { /* additions */ },
    },
  },
}

// ❌ Avoid
export default {
  theme: {
    colors: { /* replaces all */ },
  },
}
```

### 2. Organize by Category

Group related configuration:

```javascript
export default {
  theme: {
    extend: {
      // Colors
      colors: {
        brand: { /* ... */ },
        accent: { /* ... */ },
      },

      // Typography
      fontFamily: { /* ... */ },
      fontSize: { /* ... */ },

      // Layout
      spacing: { /* ... */ },
      screens: { /* ... */ },
    },
  },
}
```

### 3. Comment Complex Logic

Explain non-obvious configurations:

```javascript
export default {
  theme: {
    extend: {
      // Generate even spacing: 0, 2, 4, 6, ... 100
      // Useful for grid systems with 2px increments
      spacing: Object.fromEntries(
        Array.from({ length: 51 }, (_, i) => [i * 2, `${i * 0.125}rem`])
      ),
    },
  },
}
```

### 4. Extract Constants

Define values once, reuse everywhere:

```javascript
const BRAND_COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
};

export default {
  theme: {
    extend: {
      colors: {
        brand: BRAND_COLORS.blue,
        accent: BRAND_COLORS.green,
      },
      backgroundColor: {
        primary: BRAND_COLORS.blue,
      },
    },
  },
}
```

### 5. Prefer Style Tab for Plugins

Use `@plugin` directive in Style tab instead of JavaScript config:

```css
/* ✅ Recommended - Style tab */
@plugin "@tailwindcss/forms";
```

```javascript
// ❌ Less ideal - JavaScript config
export default {
  plugins: [
    require('@tailwindcss/forms')
  ]
}
```

---

## Examples

### Minimal Config

```javascript
export default {
  theme: {
    extend: {
      colors: {
        brand: '#3b82f6',
      },
    },
  },
}
```

### Design System Config

```javascript
const colors = {
  brand: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    900: '#1e3a8a',
  },
  accent: {
    50: '#f0fdf4',
    500: '#10b981',
    900: '#064e3b',
  },
};

const spacing = {
  'section': '4rem',
  'container': '1280px',
};

export default {
  theme: {
    extend: {
      colors,
      spacing,
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
}
```

### Plugin Configuration

```javascript
export default {
  theme: {
    extend: {
      colors: {
        brand: '#3b82f6',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
  ],
}
```

### Custom Utilities Plugin

```javascript
const plugin = require('tailwindcss/plugin');

export default {
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.text-pretty': {
          'text-wrap': 'pretty',
        },
        '.scrollbar-hide': {
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    }),
  ],
}
```

---

## Next Steps

- Learn about [Wizzard visual configuration](Wizzard-Overview.md)
- Explore [Style tab for CSS organization](Style-Editor.md)
- Check [Plugin integration guide](Plugins.md)
- Understand [Plain Classes autocomplete](Plain-Classes.md)

---

**Need Help?**
If you have questions about JavaScript configuration, consult the [FAQ](FAQ.md) or reach out to Winden support.

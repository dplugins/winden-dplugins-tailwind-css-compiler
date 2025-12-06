# Tailwind Config Format Examples

Winden's compile-in-browser engine supports **4 different Tailwind config formats**. This document provides examples and explains when to use each format.

---

## 1. ESM Config (Export Default)

**Format:** ES Module with `export default`

**Use Case:** Modern JavaScript projects, TypeScript, most new codebases

**Example:**

```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3490dc',
        secondary: '#ffed4e',
        danger: '#e3342f',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      spacing: {
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    }
  },
  plugins: []
}
```

**Features:**
- ✅ Clean, modern syntax
- ✅ Full TypeScript support
- ✅ Tree-shakeable
- ✅ Most common format in 2024+

---

## 2. CommonJS Config (module.exports)

**Format:** CommonJS with `module.exports`

**Use Case:** Node.js projects, legacy codebases, older Tailwind v2/v3 configs

**Example:**

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    }
  },
  plugins: []
}
```

**Features:**
- ✅ Works with older Node.js versions
- ✅ Compatible with require() syntax
- ✅ Standard for npm packages
- ✅ Used in Tailwind v2 and v3 projects

**Alternative Syntax (exports.):**

```javascript
exports.theme = {
  extend: {
    colors: {
      custom: '#ff6b6b'
    }
  }
};

exports.plugins = [];
```

---

## 3. Functional ESM Config

**Format:** ES Module exporting a function

**Use Case:** Dynamic configs, environment-based theming, runtime calculations

**Example:**

```javascript
export default () => {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    theme: {
      extend: {
        colors: {
          background: isDarkMode ? '#1a202c' : '#ffffff',
          foreground: isDarkMode ? '#ffffff' : '#1a202c',
          accent: isDarkMode ? '#4299e1' : '#3182ce',
        },
        fontSize: {
          'dynamic-lg': `${Math.max(1, window.innerWidth / 100)}rem`,
        },
      }
    },
    plugins: []
  };
};
```

**Advanced Example with Parameters:**

```javascript
export default () => {
  // Read from environment or window variables
  const env = window.windenEnv || 'production';
  const locale = document.documentElement.lang || 'en';

  // Different configs per environment
  const envColors = {
    development: {
      debug: '#ff0000',
      warning: '#ffaa00',
    },
    production: {
      primary: '#3490dc',
      secondary: '#ffed4e',
    },
  };

  // RTL support based on locale
  const direction = ['ar', 'he', 'fa'].includes(locale) ? 'rtl' : 'ltr';

  return {
    theme: {
      extend: {
        colors: envColors[env] || envColors.production,
        spacing: direction === 'rtl' ? {
          'start': '0 0 0 1rem',
          'end': '0 1rem 0 0',
        } : {},
      }
    },
    plugins: []
  };
};
```

**Features:**
- ✅ Dynamic theme generation
- ✅ Access to browser APIs (window, document)
- ✅ Conditional logic
- ✅ Environment-based configuration
- ✅ Runtime calculations

---

## 4. Functional CommonJS Config

**Format:** CommonJS exporting a function

**Use Case:** Node.js dynamic configs, server-side rendering, build-time customization

**Example:**

```javascript
module.exports = function() {
  const timestamp = Date.now();
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    theme: {
      extend: {
        colors: {
          'cache-bust': `#${timestamp.toString(16).substring(0, 6)}`,
          primary: isProduction ? '#000000' : '#ff0000',
        },
        animation: {
          'debug-pulse': isProduction ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
      }
    },
    plugins: isProduction ? [] : [
      // Debug plugins only in development
    ]
  };
};
```

**Advanced Example with Dependencies:**

```javascript
module.exports = function() {
  // Feature detection
  const hasLocalStorage = typeof localStorage !== 'undefined';
  const userPreferences = hasLocalStorage
    ? JSON.parse(localStorage.getItem('theme-preferences') || '{}')
    : {};

  // Default theme
  const defaultTheme = {
    fontSize: 16,
    colorScheme: 'light',
    spacing: 'comfortable',
  };

  const theme = { ...defaultTheme, ...userPreferences };

  // Calculate spacing scale based on user preference
  const spacingMultiplier = {
    compact: 0.75,
    comfortable: 1,
    spacious: 1.25,
  }[theme.spacing] || 1;

  return {
    theme: {
      extend: {
        fontSize: {
          base: `${theme.fontSize}px`,
          lg: `${theme.fontSize * 1.125}px`,
          xl: `${theme.fontSize * 1.25}px`,
        },
        spacing: {
          1: `${0.25 * spacingMultiplier}rem`,
          2: `${0.5 * spacingMultiplier}rem`,
          3: `${0.75 * spacingMultiplier}rem`,
          4: `${1 * spacingMultiplier}rem`,
          5: `${1.25 * spacingMultiplier}rem`,
          6: `${1.5 * spacingMultiplier}rem`,
          8: `${2 * spacingMultiplier}rem`,
          10: `${2.5 * spacingMultiplier}rem`,
          12: `${3 * spacingMultiplier}rem`,
        },
        colors: theme.colorScheme === 'dark' ? {
          background: '#1a202c',
          foreground: '#ffffff',
        } : {
          background: '#ffffff',
          foreground: '#1a202c',
        },
      }
    },
    plugins: []
  };
};
```

**Features:**
- ✅ Access to Node.js APIs (process, require)
- ✅ Build-time configuration
- ✅ User preference loading
- ✅ Conditional plugin loading
- ✅ Compatible with older bundlers

---

## Comparison Table

| Feature | ESM | CommonJS | Functional ESM | Functional CommonJS |
|---------|-----|----------|----------------|---------------------|
| **Syntax** | `export default {}` | `module.exports = {}` | `export default () => ({})` | `module.exports = function() {}` |
| **Static** | ✅ Yes | ✅ Yes | ❌ No (dynamic) | ❌ No (dynamic) |
| **Tree-shakeable** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Browser APIs** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Node.js APIs** | ❌ No | ✅ Yes | ❌ No | ✅ Yes |
| **Runtime Calculation** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **TypeScript** | ✅ Excellent | ⚠️ Good | ✅ Excellent | ⚠️ Good |
| **Cache Friendly** | ✅ Yes | ✅ Yes | ⚠️ Depends | ⚠️ Depends |

---

## How Winden Detects the Format

Winden automatically detects which format you're using:

```javascript
// Detection Logic (simplified)
function detectFormat(configString) {
  if (configString.includes('module.exports')) {
    if (configString.includes('function')) {
      return 'Functional CommonJS';
    }
    return 'CommonJS';
  }

  if (configString.includes('export default')) {
    if (configString.includes('() =>') || configString.includes('function')) {
      return 'Functional ESM';
    }
    return 'ESM';
  }
}
```

**No configuration needed!** Just write your config and Winden handles the rest.

---

## Migration Examples

### From ESM to Functional ESM

**Before:**
```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3490dc',
      }
    }
  }
}
```

**After:**
```javascript
export default () => ({
  theme: {
    extend: {
      colors: {
        primary: window.brandColor || '#3490dc', // Now dynamic!
      }
    }
  }
})
```

### From CommonJS to Functional CommonJS

**Before:**
```javascript
module.exports = {
  theme: {
    extend: {
      spacing: {
        '128': '32rem',
      }
    }
  }
}
```

**After:**
```javascript
module.exports = function() {
  const isMobile = window.innerWidth < 768;

  return {
    theme: {
      extend: {
        spacing: {
          '128': isMobile ? '16rem' : '32rem', // Responsive!
        }
      }
    }
  };
}
```

### From CommonJS to ESM

**Before:**
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#ff6b6b'
      }
    }
  }
}
```

**After:**
```javascript
export default {
  theme: {
    extend: {
      colors: {
        brand: '#ff6b6b'
      }
    }
  }
}
```

---

## Best Practices

### 1. Use Static Configs When Possible

Static configs (ESM, CommonJS) are:
- ✅ Easier to cache
- ✅ Faster to process
- ✅ Easier to debug
- ✅ Better for code splitting

**Good:**
```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3490dc'
      }
    }
  }
}
```

**Avoid unless needed:**
```javascript
export default () => ({
  theme: {
    extend: {
      colors: {
        primary: '#3490dc' // Same result but slower
      }
    }
  }
})
```

### 2. Functional Configs: Memoize Expensive Calculations

**Bad:**
```javascript
export default () => {
  // This runs on EVERY compilation!
  const expensiveCalculation = Array.from({ length: 1000 })
    .map((_, i) => i * Math.random())
    .reduce((a, b) => a + b);

  return { theme: { /* ... */ } };
}
```

**Good:**
```javascript
// Calculate once and cache
let cachedConfig = null;

export default () => {
  if (cachedConfig) return cachedConfig;

  const expensiveCalculation = Array.from({ length: 1000 })
    .map((_, i) => i * Math.random())
    .reduce((a, b) => a + b);

  cachedConfig = { theme: { /* ... */ } };
  return cachedConfig;
}
```

### 3. Use ESM for Modern Projects

**Recommended:**
```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3490dc',
      }
    }
  }
}
```

**Only use CommonJS if:**
- Working with legacy codebase
- Need Node.js-specific features
- Required by build tooling

### 4. Functional Configs: Keep Logic Simple

**Bad:**
```javascript
export default () => {
  // Too much logic, hard to debug
  const colors = fetch('/api/theme')
    .then(res => res.json())
    .then(data => data.colors);

  return { theme: { extend: { colors } } };
}
```

**Good:**
```javascript
export default () => {
  // Pre-loaded data, simple logic
  const colors = window.__THEME_COLORS__ || {
    primary: '#3490dc'
  };

  return { theme: { extend: { colors } } };
}
```

---

## Troubleshooting

### Error: "Config could not be loaded"

**Check:**
1. Syntax errors in your config
2. Missing return statement (functional configs)
3. Invalid JavaScript

### Error: "require is not fully supported"

**Solution:**
Don't use `require()` for external modules in browser configs. Instead:

```javascript
// ❌ Don't do this
module.exports = {
  plugins: [
    require('@tailwindcss/typography') // Won't work in browser
  ]
}

// ✅ Do this instead
export default {
  plugins: [
    // Use CDN URLs for browser
    'https://cdn.jsdelivr.net/npm/@tailwindcss/typography@latest/dist/index.js'
  ]
}
```

### Functional Config Not Running

**Check:**
1. Function syntax is correct
2. Function returns an object
3. No async/await (not supported yet)

```javascript
// ❌ Won't work - async not supported
export default async () => {
  const data = await fetch('/api/theme');
  return data.json();
}

// ✅ Works - synchronous
export default () => {
  const data = window.__THEME_DATA__;
  return { theme: { extend: data } };
}
```

---

## Testing Your Config

Use the included test suite to verify your config format:

```bash
# Open test file in browser
open test-config-formats.html
```

Or test programmatically:

```javascript
// Test your config
const myConfig = `export default { theme: { extend: { colors: { test: '#ff0000' } } } }`;

window.tailwindify(['bg-test'], '', myConfig)
  .then(result => {
    console.log('✅ Config works!', result);
  })
  .catch(error => {
    console.error('❌ Config failed:', error);
  });
```

---

## Summary

Winden supports all major Tailwind config formats:

1. **ESM** - Modern, static configs (recommended)
2. **CommonJS** - Legacy, Node.js-style configs
3. **Functional ESM** - Dynamic, runtime-calculated configs
4. **Functional CommonJS** - Legacy dynamic configs

Choose based on your needs:
- **Simple project?** → ESM
- **Need dynamic theming?** → Functional ESM
- **Legacy codebase?** → CommonJS
- **Node.js build tools?** → Functional CommonJS

All formats work seamlessly with automatic detection - just write your config and Winden handles the rest!

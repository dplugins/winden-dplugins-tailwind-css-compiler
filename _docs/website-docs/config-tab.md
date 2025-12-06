# Config Tab (Legacy)

The Config Tab is for **JavaScript-based Tailwind configuration**.

**⚠️ We strongly recommend using the Style Tab instead** - it's faster, simpler, and uses the modern CSS `@theme` directive.

---

## When to Use Config Tab

Only use the Config Tab if you:
1. **Have existing JavaScript config** from another project you want to copy
2. **Absolutely prefer JavaScript** over CSS (though CSS is better)

**For everyone else:** Use the **Wizard** (visual) or **Style Tab** (CSS).

---

## JavaScript Config Format

The Config Tab uses **ESM (ES Modules)** syntax, not CommonJS:

### ✅ Correct - Use `export default`

```javascript
export default {
    theme: {
        extend: {
            colors: {
                brand: '#6366f1',
                accent: '#f59e0b'
            }
        }
    }
};
```

### ❌ Wrong - Don't use `module.exports`

```javascript
module.exports = {  // ❌ This won't work!
    theme: {
        extend: {
            colors: {
                brand: '#6366f1'
            }
        }
    }
};
```

**Why ESM?** Winden compiles in the browser, which uses modern ESM syntax. `module.exports` is Node.js/CommonJS syntax and won't work in the browser.

---

## Config Tab vs Style Tab vs Wizard

| What You Want | Use This |
|---------------|----------|
| **Visual color/spacing builder** | Wizard (easiest!) |
| **Write CSS @theme config** | Style Tab (recommended) |
| **Copy existing JS config** | Config Tab (legacy) |

### Example: Same Thing, Three Ways

**Wizard (Visual - No Code):**
1. Go to Wizard → Colors
2. Add color "brand" → #6366f1
3. Done!

**Style Tab (CSS - Recommended):**
```css
@theme {
  --color-brand: #6366f1;
  --color-accent: #f59e0b;
}
```

**Config Tab (JavaScript - Legacy):**
```javascript
export default {
    theme: {
        extend: {
            colors: {
                brand: '#6366f1',
                accent: '#f59e0b'
            }
        }
    }
};
```

All three do the same thing, but Wizard and Style Tab are easier!

---

## Common Config Tab Use Cases

### Colors

```javascript
export default {
    theme: {
        extend: {
            colors: {
                primary: '#3b82f6',
                secondary: '#8b5cf6',
                danger: '#ef4444'
            }
        }
    }
};
```

**Better in Style Tab:**
```css
@theme {
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-danger: #ef4444;
}
```

### Spacing

```javascript
export default {
    theme: {
        extend: {
            spacing: {
                '128': '32rem',
                '144': '36rem'
            }
        }
    }
};
```

**Better in Style Tab:**
```css
@theme {
  --spacing-128: 32rem;
  --spacing-144: 36rem;
}
```

### Font Families

```javascript
export default {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Merriweather', 'serif']
            }
        }
    }
};
```

**Better in Style Tab:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter&family=Merriweather&display=swap');

@theme {
  --font-family-sans: 'Inter', sans-serif;
  --font-family-serif: 'Merriweather', serif;
}
```

### Breakpoints

```javascript
export default {
    theme: {
        extend: {
            screens: {
                'tablet': '768px',
                'desktop': '1024px'
            }
        }
    }
};
```

**Better in Wizard:** Go to Wizard → Breakpoints and add them visually!

**Or in Style Tab:**
```css
@theme {
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
}
```

---

## Loading Plugins in Config Tab

If you must use the Config Tab, here's how to load plugins:

### Built-in Plugins (Already Included)

```javascript
export default {
    plugins: [
        // These are built-in - no import needed!
        '@tailwindcss/typography',
        '@tailwindcss/forms',
        '@tailwindcss/container-queries'
    ]
};
```

**Note:** You don't actually need to list built-in plugins - they're already available. Just use them in your HTML!

### CDN Plugins (Advanced)

```javascript
export default {
    plugins: [
        await import('https://esm.run/daisyui@5'),
        await import('https://unpkg.com/@tailwindcss/line-clamp@latest')
    ]
};
```

**⚠️ Important:** You MUST use `await import()` for CDN plugins in Config Tab.

**Better in Style Tab:**
```css
@plugin "https://esm.run/daisyui@5";
@plugin "https://unpkg.com/@tailwindcss/line-clamp@latest";
```

No `await`, no `import()` - just the URL!

---

## Why Style Tab is Better

1. **Simpler syntax** - No `export default`, no `await import()`
2. **Faster** - Native CSS parsing, no JavaScript execution
3. **Autocomplete** - Style Tab has autocomplete, Config Tab doesn't
4. **SCSS support** - Style Tab compiles SCSS automatically
5. **Multi-tab** - Organize CSS into multiple tabs
6. **Modern** - `@theme` is the official Tailwind v4 way
7. **Error messages** - Better error handling in Style Tab

---

## Migrating from Config Tab to Style Tab

If you have JavaScript config and want to switch:

**JavaScript (Config Tab):**
```javascript
export default {
    theme: {
        extend: {
            colors: {
                brand: '#6366f1'
            },
            spacing: {
                huge: '5rem'
            }
        }
    }
};
```

**CSS (Style Tab):**
```css
@theme {
  --color-brand: #6366f1;
  --spacing-huge: 5rem;
}
```

Just convert `theme.extend.colors.name` → `--color-name`!

---

## Common Config Tab Issues

### Issue: `module.exports` not working

**Problem:**
```javascript
module.exports = {  // ❌ Wrong syntax
    theme: { ... }
};
```

**Solution:**
```javascript
export default {  // ✅ Correct syntax
    theme: { ... }
};
```

**Why?** Winden uses browser-based compilation which requires ESM syntax.

### Issue: Plugin not loading

**Problem:**
```javascript
plugins: [
  import('https://esm.run/daisyui@5')  // ❌ Missing await
]
```

**Solution:**
```javascript
plugins: [
  await import('https://esm.run/daisyui@5')  // ✅ With await
]
```

**Better solution:** Use Style Tab with `@plugin` directive!

### Issue: Replacing all Tailwind colors

**Problem:**
```javascript
theme: {
  colors: {  // ❌ Replaces ALL Tailwind colors
    brand: '#6366f1'
  }
}
```

**Solution:**
```javascript
theme: {
  extend: {  // ✅ Extends Tailwind colors
    colors: {
      brand: '#6366f1'
    }
  }
}
```

---

## Quick Questions

**Q: Should I use Config Tab or Style Tab?**
Style Tab! It's simpler, faster, and the recommended approach.

**Q: Can I use both Config Tab and Style Tab?**
Yes, but not recommended. If both have values, they might conflict.

**Q: Why can't I use `module.exports`?**
Because Winden compiles in the browser using ESM syntax. `module.exports` is Node.js syntax.

**Q: Do plugins work in Config Tab?**
Yes, but you need `await import()` for CDN plugins. Style Tab is easier - just use `@plugin "url"`.

**Q: Can I copy my old Tailwind config here?**
Maybe. If it uses `module.exports`, change it to `export default`. If it uses Node.js-specific code, it won't work.

---

## What's Next?

- **Style Tab** - Modern CSS-based configuration (recommended!)
- **Wizard Tab** - Visual design token builder (easiest!)
- **Production Settings** - Optimize for speed

The Config Tab works, but it's the old way. Give the Style Tab a try - you'll love it!

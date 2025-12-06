# Wizzard Border Radius: Perfect Rounded Corners

**Visual controls generate perfect border radius scales automatically.**

---

## Structure Overview

Border Radius follows the same structure as [Font Sizes](wizard-font-sizes.md):
- **Wizard Mode** - Auto-calculated with aspect ratios, min/max values, steps
- **Manual Mode** - Per-step control with comma-separated names
- **Fluid vs Fixed** - Viewport scaling or single value
- **Pixels vs Rems** - Figma-compatible input, accessible output
- **Extend Defaults** - Add to or replace Tailwind defaults

---

## Key Differences from Font Sizes

### 1. Utility Values

Click **"Add Utility Radius"** → Adds:
- `none` (0) - Sharp corners
- `full` (9999px) - Perfect circles/pill shape

**Use cases**:
```html
<div class="rounded-none">Sharp corners</div>
<button class="rounded-full">Pill button</button>
<img class="rounded-full" src="avatar.jpg" />
```

---

### 2. Builder Integration

**Note**: Most visual builders don't have border radius systems to import (unlike font sizes).

You cannot fetch border radius from Gutenberg/Bricks/Oxygen. Define your radius scale manually.

---

### 3. Recommended Aspect Ratio

For border radius, **1.5 (Perfect Fifth)** is recommended:
- **1.5** (Perfect Fifth) - Balanced, recommended
- **1.333** (Perfect Fourth) - Moderate jumps
- **1.618** (Golden Ratio) - Harmonious scaling
- **2.0** (Double) - Dramatic jumps

---

### 4. Usage Examples

**Basic rounded corners**:
```html
<div class="rounded">Base border radius</div>
<div class="rounded-sm">Small border radius</div>
<div class="rounded-lg">Large border radius</div>
```

**Specific corners**:
```html
<div class="rounded-t-lg">Top corners large</div>
<div class="rounded-r-lg">Right corners large</div>
```

**Individual corners**:
```html
<div class="rounded-tl-lg">Top-left large</div>
<div class="rounded-br-lg">Bottom-right large</div>
```

**Pills and circles**:
```html
<button class="rounded-full">Pill button</button>
<img class="rounded-full" src="avatar.jpg" />
```

---

## Common Use Cases

### Buttons
```html
<button class="rounded-lg">Primary Button</button>
<button class="rounded-full">Pill Button</button>
```

### Cards
```html
<div class="rounded-xl">Card with large radius</div>
```

### Avatars
```html
<img class="rounded-full" src="avatar.jpg" />
```

### Inputs
```html
<input class="rounded-md" type="text" />
```

### Tags/Badges
```html
<span class="rounded-full">Badge</span>
```

---

## Example Scale

**Wizard Settings**:
- Aspect ratio: 1.5
- Base radius: 8px to 12px
- Screen sizes: 375px to 1440px
- Steps: 7

**Generated Output**:
```css
@theme {
  --radius-sm: clamp(0.25rem, 0.219rem + 0.156vw, 0.344rem);    /* 4px → 5.5px */
  --radius: clamp(0.5rem, 0.438rem + 0.313vw, 0.688rem);        /* 8px → 11px */
  --radius-md: clamp(0.75rem, 0.656rem + 0.469vw, 1.031rem);    /* 12px → 16.5px */
  --radius-lg: clamp(1.125rem, 0.984rem + 0.703vw, 1.547rem);   /* 18px → 24.75px */
  --radius-xl: clamp(1.688rem, 1.477rem + 1.055vw, 2.32rem);    /* 27px → 37.13px */
  --radius-full: 9999px;  /* Perfect circle/pill */
}
```

---

## FAQ

**Q: Wizard or manual?**
A: Wizard for most projects, manual for exact design systems.

**Q: Extend or replace defaults?**
A: Replace for production (cleaner autocomplete).

**Q: How many steps?**
A: 5-7 for most projects (none, sm, base, lg, xl, 2xl, full).

**Q: Fixed or fluid?**
A: Fluid for modern responsive design (optional for border radius).

**Q: What's the difference between rounded-lg and rounded-xl?**
A: Each step is larger by the aspect ratio (1.5x by default).

**Q: Can I import border radius from builders?**
A: No. Most visual builders don't have border radius systems (unlike font sizes).

---

**Your professional border radius system starts here.**

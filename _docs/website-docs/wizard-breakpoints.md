# Wizzard Breakpoints: Responsive Design Made Simple

**Define custom breakpoints with visual controls.**

---

## Load Preset or Add Manually

### Quick Start: Load Preset

Click **"Load Preset"** → Choose from 3 preset options:

**Preset 1: mob, tab, desk**

| Name | Value | Device |
|------|-------|--------|
| `mob` | `768px` | Mobile |
| `tab` | `1024px` | Tablet |
| `desk` | `1440px` | Desktop |

**Preset 2: mobile, tablet, desktop**

| Name | Value | Device |
|------|-------|--------|
| `mobile` | `768px` | Mobile |
| `tablet` | `1024px` | Tablet |
| `desktop` | `1440px` | Desktop |

**Preset 3: sm, md, lg, xl**

| Name | Value | Device |
|------|-------|--------|
| `sm` | `640px` | Small tablets |
| `md` | `768px` | Tablets |
| `lg` | `1024px` | Laptops |
| `xl` | `1280px` | Desktops |

---

### Add Breakpoint Manually

Each breakpoint requires **name** and **value**:

1. Click **"Add Breakpoint"**
2. **Name**: `tablet` (becomes `tablet:` prefix)
3. **Value**: Screen width (e.g., `768px`)
4. Save

**Result**: `tablet:flex`, `tablet:hidden`, etc. available.

---

## Min and Max Breakpoints

Tailwind v4 manages both directions automatically:

**Min-width** (default):
```html
<div class="tablet:flex">Shows flex on tablet and up</div>
```

**Max-width** (Tailwind v4):
```html
<div class="max-tablet:hidden">Hidden on tablet and down</div>
```

**No "Desktop First" toggle needed** - Tailwind v4 handles both with `min-` and `max-` prefixes.

---

## Example Usage

```html
<div class="hidden md:block lg:flex">
  Hidden on mobile, block on tablet, flex on laptop+
</div>
```

---

## Extend vs Replace Tailwind Defaults

**Extend** (Default): Your breakpoints + Tailwind defaults

**Replace**: Only your custom breakpoints

Toggle: Settings tab → **"Extend Breakpoints"** → OFF

**Why replace?**
- ✅ Cleaner autocomplete
- ✅ Enforce design system
- ✅ Match your exact screen sizes

---

## More Examples

**Mobile-first** (min-width):
```html
<div class="text-sm md:text-base lg:text-lg">
  Small text on mobile, base on tablet, large on laptop
</div>
```

**Desktop-first** (max-width):
```html
<div class="block max-md:hidden">
  Block by default, hidden on tablet and down
</div>
```

**Range** (between breakpoints):
```html
<div class="md:block max-lg:flex">
  Block on tablet, flex between tablet and laptop
</div>
```

---

## FAQ

**Q: How many breakpoints should I add?**
A: 3-5 breakpoints (mobile, tablet, laptop, desktop, large).

**Q: What happened to "Desktop First" mode?**
A: Tailwind v4 handles both mobile-first (`md:`) and desktop-first (`max-md:`) automatically. No toggle needed.

**Q: Pixels or rems for breakpoints?**
A: Either works. Pixels are more common (`768px`). Rems respect browser zoom (`48rem`).

**Q: Should I extend or replace defaults?**
A: Extend for most projects. Replace if you have exact screen sizes to match.

---

**Your professional responsive system starts here.**

# Wizzard Font Family: Typography Made Simple

**Add custom fonts with visual controls.**

---

## Start Fresh or Load Preset

When you activate **Font Family**, you start with a **clean slate** - no default fonts.

### Quick Start: Load Preset

Click **"Load Preset"** → Choose from 2 options:

**Preset 1: System Fonts**
- `sans`, `serif`, `mono` - System font stacks

**Preset 2: Google Fonts**
- `sans` (Inter), `serif` (Merriweather), `mono` (JetBrains Mono)

---

## Add Font Family

Each font requires **name** and **value**:

1. Click **"Add Font Family"**
2. **Name**: `body` (becomes `font-body` class)
3. **Value**: Font stack (e.g., `'Inter', sans-serif`)
4. Save

---

## Font Value Examples

**System fonts**:
```css
ui-sans-serif, system-ui, sans-serif
```

**Google Fonts**:
```css
'Inter', sans-serif
```

**Custom fonts**:
```css
'YourFont', -apple-system, sans-serif
```

---

## Import from Page Builders

1. Click **"Builder Integrations"**
2. Select builder (Bricks/Oxygen/Gutenberg/FSE)
3. Click **"Fetch Font Families"** → **"Import"**

**Result**: All builder fonts available as Tailwind classes.

---

## Extend vs Replace Defaults

**Extend** (Default): Your fonts + Tailwind defaults

**Replace**: Only your custom fonts

Toggle: Settings tab → **"Extend Font Family"** → OFF

**Why replace?**
- ✅ Cleaner autocomplete
- ✅ Enforce design system

---

## Usage

```html
<p class="font-body">Body text</p>
<h1 class="font-heading">Heading text</h1>
<code class="font-mono">Code</code>
```

---

## FAQ

**Q: How many fonts should I add?**
A: 2-3 fonts (body, heading, optional mono).

**Q: What's the difference between name and value?**
A: **Name** = class name (`font-body`). **Value** = font stack (`'Inter', sans-serif`).

**Q: Can I import fonts from builders?**
A: Yes! Import from Gutenberg, Bricks, or Oxygen.

---

**Your professional typography system starts here.**

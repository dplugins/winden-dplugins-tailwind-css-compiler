# Wizzard Colors: Build Color Systems Fast

**Pick a color → Get 10 perfect shades automatically.**

---

## Start Fresh or Load Preset

When you activate **Colors**, you start with a **clean slate** - no default colors.

### Quick Start: Load Preset

Click **"Load Preset"** → Get 3 colors instantly:
- **Neutral** (gray with 10 shades)
- **Primary** (brand color with 10 shades)
- **Secondary** (accent color with 10 shades)

**Result**: 33 color utilities instantly.

---

## Three Ways to Add Colors

### 1. Add Color Manually

1. Click **"Add Color"**
2. Name: `brand`
3. Pick color: `#3b82f6`
4. **Shades enabled by default** (10 automatic shades)
5. Save

**Result**: `brand-50` through `brand-950` ready to use.

```html
<button class="bg-brand-500 hover:bg-brand-600">
  Button with auto-generated shades
</button>
```

---

### 2. Import from Page Builders

Already designed in Bricks/Oxygen/Elementor? Import those colors:

1. Click **"Builder Integrations"**
2. Select builder (Bricks/Oxygen/Elementor/FSE)
3. Click **"Fetch Colors"**
4. Click **"Import"**

**Result**: All builder colors now available as Tailwind classes with autocomplete.

**Benefit**: One unified color system across all builders.

---

### 3. Add Utility Colors

Click **"Add Utility Colors"** → Instantly adds:
- `black`, `white`, `transparent`, `inherit`, `current`

---

## Customize Shades

Click the **shade icon** next to any color to customize:

### Options

1. **Number of Shades** (1-20)
   - Default: 10
   - Change to 5 for minimal, 15 for granular

2. **Lightest/Darkest Points**
   - Control shade range
   - Adjust for more/less contrast

3. **Enable/Disable Individual Shades**
   - Only generate shades you use
   - **Prevents bloat** - cleaner autocomplete

4. **Custom Shade Names**
   - Override `100, 200, 300` with `light, medium, dark`
   - Each shade can have unique name

5. **Manual Overrides**
   - Click any shade → Pick exact color
   - Match brand guidelines precisely

**Example**: Only need `500`, `600`, `700`? Disable the other 7 shades.

---

## Disable Shades Completely

Need one solid color without shades?

1. Toggle **"Enable Shades"** → OFF
2. Save

**Result**: Just `bg-accent` (no `-50`, `-100`, etc.).

---

## Extend vs. Replace Default Colors

### Extend Mode (Default)

Your colors **added to** Tailwind defaults.

**Available**: `bg-red-500` (Tailwind) + `bg-brand-500` (yours)

---

### Replace Mode

Toggle **"Extend Colors"** → OFF (Settings tab)

**Result**: Only your custom colors exist. Tailwind defaults removed.

**Why use this?**
- ✅ Cleaner autocomplete (10 colors vs. 200+)
- ✅ Enforce design system
- ✅ Smaller CSS output

```css
@theme {
  --color-*: initial;  /* Remove defaults */
  --color-brand-500: #3b82f6;  /* Only yours */
}
```

---

## Quick Workflows

### E-commerce Site

1. Add colors: `primary`, `secondary`, `success`, `danger`
2. Click "Add Utility Colors"
3. Settings → "Extend Colors" → OFF
4. Save

**Result**: 45+ utilities, no Tailwind defaults.

---

### Import Bricks + Custom

1. Builder Integrations → Bricks → Fetch → Import
2. Add Color → `highlight`
3. Save

**Result**: All Bricks colors + custom highlight available everywhere.

---

## Export & Share

### Export
Backups tab → Export → Download JSON

**Use for**: Team sharing, multi-site deployment, version control

### Import
Backups tab → Import → Select JSON

---

## Autocomplete

All colors **automatically available** in builder autocomplete:

**Enable in Settings**:
- Gutenberg/FSE
- Bricks
- Oxygen
- Elementor

Type `bg-pr` → See `bg-primary-50`, `bg-primary-100`, etc.

---

## Advanced

### OKLCH Color Support
Any CSS color format works:
- Hex: `#3b82f6`
- RGB: `rgb(59, 130, 246)`
- HSL: `hsl(217, 91%, 60%)`
- OKLCH: `oklch(67% 0.15 240)`

---

## FAQ

**Q: How many colors should I create?**
**A**: 3-7 colors (primary, secondary, neutral, success, warning, danger).

**Q: Extend or replace Tailwind defaults?**
**A**: Prototyping = Extend. Production = Replace.

**Q: Can I mix shaded and non-shaded colors?**
**A**: Yes! Toggle "Enable Shades" per color.

**Q: How do I match exact brand colors?**
**A**: Expand shade settings → Manually override the `500` shade.

---

## Best Practices

1. **Start with neutrals** (80% of UI uses grays)
2. **Use semantic names** (`success`, not `green`)
3. **Disable unused shades** (cleaner output)
4. **Export before changes** (backup = safety net)
5. **Import builder colors** (one unified system)

---

## Next Steps

1. Open Winden → Wizzard → Colors tab
2. Create your first color
3. Enable shades → Get 10 perfect shades
4. Start designing

**You'll never manually configure colors again.**

# Wizzard Settings Tab: Feature Management

**Control which Wizzard features are active.**

---

## Enable/Disable Features

Toggle features on or off:

- **Colors** - Color palette management
- **Font Sizes** - Typography scale
- **Font Family** - Custom fonts
- **Spacing** - Spacing scale
- **Border Radius** - Rounded corners
- **Breakpoints** - Responsive breakpoints

**Result:** Only enabled features appear in Wizzard tabs and generate CSS.

---

## Extend vs Replace

For each feature, control how it interacts with Tailwind defaults:

**Extend** (Default): Your tokens + Tailwind defaults
**Replace**: Only your custom tokens

Toggle **"Extend [Feature]"** → OFF to replace defaults.

**Why replace?**
- ✅ Cleaner autocomplete
- ✅ Enforce design system
- ✅ Smaller CSS output

---

## Preview Generated Config

See the generated `@theme` CSS configuration at the bottom of Settings tab.

**Shows:**
- All active design tokens
- CSS custom properties
- Wildcard resets (when replace mode active)

**Use for:**
- Verify configuration output
- Debug design tokens
- Copy raw CSS if needed

---

**Control your design system from one place.**

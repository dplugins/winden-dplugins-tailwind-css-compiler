# Wizzard Backups: Save & Restore Settings

**Export, import, and manage your Wizzard configurations.**

---

## Reset to Factory Settings

Click **"Reset to Factory Settings"** → Restores all Wizzard tabs to default state.

**What gets reset:**
- All colors, font sizes, spacing, border radius, font families, breakpoints
- Returns to clean slate (as if you just activated Wizzard)

**Use when:** Starting fresh or fixing broken configurations.

---

## Export Current State

### Export as JSON

Click **"Export Current State"** → Downloads JSON file with all current Wizzard settings.

**File name:** `wizzard-backup-[date].json`

**Contains:**
- All active design tokens (colors, spacing, fonts, etc.)
- Current settings and configurations
- Exact snapshot of your Wizzard state

**Use cases:**
- Share configurations with team
- Move settings between sites
- Keep local backup before major changes

---

## Import Wizard State

### Drag & Drop Import

**In Sidebar:**
1. Drag JSON file onto **"Import Wizard"** area
2. Drop to upload
3. Confirm import

**Result:** All Wizzard settings replaced with imported configuration.

**Or click to browse:**
1. Click **"Import Wizard"**
2. Select JSON file
3. Confirm import

---

## Manage Backups

### Create Backup

**In main area:**
1. Click **"Create Backup"**
2. Enter backup name (e.g., "Before redesign")
3. Save

**Result:** Current Wizzard state saved to database.

---

### Backup List

All saved backups appear in the main area:

**Each backup shows:**
- Backup name
- Creation date
- Actions: Load, Rename, Export, Delete

---

### Backup Actions

**Load Backup:**
1. Click **"Load"** on backup
2. Confirm
3. Wizzard restored to that backup state

**Rename Backup:**
1. Click **"Rename"**
2. Enter new name
3. Save

**Export Backup:**
1. Click **"Export"**
2. Downloads as JSON file
3. Share or store externally

**Delete Backup:**
1. Click **"Delete"**
2. Confirm removal
3. Backup removed from database

---

## Quick Workflows

### Workflow 1: Before Major Changes

1. Create Backup → "Before redesign"
2. Make changes in Wizzard
3. If something breaks → Load Backup → "Before redesign"

**Result:** Safe experimentation with rollback option.

---

### Workflow 2: Share Settings with Team

1. Export Current State → `wizzard-backup.json`
2. Share file with team
3. Team imports via drag & drop

**Result:** Identical design system across all sites.

---

### Workflow 3: Move Between Staging/Production

1. **Staging:** Create Backup → Export as JSON
2. **Production:** Import JSON via drag & drop
3. Verify settings loaded correctly

**Result:** Consistent design tokens across environments.

---

## Best Practices

1. **Create backup before experiments** (easy rollback)
2. **Name backups descriptively** ("V2 Launch", "Client Approved")
3. **Export important configs** (local safety copy)
4. **Clean old backups** (keep database tidy)
5. **Test imports on staging first** (avoid production issues)

---

## FAQ

**Q: What's the difference between Export and Create Backup?**
A: **Export** downloads JSON file (external). **Create Backup** saves to database (internal).

**Q: Can I import backups from other Winden sites?**
A: Yes! Export from one site, import to another.

**Q: Does Reset delete my backups?**
A: No. Reset only affects current Wizzard state. Saved backups remain in database.

**Q: What happens if I import over existing settings?**
A: Import replaces all current Wizzard settings. Create backup first if you want to keep current state.

**Q: Can I edit JSON files manually?**
A: Yes, but not recommended. Use Wizzard interface to avoid errors.

---

**Your design system, backed up and portable.**

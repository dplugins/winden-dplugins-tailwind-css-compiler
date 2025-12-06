# Winden Migration System

This document describes the automatic migration system that handles upgrades from older versions of Winden.

## Overview

The migration system automatically detects version changes and performs necessary cleanup and configuration updates to ensure smooth upgrades.

## How It Works

### Automatic Detection

The migration handler runs on every `admin_init` hook and checks:

1. **Stored version** (`winden_version` option in database)
2. **Current version** (defined in `Migration.php`)
3. **Version comparison** - If stored < current, migration runs

### Migration Process

```
User updates plugin
        ↓
admin_init hook fires
        ↓
Migration::checkMigration()
        ↓
Version comparison
        ↓
    Is upgrade needed?
    ↙           ↘
  YES            NO
   ↓              ↓
Run migrations   Exit
   ↓
Update version
```

## Migration: 2.8.x → 2.9.0

### Issues Fixed

**Problem**: Users upgrading from versions before 2.9.0 may have:
- Corrupted cache with CSS syntax errors
- Old configuration format (array with 'name' keys)
- Missing Wizzard configuration

**Solution**: The `migrateTo290()` method:

1. ✅ **Clears old cache**
   - Deletes `winden_cache` option
   - Removes `output.css` file
   - Forces fresh CSS compilation

2. ✅ **Converts old config format**
   - Detects old array format with 'name' keys
   - Extracts `input.css` → `scss` property
   - Extracts `tailwind.config.js` → `javascript` property
   - Creates new unified config structure

3. ✅ **Ensures Wizzard config exists**
   - Adds default Wizzard configuration if missing
   - Prevents undefined property errors

### Log Output

Migration logs are written to PHP error log:

```
[Winden Migration] Upgrading from version 2.8.3 to 2.9.0
[Winden Migration] Running migration to 2.9.0
[Winden Migration] ✅ Old cache cleared
[Winden Migration] ✅ output.css file deleted
[Winden Migration] Detected old configuration format, converting...
[Winden Migration] ✅ Configuration converted to new format
[Winden Migration] ✅ Migration to 2.9.0 completed
```

## File Structure

```
App/
├── Helpers/
│   ├── Migration.php           # Migration handler class
│   └── WordPressLoader.php     # Dynamic WordPress loading utility
├── Utilities/
│   ├── clear-cache.php         # Manual cache clearing script
│   └── test-migration.php      # Migration testing script
└── App.php                     # Initializes migration on construct
```

## Code Location

**Migration Handler**: [App/Helpers/Migration.php](App/Helpers/Migration.php)

**Key Methods**:
- `checkMigration()` - Runs on admin_init, checks version
- `runMigration($from_version)` - Orchestrates migration based on version
- `migrateTo290()` - Specific migration for 2.9.0
- `convertOldConfig()` - Converts old config format
- `getDefaultWizzardConfig()` - Returns default Wizzard settings

## Adding New Migrations

### For Future Versions (e.g., 3.0.0)

1. **Update CURRENT_VERSION constant**:
```php
const CURRENT_VERSION = '3.0.0';
```

2. **Add version check in runMigration()**:
```php
private function runMigration($from_version)
{
    error_log('[Winden Migration] Upgrading from version ' . $from_version . ' to ' . self::CURRENT_VERSION);

    // Existing migrations
    if (version_compare($from_version, '2.9.0', '<')) {
        $this->migrateTo290();
    }

    // NEW: Add your migration
    if (version_compare($from_version, '3.0.0', '<')) {
        $this->migrateTo300();
    }
}
```

3. **Create migration method**:
```php
/**
 * Migration to version 3.0.0
 *
 * Description of what this migration does
 */
private function migrateTo300()
{
    error_log('[Winden Migration] Running migration to 3.0.0');

    // Your migration logic here
    // Example: Update new settings, clear specific cache, etc.

    error_log('[Winden Migration] ✅ Migration to 3.0.0 completed');
}
```

### Migration Best Practices

1. ✅ **Always log migration steps** - Use `error_log()` for debugging
2. ✅ **Be defensive** - Check if data exists before converting
3. ✅ **Preserve user data** - Only clear cache/temp data, not user configurations
4. ✅ **Test with old data** - Test migrations with actual old database exports
5. ✅ **Make it idempotent** - Migration should be safe to run multiple times

### Testing Migrations

**Reset version to test migration**:
```php
// In WordPress admin or WP-CLI
delete_option('winden_version');
// Or set to specific version
update_option('winden_version', '2.8.0');
```

Then reload admin page to trigger migration.

## User Impact

### What Users See

**No action required** - Migration happens automatically in the background.

**Logs location**:
- Local WP: `~/Local Sites/yoursite/logs/php/error.log`
- Standard WP: `wp-content/debug.log` (if WP_DEBUG_LOG enabled)

### When Migration Fails

If migration fails, users can:

1. **Manual cache clear**: Use the AJAX endpoint:
   ```javascript
   fetch(window.websiteUrl + '/wp-admin/admin-ajax.php', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
           action: 'clear_winden_cache',
           _nonce: window.nonce
       })
   }).then(r => r.json()).then(console.log);
   ```

2. **Check PHP error logs** for migration error messages

3. **Contact support** with error log details

## Benefits

✅ **Automatic** - No user intervention required
✅ **Version-aware** - Only runs necessary migrations
✅ **Logged** - All actions logged for debugging
✅ **Safe** - Preserves user data, only clears cache
✅ **Extensible** - Easy to add new migrations for future versions

## Related Files

- [App/App.php](App/App.php) - Initializes migration
- [App/Admin/SaveContent.php](App/Admin/SaveContent.php) - Cache clearing endpoint
- [App/Admin/GetContent.php](App/Admin/GetContent.php) - Old config format handling

## Version History

| Version | Migration Added | Purpose |
|---------|----------------|---------|
| 2.9.0 | `migrateTo290()` | Clear old cache, convert config format, ensure Wizzard config |

## Future Enhancements

Potential improvements for future versions:

1. **Database table for migration history** - Track which migrations ran and when
2. **Rollback support** - Ability to revert migrations if needed
3. **Admin notice on migration** - Show success message to user
4. **Migration dry-run mode** - Test migrations without applying changes
5. **Batch processing** - For large data migrations with progress bar

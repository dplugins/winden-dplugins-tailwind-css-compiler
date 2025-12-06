# Custom File Paths

Customize where Winden saves its files using WordPress filters.

---

## Default Locations

Files are saved to `wp-content/uploads/winden/`:

| File | Content |
|------|---------|
| `tailwind.config.js` | Config Tab (JS config) |
| `style-tab.css` | Style Tab content only |
| `input.css` | Style Tab + Wizard @theme (for VS Code) |
| `output.css` | Compiled CSS |

---

## Available Filters

```php
// Config Tab content
add_filter('winden_config_file_path', function($path) {
    return get_stylesheet_directory() . '/winden/tailwind.config.js';
});

// Style Tab content
add_filter('winden_scss_file_path', function($path) {
    return get_stylesheet_directory() . '/winden/style-tab.css';
});

// Style Tab + Wizard @theme content
add_filter('winden_input_file_path', function($path) {
    return get_stylesheet_directory() . '/winden/input.css';
});

// Compiled CSS
add_filter('winden_cache_file_path', function($path) {
    return get_stylesheet_directory() . '/winden/output.css';
});
```

---

## Full Example

Add to `functions.php` to copy all files to your theme:

```php
// Copy Winden files to theme directory
add_filter('winden_config_file_path', 'winden_theme_path');
add_filter('winden_scss_file_path', 'winden_theme_path');
add_filter('winden_input_file_path', 'winden_theme_path');
add_filter('winden_cache_file_path', 'winden_theme_path');

function winden_theme_path($path) {
    $dir = get_stylesheet_directory() . '/winden';
    wp_mkdir_p($dir);
    return $dir . '/' . basename($path);
}
```

**Result:** Files copied to `wp-content/themes/your-theme/winden/`

```php
// Copy Winden files to theme root
add_filter('winden_config_file_path', 'winden_theme_path');
add_filter('winden_scss_file_path', 'winden_theme_path');
add_filter('winden_input_file_path', 'winden_theme_path');
add_filter('winden_cache_file_path', 'winden_theme_path');

function winden_theme_path($path) {
    return get_stylesheet_directory() . '/' . basename($path);
}
```

**Result:** Files copied to `wp-content/themes/your-theme/`

---

## Notes

- Files are **copied** to custom location (default location always kept)
- `input.css` is for VS Code Tailwind CSS IntelliSense - point it to this file
- `style-tab.css` is used internally by Winden admin
- Winden reads from database primarily - files are for external tools

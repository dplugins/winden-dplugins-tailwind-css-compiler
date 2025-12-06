## Available Filters

Files are **copied** (default location always kept).

```php
// Config Tab content (tailwind.config.js)
add_filter('winden_config_file_path', function($path) { ... });

// Style Tab content (style-tab.css)
add_filter('winden_scss_file_path', function($path) { ... });

// Style Tab + Wizard @theme (input.css)
add_filter('winden_input_file_path', function($path) { ... });

// Compiled CSS (output.css)
add_filter('winden_cache_file_path', function($path) { ... });
```

## Full Example

Add to `functions.php` to copy all files to your theme root:

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

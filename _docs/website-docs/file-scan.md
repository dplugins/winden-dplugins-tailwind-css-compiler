# File Scan: Automatic Class Discovery

**Find Tailwind classes across your WordPress site automatically.**

---

## How It Works

Select folders in the tree view. Everything inside gets scanned for Tailwind classes.

**Problem**: Tracking classes manually across themes and plugins
**Solution**: Point Winden at your directories and let it find classes automatically

---

## Quick Setup

### 1. Select Folders

Click folders to select them. Selecting a parent folder scans everything inside.

**Smart filtering**: Subfolders are automatically removed (no duplicate scanning).

### 2. Filter File Types

Add extensions to scan only specific formats:

```
php, html, js, jsx, ts, tsx, twig
```

**Leave empty** to scan all files.

### 3. Selected Items List

Shows exactly what will be scanned:

```
plugins/your-plugin/templates     [🗑️]
themes/your-theme/src             [🗑️]
```

Click trash icon to remove. Click **Clear All** to start over.

---

## What Gets Scanned

Winden looks for these patterns in your files:

### HTML/PHP Attributes
```php
class="bg-blue-500 text-white p-4"
```

### React/JSX className
```jsx
className="flex items-center gap-4"
"className": "container mx-auto"
```

### PHP Arrays
```php
['class' => 'bg-gray-100']
['menu_class' => 'flex space-x-4']
['item_classes' => 'text-lg font-bold']
```

**Pattern**: Any PHP array key containing `class` or `classes`:
- `class`, `classes`
- `menu_class`, `item_classes`
- `class_name`, `classes_array`

---

## When It Works

✅ **Scanning ACTIVE**:
- At least one folder selected
- Settings saved
- Selected paths exist on disk

✅ **Runs automatically** on every Winden compilation

---

## When It Doesn't Work

❌ **Scanning DISABLED**:
- No folders selected
- Selected paths don't exist

❌ **Classes NOT found**:
- Dynamic strings: `class="${prefix}-${color}"`
- Database content (only scans files)
- CSS files (looks for HTML attributes, not CSS)

---

## Auto-Ignored

These folders are always skipped:

```
node_modules/, vendor/, .git/, .svn/, dist/, build/
```

---

## Workflows

### Scan Your Theme
1. Select `themes/your-theme`
2. Add file types: `php, js`
3. Save

### Scan a Plugin
1. Select `plugins/your-plugin/templates`
2. Add file types: `php, twig`
3. Save

---

## Developer Hook

Add custom crawlers using the `winden_register_crawlers` filter to scan classes from any source: database, API, custom formats, etc.

### Basic Example

```php
<?php
// File: mu-plugins/my-custom-crawler.php

use Winden\App\Caching\StringParser;

class ACF_Field_Crawler {
    use StringParser;

    public function classes(): array {
        $classes = [];
        $posts = get_posts(['post_type' => 'any', 'posts_per_page' => -1]);

        foreach ($posts as $post) {
            $custom_classes = get_field('custom_classes', $post->ID);
            if ($custom_classes) {
                $parsed = $this->parseString($custom_classes);
                $classes = array_merge($classes, $parsed);
            }
        }

        return array_unique($classes);
    }
}

add_filter('winden_register_crawlers', function($crawlers) {
    $crawlers[] = new ACF_Field_Crawler();
    return $crawlers;
});
```

### Manual Parsing (Without StringParser)

```php
<?php
class Manual_Classes_Crawler {

    public function classes(): array {
        $classes = [];

        // Hardcoded classes
        $classes[] = 'my-custom-class';

        // From API
        $response = wp_remote_get('https://api.example.com/classes');
        if (!is_wp_error($response)) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            if (isset($body['classes'])) {
                $classes = array_merge($classes, $body['classes']);
            }
        }

        // From database
        global $wpdb;
        $results = $wpdb->get_col("
            SELECT class_name FROM {$wpdb->prefix}my_custom_classes
        ");
        $classes = array_merge($classes, $results);

        // Programmatically generated
        foreach (['red', 'blue', 'green'] as $color) {
            $classes[] = "bg-{$color}-500";
        }

        return array_unique($classes);
    }
}

add_filter('winden_register_crawlers', function($crawlers) {
    $crawlers[] = new Manual_Classes_Crawler();
    return $crawlers;
});
```

### Requirements

1. Have a `classes()` method that returns an array
2. Return unique class names as strings
3. Register via `winden_register_crawlers` filter

**StringParser trait** (optional): Use `$this->parseString($content)` to extract classes with standard Winden patterns.

---

**Select folders to activate scanning. File scanning runs automatically when folders are selected.**

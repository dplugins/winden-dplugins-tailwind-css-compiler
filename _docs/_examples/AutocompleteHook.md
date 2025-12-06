# Winden Autocomplete Integration Guide

This guide explains how other WordPress plugins can integrate Winden's Tailwind CSS autocomplete functionality into their own plugins and settings pages.

## Overview

Winden exposes two types of autocomplete:

1. **Monaco Editor Autocomplete** - For code editing (CSS/SCSS) with context-aware suggestions
2. **Plain Classes Autocomplete** - For HTML class attributes (like `<div class="bg-red-500">`)

Both use the same Tailwind class cache and support WordPress hooks for customization.

## Features

- ✅ Full Tailwind CSS class autocomplete
- ✅ Support for both Tailwind v3 and v4
- ✅ Context-aware suggestions (@apply, @tailwind, @theme, etc.)
- ✅ Responsive breakpoint prefixes (sm:, md:, lg:, etc.)
- ✅ Automatic cache synchronization
- ✅ Extensible with custom classes and suggestions
- ✅ Works with CSS, SCSS, and JavaScript modes
- ✅ HTML class attribute autocomplete for PHP/HTML templates

## Quick Start

Choose the autocomplete type you need:

---

## Option 1: Plain Classes Autocomplete (HTML Class Attributes)

Use this when you want autocomplete for HTML class attributes in your plugin's settings or custom fields.

### Step 1: Request Plain Classes Autocomplete

In your plugin's admin page:

```php
<?php
// In your plugin file

add_action('admin_enqueue_scripts', function($hook) {
    // Only load on your plugin's settings page
    if ($hook !== 'toplevel_page_my-plugin-settings') {
        return;
    }

    // Request Winden's plain classes autocomplete
    do_action('winden_request_plain_classes_autocomplete');
}, 10);
```

### Step 2: Use the Autocomplete Component in React

Now you can use Winden's `WindenAutocompleteWithScreens` component in your React app:

```javascript
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

// Import Winden's autocomplete component
const WindenAutocompleteWithScreens = window.WindenAutocompleteWithScreens;

function MyPluginSettings() {
    const [classes, setClasses] = useState([]);

    return (
        <div>
            <h2>Tailwind Classes</h2>
            <WindenAutocompleteWithScreens
                defaultTags={classes}
                onChange={(tags) => {
                    setClasses(tags);
                    console.log('Classes updated:', tags);
                    // Save to your plugin's settings
                }}
                isDark={false} // Set to true for dark mode
            />
        </div>
    );
}

// Mount your app
const root = createRoot(document.getElementById('my-plugin-root'));
root.render(<MyPluginSettings />);
```

### Step 3: Access Autocomplete Data Directly (Optional)

You can also access the raw autocomplete data:

```javascript
// All available Tailwind classes
const classes = window.winden_autocomplete;
console.log('Available classes:', classes);

// Breakpoint prefixes (sm, md, lg, etc.)
const screens = window.winden_autocomplete_screens;
console.log('Available breakpoints:', screens);

// Use in your own custom autocomplete
function filterClasses(searchTerm) {
    return classes.filter(cls =>
        cls.toLowerCase().includes(searchTerm.toLowerCase())
    );
}
```

---

## Option 2: Monaco Editor Autocomplete (Code Editing)

Use this for CSS/SCSS code editing with Tailwind autocomplete.

### Step 1: Request Monaco Editor

In your plugin's admin page:

```php
<?php
// In your plugin file

add_action('admin_enqueue_scripts', function($hook) {
    // Only load on your plugin's settings page
    if ($hook !== 'toplevel_page_my-plugin-settings') {
        return;
    }

    // Request Winden's Monaco editor
    do_action('winden_request_monaco_editor');
}, 10);
```

### Step 2: Use Monaco Editor in Your React Component

```javascript
import React from 'react';
import Editor from '@monaco-editor/react';

function MyStyleEditor() {
    const [cssContent, setCssContent] = React.useState('');
    const [completionDisposable, setCompletionDisposable] = React.useState(null);

    // Clean up completion provider on unmount
    React.useEffect(() => {
        return () => {
            if (completionDisposable && typeof completionDisposable.dispose === 'function') {
                completionDisposable.dispose();
            }
        };
    }, [completionDisposable]);

    const handleEditorMount = (editor, monaco) => {
        // Check if Winden data is available
        if (!window.windenMonacoData || !window.windenMonacoData.classes) {
            console.warn('Winden autocomplete data not available');
            return;
        }

        const { classes, suggestions, tailwindVersion } = window.windenMonacoData;

        // Register Tailwind autocomplete
        const disposable = monaco.languages.registerCompletionItemProvider('css', {
            provideCompletionItems: function(model, position) {
                const textUntilPosition = model.getValueInRange({
                    startLineNumber: position.lineNumber,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });

                const word = model.getWordUntilPosition(position);
                const trimmedText = textUntilPosition.trim().split(' ')[0].trim();

                // @ directives (like @apply, @tailwind)
                if (trimmedText === '@') {
                    return {
                        suggestions: suggestions.map(suggestion => ({
                            label: suggestion,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: suggestion,
                            range: {
                                startLineNumber: position.lineNumber,
                                endLineNumber: position.lineNumber,
                                startColumn: word.startColumn,
                                endColumn: word.endColumn
                            }
                        }))
                    };
                }

                // Tailwind classes after @apply
                if (suggestions.includes(trimmedText)) {
                    return {
                        suggestions: classes.map(cls => ({
                            label: cls,
                            kind: monaco.languages.CompletionItemKind.Value,
                            insertText: cls,
                            range: {
                                startLineNumber: position.lineNumber,
                                endLineNumber: position.lineNumber,
                                startColumn: word.startColumn,
                                endColumn: word.endColumn
                            }
                        }))
                    };
                }

                return { suggestions: [] };
            }
        });

        setCompletionDisposable(disposable);
        console.log('Winden autocomplete initialized with', classes.length, 'classes');
    };

    return (
        <Editor
            height="600px"
            language="css"
            theme="vs-dark"
            value={cssContent}
            onChange={(value) => setCssContent(value)}
            onMount={handleEditorMount}
            options={{
                selectOnLineNumbers: true,
                minimap: { enabled: false },
                tabSize: 2
            }}
        />
    );
}

export default MyStyleEditor;
```

### Optional: Use the Helper Library

If you want to reuse the integration logic, you can copy the helper from [`examples/monaco-helper-example.js`](examples/monaco-helper-example.js) to your own plugin and use it like this:

```javascript
// After copying the helper to your plugin
import './winden-monaco-helper.js';

const handleEditorMount = (editor, monaco) => {
    if (window.WindenMonacoHelper) {
        const disposable = window.WindenMonacoHelper.initializeAutocomplete(monaco, 'css');
        setCompletionDisposable(disposable);
    }
};
```

## Advanced Usage

### Custom Classes and Suggestions

You can add your own custom classes or @ directives via PHP filters:

```php
// Add custom classes
add_filter('winden_monaco_autocomplete_classes', function($classes) {
    return array_merge($classes, [
        'my-custom-class',
        'another-utility',
        'brand-action'
    ]);
});

// Add custom @ directives
add_filter('winden_monaco_autocomplete_suggestions', function($suggestions) {
    return array_merge($suggestions, [
        '@custom-directive',
        '@my-rule'
    ]);
});
```

Or merge them in JavaScript:

```javascript
const handleEditorMount = (editor, monaco) => {
    const { classes, suggestions } = window.windenMonacoData;

    // Merge with your custom classes
    const allClasses = [...classes, 'my-custom-class', 'brand-action'];
    const allSuggestions = [...suggestions, '@custom-directive'];

    // Register completion provider with merged data
    // ... implementation
};
```

### Filter Classes on the PHP Side

You can also modify the autocomplete data using WordPress filters:

```php
<?php
// Add custom classes to Winden's autocomplete
add_filter('winden_monaco_autocomplete_classes', function($classes) {
    $custom_classes = [
        'my-plugin-action',
        'my-plugin-secondary',
        'custom-utility-class'
    ];
    return array_merge($classes, $custom_classes);
});

// Add custom @ directives
add_filter('winden_monaco_autocomplete_suggestions', function($suggestions) {
    $custom_suggestions = ['@my-custom-directive'];
    return array_merge($suggestions, $custom_suggestions);
});
```

### Multiple Language Support

```javascript
// Register for different languages
monaco.languages.registerCompletionItemProvider('scss', { /* ... */ });
monaco.languages.registerCompletionItemProvider('css', { /* ... */ });
monaco.languages.registerCompletionItemProvider('javascript', { /* ... */ });
```

## API Reference

### JavaScript API

#### `window.windenMonacoData`

The main data object exposed by Winden containing all autocomplete information.

**Properties:**
- `classes` (array) - Array of all available Tailwind class names
- `suggestions` (array) - Array of @ directives (`@apply`, `@tailwind`, etc.)
- `tailwindVersion` (string) - Tailwind version (`'v3'` or `'v4'`)
- `pluginUrl` (string) - URL to Winden plugin directory
- `uploadsUrl` (string) - URL to WordPress uploads directory

**Example:**
```javascript
const { classes, suggestions, tailwindVersion } = window.windenMonacoData;

console.log(`${classes.length} Tailwind classes available`);
console.log(`Tailwind version: ${tailwindVersion}`);
console.log(`Directives:`, suggestions);
```

---

#### `window.winden_autocomplete`

Array of all available Tailwind classes (for plain classes autocomplete).

**Type:** `array`

**Example:**
```javascript
const allClasses = window.winden_autocomplete;
console.log(`${allClasses.length} classes available`);

// Filter classes
const bgClasses = allClasses.filter(cls => cls.startsWith('bg-'));
```

---

#### `window.winden_autocomplete_screens`

Array of breakpoint prefixes (for plain classes autocomplete).

**Type:** `array`

**Example:**
```javascript
const breakpoints = window.winden_autocomplete_screens;
// ['sm', 'md', 'lg', 'xl', '2xl']

// Use with classes
const responsiveClass = `${breakpoints[0]}:text-lg`; // 'sm:text-lg'
```

---

### PHP Hooks

#### `do_action('winden_request_plain_classes_autocomplete')`

Request Winden to enqueue plain classes autocomplete (for HTML class attributes).

**Usage:**
```php
add_action('admin_enqueue_scripts', function($hook) {
    if ($hook === 'my-plugin-settings') {
        do_action('winden_request_plain_classes_autocomplete');
    }
});
```

**What it loads:**
- `window.winden_autocomplete` - Array of all Tailwind classes
- `window.winden_autocomplete_screens` - Array of breakpoint prefixes
- Tailwind compiler for generating autocomplete data

---

#### `do_action('winden_request_monaco_editor')`

Request Winden to enqueue Monaco editor assets and autocomplete data (for code editing).

**Usage:**
```php
add_action('admin_enqueue_scripts', function($hook) {
    if ($hook === 'my-plugin-settings') {
        do_action('winden_request_monaco_editor');
    }
});
```

**What it loads:**
- `window.windenMonacoData` - Autocomplete data object
- `window.WindenMonaco` - Monaco helper library
- Monaco editor integration scripts

---

#### `apply_filters('winden_plain_classes_autocomplete', $classes)`

Filter the plain classes autocomplete array.

**Parameters:**
- `$classes` (array) - Array of Tailwind class names

**Returns:** `array` - Modified array of class names

**Example:**
```php
add_filter('winden_plain_classes_autocomplete', function($classes) {
    // Add your custom classes
    return array_merge($classes, [
        'my-custom-btn',
        'my-custom-card',
        'my-utility-class'
    ]);
});
```

---

#### `apply_filters('winden_plain_classes_screens', $screens)`

Filter the breakpoint prefixes for plain classes autocomplete.

**Parameters:**
- `$screens` (array) - Array of breakpoint names

**Returns:** `array` - Modified array of breakpoint names

**Example:**
```php
add_filter('winden_plain_classes_screens', function($screens) {
    // Add custom breakpoint
    return array_merge($screens, ['3xl', '4xl']);
});
```

---

#### `apply_filters('winden_monaco_autocomplete_classes', $classes)`

Filter the Monaco editor autocomplete classes array.

**Parameters:**
- `$classes` (array) - Array of Tailwind class names

**Returns:** `array` - Modified array of class names

**Example:**
```php
add_filter('winden_monaco_autocomplete_classes', function($classes) {
    return array_merge($classes, ['custom-class-1', 'custom-class-2']);
});
```

---

#### `apply_filters('winden_monaco_autocomplete_suggestions', $suggestions)`

Filter the @ directive suggestions array for Monaco editor.

**Parameters:**
- `$suggestions` (array) - Array of @ directive names

**Returns:** `array` - Modified array of directive names

**Example:**
```php
add_filter('winden_monaco_autocomplete_suggestions', function($suggestions) {
    return array_merge($suggestions, ['@custom-directive']);
});
```

---

## Complete Working Examples

### Example 1: Plain Classes Autocomplete Plugin

This example shows how to create a settings page with HTML class autocomplete:

#### my-plain-classes-plugin.php
```php
<?php
/**
 * Plugin Name: My Plain Classes Plugin
 * Description: Example plugin using Winden plain classes autocomplete
 */

// Add admin menu
add_action('admin_menu', function() {
    add_menu_page(
        'Tailwind Classes',
        'Tailwind Classes',
        'manage_options',
        'my-classes-plugin',
        'my_classes_plugin_render_page',
        'dashicons-admin-appearance'
    );
});

// Enqueue assets
add_action('admin_enqueue_scripts', function($hook) {
    if ($hook !== 'toplevel_page_my-classes-plugin') {
        return;
    }

    // Request Winden's plain classes autocomplete
    do_action('winden_request_plain_classes_autocomplete');

    // Enqueue your React app
    wp_enqueue_script(
        'my-classes-plugin-app',
        plugin_dir_url(__FILE__) . 'build/app.js',
        ['react', 'react-dom', 'wp-element'],
        '1.0.0',
        true
    );

    // Optionally add custom classes
    add_filter('winden_plain_classes_autocomplete', function($classes) {
        return array_merge($classes, [
            'my-custom-button',
            'my-custom-card',
            'site-header',
            'site-footer'
        ]);
    });
});

// Render admin page
function my_classes_plugin_render_page() {
    ?>
    <div class="wrap">
        <h1>Tailwind CSS Classes</h1>
        <div id="my-classes-app-root"></div>
    </div>
    <?php
}

// Save settings
add_action('wp_ajax_save_my_classes', function() {
    check_ajax_referer('my-classes-nonce');

    if (!current_user_can('manage_options')) {
        wp_send_json_error('Unauthorized');
    }

    $classes = isset($_POST['classes']) ? array_map('sanitize_text_field', $_POST['classes']) : [];
    update_option('my_plugin_classes', $classes);

    wp_send_json_success(['message' => 'Saved successfully!']);
});
```

#### app.jsx (React component)
```javascript
import React, { useState, useEffect } from 'react';
import { createRoot } from '@wordpress/element';

function ClassesApp() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load saved classes on mount
    useEffect(() => {
        fetch(ajaxurl + '?action=get_my_classes')
            .then(res => res.json())
            .then(data => {
                setClasses(data.data || []);
                setLoading(false);
            });
    }, []);

    const saveClasses = () => {
        const formData = new FormData();
        formData.append('action', 'save_my_classes');
        formData.append('_ajax_nonce', window.myClassesNonce);
        formData.append('classes', JSON.stringify(classes));

        fetch(ajaxurl, {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            alert(data.data.message);
        });
    };

    if (loading) return <p>Loading...</p>;

    // Check if Winden autocomplete is available
    if (!window.winden_autocomplete || !window.winden_autocomplete.length) {
        return (
            <div className="notice notice-warning">
                <p>Winden autocomplete not available. Make sure Winden plugin is installed and cache is generated.</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', marginTop: '20px' }}>
            <div className="card">
                <h2>Configure Tailwind Classes</h2>
                <p>Type to search and add Tailwind classes. Supports breakpoint prefixes (sm:, md:, lg:, etc.)</p>

                {/* Use Winden's autocomplete - you'll need to build your own or use a library */}
                <div style={{ marginBottom: '20px' }}>
                    <label>Tailwind Classes:</label>
                    <input
                        type="text"
                        placeholder="Type to search classes (e.g., bg-red-500, sm:text-lg)"
                        list="tailwind-classes"
                        style={{ width: '100%', padding: '8px' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value) {
                                setClasses([...classes, e.target.value]);
                                e.target.value = '';
                            }
                        }}
                    />
                    <datalist id="tailwind-classes">
                        {window.winden_autocomplete.slice(0, 100).map((cls, idx) => (
                            <option key={idx} value={cls} />
                        ))}
                    </datalist>
                </div>

                {/* Display selected classes */}
                <div style={{ marginBottom: '20px' }}>
                    <strong>Selected Classes ({classes.length}):</strong>
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {classes.map((cls, idx) => (
                            <span
                                key={idx}
                                style={{
                                    background: '#f0f0f0',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}
                            >
                                {cls}
                                <button
                                    onClick={() => setClasses(classes.filter((_, i) => i !== idx))}
                                    style={{ marginLeft: '8px', cursor: 'pointer', border: 'none', background: 'transparent' }}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                <button className="button button-action" onClick={saveClasses}>
                    Save Classes
                </button>

                {/* Debug info */}
                <details style={{ marginTop: '20px' }}>
                    <summary>Debug Info</summary>
                    <p>Available Tailwind classes: {window.winden_autocomplete.length}</p>
                    <p>Available breakpoints: {window.winden_autocomplete_screens?.join(', ')}</p>
                </details>
            </div>
        </div>
    );
}

// Mount the app
const container = document.getElementById('my-classes-app-root');
if (container) {
    const root = createRoot(container);
    root.render(<ClassesApp />);
}
```

---

### Example 2: Monaco Editor Plugin

Here's a complete example of a plugin that uses Winden's Monaco autocomplete for code editing:

### my-plugin.php
```php
<?php
/**
 * Plugin Name: My Custom Tailwind Plugin
 * Description: Example plugin using Winden Monaco autocomplete
 */

// Add admin menu
add_action('admin_menu', function() {
    add_menu_page(
        'My Tailwind Editor',
        'Tailwind Editor',
        'manage_options',
        'my-tailwind-editor',
        'my_plugin_render_page',
        'dashicons-editor-code'
    );
});

// Enqueue assets
add_action('admin_enqueue_scripts', function($hook) {
    if ($hook !== 'toplevel_page_my-tailwind-editor') {
        return;
    }

    // Request Winden's Monaco editor
    do_action('winden_request_monaco_editor');

    // Enqueue your React app
    wp_enqueue_script(
        'my-plugin-editor',
        plugin_dir_url(__FILE__) . 'build/editor.js',
        ['react', 'react-dom', 'winden-monaco-helper'],
        '1.0.0',
        true
    );

    // Add custom classes
    add_filter('winden_monaco_autocomplete_classes', function($classes) {
        return array_merge($classes, [
            'my-brand-action',
            'my-brand-secondary',
            'my-custom-utility'
        ]);
    });
});

// Render admin page
function my_plugin_render_page() {
    echo '<div id="my-tailwind-editor-root"></div>';
}
```

### editor.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from '@monaco-editor/react';

function TailwindEditor() {
    const [content, setContent] = useState('/* Start typing @apply to see Tailwind classes */\n\n.my-class {\n  \n}');
    const [completionDisposable, setCompletionDisposable] = useState(null);

    useEffect(() => {
        return () => {
            if (completionDisposable?.dispose) {
                completionDisposable.dispose();
            }
        };
    }, [completionDisposable]);

    const handleMount = (editor, monaco) => {
        if (window.WindenMonaco?.isAvailable()) {
            const disposable = window.WindenMonaco.initializeAutocomplete(
                monaco,
                'css',
                {
                    customClasses: ['my-extra-class']
                }
            );
            setCompletionDisposable(disposable);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Tailwind CSS Editor</h1>
            <Editor
                height="500px"
                language="css"
                theme="vs-dark"
                value={content}
                onChange={setContent}
                onMount={handleMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    tabSize: 2
                }}
            />
        </div>
    );
}

// Mount the app
const root = createRoot(document.getElementById('my-tailwind-editor-root'));
root.render(<TailwindEditor />);
```

## Troubleshooting

### Autocomplete not working

1. **Check if Winden is installed and activated**
   ```javascript
   console.log(window.WindenMonaco?.isAvailable());
   ```

2. **Verify the action is triggered**
   ```php
   add_action('admin_enqueue_scripts', function() {
       do_action('winden_request_monaco_editor');
       error_log('Winden Monaco requested');
   });
   ```

3. **Check browser console for errors**
   - Monaco should log: `[Winden Monaco] Helper loaded with X Tailwind classes`

### Classes are empty

The classes array depends on Winden's cache. Make sure:
- Winden has been saved at least once
- The cache is generated (check Winden settings page)

### Wrong Tailwind version

Check which version is active:
```javascript
console.log(window.WindenMonaco.getTailwindVersion());
```

## Requirements

- **Winden Plugin**: 2.8.3 or higher
- **WordPress**: 6.3 or higher
- **PHP**: 8.0 or higher
- **Monaco Editor**: `@monaco-editor/react` package

## Support

For issues or questions:
- GitHub: https://github.com/dplugins/winden
- Support: https://dplugins.com/support

## License

This integration is part of the Winden plugin and follows the same license terms.

---

**Last Updated**: 2025-10-17
**Version**: 1.0.0

# Swiss Knife Oxygen Builder Script Loading & Component Management

## Overview

Swiss Knife for Oxygen is a WordPress plugin that extends Oxygen Builder functionality through JavaScript injection, component management, and iframe communication. This document outlines the learning and implementation details of how scripts are loaded and how components are managed within the Oxygen Builder environment.

## Architecture Overview

### 1. Plugin Structure
```
swiss-knife-oxygen-new-main/
├── app/
│   ├── App.php                    # Main plugin initialization
│   ├── Admin/
│   │   ├── Admin.php             # Admin interface management
│   │   └── Features/
│   │       ├── ScriptsManager.php # Script injection system
│   │       ├── RightClick.php    # Builder iframe integration
│   │       ├── ClassesManager.php # Class management
│   │       └── Shortcuts.php     # Keyboard shortcuts
│   └── features/
│       ├── script_marko.js       # Main builder script
│       ├── script_marko_iframe.js # Iframe script
│       ├── stylemarko.css        # Builder styles
│       └── stylemarko_iframe.css # Iframe styles
├── src/                          # Source JavaScript files
├── dist/                         # Built JavaScript files
└── build.js                      # Build configuration
```

## 2. Script Loading Mechanisms

### 2.1 WordPress Hook Integration

The plugin uses WordPress hooks to inject scripts at the right time:

```php
// From App.php
private function initHooks() {
    add_action('plugins_loaded', [$this->admin, 'init']);
    add_action('breakdance_loaded', [$this->rightClick, 'addBuilderStyles'], 999);
    add_action('wp_enqueue_scripts', [$this->rightClick, 'enqueueIframeStyles'], 999999);
    add_action('oxygen_enqueue_frontend_scripts', [$this->rightClick, 'enqueueIframeStyles'], 999999);
}
```

### 2.2 Builder Detection

The plugin detects when Oxygen Builder is active:

```php
// From RightClick.php
private function isBuilderActive() {
    return isset($_GET['oxygen']) && $_GET['oxygen'] === 'builder';
}

private function isBuilderIframe() {
    return isset($_GET['breakdance_iframe']) || 
           (isset($_GET['oxygen']) && $_GET['oxygen'] === 'true');
}
```

### 2.3 Script Injection Methods

#### Method 1: Inline Script Injection
```php
// Direct inline injection for builder
public function addBuilderStyles() {
    if ($this->isBuilderActive()) {
        ?>
        <style type="text/css">
            <?php include(SWK_PATH . 'app/features/stylemarko.css'); ?>
        </style>
        <script type="text/javascript">
            <?php include(SWK_PATH . 'app/features/script_marko.js'); ?>
        </script>
        <?php
    }
}
```

#### Method 2: WordPress Enqueue System
```php
// Proper WordPress enqueue for iframe
public function enqueueIframeStyles() {
    if ($this->isBuilderIframe()) {
        wp_enqueue_style(
            'stylemarko-iframe', 
            SWK_URL . 'app/features/stylemarko_iframe.css', 
            array(), 
            SWK_VERSION
        );

        wp_enqueue_script(
            'script-marko-iframe',
            SWK_URL . 'app/features/script_marko_iframe.js',
            array(),
            SWK_VERSION,
            true
        );
    }
}
```

## 3. Oxygen Builder Access Patterns

### 3.1 Vue.js Instance Detection

The plugin searches for Oxygen's Vue.js instances:

```javascript
// From script_marko.js
function getOxygenVueApp() {
    const parentElements = window.parent.document.querySelectorAll("*");
    parentElements.forEach((el) => {
        if (el.__vue__) {
            if (el.__vue__.component) {
                // Found Vue component
            }
            if (el.__vue__.builder) {
                // Found builder instance
            }
            if (el.__vue__.$store?.state?.builder) {
                // Found builder store
            }
        }
    });
}
```

### 3.2 Global Object Detection

```javascript
// Check for Oxygen-specific global objects
const oxygenObjects = [
    "Oxygen",
    "OxygenVSB", 
    "iframeScope",
    "oxygenMD5",
    "oxygen_vsb_current_user_can_full_access",
    "oxygen_vsb_current_user_can_register_components",
    "oxygen_vsb_current_user_can_use_design_library",
    "oxygen_vsb_current_user_can_use_reusable_parts",
    "oxygen_vsb_current_user_can_manage_options",
    "oxygen_vsb_current_user_can_edit_only_dynamic_content",
];
```

### 3.3 Iframe Communication

```javascript
// Communication between parent and iframe
window.parent.postMessage({
    type: "oxygen-classes-update",
    elementId: activeElement.id.toString(),
    classes: classes,
    path: "properties.classes",
}, "*");
```

## 4. Component Management

### 4.1 Dynamic Component Addition

The plugin adds custom components to the Oxygen Builder interface:

```javascript
// From script_marko.js
function addMarkoButtons(menu) {
    const markoButton = document.createElement('div');
    markoButton.className = 'marko-button';
    markoButton.innerHTML = `
        <button class="copy-classes">Copy Classes</button>
        <button class="paste-classes">Paste Classes</button>
    `;
    
    menu.appendChild(markoButton);
}
```

### 4.2 Class Management System

```javascript
// Filter system classes from custom classes
function filterSystemClasses(classList) {
    return Array.from(classList).filter(
        (className) =>
            !className.startsWith("oxy-") &&
            !className.startsWith("builder-") &&
            !className.startsWith("breakdance-")
    );
}
```

### 4.3 Clipboard Integration

```javascript
// Store classes in localStorage for clipboard functionality
const clipboardData = {
    oxy: { path: "properties.classes", data: classes },
};
localStorage.setItem("breakdance_clipboard", JSON.stringify(clipboardData));
```

## 5. Scripts Manager System

### 5.1 Database Storage

Scripts are stored in WordPress options:

```php
// From ScriptsManager.php
$scripts = get_option('swk_scripts_manager', []);
```

### 5.2 Dynamic Script Loading

```php
public function loadSavedScripts() {
    $scripts = get_option('swk_scripts_manager', []);
    
    foreach ($scripts as $script) {
        $handle = 'swk-' . $script['slug'];
        $url = $script['url'];
        
        if ($script['type'] === 'style') {
            wp_enqueue_style($handle, $url, [], null);
        } else {
            wp_enqueue_script($handle, $url, [], null, true);
        }
    }
}
```

### 5.3 File Upload Support

```php
public function allowJsCssUploads($mimes) {
    $mimes['js'] = 'application/javascript';
    $mimes['css'] = 'text/css';
    return $mimes;
}
```

## 6. Build System

### 6.1 ESBuild Configuration

```javascript
// From build.js
esbuild.build({
    entryPoints: [file],
    outfile: outFile,
    bundle: true,
    minify: true,
    sourcemap: options.sourcemap,
    target: 'es2015',
});
```

### 6.2 Watch Mode

```javascript
if (isWatchMode) {
    chokidar.watch(srcDir, { ignored: /(^|[\/\\])\../ }).on('change', (filePath) => {
        if (filePath.endsWith('.js')) {
            buildFile(filePath, buildOptions);
        }
    });
}
```

## 7. Key Learning Points

### 7.1 Timing is Critical
- Scripts must be loaded after Oxygen Builder initializes
- Use high priority hooks (999999) to ensure late loading
- Implement polling mechanisms to detect when Oxygen is ready

### 7.2 Iframe Communication
- Oxygen Builder runs in an iframe
- Use `window.parent` to access the main window
- Use `postMessage` for cross-frame communication
- Store data in `localStorage` for persistence

### 7.3 Vue.js Integration
- Oxygen uses Vue.js for its interface
- Access Vue instances via `element.__vue__`
- Use Vue's reactive system for updates
- Monitor Vue component lifecycle

### 7.4 Security Considerations
- Validate all user inputs
- Sanitize file uploads
- Use nonces for AJAX requests
- Escape output in templates

### 7.5 Performance Optimization
- Load scripts only when needed
- Use proper dependency management
- Implement lazy loading for heavy components
- Cache frequently accessed data

## 8. Common Patterns

### 8.1 Observer Pattern
```javascript
function startObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // Handle DOM changes
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
```

### 8.2 Event Delegation
```javascript
document.addEventListener('click', (e) => {
    if (e.target.matches('.marko-button')) {
        // Handle button clicks
    }
});
```

### 8.3 State Management
```javascript
// Shared state between parent and iframe
let copiedClasses = null;
let activeElement = null;
```

## 9. Debugging Techniques

### 9.1 Console Logging
```javascript
console.log("Script loaded in iframe");
console.log("Found classes:", classes);
console.log("Classes copied:", classes);
```

### 9.2 Error Handling
```javascript
try {
    const clipboardData = JSON.parse(clipboardJson);
    // Process data
} catch (error) {
    console.error('Error parsing clipboard data:', error);
}
```

### 9.3 Development Mode
```javascript
// Debug code to find Oxygen's main builder object
function inspectOxygenObjects() {
    const parentProps = Object.getOwnPropertyNames(window.parent);
    // Inspect available properties
}
```

## 10. Best Practices

1. **Always check for Oxygen Builder availability before executing code**
2. **Use proper WordPress hooks and priorities**
3. **Implement fallbacks for when Oxygen objects aren't available**
4. **Test in both builder and frontend contexts**
5. **Handle iframe communication carefully**
6. **Use proper error handling and logging**
7. **Follow WordPress coding standards**
8. **Implement proper security measures**
9. **Optimize for performance**
10. **Maintain backward compatibility**

This documentation provides a comprehensive overview of how Swiss Knife integrates with Oxygen Builder, manages scripts, and handles component interactions within the builder environment. 
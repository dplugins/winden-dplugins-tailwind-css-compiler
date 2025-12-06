# Winden Autocomplete Integration Guide

This guide shows how to integrate Winden's Tailwind autocomplete functionality into your Gutenberg Block Studio (GBS) plugin pages.

## Overview

The Winden plugin provides a powerful Tailwind CSS autocomplete system that can be accessed from other plugins. This integration will load the autocomplete on your admin pages and provide utility functions to use it in your React components.

## Updated Menu Class

Replace your existing `App/Admin/Menu.php` with this enhanced version:

```php
<?php

namespace GutenbergBlockStudio\App\Admin;

class Menu
{
    /**
     * Constructor to set up hooks
     */
    public function __construct()
    {
        add_action('admin_enqueue_scripts', [$this, 'load_winden_autocomplete']);
    }

    /**
     * Register the admin menu and submenus
     */
    public function register()
    {
        // Remove any existing menu items first
        remove_menu_page('gbs');
        remove_submenu_page('gbs', 'gbs');

        $icon = '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
<path d="M20 0C14.6957 0 9.60929 2.10742 5.85917 5.85917C2.10742 9.60905 0 14.6957 0 20C0 25.3043 2.10742 30.3907 5.85917 34.1408C9.60905 37.8926 14.6957 40 20 40C25.3043 40 30.3907 37.8926 34.1408 34.1408C37.8926 30.3909 40 25.3043 40 20C40 14.6957 37.8926 9.60929 34.1408 5.85917C30.3909 2.10742 25.3043 0 20 0ZM20 23.9992C18.3819 23.9992 16.9232 23.0262 16.3045 21.53C15.6858 20.0356 16.027 18.3163 17.1726 17.1726C18.3163 16.027 20.0356 15.6858 21.53 16.3045C23.0262 16.9233 23.9992 18.3819 23.9992 20C23.9992 21.0612 23.5792 22.0774 22.8274 22.8274C22.0774 23.5792 21.0612 23.9992 20 23.9992ZM20 4.00115C21.35 4.0049 22.6943 4.17927 23.9992 4.5205V13.1209C22.788 12.4009 21.4081 12.0146 20 11.9997H6.16108C9.01474 7.05534 14.2891 4.00691 20 4.00115ZM4.00115 20C4.0049 18.65 4.17927 17.3057 4.5205 16.0008H13.1209C12.4009 17.212 12.0146 18.5919 11.9997 20V33.8389C7.05534 30.9853 4.00691 25.7109 4.00115 20ZM20 35.9988C18.65 35.9951 17.3057 35.8207 16.0008 35.4795V26.8791C17.212 27.5991 18.5919 27.9854 20 28.0003H33.8389C30.9853 32.9447 25.7109 35.9931 20 35.9988ZM35.4795 23.9992H26.8791C27.5991 22.788 27.9854 21.4081 28.0003 20V6.16108C31.0396 7.89167 33.4208 10.5803 34.7744 13.8072C36.1262 17.034 36.3757 20.6173 35.4795 23.9992Z" 
fill="currentColor"
/>
</svg>';

        // Add main menu (Studio)
        add_menu_page(
            'Studio',
            'Studio',
            'manage_options',
            'gbs',
            [$this, 'render_studio_page'],
            sprintf('data:image/svg+xml;base64,%s', base64_encode($icon)),
        );

        // Add Studio submenu (this will be the first item)
        add_submenu_page(
            'gbs',
            'Blocks',
            'Blocks',
            'manage_options',
            'gbs',
            [$this, 'render_studio_page']
        );

        add_submenu_page(
            'gbs',
            'Reusable Components',
            'Reusable Components',
            'manage_options',
            'gbs-reusable',
            [$this, 'render_studio_page']
        );

        // Add Settings submenu
        add_submenu_page(
            'gbs',
            'Settings',
            'Settings',
            'manage_options',
            'gbs-settings',
            [$this, 'render_settings_page']
        );

        // Add Licence submenu
        add_submenu_page(
            'gbs',
            'Licence',
            'Licence',
            'manage_options',
            'gbs-licence',
            [$this, 'render_licence_page']
        );
    }

    /**
     * Load Winden autocomplete on our admin pages
     */
    public function load_winden_autocomplete($hook)
    {
        // Define your plugin pages
        $gbs_pages = [
            'toplevel_page_gbs',        // Main studio page
            'studio_page_gbs-reusable', // Reusable components
            'studio_page_gbs-settings', // Settings page
            'studio_page_gbs-licence'   // Licence page
        ];

        // Only load on your plugin pages
        if (!in_array($hook, $gbs_pages)) {
            return;
        }

        // Check if Winden is active
        if (!$this->is_winden_active()) {
            return;
        }

        $this->enqueue_winden_scripts();
    }

    /**
     * Check if Winden plugin is active and classes are available
     */
    private function is_winden_active()
    {
        return class_exists('Winden\App\Helpers\LoadAssets') && 
               class_exists('Winden\App\Assets\Providers\ProvidersHelpers');
    }

    /**
     * Enqueue Winden scripts and set up autocomplete
     */
    private function enqueue_winden_scripts()
    {
        try {
            // Load Winden's core scripts
            \Winden\App\Helpers\LoadAssets::loadInlineScripts();
            \Winden\App\Helpers\LoadAssets::loadCDNScripts('inlinemodule');

            // Add inline script to set up autocomplete
            wp_add_inline_script('wp-util', $this->get_autocomplete_script());

            // Add script tag for module loading
            add_action('admin_footer', [$this, 'add_winden_framework_scripts']);

        } catch (Exception $e) {
            // Silently fail if Winden classes aren't available
            error_log('GBS: Failed to load Winden autocomplete: ' . $e->getMessage());
        }
    }

    /**
     * Add framework scripts in footer
     */
    public function add_winden_framework_scripts()
    {
        if (!$this->is_winden_active()) {
            return;
        }

        echo '<script type="module">
            // Load Winden framework scripts
            try {
                // Wait for DOM to be ready
                document.addEventListener("DOMContentLoaded", function() {
                    // Initialize Winden framework
                    if (typeof window.ProvidersHelpers !== "undefined") {
                        window.ProvidersHelpers.framework_scripts();
                    }
                    
                    // Set up autocomplete loading
                    window.gbsLoadWindenAutocomplete();
                });
            } catch(e) {
                console.warn("GBS: Could not load Winden framework scripts:", e);
            }
        </script>';
    }

    /**
     * Get the autocomplete initialization script
     */
    private function get_autocomplete_script()
    {
        return '
            // GBS Winden Autocomplete Integration
            window.gbsLoadWindenAutocomplete = function() {
                let autocompleteReady = false;
                let autocompleteClasses = [];
                let autocompleteScreens = [];
                
                // Function to check for autocomplete availability
                const checkAutocomplete = () => {
                    if (window.winden_autocomplete && Array.isArray(window.winden_autocomplete) && window.winden_autocomplete.length > 0) {
                        autocompleteClasses = window.winden_autocomplete;
                        autocompleteScreens = window.winden_autocomplete_screens || [];
                        autocompleteReady = true;
                        
                        console.log("GBS: Winden autocomplete loaded with", autocompleteClasses.length, "classes");
                        
                        // Trigger custom event for your React components
                        window.dispatchEvent(new CustomEvent("gbsWindenAutocompleteReady", {
                            detail: { 
                                classes: autocompleteClasses,
                                screens: autocompleteScreens
                            }
                        }));
                        
                        return true;
                    }
                    return false;
                };
                
                // Try immediate check
                if (checkAutocomplete()) {
                    return;
                }
                
                // Wait for autocomplete to load
                const maxAttempts = 100; // 10 seconds
                let attempts = 0;
                
                const checkInterval = setInterval(() => {
                    attempts++;
                    
                    if (checkAutocomplete() || attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        if (attempts >= maxAttempts) {
                            console.warn("GBS: Winden autocomplete failed to load after 10 seconds");
                        }
                    }
                }, 100);
                
                // Also try to manually trigger autocomplete generation if available
                setTimeout(() => {
                    if (!autocompleteReady && typeof window.tailwindifyClasses === "function") {
                        console.log("GBS: Manually triggering Winden autocomplete generation");
                        window.tailwindifyClasses().then(result => {
                            if (result && result.classes) {
                                window.winden_autocomplete = result.classes;
                                window.parent.winden_autocomplete = result.classes;
                                if (result.screens) {
                                    window.winden_autocomplete_screens = result.screens;
                                    window.parent.winden_autocomplete_screens = result.screens;
                                }
                                checkAutocomplete();
                            }
                        }).catch(e => {
                            console.warn("GBS: Failed to manually generate autocomplete:", e);
                        });
                    }
                }, 1000);
            };
            
            // Utility functions for your components
            window.gbsGetWindenClasses = function() {
                return window.winden_autocomplete || [];
            };
            
            window.gbsGetWindenScreens = function() {
                return window.winden_autocomplete_screens || [];
            };
            
            window.gbsFilterWindenClasses = function(query, limit = 50) {
                const classes = window.gbsGetWindenClasses();
                if (!query || query.length < 2) return [];
                
                const normalizedQuery = query.toLowerCase();
                return classes
                    .filter(cls => cls.toLowerCase().includes(normalizedQuery))
                    .slice(0, limit);
            };
        ';
    }

    /**
     * Render the studio page
     */
    public function render_studio_page()
    {
        echo '<div id="gbs-admin-root" data-page="studio"></div>';
    }

    /**
     * Render the settings page
     */
    public function render_settings_page()
    {
        echo '<div id="gbs-admin-root" data-page="settings"></div>';
    }

    /**
     * Render the licence page
     */
    public function render_licence_page()
    {
        echo '<div id="gbs-admin-root" data-page="licence"></div>';
    }
}
```

## Plugin Initialization

In your main plugin file or bootstrap, initialize the Menu class properly:

```php
<?php
// In your main plugin file

// Make sure this is called after plugins are loaded
add_action('plugins_loaded', function() {
    // Instantiate the Menu class (this will set up the hooks)
    $menu = new GutenbergBlockStudio\App\Admin\Menu();
    
    // Register the menu on admin_menu hook
    add_action('admin_menu', [$menu, 'register']);
});
```

## JavaScript Usage in React Components

### Listening for Autocomplete Ready Event

```javascript
import { useEffect, useState } from 'react';

const MyComponent = () => {
    const [tailwindClasses, setTailwindClasses] = useState([]);
    const [tailwindScreens, setTailwindScreens] = useState([]);

    useEffect(() => {
        const handleAutocompleteReady = (event) => {
            const { classes, screens } = event.detail;
            console.log('Tailwind classes available:', classes.length);
            setTailwindClasses(classes);
            setTailwindScreens(screens);
        };

        // Listen for the custom event
        window.addEventListener('gbsWindenAutocompleteReady', handleAutocompleteReady);

        // Check if already loaded
        const existingClasses = window.gbsGetWindenClasses?.() || [];
        if (existingClasses.length > 0) {
            setTailwindClasses(existingClasses);
            setTailwindScreens(window.gbsGetWindenScreens?.() || []);
        }

        return () => {
            window.removeEventListener('gbsWindenAutocompleteReady', handleAutocompleteReady);
        };
    }, []);

    // Use the utility functions
    const filterClasses = (query) => {
        return window.gbsFilterWindenClasses?.(query, 20) || [];
    };

    return (
        <div>
            <p>Available classes: {tailwindClasses.length}</p>
            {/* Your component content */}
        </div>
    );
};
```

### Simple Autocomplete Input Component

```javascript
import { useState } from 'react';

const TailwindClassInput = ({ value, onChange, placeholder = "Enter Tailwind classes..." }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleInputChange = (e) => {
        const inputValue = e.target.value;
        onChange(inputValue);

        if (inputValue.length > 1) {
            const words = inputValue.split(' ');
            const currentWord = words[words.length - 1];
            
            if (currentWord.length > 1) {
                const filtered = window.gbsFilterWindenClasses?.(currentWord, 10) || [];
                setSuggestions(filtered);
                setShowSuggestions(filtered.length > 0);
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        const words = value.split(' ');
        words[words.length - 1] = suggestion;
        onChange(words.join(' ') + ' ');
        setShowSuggestions(false);
    };

    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={handleInputChange}
                placeholder={placeholder}
                className="w-full p-2 border rounded"
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                    {suggestions.map((cls, index) => (
                        <li
                            key={index}
                            onClick={() => handleSuggestionClick(cls)}
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                            <span className="font-mono">{cls}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TailwindClassInput;
```

### Advanced Multi-Class Input with Tags

```javascript
import { useState, useEffect } from 'react';

const TailwindClassTags = ({ classes = [], onChange }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);

        if (value.length > 1) {
            const filtered = window.gbsFilterWindenClasses?.(value, 15) || [];
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const addClass = (className) => {
        if (!classes.includes(className)) {
            onChange([...classes, className]);
        }
        setInputValue('');
        setShowSuggestions(false);
    };

    const removeClass = (className) => {
        onChange(classes.filter(cls => cls !== className));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            addClass(inputValue.trim());
        } else if (e.key === 'Backspace' && !inputValue && classes.length > 0) {
            removeClass(classes[classes.length - 1]);
        }
    };

    return (
        <div className="relative">
            <div className="flex flex-wrap gap-1 p-2 border rounded min-h-[40px] bg-white">
                {classes.map((cls, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                        <span className="font-mono">{cls}</span>
                        <button
                            onClick={() => removeClass(cls)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={classes.length === 0 ? "Type Tailwind classes..." : ""}
                    className="flex-1 outline-none min-w-[100px]"
                />
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                    {suggestions.map((cls, index) => (
                        <li
                            key={index}
                            onClick={() => addClass(cls)}
                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                            <span className="font-mono">{cls}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TailwindClassTags;
```

## Available Global Functions

After the integration is complete, these functions will be available globally:

### `window.gbsGetWindenClasses()`
Returns all available Tailwind classes as an array.

```javascript
const allClasses = window.gbsGetWindenClasses();
console.log(`${allClasses.length} classes available`);
```

### `window.gbsGetWindenScreens()`
Returns all available Tailwind screen breakpoints.

```javascript
const screens = window.gbsGetWindenScreens();
console.log('Available screens:', screens);
```

### `window.gbsFilterWindenClasses(query, limit)`
Filters classes based on a query string.

```javascript
const matches = window.gbsFilterWindenClasses('bg-red', 10);
console.log('Red background classes:', matches);
```

## Events

### `gbsWindenAutocompleteReady`
Fired when the Winden autocomplete is fully loaded and ready to use.

```javascript
window.addEventListener('gbsWindenAutocompleteReady', (event) => {
    const { classes, screens } = event.detail;
    console.log('Autocomplete ready with', classes.length, 'classes');
});
```

## Error Handling

The integration includes comprehensive error handling:

- **Graceful degradation** if Winden is not installed
- **Console warnings** for debugging
- **Timeout protection** to prevent infinite loading
- **Fallback attempts** to manually trigger autocomplete

## Testing

To test the integration:

1. Install and activate the Winden plugin
2. Go to any of your GBS admin pages
3. Open browser console
4. Look for messages like: `"GBS: Winden autocomplete loaded with X classes"`
5. Test the utility functions: `window.gbsGetWindenClasses()`

## Notes

- **Dependency**: Requires Winden plugin to be active
- **Performance**: Autocomplete array can contain thousands of classes
- **Timing**: May take 1-2 seconds to fully load autocomplete data
- **Compatibility**: Works with Winden's configuration system
- **Updates**: Automatically refreshes when Winden configuration changes

## Troubleshooting

If autocomplete doesn't load:

1. Check if Winden plugin is active
2. Verify you're on a GBS admin page
3. Check browser console for error messages
4. Ensure Winden has valid configuration
5. Try refreshing the page

The integration will log helpful messages to the console for debugging purposes. 
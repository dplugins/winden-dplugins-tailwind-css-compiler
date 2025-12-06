# Bricks Save Detection & CSS Compilation Flow

## Overview
This document explains how Winden detects when you save in Bricks and triggers CSS compilation.

---

## Save Detection in Bricks

### Location
`assets/post-save-compile.js` - `initBricks()` function (lines 131-162)

### How It Works

```javascript
function initBricks() {
    // Wait for Bricks builder to initialize
    const checkBricksReady = setInterval(() => {
        const commonContainer = document.getElementById('bricks-panel-controls');

        if (commonContainer && commonContainer._vnode) {
            clearInterval(checkBricksReady);

            try {
                // Access Bricks Vue store
                const commonInstance = commonContainer._vnode.component.proxy;
                const commonStore = commonInstance.$_state;

                // Watch isSaving state
                commonInstance.$watch(
                    () => commonStore.isSaving,
                    (isSaving, wasSaving) => {
                        // Trigger when save completes
                        if (wasSaving && !isSaving) {
                            triggerRecompile(getPostId());
                        }
                    }
                );
            } catch(e) {
                // Silent fail if Bricks structure changes
            }
        }
    }, 100);
}
```

### Step-by-Step

1. **Find Bricks Panel** - Looks for `#bricks-panel-controls` element
2. **Access Vue Instance** - Gets the Vue component from `_vnode.component.proxy`
3. **Get Vue Store** - Accesses `$_state` which contains Bricks state
4. **Watch isSaving** - Sets up a Vue watcher on `commonStore.isSaving`
5. **Detect Save Complete** - When `isSaving` changes from `true` → `false`, save is complete
6. **Trigger Recompile** - Calls `triggerRecompile(postId)`

---

## Compilation Flow

### 1. Trigger Recompile
**File:** `assets/post-save-compile.js`
**Function:** `triggerRecompile(postId)`

```javascript
function triggerRecompile(postId) {
    if (!postId) {
        console.warn('Winden: No post ID available for compilation');
        return;
    }

    // AJAX call to backend
    jQuery.post(windenAutoCompile.ajaxUrl, {
        action: 'winden_trigger_recompile',
        post_id: postId,
        _nonce: windenAutoCompile.nonce
    }, function(response) {
        if (response.success) {
            compile();  // ← Triggers CSS compilation
        }
    }).fail(function(error) {
        console.error('Winden: Recompile trigger failed', error);
    });
}
```

### 2. Backend Processing
**File:** `App/Caching/AutoCompile.php`
**Method:** `ajax_trigger_recompile()`

- Verifies user permissions
- Verifies nonce for security
- Calls `crawl_and_flag($post_id)` to crawl post classes
- Sets `winden_needs_recompile` flag
- Returns success response

### 3. Frontend Compilation
**File:** `assets/post-save-compile.js`
**Function:** `compile()`

```javascript
async function compile() {
    try {
        // 1. Fetch classes from backend
        const response = await fetch(windenAutoCompile.ajaxUrl + '?action=get_winden_content');
        const data = await response.json();
        const { classes, config, styles } = data.data;

        // 2. Compile CSS using tailwindify
        const compiled = await window.tailwindify(
            classes,
            styles,
            config
        );

        // 3. Save compiled CSS
        const saveResponse = await fetch(windenAutoCompile.ajaxUrl, {
            method: 'POST',
            body: JSON.stringify({
                _nonce: windenAutoCompile.nonce,
                styles: compiled.css,
                status: 'success'
            })
        });

        // 4. Clear recompile flag
        await fetch(windenAutoCompile.ajaxUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'clear_recompile_flag',
                _nonce: windenAutoCompile.nonce
            })
        });

    } catch (error) {
        console.error('Winden: Compilation failed', error);
        window.windenAutoCompile.lastError = {
            timestamp: new Date().toISOString(),
            message: error.message,
            stack: error.stack
        };
    }
}
```

---

## Success Messages ("Congrats", "Top", "Stunning")

### Where They Come From
**Source:** Bricks Builder (NOT Winden)
**Element:** `<div id="bricks-message">`
**When:** After successful save operation

### How Bricks Shows Them

Bricks has its own save handler that:
1. Detects when save completes
2. Picks a random success message ("Congrats!", "Top!", "Stunning!", etc.)
3. Displays it in `#bricks-message` div
4. Animates it with a slide-in/fade-out effect

**This is completely independent of Winden's save detection.**

Both systems watch the same `isSaving` state:
- **Bricks:** Shows success message in UI
- **Winden:** Triggers CSS compilation

---

## Timeline of Events

```
User clicks "Save" button
    ↓
commonStore.isSaving = true
    ↓
Bricks sends data to server
    ↓
Server processes save
    ↓
Bricks receives response
    ↓
commonStore.isSaving = false  ← BOTH systems detect this
    ↓
    ├─→ Bricks: Shows "Congrats!" message
    │
    └─→ Winden: Triggers triggerRecompile()
            ↓
        AJAX to backend (crawl classes)
            ↓
        compile() runs
            ↓
        tailwindify() compiles CSS
            ↓
        Save CSS to uploads/winden/output.css
            ↓
        Clear recompile flag
            ↓
        Done! ✅
```

---

## Debugging

### Check Save Detection

In browser console:
```javascript
// Check if Bricks store is accessible
const panel = document.getElementById('bricks-panel-controls');
const commonInstance = panel?._vnode?.component?.proxy;
const commonStore = commonInstance?.$_state;

console.log('Bricks Store:', commonStore);
console.log('Is Saving:', commonStore?.isSaving);
```

### Watch Save Events

In browser console:
```javascript
// Watch for save state changes
const panel = document.getElementById('bricks-panel-controls');
const commonInstance = panel?._vnode?.component?.proxy;

commonInstance.$watch(
    () => commonInstance.$_state.isSaving,
    (isSaving, wasSaving) => {
        console.log('Save state changed:', {
            from: wasSaving,
            to: isSaving,
            saveComplete: wasSaving && !isSaving
        });
    }
);
```

### Check Compile Function

```javascript
// In parent window
console.log('Compile in parent:', typeof window.compile);

// In Bricks iframe
const iframe = document.getElementById('bricks-builder-iframe');
console.log('Compile in iframe:', typeof iframe?.contentWindow?.compile);
```

---

## Common Issues

### Issue 1: "Congrats" shows but CSS doesn't compile

**Cause:** The `compile()` function is running in the wrong context (parent vs iframe)

**Solution:** Update `triggerCompile()` in Bricks 2 plain classes to call compile in the iframe:
```javascript
const bricksIframe = document.getElementById('bricks-builder-iframe');
if (bricksIframe?.contentWindow?.compile) {
    bricksIframe.contentWindow.compile();
}
```

### Issue 2: No save detection

**Cause:** Bricks structure changed or Vue instance not accessible

**Check:**
```javascript
const panel = document.getElementById('bricks-panel-controls');
console.log('Panel:', panel);
console.log('VNode:', panel?._vnode);
console.log('Store:', panel?._vnode?.component?.proxy?.$_state);
```

### Issue 3: Multiple compilations on one save

**Cause:** Multiple watchers or event listeners

**Solution:** Ensure only one save detection system is active per builder

---

## Related Files

### Save Detection
- `assets/post-save-compile.js` - Main save detection logic
- `App/Caching/AutoCompile.php` - Backend AJAX handlers

### Plain Classes (Bricks 2)
- `src/plain-classes/bricks2/index.js` - Plain classes editor with compile trigger

### Compilation
- `assets/tailwindcss-watcher.js` - DOM watcher (triggers compilation on changes)
- `build/compiler/tailwindcss-compiler.js` - Main Tailwind v4 compilation engine
- `assets/inline-module.js` - Module loader
- `src/compile-in-browser/index.js` - Browser compiler source

---

## Summary

**Save Detection:**
- Watches `commonStore.isSaving` state in Bricks Vue store
- Detects when it changes from `true` → `false` (save complete)

**Success Messages:**
- Come from Bricks, not Winden
- Displayed in `#bricks-message` element
- Independent of CSS compilation

**CSS Compilation:**
- Triggered via `triggerRecompile(postId)`
- Crawls post classes via AJAX
- Compiles CSS using `tailwindify()`
- Saves to `uploads/winden/output.css`

**Key Point:** Both Bricks messages and Winden compilation happen at the same time (when save completes) but are completely independent systems.

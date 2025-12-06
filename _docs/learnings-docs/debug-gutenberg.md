# Debug Gutenberg Iframe Compilation

## Step 1: Check if scripts loaded in iframe

Open browser DevTools console and run:

```javascript
// Get the iframe
const iframe = document.querySelector('iframe[name="editor-canvas"]');

// Check if iframe exists
console.log('Iframe found:', !!iframe);

// Check iframe's window object
if (iframe && iframe.contentWindow) {
    const iframeWindow = iframe.contentWindow;

    console.log('=== Iframe Script Status ===');
    console.log('tailwindifyClasses:', typeof iframeWindow.tailwindifyClasses);
    console.log('tailwind_compiler_options:', iframeWindow.tailwind_compiler_options);
    console.log('uploadUrl:', iframeWindow.uploadUrl);
    console.log('ajaxurl:', iframeWindow.ajaxurl);
    console.log('winden_autocomplete:', iframeWindow.winden_autocomplete?.length || 'not set');
}
```

Expected output:
- `tailwindifyClasses: "function"`
- `tailwind_compiler_options: {tailwind_version: "v4", ...}`
- `uploadUrl: "http://..."`
- `ajaxurl: "http://..."`

## Step 2: Check if MutationObserver is running

The Tailwind compiler should watch for DOM changes. Check in the iframe console:

```javascript
// Run this in the IFRAME console (use iframe selector in DevTools)
console.log('Document:', document.location.href);
console.log('Compiler loaded:', typeof window.tailwindifyClasses);

// Check for compiled styles
const compiledStyle = document.getElementById('compiled-styles-tailwind');
console.log('Compiled style tag exists:', !!compiledStyle);
if (compiledStyle) {
    console.log('Style tag length:', compiledStyle.textContent.length);
}
```

## Step 3: Manually trigger compilation

Try manually compiling to see if the function works:

```javascript
// In iframe console
const iframe = document.querySelector('iframe[name="editor-canvas"]');
const iframeWindow = iframe.contentWindow;

// Get all classes from DOM
const allElements = iframeWindow.document.querySelectorAll('[class]');
const classes = [];
allElements.forEach(el => {
    el.className.split(' ').forEach(cls => {
        if (cls && !classes.includes(cls)) {
            classes.push(cls);
        }
    });
});

console.log('Found classes:', classes.length);

// Try to compile
if (typeof iframeWindow.tailwindify === 'function') {
    iframeWindow.tailwindify(classes).then(result => {
        console.log('Manual compilation result:', result);
    });
}
```

## Step 4: Check parent window autocomplete

```javascript
// In parent console
console.log('Parent winden_autocomplete:', window.winden_autocomplete?.length || 'not set');

// Try fetching from iframe manually
const iframe = document.querySelector('iframe[name="editor-canvas"]');
if (iframe && iframe.contentWindow) {
    console.log('Iframe winden_autocomplete:', iframe.contentWindow.winden_autocomplete?.length || 'not set');
}
```

## Common Issues & Solutions

### Issue: Scripts not loading in iframe
**Check:** View page source and look for `__unstableResolvedAssets` in the page HTML
**Solution:** Make sure `block_editor_settings_all` filter is running

### Issue: Compiler loaded but not watching DOM
**Check:** Look for MutationObserver in the compiler code
**Solution:** The compiler might need to be initialized manually

### Issue: Styles in wrong location
**Check:** Run `document.getElementById('compiled-styles-tailwind')` in both parent and iframe
**Expected:** Should be in iframe's head, not parent

### Issue: Config not loading
**Check:** `window.tailwind_compiler_options` in iframe
**Solution:** Make sure config script loads AFTER compiler script

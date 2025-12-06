# Browser Compiler - Test Plan

**Created**: 2025-01-16
**Purpose**: Verify all Phase 1 compiler improvements are working correctly
**Test Environment**: Browser console + WordPress admin

---

## Test Setup

1. Open WordPress admin in browser
2. Navigate to Winden plugin page
3. Open browser DevTools (F12) → Console tab
4. Keep console open for all tests

---

## Test 1: Global process.versions Mutation Fix

**What we're testing**: Verify no global pollution of `process.versions.node`

**Steps**:
1. Open browser console
2. Type: `console.log(process.versions.node)`
3. Expected result: Should show `"18.0.0"` (or original value if Node.js is actually present)
4. Type: `process.versions.node = "test"`
5. Type: `console.log(process.versions.node)`
6. Expected result: Should show `"test"` (we can mutate it, but we didn't mutate it on load)

**✅ Pass Criteria**:
- No error when accessing `process.versions.node`
- Value is `"18.0.0"` by default
- React DevTools work without warnings (if installed)

**❌ Fail Indicators**:
- Value is `"1.0.0"` (old broken behavior)
- React DevTools show compatibility warnings
- Error: `Cannot read property 'node' of undefined`

---

## Test 2: SCSS Detection False Positives Fix

**What we're testing**: URLs with `//` don't trigger SCSS mode incorrectly

### Test 2A: Valid CSS with URLs (Should NOT trigger SCSS mode)

**Steps**:
1. Go to Winden → Style Editor
2. Add a new style tab or use existing
3. Set preprocessor to **CSS** (not SCSS)
4. Paste this CSS:

```css
@import url("//fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap");

.test-fonts {
  background: url(//cdn.example.com/bg.png);
  font-family: "Roboto", sans-serif;
}

.test-protocol-relative {
  background-image: url("//images.unsplash.com/photo.jpg");
}
```

5. Click "Save" or trigger compilation
6. Check browser console

**✅ Pass Criteria**:
- No error message about SCSS syntax
- CSS compiles successfully
- No console errors

**❌ Fail Indicators**:
- Error: "SCSS syntax detected (variables like $var, mixins @mixin, nesting &) but CSS Preprocessor is set to 'CSS'"
- Compilation fails
- Message tells you to switch to SCSS mode

### Test 2B: Actual SCSS (Should trigger SCSS mode)

**Steps**:
1. Keep preprocessor set to **CSS**
2. Paste this SCSS:

```scss
$primary: blue;

.test {
  color: $primary; // SCSS variable
  // This is an SCSS comment
}
```

3. Click "Save"
4. Check console

**✅ Pass Criteria**:
- Error appears: "SCSS syntax detected..."
- Error correctly identifies SCSS features
- Suggests switching to SCSS mode

**❌ Fail Indicators**:
- No error (should detect SCSS!)
- CSS compiles incorrectly
- Variables aren't processed

### Test 2C: Edge Case - Comment After Property

**Steps**:
1. Set preprocessor to **CSS**
2. Paste this CSS:

```css
.test {
  font-family: "Open Sans", sans-serif; // From Google Fonts
  background: url(//cdn.com/image.png); // CDN resource
}
```

3. Click "Save"

**✅ Pass Criteria**:
- Error appears (these ARE SCSS comments)
- Correctly identifies `//` comments after properties

**Note**: If you want these comments to work, switch to SCSS mode. Pure CSS uses `/* */` comments.

---

## Test 3: Autoprefixer Removal (Performance Test)

**What we're testing**: Autoprefixer is removed, compilation is faster

**Steps**:
1. Open browser console
2. Go to Winden style editor
3. Add some CSS that needs prefixing:

```css
.test-flex {
  display: flex;
  align-items: center;
  transform: rotate(45deg);
  transition: all 0.3s ease;
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
```

4. In console, type:
```javascript
console.time('compile');
// Then save in UI
// After save completes, in console:
console.timeEnd('compile');
```

5. Check the compiled CSS output

**✅ Pass Criteria**:
- Compilation completes in reasonable time
- Vendor prefixes are still present (from Lightning CSS):
  - `-webkit-transform` or modern `transform`
  - `-webkit-flex` or modern `flex`
- Console shows no autoprefixer-related messages

**❌ Fail Indicators**:
- Compilation takes >500ms for simple CSS
- Missing vendor prefixes entirely
- Console shows "autoprefixer" messages
- CSS doesn't work in older browsers

**Note**: Lightning CSS (built into Tailwind v4) handles prefixing automatically.

---

## Test 4: Blob URL Memory Leak Fix

**What we're testing**: Failed plugin imports don't leak memory

**Setup**: This test requires a CDN plugin to fail

**Steps**:
1. Open browser console
2. Add this to your Winden config (JavaScript tab):

```javascript
export default {
  plugins: [
    'https://esm.run/nonexistent-plugin-12345' // This will fail
  ]
}
```

3. Save and trigger compilation
4. In console, check for errors
5. In console, type:
```javascript
performance.memory
```

6. Repeat save 10 times
7. Check memory again:
```javascript
performance.memory
```

**✅ Pass Criteria**:
- Error message appears for failed plugin load
- Memory doesn't grow significantly after repeated failures
- Console shows proper error handling
- No "blob:" URLs left in memory (hard to verify directly, but memory should stay stable)

**❌ Fail Indicators**:
- Memory grows by >10MB after repeated failures
- Compilation hangs
- Browser becomes sluggish
- Memory leak detected

**Alternative Quick Test**:
In console, run:
```javascript
// Count blob URLs before
const before = performance.getEntriesByType('resource').filter(r => r.name.startsWith('blob:')).length;
console.log('Blob URLs before:', before);

// Trigger failed plugin load (save with bad plugin URL)
// Then after error:
const after = performance.getEntriesByType('resource').filter(r => r.name.startsWith('blob:')).length;
console.log('Blob URLs after:', after);
console.log('Leaked:', after - before);
```

**✅ Pass**: Leaked count should be 0

---

## Test 5: Cross-Origin iframe Protection

**What we're testing**: Compiler works in cross-origin iframes without errors

### Test 5A: Same-Origin (Should work normally)

**Steps**:
1. Open Winden admin normally
2. Open console
3. Check for errors
4. Save some CSS
5. Verify compilation works

**✅ Pass Criteria**:
- No DOMException errors
- Compilation works normally
- AJAX requests succeed

### Test 5B: Cross-Origin Simulation

**Note**: This is harder to test without actual cross-origin setup

**Steps**:
1. Open browser console
2. Simulate cross-origin by blocking parent access:
```javascript
// Run this BEFORE loading Winden
Object.defineProperty(window, 'parent', {
  get() {
    throw new DOMException('Blocked a frame with origin "https://example.com" from accessing a cross-origin frame');
  }
});
```

3. Reload Winden page
4. Check console for errors
5. Try to save CSS

**✅ Pass Criteria**:
- Debug message: "[winden] Cross-origin parent access blocked, using fallback URL construction"
- No DOMException errors thrown
- AJAX URL constructed correctly as fallback
- Compilation still works

**❌ Fail Indicators**:
- Uncaught DOMException errors
- AJAX requests fail with wrong URL
- Compilation doesn't work

### Test 5C: Real Cross-Origin (Advanced)

**Steps** (requires setup):
1. Host WordPress on `https://example.com`
2. Embed Winden admin in iframe from `https://different-domain.com`
3. Check console for errors

**✅ Pass**: No errors, fallback URL works

---

## Test 6: Enhanced Error Messages

**What we're testing**: Error messages show phase, context, and suggestions

### Test 6A: SCSS Error

**Steps**:
1. Set preprocessor to **SCSS**
2. Add invalid SCSS:

```scss
.test {
  color: $undefined-variable;
  margin: ; // Missing value
}
```

3. Save
4. Check console error

**✅ Pass Criteria**:
Error message includes:
- **Phase**: `[SCSS]` or "SCSS compilation failed"
- **Context**: Line/column numbers
- **Suggestion**: "Check your SCSS syntax..."
- Error preview showing the problematic code

**Example Good Error**:
```
[SCSS] SCSS compilation failed: Undefined variable: "$undefined-variable"

Details:
  line: 2
  column: 10
  💡 Check your SCSS syntax. Common issues: missing semicolons, unmatched braces, invalid nesting.
```

**❌ Fail Indicators**:
- Generic error: "Compilation failed"
- No line numbers
- No suggestions
- No phase identification

### Test 6B: Plugin Loading Error

**Steps**:
1. Add bad plugin to config:
```javascript
export default {
  plugins: [
    'https://example.com/404-plugin.js'
  ]
}
```

2. Save
3. Check console

**✅ Pass Criteria**:
Error message includes:
- **Phase**: `[PLUGIN]` or "Plugin"
- **URL**: Shows the failing plugin URL
- **Suggestion**: "Check your internet connection and verify the plugin URL is correct"

**Example Good Error**:
```
[PLUGIN] Failed to load plugin from https://example.com/404-plugin.js

Details:
  pluginUrl: https://example.com/404-plugin.js
  originalError: HTTP 404 Not Found
  💡 Check your internet connection and verify the plugin URL is correct. Ensure the URL points to a valid JavaScript module.
```

### Test 6C: Tailwind Compilation Error

**Steps**:
1. Add invalid Tailwind class:
```css
@theme {
  --invalid-syntax here;
}
```

2. Save
3. Check console

**✅ Pass Criteria**:
Error message includes:
- **Phase**: `[TAILWIND]`
- **Context**: Shows problematic CSS
- **Suggestion**: "Check your @theme directive syntax..."

---

## Test 7: FNV-1a Hash Performance

**What we're testing**: Faster hashing for large CSS files

**Steps**:
1. Open browser console
2. Create large CSS file (copy-paste 1000+ lines)
3. Before saving, in console:
```javascript
console.time('hash-test');
```

4. Save the CSS
5. In console:
```javascript
console.timeEnd('hash-test');
```

**✅ Pass Criteria**:
- Hashing completes in <20ms for 100KB CSS
- No noticeable lag when saving
- Console shows reasonable time

**❌ Fail Indicators**:
- Hashing takes >100ms
- Browser freezes
- "Page Unresponsive" warning

**Benchmark Test** (in console):
```javascript
// Generate large CSS
const largeCss = '.test { color: red; }\n'.repeat(10000); // ~300KB

console.time('Hash 300KB CSS');
// Trigger save with this CSS
console.timeEnd('Hash 300KB CSS');
// Should complete in <50ms
```

---

## Test 8: loadStylesheet Callback

**What we're testing**: Better @import handling for Tailwind core and CDN

### Test 8A: Tailwind Core Import

**Steps**:
1. In style editor, add:
```css
@import "tailwindcss";

.test {
  @apply flex items-center;
}
```

2. Save
3. Check console and output

**✅ Pass Criteria**:
- Import resolves successfully
- No errors about missing imports
- Tailwind classes work

**❌ Fail Indicators**:
- Error: "Can't load stylesheet"
- Import is ignored
- Classes don't compile

### Test 8B: CDN Import

**Steps**:
1. Add CDN stylesheet:
```css
@import url("https://fonts.googleapis.com/css2?family=Roboto&display=swap");

body {
  font-family: 'Roboto', sans-serif;
}
```

2. Save
3. Check console

**✅ Pass Criteria**:
- CDN import fetches successfully
- No CORS errors
- Font loads correctly

**❌ Fail Indicators**:
- Error: "Failed to fetch stylesheet"
- CORS errors
- Import is ignored

---

## Summary Checklist

After running all tests, verify:

- [ ] ✅ **Test 1**: No global process.versions mutation
- [ ] ✅ **Test 2A**: URLs with `//` don't trigger SCSS mode
- [ ] ✅ **Test 2B**: Real SCSS is still detected
- [ ] ✅ **Test 3**: Autoprefixer removed, Lightning CSS works
- [ ] ✅ **Test 4**: No blob URL memory leaks
- [ ] ✅ **Test 5**: Cross-origin iframe protection works
- [ ] ✅ **Test 6A**: SCSS errors show phase and context
- [ ] ✅ **Test 6B**: Plugin errors show URL and suggestion
- [ ] ✅ **Test 6C**: Tailwind errors show context
- [ ] ✅ **Test 7**: Fast hashing for large CSS
- [ ] ✅ **Test 8A**: Tailwind core imports work
- [ ] ✅ **Test 8B**: CDN imports work

---

## If Tests Fail

**Check**:
1. Compiler was rebuilt: `npm run build:compiler`
2. Browser cache cleared (hard refresh: Cmd+Shift+R / Ctrl+Shift+F5)
3. WordPress object cache cleared
4. Correct file loaded: Check `build/compiler/tailwindcss-compiler.js` modification date

**Debug**:
1. Check browser console for specific errors
2. Look for line numbers in error messages
3. Compare error format to examples in this document
4. Check Network tab for AJAX request failures

**Report**:
If you find issues, note:
- Which test failed
- Error message received
- Expected vs actual behavior
- Browser and version
- Console screenshot if possible

---

## Performance Baseline

After all tests pass, record baseline metrics:

```javascript
// Run in console after all tests
console.log('=== Winden Compiler Test Results ===');
console.log('✅ All 8 test suites passed');
console.log('Compiler bundle size:', '950KB');
console.log('Average compilation time:', '<200ms'); // Measure yours
console.log('Memory usage:', performance.memory.usedJSHeapSize / 1024 / 1024, 'MB');
console.log('===================================');
```

Save these metrics to compare with future changes.

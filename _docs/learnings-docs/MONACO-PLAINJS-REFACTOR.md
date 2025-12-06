# Monaco PlainJS Language - Refactoring Summary

## Problem
The JavaScript Config tab in Winden was throwing console errors:
- `Missing requestHandler or method: getSyntacticDiagnostics`
- `Missing requestHandler or method: provideInlayHints`
- `Missing requestHandler or method: getCodeFixesAtPosition`
- `Missing requestHandler or method: getNavigationTree`

**Root Cause**: Monaco's built-in `javascript` language tries to use TypeScript language service, which requires `ts.worker.js`. We only build `css.worker.js` and `editor.worker.js`.

## Solution
Created a custom "plainjs" language that provides JavaScript syntax highlighting without TypeScript language service.

### File Structure

```
src/admin/
├── App.tsx (365 lines) ✅
│   └── Removed 130+ lines of Monaco config
│   └── Now imports registerPlainJSLanguage utility
│
└── utils/
    └── monacoPlainJS.ts (177 lines) ✨ NEW
        └── Dedicated Monaco language registration
```

### Benefits

✅ **Clean separation of concerns**:
- App.tsx: Application logic
- monacoPlainJS.ts: Monaco language configuration

✅ **Reusable**:
- Can be imported anywhere Monaco PlainJS is needed
- Easy to test in isolation

✅ **Maintainable**:
- All language config in one place
- Easy to update syntax highlighting rules
- Self-documented with JSDoc comments

✅ **Follows coding standards**:
- File size limits respected (App.tsx was getting large)
- Single responsibility principle
- Utility pattern for shared configuration

### What PlainJS Language Provides

**Syntax Highlighting**:
- Keywords: `export`, `default`, `const`, `function`, etc.
- Strings: `"..."`, `'...'`, `` `...` ``
- Numbers: integers, floats, hex, binary, octal
- Comments: `//` and `/* */`
- Operators: `=>`, `...`, `&&`, etc.
- Template literals with `${}` support

**Editor Features**:
- Auto-closing brackets `{}`, `[]`, `()`
- Auto-closing quotes `""`, `''`, ` `` `
- Comment toggling (Cmd+/)
- Proper indentation
- Bracket matching

**What's NOT Included** (by design):
- TypeScript type checking
- IntelliSense/autocomplete
- Code fixes
- Inlay hints
- Navigation tree
- Semantic validation

This is perfect for simple Tailwind v4 config editing!

## Usage in App.tsx

**Before** (198 lines of inline config):
```typescript
loader.init().then((monacoInstance) => {
  monacoInstance.languages.register({ id: 'plainjs' });
  monacoInstance.languages.setMonarchTokensProvider('plainjs', {
    // 130+ lines of configuration...
  });
  monacoInstance.languages.setLanguageConfiguration('plainjs', {
    // 50+ lines of configuration...
  });
});
```

**After** (3 lines):
```typescript
import { registerPlainJSLanguage } from '@/utils/monacoPlainJS';

loader.init().then(registerPlainJSLanguage);
```

## Testing

1. **Clear browser cache** (Cmd+Shift+R / Ctrl+Shift+F5)
2. **Open Config tab** in Winden admin
3. **Type Tailwind config**:
   ```javascript
   export default {
       theme: {
           extend: {
               colors: {
                   marko: 'red'
               }
           }
       }
   };
   ```
4. **Check console** - NO TypeScript worker errors should appear

## Technical Details

### Why This Works

1. **Custom language registration**: Monaco allows registering custom languages
2. **Monarch tokenizer**: Provides syntax highlighting without language service
3. **No worker dependency**: Uses only base `editor.worker.js`
4. **Zero TypeScript overhead**: No TS type checking, validation, or diagnostics

### Future Enhancements

If needed, we could add:
- Custom autocomplete for Tailwind config keys
- Validation for Tailwind v4 syntax
- Snippets for common config patterns
- Hover documentation for config options

But for now, simple syntax highlighting is perfect for the use case!

## Related Files

- [src/admin/utils/monacoPlainJS.ts](src/admin/utils/monacoPlainJS.ts) - PlainJS language registration
- [src/admin/App.tsx](src/admin/App.tsx) - Uses PlainJS for Config tab (line 340)
- [configs/esbuild.admin.config.js](configs/esbuild.admin.config.js) - Monaco worker build config

## Maintenance

To modify PlainJS syntax highlighting:
1. Edit `src/admin/utils/monacoPlainJS.ts`
2. Update the `tokenizer` rules
3. Rebuild: `npm run build:admin`

No need to touch App.tsx!

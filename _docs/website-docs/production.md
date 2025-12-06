# Production Settings

Two simple toggles to make your site faster. That's it!

**Location:** Settings → Production tab

---

## Disable Dev Mode

**One toggle changes everything.**

### Development Mode (Toggle OFF - Default)

✅ **What you get:**
- Live preview when you save changes
- Classes update instantly across all open tabs
- Autocomplete in page builders (Bricks, Oxygen, Gutenberg, etc.)

⚠️ **The tradeoff:**
- Loads extra scripts (950KB for the compiler + sync features)
- Slower page loads

**Use this while:** Building your site, designing pages, testing styles

---

### Production Mode (Toggle ON)

✅ **What you get:**
- Only your compiled CSS loads (typically 10-30KB)
- 30-100x smaller page weight
- Much faster page loads

❌ **What you lose:**
- No autocomplete in page builders
- No live preview
- No real-time sync

**Use this when:** Your site is live and you rarely change styles

---

### How to Switch

1. Go to Settings → Production
2. Toggle "Disable Dev Mode" on or off
3. Save
4. Refresh your site

**That's it!** No rebuild, no complicated setup.

---

## Inline Compiled CSS

**Another simple toggle for faster loading.**

### External File (Toggle OFF - Default)

Your CSS loads as a separate file:
```html
<link rel="stylesheet" href="/wp-content/uploads/winden/output.css">
```

✅ **Good:**
- Browser caches it (useful if CSS changes frequently)

❌ **Bad:**
- Extra HTTP request
- Can cause page flicker while CSS loads

---

### Inline in HTML (Toggle ON)

Your CSS loads inside the HTML:
```html
<style>
  /* Your CSS here (10-30KB) */
</style>
```

✅ **Good:**
- No extra HTTP request
- No page flicker - CSS loads instantly
- Perfect for small files (10-20KB is nothing!)
- Faster initial page load

❌ **Bad:**
- No browser caching (but with only 10-20KB, who cares?)

---

## Which Settings Should I Use?

### While Building Your Site
```
Disable Dev Mode: OFF
Inline CSS: ON
```
You need autocomplete and live preview. Inline CSS prevents page flicker and is fast since Tailwind CSS is only 10-20KB.

### Live Site (Still Editing Sometimes)
```
Disable Dev Mode: OFF
Inline CSS: ON
```
Keep autocomplete, get instant CSS load with no flicker.

### Live Site (Rarely Change Styles)
```
Disable Dev Mode: ON
Inline CSS: ON
```
Maximum speed. Inline is better for small CSS files - no extra HTTP request, no page flicker.

---

## Quick Questions

**Q: Will my site break if I turn on Production Mode?**
No! Your CSS is always compiled and ready.

**Q: Can I switch back and forth?**
Yes! Toggle as many times as you want.

**Q: Which is faster?**
Production Mode is always faster - it loads way less JavaScript.

**Q: Can I use autocomplete in Production Mode?**
No. You need Development Mode for autocomplete.

**Q: Should I use Inline CSS?**
Yes! For small CSS files (10-20KB), inline is faster - no extra HTTP request, no page flicker. External files only make sense if your CSS is huge or changes constantly.

**Q: How big is my CSS file?**
Check `/wp-content/uploads/winden/output.css` - usually 10-30KB.

---

## Testing Performance

**Before enabling Production Mode:**
1. Test your site at [PageSpeed Insights](https://pagespeed.web.dev/)
2. Note the score

**After enabling Production Mode:**
1. Test again
2. Compare scores

You'll see:
- Faster page load (200-500ms faster)
- Smaller page size (900KB+ smaller!)
- Better performance score

---

## Troubleshooting

**Styles not updating?**
- Clear browser cache (Cmd+Shift+R / Ctrl+F5)
- Clear caching plugin

**Autocomplete stopped working?**
- Check if "Disable Dev Mode" is ON
- Turn it OFF to re-enable autocomplete

**Site slow in Development Mode?**
- Normal! Development Mode loads extra scripts
- Switch to Production Mode for speed

---

That's all! Two toggles, huge performance gains.

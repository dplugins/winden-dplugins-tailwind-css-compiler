# Real-Time Cross-Tab Synchronization

Winden uses the **BroadcastChannel API** to sync changes across all open tabs in real-time. When you save in the admin panel, all open tabs (editors, frontend, other admin tabs) instantly receive and apply the updates.

## How It Works

```
┌─────────────────┐
│  Winden Admin   │  User saves changes
│   (Save Button) │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────┐
│  BroadcastChannel ('winden-updates') │
│  Broadcasts message to all tabs   │
└────────┬──────────┬───────┬──────┘
         │          │       │
    ┌────▼────┐ ┌──▼───┐ ┌─▼────────┐
    │Frontend │ │Editor│ │Other Tab │
    │Preview  │ │(Bricks)│ │  Admin  │
    └─────────┘ └──────┘ └──────────┘
    All tabs update instantly!
```

## Message Types

### 1. CONTENT_SAVED
Broadcast when user saves in admin panel (Config, Style, or Wizzard tabs)

**Payload:**
```javascript
{
  type: 'CONTENT_SAVED',
  timestamp: 1234567890,
  data: {
    javascript: 'base64_encoded_js_config',
    scss: 'base64_encoded_scss',
    wizzard: 'base64_encoded_wizzard_state',
    css: 'base64_encoded_compiled_css'
  }
}
```

**What happens in receiving tabs:**
1. Updates compiled CSS in `<style id="winden-compiled-css">`
2. Refreshes Tailwind config if `window.refreshFullTailwindConfig` exists
3. Shows brief notification (in admin/editor contexts)
4. Triggers `winden:content-updated` custom event

### 2. WIZZARD_UPDATED
Broadcast when Wizzard state changes (design tokens)

**Payload:**
```javascript
{
  type: 'WIZZARD_UPDATED',
  timestamp: 1234567890,
  data: {
    wizzard: 'base64_encoded_wizzard_state'
  }
}
```

**What happens in receiving tabs:**
1. Updates Wizzard config in Tailwind
2. Triggers `winden:wizzard-updated` custom event

### 3. SETTINGS_UPDATED
Broadcast when plugin settings change

**Payload:**
```javascript
{
  type: 'SETTINGS_UPDATED',
  timestamp: 1234567890,
  data: {
    settings: { /* settings object */ }
  }
}
```

### 4. CACHE_CLEARED
Broadcast when cache is cleared

**Payload:**
```javascript
{
  type: 'CACHE_CLEARED',
  timestamp: 1234567890
}
```

## Browser Support

**BroadcastChannel API** is supported in:
- ✅ Chrome 54+
- ✅ Firefox 38+
- ✅ Safari 15.4+
- ✅ Edge 79+
- ❌ IE 11 (degrades gracefully - no real-time sync)

If not supported, Winden works normally without cross-tab sync.

## Implementation

### Admin Side (Sender)

**Location:** [src/admin/functions/HandleSave.ts](../src/admin/functions/HandleSave.ts)

```typescript
import { windenBroadcast } from '@/utils/broadcastChannel';

// After successful save
windenBroadcast.postMessage({
  type: 'CONTENT_SAVED',
  timestamp: Date.now(),
  data: {
    javascript: data.javascript,
    scss: data.scss,
    wizzard: data.wizzard,
    css: data.css,
  },
});
```

### Frontend/Editor Side (Receiver)

**Location:** [assets/broadcast-listener.js](../assets/broadcast-listener.js)

```javascript
const channel = new BroadcastChannel('winden-updates');

channel.onmessage = function(event) {
  const message = event.data;

  switch (message.type) {
    case 'CONTENT_SAVED':
      // Update CSS and config
      updateCompiledCSS(message.data.css);
      updateTailwindConfig(message.data);
      break;
  }
};
```

## Custom Events

You can listen for Winden updates in your own code:

```javascript
// Listen for content updates
window.addEventListener('winden:content-updated', (event) => {
  console.log('Winden content updated:', event.detail);
  // event.detail contains the broadcast data
});

// Listen for Wizzard updates
window.addEventListener('winden:wizzard-updated', (event) => {
  console.log('Wizzard updated:', event.detail);
});

// Listen for settings updates
window.addEventListener('winden:settings-updated', (event) => {
  console.log('Settings updated:', event.detail);
});

// Listen for cache cleared
window.addEventListener('winden:cache-cleared', () => {
  console.log('Cache cleared');
});
```

## Advanced API

The broadcast listener exposes an API for advanced users:

```javascript
// Access the channel directly
window.windenBroadcastListener.channel;

// Subscribe to custom events
window.windenBroadcastListener.on('content-updated', (event) => {
  console.log('Content updated:', event.detail);
});

// Unsubscribe
window.windenBroadcastListener.off('content-updated', callback);
```

## Performance

- **Debounced updates**: 500ms debounce prevents too frequent updates
- **Minimal payload**: Only base64-encoded data (no large objects)
- **No polling**: Event-driven architecture (zero CPU when idle)
- **Instant updates**: Typical latency < 50ms across tabs

## Benefits

1. **Instant preview updates** - See changes on frontend immediately
2. **Multi-tab editing** - Edit in admin, preview in another tab
3. **Better DX** - No manual refresh needed
4. **Works with page builders** - Bricks, Oxygen, Elementor editors update too
5. **Zero configuration** - Works automatically when supported

## Troubleshooting

### Updates not working?

1. **Check browser support:**
   ```javascript
   console.log('BroadcastChannel supported:', typeof BroadcastChannel !== 'undefined');
   ```

2. **Check console for errors:**
   - Look for `[Winden Broadcast]` messages
   - Verify channel is initialized

3. **Verify dev mode is enabled:**
   - Broadcast listener only loads when dev mode is enabled
   - Check Settings > Production > "Disable Dev Mode" is OFF

4. **Check same origin:**
   - BroadcastChannel only works within same origin (domain + protocol)
   - Admin and frontend must be on same domain

### Testing

**Open two tabs:**
1. Tab 1: Winden admin (`/wp-admin/admin.php?page=winden`)
2. Tab 2: Frontend page (`/`)

**Make changes in Tab 1:**
- Edit CSS in Style tab
- Change colors in Wizzard
- Click Save

**Tab 2 should:**
- Update CSS instantly
- Show notification (if in admin/editor context)
- Apply new styles without refresh

## Files

- [src/admin/utils/broadcastChannel.ts](../src/admin/utils/broadcastChannel.ts) - BroadcastChannel wrapper
- [src/admin/functions/HandleSave.ts](../src/admin/functions/HandleSave.ts) - Sender implementation
- [assets/broadcast-listener.js](../assets/broadcast-listener.js) - Receiver implementation
- [App/Assets/Providers/Frontend.php](../App/Assets/Providers/Frontend.php) - Enqueue listener

## Limitations

1. **Same origin only** - Won't work across different domains
2. **No persistent storage** - Messages are ephemeral (not stored)
3. **No history** - Late-joining tabs don't receive past messages
4. **Browser support** - Gracefully degrades in unsupported browsers

## Future Enhancements

Potential improvements:
- ServiceWorker-based sync for offline support
- WebSocket fallback for real-time server sync
- Conflict resolution for simultaneous edits
- Update history/undo across tabs

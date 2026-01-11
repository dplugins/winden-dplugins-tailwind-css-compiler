/**
 * Winden BroadcastChannel Listener
 *
 * Listens for updates from the Winden admin panel and applies changes in real-time
 * Works on: Frontend, page builders, other admin tabs
 *
 * This file is vanilla JavaScript (no React/TypeScript) for maximum compatibility
 */

(function() {
  'use strict';

  // Configuration
  const DEBUG = false; // Set to true to enable detailed logging
  const DEBOUNCE_DELAY = 500;
  const NOTIFICATION_DURATION = 2000;

  // Check BroadcastChannel support
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('[Winden Broadcast] BroadcastChannel not supported in this browser');
    return;
  }

  let channel;
  const debounceTimers = new Map(); // Separate timer for each handler
  let animationStylesInjected = false;

  // Initialize channel
  try {
    channel = new BroadcastChannel('winden-updates');
    if (DEBUG) console.log('[Winden Broadcast] Channel initialized');
  } catch (error) {
    console.error('[Winden Broadcast] Failed to initialize:', error);
    return;
  }

  /**
   * Debug logger - only logs if DEBUG flag is enabled
   */
  const log = (...args) => {
    if (DEBUG) console.log('[Winden Broadcast]', ...args);
  };

  /**
   * Debounce function with separate timers per key
   */
  function debounce(func, wait, key) {
    return function executedFunction(...args) {
      if (debounceTimers.has(key)) {
        clearTimeout(debounceTimers.get(key));
      }
      const timer = setTimeout(() => {
        debounceTimers.delete(key);
        func(...args);
      }, wait);
      debounceTimers.set(key, timer);
    };
  }

  /**
   * Helper to create or get style element
   */
  function getOrCreateStyleElement(id) {
    let existingEl = document.getElementById(id);
    let styleEl;

    if (existingEl) {
      // Replace LINK with STYLE for instant updates
      if (existingEl.tagName === 'LINK') {
        log('Replacing <link> with <style> for', id);
        styleEl = document.createElement('style');
        styleEl.id = id;
        styleEl.type = 'text/css';
        existingEl.parentNode.replaceChild(styleEl, existingEl);
      } else {
        styleEl = existingEl;
      }
    } else {
      log('Creating new <style> element for', id);
      styleEl = document.createElement('style');
      styleEl.id = id;
      styleEl.type = 'text/css';
      document.head.appendChild(styleEl);
    }

    return styleEl;
  }

  /**
   * Update compiled CSS on the page
   */
  function updateCompiledCSS(cssBase64) {
    try {
      const cssContent = atob(cssBase64);

      // Skip CSS with @import statements - these would trigger 404 network requests
      // The recompilation triggered by updateTailwindConfig will handle this properly
      if (cssContent.includes('@import')) {
        return;
      }

      const styleEl = getOrCreateStyleElement('winden-compiled-css');
      styleEl.textContent = cssContent;

      log('CSS updated, length:', cssContent.length);
    } catch (error) {
      console.error('[Winden Broadcast] Error updating CSS:', error);
    }
  }

  /**
   * Force recompilation by clearing cached config files in the watcher
   */
  function forceRecompilation() {
    log('Forcing recompilation...');

    const compileOptions = {
      force: true,
      reloadFiles: true,
      invalidateCssCache: true
    };

    let compiled = false;

    // Primary method: window.compile (from tailwindcss-watcher.js)
    if (typeof window.compile === 'function') {
      try {
        window.compile(compileOptions);
        log('Recompilation requested via window.compile');
        compiled = true;
      } catch (error) {
        console.error('[Winden Broadcast] Failed to call window.compile:', error);
      }
    }

    // Fallback: Try to find compile function in iframes (Oxygen6, Bricks, etc.)
    // The watcher runs inside the iframe and sets window.compile there
    if (!compiled) {
      const iframeSelectors = [
        'iframe[src*="breakdance_iframe"]',
        'iframe[src*="oxygen"]',
        'iframe.breakdance-iframe',
        'iframe#preview-iframe',
        'iframe[name="editor-canvas"]',
        'iframe[src*="bricks"]'
      ];

      for (const selector of iframeSelectors) {
        try {
          const iframe = document.querySelector(selector);
          if (iframe && iframe.contentWindow && typeof iframe.contentWindow.compile === 'function') {
            iframe.contentWindow.compile(compileOptions);
            log('Recompilation requested via iframe.contentWindow.compile');
            compiled = true;
            break;
          }
        } catch (e) {
          // Cross-origin access blocked, continue trying
        }
      }
    }

    if (!compiled) {
      log('window.compile not available in window or iframes');
    }

    // Legacy fallback: clear cache directly
    if (typeof window.loadedData !== 'undefined') {
      window.loadedData['tailwind.config.js'] = '';
      window.loadedData['style-tab.css'] = '';

      if (typeof window.hasLoadedData !== 'undefined') {
        window.hasLoadedData['tailwind.config.js'] = false;
        window.hasLoadedData['style-tab.css'] = false;
      }

      log('Legacy watcher cache cleared');
    }
  }

  /**
   * Decode base64 JSON payload safely
   */
  function decodeBase64Json(value) {
    if (!value || typeof value !== 'string') return null;
    try {
      const decoded = atob(value);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('[Winden Broadcast] Failed to decode wizzard payload:', error);
      return null;
    }
  }

  /**
   * Extract configCode string from supported payload formats
   */
  function extractConfigCode(payload) {
    if (!payload) return '';

    const getCode = (entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return entry;
      const code = entry.configCode || entry.config_code;
      return typeof code === 'string' ? code : '';
    };

    if (Array.isArray(payload)) {
      for (const item of payload) {
        const code = getCode(item);
        if (code && code.trim().length > 0) {
          return code;
        }
      }
      return '';
    }

    return getCode(payload);
  }

  /**
   * Resolve @config directive for compiler options
   */
  function resolveConfigDirective(targetWindow, currentCustomCss) {
    if (typeof currentCustomCss === 'string') {
      const match = currentCustomCss.match(/@config[^;]+;/);
      if (match && match[0]) {
        return match[0].trim();
      }
    }

    const getUploadUrl = () => {
      if (targetWindow?.uploadUrl) return targetWindow.uploadUrl;
      if (window.uploadUrl) return window.uploadUrl;
      try {
        if (window.parent && window.parent !== window && window.parent.uploadUrl) {
          return window.parent.uploadUrl;
        }
      } catch (error) {
        // Ignore cross-origin access errors
      }
      return '';
    };

    const uploadBase = getUploadUrl();
    if (!uploadBase) return '';

    const normalized = uploadBase.replace(/\/$/, '');
    return `@config "${normalized}/winden/tailwind.config.js";`;
  }

  /**
   * Update global compiler options with new Wizard config code
   */
  function updateCompilerCustomCss(wizzardPayload) {
    if (!wizzardPayload) return false;

    const payload = typeof wizzardPayload === 'string'
      ? decodeBase64Json(wizzardPayload)
      : wizzardPayload;

    if (!payload) return false;

    const configCode = extractConfigCode(payload);
    if (!configCode || !configCode.trim()) {
      return false;
    }

    const trimmedConfig = configCode.trim();
    let didUpdate = false;

    const applyToWindow = (target) => {
      if (!target) return;

      const compilerOptions = target.tailwind_compiler_options || {};
      const directive = resolveConfigDirective(target, compilerOptions.custom_css);
      const newCustomCss = directive
        ? `${directive}\n${trimmedConfig}`
        : trimmedConfig;

      if (compilerOptions.custom_css === newCustomCss) {
        return;
      }

      compilerOptions.custom_css = newCustomCss;
      target.tailwind_compiler_options = compilerOptions;
      didUpdate = true;
    };

    applyToWindow(window);
    try {
      if (window.parent && window.parent !== window) {
        applyToWindow(window.parent);
      }
    } catch (error) {
      // Ignore cross-origin access issues
    }

    // Also apply to iframes (for Oxygen6, Bricks, etc.)
    const iframeSelectors = [
      'iframe[src*="breakdance_iframe"]',
      'iframe[src*="oxygen"]',
      'iframe.breakdance-iframe',
      'iframe#preview-iframe',
      'iframe[name="editor-canvas"]',
      'iframe[src*="bricks"]'
    ];

    for (const selector of iframeSelectors) {
      try {
        const iframe = document.querySelector(selector);
        if (iframe && iframe.contentWindow) {
          applyToWindow(iframe.contentWindow);
        }
      } catch (e) {
        // Cross-origin access blocked, continue trying
      }
    }

    return didUpdate;
  }

  /**
   * Update Tailwind config and trigger recompilation
   */
  function updateTailwindConfig(data) {
    try {
      log('Updating Tailwind config');

      if (data?.wizzard) {
        const updated = updateCompilerCustomCss(data.wizzard);
        if (updated) {
          log('Tailwind compiler options updated from Wizzard data');
        }
      }

      // Always try forceRecompilation first - it now handles iframe contexts
      // forceRecompilation() will find window.compile in current window or iframes
      forceRecompilation();
    } catch (error) {
      console.error('[Winden Broadcast] Error updating config:', error);
    }
  }

  /**
   * Inject animation styles once
   */
  function injectAnimationStyles() {
    if (animationStylesInjected) return;

    const style = document.createElement('style');
    style.id = 'winden-notification-animations';
    style.textContent = `
      @keyframes windenFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes windenFadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(10px); }
      }
    `;
    document.head.appendChild(style);
    animationStylesInjected = true;
  }

  /**
   * Show brief visual notification of update
   */
  function showUpdateNotification(message) {
    // Only show in admin/editor contexts (not frontend)
    if (!window.location.pathname.includes('wp-admin') &&
        !document.querySelector('[class*="editor"]') &&
        !document.querySelector('[class*="builder"]')) {
      return;
    }

    // Ensure animation styles are injected
    injectAnimationStyles();

    // Remove existing notification
    const existing = document.getElementById('winden-update-notification');
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement('div');
    notification.id = 'winden-update-notification';
    notification.textContent = `Winden: ${message}`;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999999;
      animation: windenFadeIn 0.3s ease-in-out;
    `;

    document.body.appendChild(notification);

    // Remove after delay
    setTimeout(() => {
      notification.style.animation = 'windenFadeOut 0.3s ease-in-out';
      setTimeout(() => notification.remove(), 300);
    }, NOTIFICATION_DURATION);
  }

  /**
   * Handle CONTENT_SAVED message
   */
  const handleContentSaved = debounce(function(data) {
    log('Content saved event received');

    // Update CSS if available
    if (data.css) {
      updateCompiledCSS(data.css);
    }

    // Update config if available
    if (data.javascript || data.wizzard || data.scss) {
      updateTailwindConfig(data);
    }

    // Trigger custom event for advanced integrations
    window.dispatchEvent(new CustomEvent('winden:content-updated', { detail: data }));
  }, DEBOUNCE_DELAY, 'content-saved');

  /**
   * Handle WIZZARD_UPDATED message
   */
  const handleWizzardUpdated = debounce(function(data) {
    log('Wizzard updated event received');

    // Update Wizzard config
    if (data.wizzard) {
      updateTailwindConfig(data);
    }

    // Trigger custom event
    window.dispatchEvent(new CustomEvent('winden:wizzard-updated', { detail: data }));
  }, DEBOUNCE_DELAY, 'wizzard-updated');

  /**
   * Handle SETTINGS_UPDATED message
   */
  function handleSettingsUpdated(data) {
    log('Settings updated event received');

    // Trigger custom event
    window.dispatchEvent(new CustomEvent('winden:settings-updated', { detail: data }));

    // Notification removed - silent update
  }

  /**
   * Handle CACHE_CLEARED message
   */
  function handleCacheCleared() {
    log('Cache cleared event received');

    // Force recompilation if available
    if (typeof window.compile === 'function') {
      forceRecompilation();
    }

    // Trigger custom event
    window.dispatchEvent(new CustomEvent('winden:cache-cleared'));

    // Notification removed - silent update
  }

  /**
   * Main message handler
   */
  channel.onmessage = function(event) {
    const message = event.data;
    log('Received:', message.type);

    switch (message.type) {
      case 'CONTENT_SAVED':
        handleContentSaved(message.data);
        break;
      case 'WIZZARD_UPDATED':
        handleWizzardUpdated(message.data);
        break;
      case 'SETTINGS_UPDATED':
        handleSettingsUpdated(message.data);
        break;
      case 'CACHE_CLEARED':
        handleCacheCleared();
        break;
      default:
        log('Unknown message type:', message.type);
    }
  };

  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (channel) {
      channel.close();
      log('Channel closed');
    }
  });

  // Expose API for advanced users
  window.windenBroadcastListener = {
    channel: channel,
    on: function(eventType, callback) {
      window.addEventListener('winden:' + eventType, callback);
    },
    off: function(eventType, callback) {
      window.removeEventListener('winden:' + eventType, callback);
    },
    // Enable debug logging at runtime
    enableDebug: function() {
      window.WINDTACS_BROADCAST_DEBUG = true;
    }
  };

  log('Ready');
})();

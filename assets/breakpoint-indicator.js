/**
 * Winden Breakpoint Indicator
 *
 * Displays current responsive breakpoint in bottom-right corner for logged-in users.
 * Shows breakpoint name and screen width, updates in real-time on window resize.
 *
 * Breakpoint sources (in priority order):
 * 1. extractStyleGuideConfig - Extracts from Wizzard @theme config (primary)
 * 2. CSS custom properties - Parses --breakpoint-* from stylesheets (fallback)
 * 3. PHP-provided data - From windenBreakpoints global (fallback)
 * 4. Tailwind defaults - sm/md/lg/xl/2xl hardcoded (final fallback)
 *
 * This file is vanilla JavaScript (no React/TypeScript) for maximum compatibility
 */

(function () {
  'use strict';

  // Tailwind default breakpoints (used as final fallback)
  const DEFAULT_BREAKPOINTS = [
    { name: 'sm', value: 640 },
    { name: 'md', value: 768 },
    { name: 'lg', value: 1024 },
    { name: 'xl', value: 1280 },
    { name: '2xl', value: 1536 }
  ];

  /**
   * Extract breakpoints from CSS custom properties (fallback method)
   */
  function extractBreakpointsFromCSS() {
    const breakpoints = [];
    const styleSheets = Array.from(document.styleSheets);

    for (const sheet of styleSheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          if (rule.cssText && rule.cssText.includes('--breakpoint-')) {
            const matches = rule.cssText.matchAll(/--breakpoint-([^:]+):\s*([^;]+);/g);
            for (const match of matches) {
              const name = match[1];
              const value = match[2].trim();
              if (name !== '*' && value !== 'initial') {
                const numericValue = parseInt(value);
                if (!isNaN(numericValue)) {
                  breakpoints.push({ name, value: numericValue });
                }
              }
            }
          }
        }
      } catch (e) {
        // Ignore CORS errors from external stylesheets
        continue;
      }
    }

    return breakpoints;
  }

  /**
   * Fetch editor content from backend
   */
  async function fetchEditorContent() {
    let wizardContent = '';
    let windenStylesContent = '';

    // Try to get wizard content from immediate sources
    if (window.winden_editor?.wizzard?.configCode) {
      wizardContent = window.winden_editor.wizzard.configCode;
    }

    if (window.winden_editor?.scss) {
      windenStylesContent = window.winden_editor.scss;
    }

    // If not available, try backend
    if (!wizardContent) {
      try {
        // Get AJAX URL (handle various scenarios)
        let ajaxUrl;
        if (window.windenData?.ajaxUrl) {
          ajaxUrl = window.windenData.ajaxUrl;
        } else if (window.windenAutoCompile?.ajaxUrl) {
          ajaxUrl = window.windenAutoCompile.ajaxUrl;
        } else {
          // Fallback: construct from current location
          const currentPath = window.location.pathname;
          const wpAdminIndex = currentPath.indexOf('/wp-admin/');
          const basePath = wpAdminIndex > 0 ? currentPath.substring(0, wpAdminIndex) : '';
          ajaxUrl = window.location.origin + basePath + '/wp-admin/admin-ajax.php';
        }

        ajaxUrl += '?action=winden_get_content';
        const response = await fetch(ajaxUrl);

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            wizardContent = data.data.wizzard?.configCode || '';
            windenStylesContent = data.data.scss ? atob(data.data.scss) : '';
          }
        }
      } catch (error) {
        // Silently fail - will use fallback breakpoints
      }
    }

    return { wizardContent, windenStylesContent };
  }

  /**
   * Get breakpoints from Wizzard config or use defaults
   */
  async function getBreakpoints() {
    // Check if extractStyleGuideConfig is available (requires dev mode)
    if (typeof window.extractStyleGuideConfig !== 'function') {
      return {
        error: 'Enable dev mode in Settings > Production to see custom breakpoints',
        breakpoints: DEFAULT_BREAKPOINTS
      };
    }

    // Extract from Wizzard config
    try {
      const { wizardContent, windenStylesContent } = await fetchEditorContent();
      const result = await window.extractStyleGuideConfig('', wizardContent, windenStylesContent);

      if (result?.success && result.config?.theme?.screens) {
        const screens = result.config.theme.screens;
        const breakpoints = Object.entries(screens).map(([name, value]) => {
          // Convert rem to pixels (1rem = 16px by default)
          let pixelValue = parseInt(value);
          if (typeof value === 'string' && value.includes('rem')) {
            const remValue = parseFloat(value);
            pixelValue = Math.round(remValue * 16);
          }
          return {
            name,
            value: pixelValue
          };
        });

        if (breakpoints.length > 0) {
          return { breakpoints };
        }
      }
    } catch (error) {
      // Silently fail and try fallbacks
    }

    // Fallback 1: Extract from CSS
    const cssBreakpoints = extractBreakpointsFromCSS();
    if (cssBreakpoints.length > 0) {
      return { breakpoints: cssBreakpoints };
    }

    // Fallback 2: Tailwind defaults
    return {
      breakpoints: DEFAULT_BREAKPOINTS
    };
  }

  let sortedBreakpoints = [];
  let indicatorElement = null;
  let selectedBreakpoint = null; // Track manually selected breakpoint

  /**
   * Calculate current breakpoint based on window width
   *
   * Mobile-first approach: Find the largest breakpoint that fits current width
   *
   * @returns {Object} { name: string, value: number, width: number }
   */
  function getCurrentBreakpoint() {
    const width = window.innerWidth;
    let currentBreakpoint = null;

    // Mobile-first: Find largest breakpoint <= current width
    for (let i = sortedBreakpoints.length - 1; i >= 0; i--) {
      if (width >= sortedBreakpoints[i].value) {
        currentBreakpoint = sortedBreakpoints[i];
        break;
      }
    }

    // If no breakpoint matches, we're below the smallest breakpoint
    if (!currentBreakpoint && sortedBreakpoints.length > 0) {
      // Show as "< sm" or "< smallest"
      const smallest = sortedBreakpoints[0];
      return {
        name: `< ${smallest.name}`,
        value: smallest.value,
        width: width,
        isBelow: true
      };
    }

    return {
      name: currentBreakpoint ? currentBreakpoint.name : 'unknown',
      value: currentBreakpoint ? currentBreakpoint.value : 0,
      width: width,
      isBelow: false
    };
  }

  /**
   * Create indicator DOM element with select dropdown or buttons
   */
  function createIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'winden-breakpoint-indicator';
    indicator.className = 'winden-breakpoint-indicator';

    // Inner content wrapper
    const content = document.createElement('div');
    content.className = 'winden-breakpoint-content';

    // Check if we're in preview mode
    const isPreviewMode = document.getElementById('winden-breakpoint-iframe-wrapper') !== null;

    if (isPreviewMode) {
      // Group breakpoints by value to handle duplicates
      const groupedBreakpoints = [];
      const processedValues = new Set();

      sortedBreakpoints.forEach((bp) => {
        if (!processedValues.has(bp.value)) {
          // Find all breakpoints with this value
          const duplicates = sortedBreakpoints.filter(b => b.value === bp.value);

          groupedBreakpoints.push({
            value: bp.value,
            names: duplicates.map(b => b.name),
            indices: sortedBreakpoints
              .map((b, i) => b.value === bp.value ? i : -1)
              .filter(i => i !== -1)
          });

          processedValues.add(bp.value);
        }
      });

      // Show buttons in preview mode
      groupedBreakpoints.forEach(group => {
        const button = document.createElement('button');
        button.className = 'winden-breakpoint-button';
        // If multiple names, join with comma
        button.textContent = group.names.join(', ');
        button.dataset.width = group.value;
        button.dataset.indices = JSON.stringify(group.indices);
        button.addEventListener('click', () => handleBreakpointButtonClick(group.indices[0]));
        content.appendChild(button);
      });

      indicator.appendChild(content);

      // Add exit button outside content wrapper
      const exitBtn = document.createElement('button');
      exitBtn.className = 'winden-breakpoint-button winden-breakpoint-exit';
      exitBtn.textContent = '✕ Exit';
      exitBtn.addEventListener('click', exitPreviewMode);
      indicator.appendChild(exitBtn);
    } else {
      // Show select dropdown in normal mode
      const select = document.createElement('select');
      select.className = 'winden-breakpoint-select';

      // Populate select with breakpoints
      sortedBreakpoints.forEach(bp => {
        const option = document.createElement('option');
        option.value = bp.value;
        option.textContent = bp.name;
        select.appendChild(option);
      });

      // Handle breakpoint change
      select.addEventListener('change', handleBreakpointChange);

      // Screen width display
      const widthEl = document.createElement('span');
      widthEl.className = 'winden-breakpoint-width';

      content.appendChild(select);
      content.appendChild(widthEl);

      indicator.appendChild(content);
    }

    document.body.appendChild(indicator);

    return indicator;
  }

  /**
   * Handle breakpoint button click in preview mode
   */
  function handleBreakpointButtonClick(index) {
    const selectedBp = sortedBreakpoints[index];
    // Store both the breakpoint data and its index
    selectedBreakpoint = { ...selectedBp, index };

    const iframe = document.getElementById('winden-breakpoint-iframe');
    if (iframe) {
      iframe.style.width = selectedBp.value + 'px';
      iframe.style.height = 'calc(100vh - 60px)';
    }

    // Find all breakpoints with same value for grouped display
    const duplicates = sortedBreakpoints.filter(b => b.value === selectedBp.value);
    const groupedNames = duplicates.map(b => b.name).join(', ');

    showTooltip('Viewing at ' + groupedNames + ' (' + selectedBp.value + 'px)');

    // Refresh indicator to update active button state
    refreshIndicator();
  }

  /**
   * Exit preview mode
   */
  function exitPreviewMode() {
    const wrapper = document.getElementById('winden-breakpoint-iframe-wrapper');

    if (wrapper) wrapper.remove();

    selectedBreakpoint = null;
    showTooltip('Preview mode closed');

    // Remove keyboard shortcuts listener
    document.removeEventListener('keydown', handleKeyboardShortcuts);

    // Refresh indicator to show select dropdown again
    refreshIndicator();
  }

  /**
   * Handle keyboard shortcuts in preview mode
   */
  function handleKeyboardShortcuts(event) {
    const isPreviewMode = document.getElementById('winden-breakpoint-iframe-wrapper') !== null;
    if (!isPreviewMode) return;

    // ESC - Exit preview mode
    if (event.key === 'Escape' || event.key === 'Esc') {
      exitPreviewMode();
      return;
    }

    // Cmd/Ctrl + Arrow Left/Right - Navigate between unique breakpoint values
    if ((event.metaKey || event.ctrlKey) && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();

      // Get unique values in sorted order
      const uniqueValues = [...new Set(sortedBreakpoints.map(bp => bp.value))].sort((a, b) => a - b);

      // Find current value
      const currentValue = selectedBreakpoint ? selectedBreakpoint.value : uniqueValues[0];
      const currentValueIndex = uniqueValues.indexOf(currentValue);

      let newValueIndex;
      if (event.key === 'ArrowLeft') {
        // Go to previous unique value (stop at smallest)
        newValueIndex = currentValueIndex > 0 ? currentValueIndex - 1 : currentValueIndex;
      } else {
        // Go to next unique value (stop at biggest)
        newValueIndex = currentValueIndex < uniqueValues.length - 1 ? currentValueIndex + 1 : currentValueIndex;
      }

      // Only navigate if value changed
      if (newValueIndex !== currentValueIndex) {
        const newValue = uniqueValues[newValueIndex];
        // Find first breakpoint with this value
        const newIndex = sortedBreakpoints.findIndex(bp => bp.value === newValue);
        handleBreakpointButtonClick(newIndex);
      }
    }
  }

  /**
   * Handle breakpoint selection change - wraps page in resizable iframe
   */
  function handleBreakpointChange(event) {
    const selectedWidth = parseInt(event.target.value);
    const selectedBpIndex = sortedBreakpoints.findIndex(bp => bp.value === selectedWidth);
    const selectedBp = sortedBreakpoints[selectedBpIndex];

    // Store the selected breakpoint with its index
    selectedBreakpoint = { ...selectedBp, index: selectedBpIndex };

    // Check if iframe wrapper already exists
    let iframeWrapper = document.getElementById('winden-breakpoint-iframe-wrapper');
    let iframe = document.getElementById('winden-breakpoint-iframe');

    if (!iframeWrapper) {
      // Create iframe wrapper for the first time
      createIframeWrapper(selectedWidth);

      // Add keyboard shortcuts listener for preview mode
      document.addEventListener('keydown', handleKeyboardShortcuts);

      // Refresh indicator to show buttons instead of dropdown
      refreshIndicator();
    } else {
      // Resize existing iframe to selected breakpoint
      if (iframe) {
        iframe.style.width = selectedWidth + 'px';
        iframe.style.height = 'calc(100vh - 60px)'; // Leave room for indicator
      }
    }

    showTooltip('Viewing at ' + selectedBp.name + ' (' + selectedWidth + 'px)');
  }

  /**
   * Create iframe wrapper that contains the current page
   */
  function createIframeWrapper(width) {
    // Save current scroll position
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Create wrapper overlay
    const wrapper = document.createElement('div');
    wrapper.id = 'winden-breakpoint-iframe-wrapper';
    wrapper.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      background: #2d2d2d;
      z-index: 999998;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow: auto;
      padding: 20px;
    `;

    // Create iframe with current page
    const iframe = document.createElement('iframe');
    iframe.id = 'winden-breakpoint-iframe';
    iframe.src = window.location.href;
    iframe.style.cssText = `
      width: ${width}px;
      height: calc(100vh - 60px);
      border: 2px solid hsl(224deg 71.43% 4.12%);
      border-radius: 8px;
      background: white;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      margin: 0 auto;
    `;

    wrapper.appendChild(iframe);
    document.body.appendChild(wrapper);

    // Restore scroll position in iframe (after it loads)
    iframe.onload = () => {
      try {
        iframe.contentWindow.scrollTo(scrollX, scrollY);
      } catch (error) {
        // Cross-origin restriction - can't access iframe content
      }
    };
  }

  /**
   * Show temporary tooltip message
   */
  function showTooltip(message) {
    // Remove any existing tooltip
    const existing = document.getElementById('winden-breakpoint-tooltip');
    if (existing) {
      existing.remove();
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'winden-breakpoint-tooltip';
    tooltip.textContent = message;
    tooltip.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: hsl(224deg 71.43% 4.12%);
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 9999999;
      animation: slideInUp 0.2s ease-out;
    `;

    document.body.appendChild(tooltip);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      tooltip.style.animation = 'slideOutDown 0.2s ease-in';
      setTimeout(() => tooltip.remove(), 200);
    }, 3000);
  }

  /**
   * Refresh indicator - removes old and creates new one
   */
  function refreshIndicator() {
    if (indicatorElement) {
      indicatorElement.remove();
      indicatorElement = null;
    }
    indicatorElement = createIndicator();
    updateIndicator();
  }

  /**
   * Update indicator with current breakpoint data
   */
  function updateIndicator() {
    if (!indicatorElement) {
      indicatorElement = createIndicator();
    }

    const bp = getCurrentBreakpoint();
    const isPreviewMode = document.getElementById('winden-breakpoint-iframe-wrapper') !== null;

    if (isPreviewMode) {
      // Update button states in preview mode
      const buttons = indicatorElement.querySelectorAll('.winden-breakpoint-button:not(.winden-breakpoint-exit)');
      buttons.forEach(button => {
        const width = parseInt(button.dataset.width);
        if (selectedBreakpoint && width === selectedBreakpoint.value) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
    } else {
      // Update select dropdown in normal mode
      const select = indicatorElement.querySelector('.winden-breakpoint-select');
      const widthEl = indicatorElement.querySelector('.winden-breakpoint-width');

      if (select && widthEl) {
        // If user manually selected a breakpoint, keep it selected
        if (selectedBreakpoint) {
          select.value = selectedBreakpoint.value;

          // If window width matches the selected breakpoint, clear the selection
          if (Math.abs(bp.width - selectedBreakpoint.value) < 10) {
            selectedBreakpoint = null;
          }
        } else if (!bp.isBelow && bp.name !== 'unknown') {
          // Auto-select based on current width
          const matchingBp = sortedBreakpoints.find(b => b.name === bp.name);
          if (matchingBp) {
            select.value = matchingBp.value;
          }
        }

        // Update width display
        widthEl.textContent = `${bp.width}px`;

        // Add class for styling below-breakpoint state
        if (bp.isBelow) {
          indicatorElement.classList.add('is-below');
        } else {
          indicatorElement.classList.remove('is-below');
        }
      }
    }
  }

  /**
   * Real-time resize handler - no debounce for instant updates
   */
  function handleResize() {
    const isPreviewMode = document.getElementById('winden-breakpoint-iframe-wrapper') !== null;

    if (isPreviewMode) {
      // In preview mode, update iframe size immediately
      const iframe = document.getElementById('winden-breakpoint-iframe');
      if (iframe && selectedBreakpoint) {
        iframe.style.width = selectedBreakpoint.value + 'px';
        iframe.style.height = 'calc(100vh - 60px)';
      }
    }

    // Update indicator immediately (no debounce for instant feedback)
    updateIndicator();
  }

  /**
   * Initialize indicator
   */
  async function init() {
    // Don't load indicator inside iframe
    if (window.self !== window.top) {
      return;
    }

    // Get and sort breakpoints by value (ascending) for mobile-first approach
    const result = await getBreakpoints();
    sortedBreakpoints = result.breakpoints.sort((a, b) => a.value - b.value);

    // Show error message if dev mode is disabled
    if (result.error) {
      console.warn('[Winden Breakpoint]', result.error);
    }

    // Create and update indicator immediately
    updateIndicator();

    // Listen to window resize
    window.addEventListener('resize', handleResize);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', function () {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
  });

  // Expose API for debugging/advanced use
  window.windenBreakpointIndicator = {
    getCurrentBreakpoint,
    updateIndicator,
    breakpoints: sortedBreakpoints
  };

})();

/**
 * Winden Classes UI Component
 *
 * Reusable UI for entering Tailwind classes with:
 * - Autocomplete integration
 * - Split by breakpoint mode
 * - Auto-resize textarea
 *
 * Usage:
 *   WindenClassesUI.create({
 *     container: document.getElementById('my-container'),
 *     breakpoints: ['sm', 'md', 'lg', 'xl', '2xl'],
 *     value: 'bg-blue-500 text-white',
 *     onChange: (classes) => console.log('Changed:', classes),
 *     onSave: (classes) => saveToServer(classes),
 *   });
 */

export interface WindenClassesUIOptions {
  /** Container element to render into */
  container: HTMLElement;
  /** Breakpoints for split mode (default: ['sm', 'md', 'lg', 'xl', '2xl']) */
  breakpoints?: string[];
  /** Initial value */
  value?: string;
  /** Label text (default: 'Winden Classes') */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Called on every change (debounced) */
  onChange?: (classes: string) => void;
  /** Called when user explicitly saves (blur, etc.) */
  onSave?: (classes: string) => void;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Show split by breakpoint toggle (default: true) */
  showSplitToggle?: boolean;
  /** Custom class prefix for styling (default: 'winden') */
  classPrefix?: string;
}

export interface WindenClassesUIInstance {
  /** Get current value */
  getValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Focus the main textarea */
  focus: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
  /** Get the main textarea element */
  getTextarea: () => HTMLTextAreaElement;
}

/**
 * Create Winden Classes UI
 */
export function create(options: WindenClassesUIOptions): WindenClassesUIInstance {
  const {
    container,
    breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'],
    value = '',
    label = 'Winden Classes',
    placeholder = 'e.g. bg-blue-500 text-white p-4 | Use @ for breakpoints',
    onChange,
    onSave,
    debounceMs = 300,
    showSplitToggle = true,
    classPrefix = 'winden',
  } = options;

  // State
  let isSplitMode = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Create elements
  const wrapper = document.createElement('div');
  wrapper.className = `${classPrefix}-classes-extension`;

  // Label
  const labelEl = document.createElement('label');
  labelEl.className = 'oxygen-control-label';
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  // Single mode wrapper
  const singleMode = document.createElement('div');
  singleMode.className = `${classPrefix}-classes-input-wrapper`;
  singleMode.id = `${classPrefix}-single-mode`;

  // Main textarea
  const textarea = document.createElement('textarea');
  textarea.id = `${classPrefix}-classes-textarea`;
  textarea.className = `${classPrefix}-textarea-base`;
  textarea.placeholder = placeholder;
  textarea.value = value;
  textarea.setAttribute('autocomplete', 'off');
  textarea.setAttribute('autocorrect', 'off');
  textarea.setAttribute('autocapitalize', 'off');
  textarea.setAttribute('spellcheck', 'false');
  singleMode.appendChild(textarea);
  wrapper.appendChild(singleMode);

  // Split mode container
  const splitMode = document.createElement('div');
  splitMode.className = `${classPrefix}-split-container`;
  splitMode.id = `${classPrefix}-split-mode`;

  // Default (no breakpoint) textarea
  const defaultGroup = createSplitGroup('', 'Default', 'Classes without breakpoint');
  splitMode.appendChild(defaultGroup);

  // Breakpoint textareas
  breakpoints.forEach(bp => {
    const group = createSplitGroup(bp, bp.toUpperCase(), `${bp}: classes`);
    splitMode.appendChild(group);
  });

  wrapper.appendChild(splitMode);

  // Toggle switch (if enabled)
  let toggleWrapper: HTMLElement | null = null;
  if (showSplitToggle) {
    toggleWrapper = document.createElement('label');
    toggleWrapper.className = `${classPrefix}-toggle-wrapper`;
    toggleWrapper.id = `${classPrefix}-split-toggle`;
    toggleWrapper.innerHTML = `
      <span class="${classPrefix}-toggle">
        <input type="checkbox" />
        <span class="${classPrefix}-toggle-dot"></span>
      </span>
      <span class="${classPrefix}-toggle-label">Split by breakpoint</span>
    `;
    wrapper.appendChild(toggleWrapper);
  }

  // Append to container
  container.appendChild(wrapper);

  // Helper: create split group
  function createSplitGroup(breakpoint: string, labelText: string, placeholderText: string): HTMLElement {
    const group = document.createElement('div');
    group.className = `${classPrefix}-split-group`;

    const label = document.createElement('div');
    label.className = `${classPrefix}-split-label`;
    label.textContent = labelText;
    group.appendChild(label);

    const ta = document.createElement('textarea');
    ta.className = `${classPrefix}-textarea-base ${classPrefix}-split-textarea`;
    ta.dataset.breakpoint = breakpoint;
    ta.placeholder = placeholderText;
    ta.setAttribute('autocomplete', 'off');
    ta.setAttribute('autocorrect', 'off');
    ta.setAttribute('autocapitalize', 'off');
    ta.setAttribute('spellcheck', 'false');
    group.appendChild(ta);

    return group;
  }

  // Debounced onChange handler
  function handleChange() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onChange?.(textarea.value);
    }, debounceMs);
  }

  // Auto-resize textarea
  function autoResize(ta: HTMLTextAreaElement) {
    // Check if field-sizing is supported
    if (CSS.supports && CSS.supports('field-sizing', 'content')) {
      return; // Browser handles it natively
    }

    function resize() {
      ta.style.height = 'auto';
      const newHeight = Math.min(ta.scrollHeight, 200);
      ta.style.height = newHeight + 'px';
    }

    ta.addEventListener('input', resize);
    resize();
  }

  // Sync from single to split mode
  function syncToSplitMode() {
    const classes = textarea.value || '';
    const groups: Record<string, string[]> = { '': [] };
    breakpoints.forEach(bp => { groups[bp] = []; });

    const bpPattern = new RegExp(`^(${breakpoints.join('|')}):`);

    classes.split(/\s+/).forEach(cls => {
      if (!cls) return;
      const match = cls.match(bpPattern);
      if (match && groups[match[1]]) {
        groups[match[1]].push(cls);
      } else {
        groups[''].push(cls);
      }
    });

    splitMode.querySelectorAll<HTMLTextAreaElement>(`.${classPrefix}-split-textarea`).forEach(ta => {
      const bp = ta.dataset.breakpoint || '';
      if (groups[bp]) {
        ta.value = groups[bp].join(' ');
      }
    });
  }

  // Sync from split to single mode
  function syncFromSplitMode() {
    const allClasses: string[] = [];

    splitMode.querySelectorAll<HTMLTextAreaElement>(`.${classPrefix}-split-textarea`).forEach(ta => {
      const classes = ta.value.trim();
      if (classes) {
        allClasses.push(classes);
      }
    });

    textarea.value = allClasses.join(' ');
    handleChange();
  }

  // Toggle split mode
  function toggleSplitMode(enabled: boolean) {
    isSplitMode = enabled;
    const toggle = toggleWrapper?.querySelector(`.${classPrefix}-toggle`);

    if (enabled) {
      singleMode.style.display = 'none';
      splitMode.classList.add('is-active');
      toggle?.classList.add('is-checked');
      syncToSplitMode();
    } else {
      singleMode.style.display = 'block';
      splitMode.classList.remove('is-active');
      toggle?.classList.remove('is-checked');
      syncFromSplitMode();
    }
  }

  // Event listeners
  textarea.addEventListener('input', handleChange);
  textarea.addEventListener('blur', () => onSave?.(textarea.value));

  // Split textarea listeners
  splitMode.querySelectorAll<HTMLTextAreaElement>(`.${classPrefix}-split-textarea`).forEach(ta => {
    ta.addEventListener('input', () => {
      if (isSplitMode) syncFromSplitMode();
    });
  });

  // Toggle listener
  if (toggleWrapper) {
    toggleWrapper.addEventListener('click', (e) => {
      e.preventDefault();
      const checkbox = toggleWrapper!.querySelector('input') as HTMLInputElement;
      checkbox.checked = !checkbox.checked;
      toggleSplitMode(checkbox.checked);
    });
  }

  // Auto-resize all textareas
  autoResize(textarea);
  splitMode.querySelectorAll<HTMLTextAreaElement>(`.${classPrefix}-split-textarea`).forEach(autoResize);

  // Initialize autocomplete if available
  function initAutocomplete() {
    if (typeof window.WindenAutocomplete === 'undefined') {
      setTimeout(initAutocomplete, 500);
      return;
    }

    // Check for autocomplete data
    const autocompleteData = window.winden_autocomplete ||
      (window.parent && window.parent !== window ? window.parent.winden_autocomplete : null);

    let hasData = false;
    if (Array.isArray(autocompleteData) && autocompleteData.length > 0) {
      hasData = true;
    } else if (autocompleteData && typeof autocompleteData === 'object' && Object.keys(autocompleteData).length > 0) {
      hasData = true;
    }

    if (!hasData) {
      setTimeout(initAutocomplete, 500);
      return;
    }

    // Update breakpoints in autocomplete
    if (breakpoints.length > 0) {
      window.WindenAutocomplete.setBreakpoints(breakpoints);
    }

    // Create autocomplete instance
    window.WindenAutocomplete.create({
      container: singleMode,
      input: textarea,
      maxSuggestions: 12,
      debounceMs: 50,
      onChange: (classes: string) => {
        // Trigger input event for any listeners
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      },
    });
  }

  initAutocomplete();

  // Return instance API
  return {
    getValue: () => textarea.value,
    setValue: (val: string) => {
      textarea.value = val;
      if (isSplitMode) syncToSplitMode();
    },
    focus: () => textarea.focus(),
    destroy: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      wrapper.remove();
    },
    getTextarea: () => textarea,
  };
}

// Declare window types
declare global {
  interface Window {
    WindenAutocomplete: {
      create: (options: any) => any;
      setBreakpoints: (breakpoints: string[]) => void;
    };
    winden_autocomplete?: string[] | Record<string | number, string>;
    WindenClassesUI: {
      create: typeof create;
    };
  }
}

// Expose to window
if (typeof window !== 'undefined') {
  window.WindenClassesUI = { create };
}

export default { create };

/**
 * Split Mode Utilities for Winden Classes
 *
 * Shared utilities for split-by-breakpoint functionality used across all builders.
 * These are pure functions that can be used with any DOM context.
 */

/**
 * Attributes to disable browser autocomplete on textareas
 */
export const AUTOCOMPLETE_DISABLE_ATTRS = `autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false" data-form-type="other" data-lpignore="true" data-1p-ignore`;

/**
 * Parse classes string into groups by breakpoint prefix
 *
 * @param classes - Space-separated class string (e.g., "bg-blue-500 sm:p-4 md:p-8")
 * @param breakpoints - Array of breakpoint names (e.g., ['sm', 'md', 'lg', 'xl', '2xl'])
 * @returns Object with breakpoint keys and arrays of classes
 *
 * @example
 * parseClassesByBreakpoint("bg-blue-500 sm:p-4 md:p-8", ['sm', 'md', 'lg'])
 * // Returns: { '': ['bg-blue-500'], 'sm': ['sm:p-4'], 'md': ['md:p-8'], 'lg': [] }
 */
export function parseClassesByBreakpoint(
  classes: string,
  breakpoints: string[]
): Record<string, string[]> {
  const groups: Record<string, string[]> = { '': [] };
  breakpoints.forEach(bp => { groups[bp] = []; });

  const bpPattern = new RegExp(`^(${breakpoints.join('|')}):`);

  (classes || '').split(/\s+/).forEach(cls => {
    if (!cls) return;
    const match = cls.match(bpPattern);
    if (match && groups[match[1]] !== undefined) {
      groups[match[1]].push(cls);
    } else {
      groups[''].push(cls);
    }
  });

  return groups;
}

/**
 * Remove breakpoint prefix from a class
 *
 * @param cls - Class with potential prefix (e.g., "sm:p-4")
 * @param breakpoint - Breakpoint to remove (e.g., "sm")
 * @returns Class without prefix (e.g., "p-4")
 */
export function removeBreakpointPrefix(cls: string, breakpoint: string): string {
  return cls.replace(new RegExp(`^${breakpoint}:`), '');
}

/**
 * Add breakpoint prefix to a class (if not already present)
 *
 * @param cls - Class without prefix (e.g., "p-4")
 * @param breakpoint - Breakpoint to add (e.g., "sm")
 * @returns Class with prefix (e.g., "sm:p-4")
 */
export function addBreakpointPrefix(cls: string, breakpoint: string): string {
  if (!cls || cls.startsWith(`${breakpoint}:`)) {
    return cls;
  }
  return `${breakpoint}:${cls}`;
}

/**
 * Combine classes from split textareas back into a single string
 *
 * @param getTextareaValue - Function to get value from a textarea by breakpoint key
 * @param breakpoints - Array of breakpoint names
 * @returns Combined class string with proper prefixes
 */
export function combineFromSplitTextareas(
  getTextareaValue: (breakpoint: string) => string,
  breakpoints: string[]
): string {
  const allClasses: string[] = [];

  // Get default classes (no prefix)
  const defaultClasses = getTextareaValue('').trim();
  if (defaultClasses) {
    allClasses.push(defaultClasses);
  }

  // Get breakpoint classes (add prefix)
  breakpoints.forEach(bp => {
    const bpClasses = getTextareaValue(bp).trim();
    if (bpClasses) {
      const prefixedClasses = bpClasses
        .split(/\s+/)
        .map(cls => addBreakpointPrefix(cls, bp))
        .filter(Boolean)
        .join(' ');
      allClasses.push(prefixedClasses);
    }
  });

  return allClasses.join(' ');
}

/**
 * Sync classes to split textareas (removes prefix for display)
 *
 * @param classes - Combined class string
 * @param setTextareaValue - Function to set value on a textarea by breakpoint key
 * @param breakpoints - Array of breakpoint names
 */
export function syncToSplitTextareas(
  classes: string,
  setTextareaValue: (breakpoint: string, value: string) => void,
  breakpoints: string[]
): void {
  const groups = parseClassesByBreakpoint(classes, breakpoints);

  // Set default textarea (no prefix removal needed)
  setTextareaValue('', groups[''].join(' '));

  // Set breakpoint textareas (remove prefix for display)
  breakpoints.forEach(bp => {
    const classesWithoutPrefix = groups[bp].map(cls => removeBreakpointPrefix(cls, bp));
    setTextareaValue(bp, classesWithoutPrefix.join(' '));
  });
}

/**
 * Generate HTML for split mode textareas
 *
 * @param breakpoints - Array of breakpoint names
 * @returns HTML string for split mode container content
 */
export function generateSplitModeHTML(breakpoints: string[]): string {
  let html = `
    <div class="winden-split-group">
      <div class="winden-split-label">DEFAULT</div>
      <textarea
        class="winden-textarea-base winden-split-textarea"
        data-breakpoint=""
        placeholder="Classes without breakpoint"
        ${AUTOCOMPLETE_DISABLE_ATTRS}
      ></textarea>
    </div>
  `;

  breakpoints.forEach(bp => {
    html += `
      <div class="winden-split-group">
        <div class="winden-split-label">${bp.toUpperCase()}</div>
        <textarea
          class="winden-textarea-base winden-split-textarea"
          data-breakpoint="${bp}"
          placeholder="${bp}: classes"
          ${AUTOCOMPLETE_DISABLE_ATTRS}
        ></textarea>
      </div>
    `;
  });

  return html;
}

/**
 * Generate HTML for main textarea with autocomplete disable attributes
 *
 * @param id - Textarea ID
 * @param placeholder - Placeholder text
 * @returns HTML string for textarea
 */
export function generateMainTextareaHTML(
  id: string = 'winden-classes-textarea',
  placeholder: string = 'e.g. bg-blue-500 text-white p-4'
): string {
  return `
    <textarea
      id="${id}"
      class="winden-textarea-base"
      placeholder="${placeholder}"
      ${AUTOCOMPLETE_DISABLE_ATTRS}
    ></textarea>
  `;
}

/**
 * Check if WindenAutocomplete is available and has data
 *
 * @returns true if ready, false if should retry
 */
export function isAutocompleteReady(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if WindenAutocomplete global is available
  if (!(window as any).WindenAutocomplete) {
    return false;
  }

  // Check if autocomplete data is available
  const autocompleteData = (window as any).winden_autocomplete;
  if (!autocompleteData) {
    return false;
  }

  // Check if data is populated
  if (Array.isArray(autocompleteData) && autocompleteData.length > 0) {
    return true;
  }
  if (typeof autocompleteData === 'object' && Object.keys(autocompleteData).length > 0) {
    return true;
  }

  return false;
}

/**
 * Wait for autocomplete to be ready with retry logic
 *
 * @param callback - Function to call when ready
 * @param maxRetries - Maximum number of retries (default: 10)
 * @param interval - Retry interval in ms (default: 500)
 */
export function waitForAutocomplete(
  callback: () => void,
  maxRetries: number = 10,
  interval: number = 500
): void {
  let retries = 0;

  const check = () => {
    if (isAutocompleteReady()) {
      callback();
      return;
    }

    retries++;
    if (retries < maxRetries) {
      setTimeout(check, interval);
    } else {
      console.warn('[Winden] Autocomplete not available after max retries');
    }
  };

  check();
}

// Export types for TypeScript users
export interface SplitModeConfig {
  breakpoints: string[];
  containerSelector: string;
  singleModeSelector: string;
  splitModeSelector: string;
  toggleSelector: string;
  mainTextareaSelector: string;
}

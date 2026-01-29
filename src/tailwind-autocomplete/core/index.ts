/**
 * Tailwind Autocomplete
 *
 * A custom autocomplete for Tailwind CSS classes with support for:
 * - Multiple space-separated classes
 * - Breakpoint prefixes (sm:, md:, lg:, xl:, 2xl:)
 * - Variant prefixes (hover:, focus:, dark:, etc.)
 * - Tailwind class names
 */

import type {
  AutocompleteOptions,
  AutocompleteInstance,
  ClassData,
  ParsedInput,
  Suggestion,
} from './types';
import { defaultClassData } from './data';
import './styles.scss';

/**
 * Parse the current input to extract completed classes and current partial
 */
function parseInput(value: string, cursorPosition: number): ParsedInput {
  // Get text up to cursor
  const textToCursor = value.substring(0, cursorPosition);

  // Split by spaces to get individual classes
  const parts = textToCursor.split(/\s+/);
  const currentPart = parts[parts.length - 1] || '';

  // Get completed classes (everything before the current part)
  const completedText = value.substring(0, textToCursor.length - currentPart.length).trim();
  const completedClasses = completedText ? completedText.split(/\s+/).filter(Boolean) : [];

  // Parse the current part for breakpoint and variants
  const colonParts = currentPart.split(':');

  let breakpoint = '';
  const variants: string[] = [];
  let baseClass = currentPart;

  if (colonParts.length > 1) {
    // Check each part to see if it's a breakpoint or variant
    const prefixes = colonParts.slice(0, -1);
    baseClass = colonParts[colonParts.length - 1];

    for (const prefix of prefixes) {
      // Check if it's a breakpoint
      if (defaultClassData.breakpoints.includes(prefix)) {
        breakpoint = prefix + ':';
      } else {
        // It's a variant
        variants.push(prefix + ':');
      }
    }
  }

  return {
    completedClasses,
    currentInput: currentPart,
    breakpoint,
    variants,
    baseClass,
    cursorPosition,
  };
}

/**
 * Check if current input is requesting breakpoints (starts with @)
 */
function isBreakpointTrigger(input: string): boolean {
  return input.startsWith('@');
}

/**
 * Get the query after the @ symbol for breakpoint filtering
 */
function getBreakpointQuery(input: string): string {
  return input.startsWith('@') ? input.substring(1) : '';
}

/**
 * Generate suggestions based on parsed input
 */
function getSuggestions(
  parsed: ParsedInput,
  classData: ClassData,
  maxSuggestions: number
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const query = parsed.baseClass.toLowerCase();
  const prefix = parsed.breakpoint + parsed.variants.join('');

  // Check if user is typing @ to get breakpoints
  if (isBreakpointTrigger(parsed.currentInput)) {
    const bpQuery = getBreakpointQuery(parsed.currentInput).toLowerCase();

    for (const bp of classData.breakpoints) {
      if (suggestions.length >= maxSuggestions) break;
      if (!bpQuery || bp.toLowerCase().startsWith(bpQuery)) {
        suggestions.push({
          value: bp + ':',
          type: 'breakpoint',
          description: `${bp} breakpoint`,
        });
      }
    }
    return suggestions;
  }

  // If query is empty and no prefix, don't show anything (user needs to type)
  if (!query && !prefix) {
    return suggestions;
  }

  // Check if the query ends with ":" - user wants to see what comes next
  if (parsed.currentInput.endsWith(':')) {
    // Show variants and classes
    for (const variant of classData.variants.slice(0, 10)) {
      if (suggestions.length >= maxSuggestions) break;
      suggestions.push({
        value: prefix + variant + ':',
        type: 'variant',
        description: `${variant} variant`,
      });
    }

    // Also show some common classes
    for (const cls of classData.classes.slice(0, maxSuggestions - suggestions.length)) {
      if (suggestions.length >= maxSuggestions) break;
      suggestions.push({
        value: prefix + cls,
        type: 'class',
      });
    }
    return suggestions;
  }

  // Filter based on query
  const seen = new Set<string>();

  // Track already used classes to avoid suggesting them
  const alreadyUsed = new Set(parsed.completedClasses.map(c => c.toLowerCase()));

  // Try to match variants first (if query looks like a variant)
  for (const variant of classData.variants) {
    if (suggestions.length >= maxSuggestions) break;
    const variantLower = variant.toLowerCase();
    if (variantLower.startsWith(query) && !seen.has(variant)) {
      seen.add(variant);
      suggestions.push({
        value: prefix + variant + ':',
        type: 'variant',
        description: `${variant} variant`,
      });
    }
  }

  // Match class names with score-based ranking
  interface ScoredClass {
    value: string;
    score: number;
  }

  const scoredClasses: ScoredClass[] = [];

  // The full value being typed (for exact match detection)
  const currentInputLower = parsed.currentInput.toLowerCase();

  for (const cls of classData.classes) {
    const clsLower = cls.toLowerCase();

    // Skip if this class is already used
    if (alreadyUsed.has(clsLower)) continue;

    // The full suggestion value we would generate
    const fullSuggestion = (prefix + cls).toLowerCase();

    // Skip if suggestion exactly matches what user already typed
    if (fullSuggestion === currentInputLower) continue;

    // Calculate score
    let score = 0;

    // Starts with query (most relevant)
    if (clsLower.startsWith(query)) {
      score = 80 + (query.length / clsLower.length) * 20;
    }
    // Contains query
    else if (clsLower.includes(query)) {
      // Prefer matches at word boundaries (after -)
      const idx = clsLower.indexOf(query);
      if (idx > 0 && clsLower[idx - 1] === '-') {
        score = 60 + (query.length / clsLower.length) * 20;
      } else {
        score = 40 + (query.length / clsLower.length) * 20;
      }
    }

    if (score > 0 && !seen.has(cls)) {
      seen.add(cls);
      scoredClasses.push({ value: cls, score });
    }
  }

  // Sort by score and add to suggestions
  scoredClasses.sort((a, b) => b.score - a.score);

  for (const { value } of scoredClasses) {
    if (suggestions.length >= maxSuggestions) break;
    suggestions.push({
      value: prefix + value,
      type: 'class',
    });
  }

  return suggestions;
}

/**
 * Create the dropdown element
 */
function createDropdown(extraClass?: string): HTMLElement {
  const dropdown = document.createElement('div');
  dropdown.className = 'winden-autocomplete-dropdown' + (extraClass ? ` ${extraClass}` : '');
  dropdown.style.display = 'none';
  return dropdown;
}

/**
 * Position the dropdown below the input
 */
function positionDropdown(dropdown: HTMLElement, input: HTMLInputElement): void {
  const rect = input.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  dropdown.style.position = 'absolute';
  dropdown.style.top = `${rect.bottom + scrollTop}px`;
  dropdown.style.left = `${rect.left + scrollLeft}px`;
  dropdown.style.width = `${rect.width}px`;
  dropdown.style.zIndex = '99999';
}

/**
 * Render suggestions in the dropdown
 */
function renderSuggestions(
  dropdown: HTMLElement,
  suggestions: Suggestion[],
  selectedIndex: number,
  onSelect: (suggestion: Suggestion) => void,
  onHover?: (index: number) => void
): void {
  dropdown.innerHTML = '';

  if (suggestions.length === 0) {
    dropdown.style.display = 'none';
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const item = document.createElement('div');
    item.className = 'winden-autocomplete-item';
    if (index === selectedIndex) {
      item.classList.add('winden-autocomplete-item--selected');
    }

    // Type badge
    const badge = document.createElement('span');
    badge.className = `winden-autocomplete-badge winden-autocomplete-badge--${suggestion.type}`;
    badge.textContent = suggestion.type === 'breakpoint' ? 'BP' : suggestion.type === 'variant' ? 'V' : 'C';

    // Value
    const value = document.createElement('span');
    value.className = 'winden-autocomplete-value';
    value.textContent = suggestion.value;

    item.appendChild(badge);
    item.appendChild(value);

    if (suggestion.description) {
      const desc = document.createElement('span');
      desc.className = 'winden-autocomplete-desc';
      desc.textContent = suggestion.description;
      item.appendChild(desc);
    }

    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onSelect(suggestion);
    });

    item.addEventListener('mouseenter', () => {
      if (interactionMode !== 'mouse') {
        return;
      }
      // Update selection on hover - both visual and state
      const items = dropdown.querySelectorAll('.winden-autocomplete-item');
      items.forEach((el, i) => {
        el.classList.toggle('winden-autocomplete-item--selected', i === index);
      });
      onHover?.(index);
    });

    dropdown.appendChild(item);
  });

  dropdown.style.display = 'block';
}

/**
 * Debounce function
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Initialize Tailwind Autocomplete
 */
export function createTailwindAutocomplete(options: AutocompleteOptions): AutocompleteInstance {
  // Resolve elements
  const container = typeof options.container === 'string'
    ? document.querySelector<HTMLElement>(options.container)
    : options.container;

  const input = typeof options.input === 'string'
    ? document.querySelector<HTMLInputElement>(options.input)
    : options.input;

  if (!container || !input) {
    throw new Error('Container or input element not found');
  }

  // Options with defaults
  const maxSuggestions = options.maxSuggestions ?? 10;
  const debounceMs = options.debounceMs ?? 50;
  // Use defaultClassData directly (without spread) to preserve getter behavior
  // This allows classes to be read dynamically from window.winden_autocomplete
  let classData: ClassData = options.classData ?? defaultClassData;

  // State
  let suggestions: Suggestion[] = [];
  let selectedIndex = 0;
  let isOpen = false;
  let interactionMode: 'keyboard' | 'mouse' = 'keyboard';
  let lastParsed: ParsedInput | null = null;
  let lastPreviewClass: string | null = null;

  // Create dropdown
  const dropdown = createDropdown(options.dropdownClass);
  document.body.appendChild(dropdown);

  /**
   * Update suggestions based on current input
   */
  const updateSuggestions = () => {
    // Only show suggestions if input is focused (prevents dropdown on programmatic changes)
    if (document.activeElement !== input) {
      closeSuggestions();
      return;
    }

    const value = input.value;
    const cursorPosition = input.selectionStart ?? value.length;
    const parsed = parseInput(value, cursorPosition);
    lastParsed = parsed;
    if (options.onPreview) {
      if (lastPreviewClass !== null) {
        options.onPreview(null);
        lastPreviewClass = null;
      }
    }

    suggestions = getSuggestions(parsed, classData, maxSuggestions);
    selectedIndex = 0;

    positionDropdown(dropdown, input);
    renderSuggestions(dropdown, suggestions, selectedIndex, handleSelect, handleHover);

    isOpen = suggestions.length > 0;
  };

  const debouncedUpdate = debounce(updateSuggestions, debounceMs);

  /**
   * Handle hover - update selectedIndex so keyboard continues from mouse position
   */
  const handleHover = (index: number) => {
    selectedIndex = index;
    if (interactionMode === 'mouse') {
      updatePreview(index);
    }
  };

  const updatePreview = (index: number) => {
    if (!options.onPreview || !lastParsed) {
      return;
    }

    const suggestion = suggestions[index];
    if (!suggestion || suggestion.type !== 'class') {
      if (lastPreviewClass !== null) {
        options.onPreview(null);
        lastPreviewClass = null;
      }
      return;
    }

    const previewClass = suggestion.value;

    if (previewClass !== lastPreviewClass) {
      options.onPreview(previewClass);
      lastPreviewClass = previewClass;
    }
  };

  /**
   * Handle suggestion selection
   */
  const handleSelect = (suggestion: Suggestion) => {
    if (options.onPreview && lastPreviewClass !== null) {
      options.onPreview(null);
      lastPreviewClass = null;
    }
    const value = input.value;
    const cursorPosition = input.selectionStart ?? value.length;
    const parsed = parseInput(value, cursorPosition);

    // Build the new value
    let newValue = parsed.completedClasses.join(' ');
    if (newValue) newValue += ' ';

    // Handle breakpoint selection from @ trigger
    if (suggestion.type === 'breakpoint' && isBreakpointTrigger(parsed.currentInput)) {
      // Replace @query with the breakpoint (e.g., @sm → sm:)
      newValue += suggestion.value;
    }
    // If suggestion is a variant, keep the cursor ready for more typing
    else if (suggestion.type === 'breakpoint' || suggestion.type === 'variant') {
      newValue += suggestion.value;
    } else {
      // Full class - add space after
      newValue += suggestion.value + ' ';
    }

    // Add any text after the cursor
    const afterCursor = value.substring(cursorPosition).trim();
    if (afterCursor) {
      newValue += afterCursor;
    }

    input.value = newValue.trim();

    // Set cursor position
    if (suggestion.type === 'class') {
      // After the class and space
      input.selectionStart = input.selectionEnd = (parsed.completedClasses.join(' ') + ' ' + suggestion.value + ' ').length;
    } else {
      // Right after the colon for continued typing
      input.selectionStart = input.selectionEnd = newValue.trimEnd().length;
    }

    // Trigger change callback
    options.onChange?.(input.value.trim());

    // Close dropdown for full class, keep open for prefixes
    if (suggestion.type === 'class') {
      closeSuggestions();
    } else {
      // Update suggestions for the next part
      updateSuggestions();
    }

    input.focus();
  };

  /**
   * Close suggestions dropdown
   */
  const closeSuggestions = () => {
    if (options.onPreview && lastPreviewClass !== null) {
      options.onPreview(null);
      lastPreviewClass = null;
    }
    dropdown.style.display = 'none';
    suggestions = [];
    selectedIndex = 0;
    isOpen = false;
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: KeyboardEvent) => {
    interactionMode = 'keyboard';
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        updateSuggestions();
        e.preventDefault();
        if (suggestions.length > 0) {
          updatePreview(selectedIndex);
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % suggestions.length;
        renderSuggestions(dropdown, suggestions, selectedIndex, handleSelect, handleHover);
        updatePreview(selectedIndex);
        break;

      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1;
        renderSuggestions(dropdown, suggestions, selectedIndex, handleSelect, handleHover);
        updatePreview(selectedIndex);
        break;

      case 'Enter':
      case 'Tab':
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          handleSelect(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        closeSuggestions();
        break;
    }
  };

  /**
   * Handle input events
   */
  const handleInput = () => {
    debouncedUpdate();
  };

  /**
   * Handle focus events
   */
  const handleFocus = () => {
    updateSuggestions();
  };

  /**
   * Handle blur events
   */
  const handleBlur = () => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      closeSuggestions();
      options.onChange?.(input.value.trim());
    }, 150);
  };

  // Attach event listeners
  input.addEventListener('input', handleInput);
  input.addEventListener('keydown', handleKeyDown);
  input.addEventListener('focus', handleFocus);
  input.addEventListener('blur', handleBlur);

  // Handle window scroll/resize
  const handleReposition = () => {
    if (isOpen) {
      positionDropdown(dropdown, input);
    }
  };

  window.addEventListener('scroll', handleReposition, true);
  window.addEventListener('resize', handleReposition);

  const handleDropdownMouseMove = () => {
    interactionMode = 'mouse';
  };

  const handleDropdownMouseLeave = () => {
    interactionMode = 'keyboard';
    if (options.onPreview && lastPreviewClass !== null) {
      options.onPreview(null);
      lastPreviewClass = null;
    }
  };

  dropdown.addEventListener('mousemove', handleDropdownMouseMove);
  dropdown.addEventListener('mouseleave', handleDropdownMouseLeave);

  // Return instance
  return {
    destroy: () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keydown', handleKeyDown);
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
      dropdown.removeEventListener('mousemove', handleDropdownMouseMove);
      dropdown.removeEventListener('mouseleave', handleDropdownMouseLeave);
      dropdown.remove();
    },

    close: () => {
      closeSuggestions();
    },

    updateClassData: (data: Partial<ClassData>) => {
      classData = { ...classData, ...data };
    },

    setValue: (value: string) => {
      input.value = value;
      options.onChange?.(value);
    },

    getValue: () => input.value,

    focus: () => {
      input.focus();
    },
  };
}

// Export types
export type { AutocompleteOptions, AutocompleteInstance, ClassData, Suggestion };

// Export data and helper functions for external use
export {
  defaultClassData,
  defaultBreakpoints,
  defaultVariants,
  defaultClasses,
  getDefaultClassData,
  setBreakpoints,
  addBreakpoints,
  setVariants,
  addVariants,
  setClasses,
  addClasses,
  updateClassData,
} from './data';

import {
  getDefaultClassData,
  setBreakpoints,
  addBreakpoints,
  setVariants,
  addVariants,
  setClasses,
  addClasses,
  updateClassData,
} from './data';

// Expose to window for global access
declare global {
  interface Window {
    WindenAutocomplete: {
      create: typeof createTailwindAutocomplete;
      getClassData: typeof getDefaultClassData;
      setBreakpoints: typeof setBreakpoints;
      addBreakpoints: typeof addBreakpoints;
      setVariants: typeof setVariants;
      addVariants: typeof addVariants;
      setClasses: typeof setClasses;
      addClasses: typeof addClasses;
      updateClassData: typeof updateClassData;
    };
  }
}

if (typeof window !== 'undefined') {
  window.WindenAutocomplete = {
    create: createTailwindAutocomplete,
    getClassData: getDefaultClassData,
    setBreakpoints,
    addBreakpoints,
    setVariants,
    addVariants,
    setClasses,
    addClasses,
    updateClassData,
  };
}

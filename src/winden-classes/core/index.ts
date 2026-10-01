/**
 * Tailwind Autocomplete
 *
 * A custom autocomplete for Tailwind CSS classes with support for:
 * - Multiple space-separated classes
 * - Breakpoint prefixes (sm:, md:, lg:, xl:, 2xl:)
 * - Variant prefixes (hover:, focus:, dark:, etc.)
 * - Tailwind class names
 */

import { resolveColors } from './class-colors';

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
export function parseInput(value: string, cursorPosition: number): ParsedInput {
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
export function getSuggestions(
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

    // Calculate score
    let score = 0;

    // What was typed, exactly. Dropping it used to leave a *different* class
    // at the top of the list and preselected — type `m-20` and the highlighted
    // suggestion was `-m-20`, one Enter away from the opposite margin.
    if (fullSuggestion === currentInputLower) {
      score = 200;
    }
    // Starts with query (most relevant)
    else if (clsLower.startsWith(query)) {
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
 * Inject dropdown CSS into the document if not already present
 */
function injectDropdownStyles(doc: Document): void {
  const styleId = 'winden-autocomplete-styles';
  if (doc.getElementById(styleId)) {
    return; // Already injected
  }

  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
    .winden-autocomplete-dropdown {
      background: #2a2a2a;
      border: 1px solid #444;
      border-radius: 6px;
      max-height: 300px;
      overflow-y: auto;
      overflow-x: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .winden-autocomplete-dropdown::-webkit-scrollbar {
      width: 6px;
    }
    .winden-autocomplete-dropdown::-webkit-scrollbar-track {
      background: transparent;
    }
    .winden-autocomplete-dropdown::-webkit-scrollbar-thumb {
      background: #3d3d5c;
      border-radius: 3px;
    }
    .winden-autocomplete-dropdown::-webkit-scrollbar-thumb:hover {
      background: #4d4d6c;
    }
    .winden-autocomplete-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.1s ease;
      color: #e5e5e5;
    }
    .winden-autocomplete-item:hover {
      background: #3a3a3a;
    }
    .winden-autocomplete-item--selected {
      background: #3d3d5c;
    }
    .winden-autocomplete-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 18px;
      padding: 0 4px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .winden-autocomplete-badge--breakpoint {
      background: #7b66ff;
      color: white;
    }
    .winden-autocomplete-badge--variant {
      background: #059669;
      color: white;
    }
    .winden-autocomplete-badge--class {
      background: #7b66ff;
      color: white;
    }
    .winden-autocomplete-value {
      color: #e2e8f0;
      font-size: 12px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .winden-autocomplete-desc {
      display: none;
    }

    .winden-autocomplete-swatch {
      width: 14px;
      height: 14px;
      margin-left: auto;
      border-radius: 50%;
      /* A pale colour needs an edge to read as a colour and not as a hole */
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
      flex: none;
    }
  `;
  doc.head.appendChild(style);
}

/**
 * Create the dropdown element
 */
function createDropdown(extraClass?: string, ownerDoc?: Document): HTMLElement {
  const doc = ownerDoc || document;

  // Inject styles into the document if needed
  injectDropdownStyles(doc);

  const dropdown = doc.createElement('div');
  dropdown.className = 'winden-autocomplete-dropdown' + (extraClass ? ` ${extraClass}` : '');
  dropdown.style.display = 'none';
  return dropdown;
}

/**
 * Position the dropdown below the input
 * Handles cross-document positioning when input and dropdown are in the same document
 */
function positionDropdown(dropdown: HTMLElement, input: HTMLInputElement | HTMLTextAreaElement): void {
  const rect = input.getBoundingClientRect();
  const dropdownDoc = dropdown.ownerDocument;
  const dropdownWin = dropdownDoc?.defaultView || window;

  const scrollTop = dropdownWin.pageYOffset || dropdownDoc?.documentElement?.scrollTop || 0;
  const scrollLeft = dropdownWin.pageXOffset || dropdownDoc?.documentElement?.scrollLeft || 0;

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
  onHover?: (index: number) => void,
  getInteractionMode?: () => 'keyboard' | 'mouse',
  swatches?: Map<string, string>
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

    // A colour is worth showing rather than naming: `bg-red-400` and
    // `bg-rose-400` are a paragraph apart in text and obvious side by side.
    const swatch = swatches?.get(suggestion.value);
    if (swatch) {
      const dot = document.createElement('span');
      dot.className = 'winden-autocomplete-swatch';
      dot.style.background = swatch;
      item.appendChild(dot);
    }

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
      const currentMode = getInteractionMode ? getInteractionMode() : 'keyboard';
      if (currentMode !== 'mouse') {
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
 * Debounce, with a way to stop waiting.
 *
 * A timer is the wrong thing to have alone here: the keys that act on the
 * suggestion list arrive between the keystroke and the redraw it scheduled, so
 * they need to bring that redraw forward (`flush`) rather than read the list
 * belonging to the previous character. Closing the list needs the opposite —
 * `cancel`, or a pending redraw reopens it a moment later.
 */
interface Debounced<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  flush: () => void;
  cancel: () => void;
}

function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): Debounced<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pending: Parameters<T> | null = null;

  const run = () => {
    timeout = null;
    const args = pending;
    pending = null;
    if (args) func(...args);
  };

  const debounced = ((...args: Parameters<T>) => {
    pending = args;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(run, wait);
  }) as Debounced<T>;

  debounced.flush = () => {
    if (!timeout) return;
    clearTimeout(timeout);
    run();
  };

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    pending = null;
  };

  return debounced;
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
  // Zero by default on purpose: a full scan of the class list costs well
  // under a millisecond, so any wait here is lag the typist can feel and
  // nothing it buys back. The debounce stays for the coalescing, and for
  // callers that want a wait.
  const debounceMs = options.debounceMs ?? 0;
  // Use defaultClassData directly (without spread) to preserve getter behavior
  // This allows classes to be read dynamically from window.winden_autocomplete
  let classData: ClassData = options.classData ?? defaultClassData;

  // State
  let suggestions: Suggestion[] = [];
  let selectedIndex = 0;
  /** class → colour, kept across keystrokes so a colour is measured once */
  const swatches = new Map<string, string>();
  let isOpen = false;
  let interactionMode: 'keyboard' | 'mouse' = 'keyboard';
  let lastParsed: ParsedInput | null = null;
  let lastPreviewClass: string | null = null;

  // Getter for interaction mode (used by renderSuggestions)
  const getInteractionMode = () => interactionMode;

  // Determine the dropdown parent - use provided parent, or fall back to input's document body
  const dropdownParent = options.dropdownParent || input.ownerDocument?.body || document.body;
  const dropdownOwnerDoc = dropdownParent.ownerDocument || document;

  // Create dropdown in the same document context as the parent
  const dropdown = createDropdown(options.dropdownClass, dropdownOwnerDoc);
  dropdownParent.appendChild(dropdown);

  /**
   * Update suggestions based on current input
   */
  const updateSuggestions = () => {
    // Only show suggestions if input is focused (prevents dropdown on programmatic changes)
    // Check both the input's own document and the main document for activeElement
    const inputDoc = input.ownerDocument;
    const isInputFocused = inputDoc?.activeElement === input || document.activeElement === input;

    if (!isInputFocused) {
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
    renderSuggestions(dropdown, suggestions, selectedIndex, handleSelect, handleHover, getInteractionMode, swatches);

    isOpen = suggestions.length > 0;
    void paintSwatches(suggestions);
  };

  /**
   * Colours are measured where the compiled Tailwind lives, then the list is
   * drawn again — the explanations are cached per class, so scrolling back to
   * a colour already seen costs nothing.
   */
  const paintSwatches = async (shown: Suggestion[]) => {
    const wanted = shown
      .filter((suggestion) => suggestion.type === 'class' && !swatches.has(suggestion.value))
      .map((suggestion) => suggestion.value);
    if (wanted.length === 0) return;

    const colours = await resolveColors(wanted);
    for (const [className, colour] of colours) swatches.set(className, colour);

    // Only redraw if the list is still the one these belong to
    if (colours.size > 0 && isOpen && shown === suggestions) {
      renderSuggestions(dropdown, suggestions, selectedIndex, handleSelect, handleHover, getInteractionMode, swatches);
    }
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
    const completed = parsed.completedClasses.join(' ');
    let newValue = completed ? completed + ' ' : '';

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

    // Where the caret lands, measured before anything is appended behind it:
    // past the separating space for a finished class, tight against the colon
    // for a prefix still being built on. The space has to survive into the
    // field — trimming it off left the next class typed against the last one,
    // `text-xl` and `p-4` arriving as `text-xlp-4`.
    const caret = newValue.length;

    // Add any text after the cursor
    const afterCursor = value.substring(cursorPosition).trim();
    if (afterCursor) {
      newValue += afterCursor;
    }

    input.value = newValue;
    input.selectionStart = input.selectionEnd = caret;

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
    // A redraw still on the timer would reopen the list a moment after it was
    // dismissed — or right after a suggestion was taken, since accepting one
    // rewrites the field.
    debouncedUpdate.cancel();
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
  /**
   * Who gets Up and Down.
   *
   * While the list is open they step through it — that is the point of typing
   * `bg-red` and reaching `bg-red-500` without touching the mouse. The catch is
   * a textarea has lines of its own, and the list opens on every keystroke, so
   * there has to be a way out: Escape closes it, and Alt+Up/Down moves the
   * caret with the list still up. With the list closed the arrows are the
   * caret's, and pressing one does not reopen it.
   */
  const isMultiline = input.tagName === 'TEXTAREA';

  const stepSuggestion = (e: KeyboardEvent, delta: number) => {
    e.preventDefault();
    selectedIndex = delta > 0
      ? (selectedIndex + 1) % suggestions.length
      : (selectedIndex <= 0 ? suggestions.length - 1 : selectedIndex - 1);
    // Redrawing without the swatches would drop every colour off the list the
    // moment the keyboard touched it — the map is the only thing that carries
    // them between renders.
    renderSuggestions(dropdown, suggestions, selectedIndex, handleSelect, handleHover, getInteractionMode, swatches);
    updatePreview(selectedIndex);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    interactionMode = 'keyboard';
    const isVertical = e.key === 'ArrowDown' || e.key === 'ArrowUp';

    // These four keys read the list, and the list is drawn on a timer, so the
    // keystroke that should have shaped it may still be waiting its turn.
    // Without this, typing `p-4` and completing it straight away inserts
    // `p-0` — the top match for `p-`, one character behind.
    if (isVertical || e.key === 'Enter' || e.key === 'Tab') {
      debouncedUpdate.flush();
    }

    if (!isOpen) {
      // In a textarea the arrows belong to the caret; reopening the list here
      // would take them back and strand the caret on its line.
      if (isVertical && !isMultiline) {
        updateSuggestions();
        e.preventDefault();
        if (suggestions.length > 0) {
          updatePreview(selectedIndex);
        }
      }
      return;
    }

    // Alt is the way past an open list: the caret moves and the list goes,
    // since it was about the word the caret is leaving.
    if (isVertical && e.altKey) {
      closeSuggestions();
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        stepSuggestion(e, 1);
        break;

      case 'ArrowUp':
        stepSuggestion(e, -1);
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
  input.addEventListener('keydown', handleKeyDown as EventListener);
  input.addEventListener('focus', handleFocus);
  input.addEventListener('blur', handleBlur);

  // Handle window scroll/resize - use the correct window context
  const dropdownWin = dropdownOwnerDoc?.defaultView || window;

  const handleReposition = () => {
    if (isOpen) {
      positionDropdown(dropdown, input);
    }
  };

  dropdownWin.addEventListener('scroll', handleReposition, true);
  dropdownWin.addEventListener('resize', handleReposition);

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

  /**
   * Dismiss on the way down, not on blur.
   *
   * Blur closes the list 150ms later so a suggestion can still be clicked, but
   * the list sits over whatever is beneath the input — press a control down
   * there and the list, still on screen, takes the click instead. Closing on
   * mousedown outside lets the press through to what was aimed at.
   */
  const handleOutsidePress = (event: Event) => {
    if (!isOpen) return;
    const target = event.target as Node | null;
    if (!target || input.contains(target) || dropdown.contains(target)) return;
    closeSuggestions();
  };

  const pressDoc = dropdownOwnerDoc || document;
  pressDoc.addEventListener('mousedown', handleOutsidePress, true);

  // Return instance
  return {
    destroy: () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keydown', handleKeyDown as EventListener);
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      dropdownWin.removeEventListener('scroll', handleReposition, true);
      dropdownWin.removeEventListener('resize', handleReposition);
      dropdown.removeEventListener('mousemove', handleDropdownMouseMove);
      dropdown.removeEventListener('mouseleave', handleDropdownMouseLeave);
      pressDoc.removeEventListener('mousedown', handleOutsidePress, true);
      dropdown.remove();
    },

    close: () => {
      closeSuggestions();
    },

    updateClassData: (data: Partial<ClassData>) => {
      classData = { ...classData, ...data };
    },

    setValue: (value: string) => {
      // A list (or a redraw on the timer) built from the old text is stale.
      closeSuggestions();
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

// Export split mode utilities
export {
  AUTOCOMPLETE_DISABLE_ATTRS,
  parseClassesByBreakpoint,
  removeBreakpointPrefix,
  addBreakpointPrefix,
  combineFromSplitTextareas,
  syncToSplitTextareas,
  generateSplitModeHTML,
  generateMainTextareaHTML,
  isAutocompleteReady,
  waitForAutocomplete,
} from './split-mode';

import {
  AUTOCOMPLETE_DISABLE_ATTRS,
  parseClassesByBreakpoint,
  removeBreakpointPrefix,
  addBreakpointPrefix,
  combineFromSplitTextareas,
  syncToSplitTextareas,
  generateSplitModeHTML,
  generateMainTextareaHTML,
  isAutocompleteReady,
  waitForAutocomplete,
} from './split-mode';

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
      // Split mode utilities
      splitMode: {
        AUTOCOMPLETE_DISABLE_ATTRS: typeof AUTOCOMPLETE_DISABLE_ATTRS;
        parseClassesByBreakpoint: typeof parseClassesByBreakpoint;
        removeBreakpointPrefix: typeof removeBreakpointPrefix;
        addBreakpointPrefix: typeof addBreakpointPrefix;
        combineFromSplitTextareas: typeof combineFromSplitTextareas;
        syncToSplitTextareas: typeof syncToSplitTextareas;
        generateSplitModeHTML: typeof generateSplitModeHTML;
        generateMainTextareaHTML: typeof generateMainTextareaHTML;
        isAutocompleteReady: typeof isAutocompleteReady;
        waitForAutocomplete: typeof waitForAutocomplete;
      };
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
    // Split mode utilities
    splitMode: {
      AUTOCOMPLETE_DISABLE_ATTRS,
      parseClassesByBreakpoint,
      removeBreakpointPrefix,
      addBreakpointPrefix,
      combineFromSplitTextareas,
      syncToSplitTextareas,
      generateSplitModeHTML,
      generateMainTextareaHTML,
      isAutocompleteReady,
      waitForAutocomplete,
    },
  };
}

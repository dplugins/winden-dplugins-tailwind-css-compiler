/**
 * Tailwind Autocomplete Types
 */

export interface AutocompleteOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Input element or selector */
  input: HTMLInputElement | string;
  /** Callback when classes change */
  onChange?: (classes: string) => void;
  /** Callback when hovering or navigating suggestions for live preview */
  onPreview?: (previewClass: string | null) => void;
  /** Custom class data (optional, uses defaults if not provided) */
  classData?: ClassData;
  /** Maximum suggestions to show */
  maxSuggestions?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Additional class for dropdown (e.g., for theming) */
  dropdownClass?: string;
  /** Parent element for dropdown (defaults to document.body). Use this when the input is in a different document context (e.g., iframe, sidebar panel) */
  dropdownParent?: HTMLElement;
}

export interface ClassData {
  breakpoints: string[];
  variants: string[];
  classes: string[];
}

export interface Suggestion {
  value: string;
  type: 'breakpoint' | 'variant' | 'class';
  description?: string;
}

export interface ParsedInput {
  /** All completed classes before cursor */
  completedClasses: string[];
  /** Current partial class being typed */
  currentInput: string;
  /** Breakpoint prefix if any (e.g., "sm:") */
  breakpoint: string;
  /** Variant prefixes if any (e.g., "hover:focus:") */
  variants: string[];
  /** The base class being typed */
  baseClass: string;
  /** Cursor position in input */
  cursorPosition: number;
}

export interface AutocompleteInstance {
  /** Destroy the autocomplete instance */
  destroy: () => void;
  /** Close the suggestions dropdown */
  close: () => void;
  /** Update the class data */
  updateClassData: (data: Partial<ClassData>) => void;
  /** Programmatically set value */
  setValue: (value: string) => void;
  /** Get current value */
  getValue: () => string;
  /** Focus the input */
  focus: () => void;
}

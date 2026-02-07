/**
 * Shared utilities for preview-on-hover functionality across all page builders
 */
import { twMerge } from 'tailwind-merge';

function tokenizeClassString(classString = '') {
  return classString.trim().split(/\s+/).filter(Boolean);
}

function uniqueTokens(tokens = []) {
  const seen = new Set();
  return tokens.filter((token) => {
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
}

/**
 * Split class into variants and utility parts
 * Example: "hover:bg-red-500" -> { variants: "hover", utility: "bg-red-500" }
 * @param {string} className - The class name to split
 * @returns {{ variants: string, utility: string }}
 */
export function splitClassVariants(className = '') {
  const segments = [];
  let current = '';
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < className.length; i++) {
    const char = className[i];
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (char === ':' && bracketDepth === 0 && parenDepth === 0) {
      segments.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  segments.push(current);
  const utility = segments.pop() || '';
  return { variants: segments.join(':'), utility };
}

/**
 * Merge classes using Tailwind conflict resolution rules.
 * This handles all Tailwind utility groups, not just a fixed subset.
 * @param {string[]} existingClasses
 * @param {string[]} incomingClasses
 * @returns {string[]}
 */
export function mergeClassTokens(existingClasses = [], incomingClasses = []) {
  const existing = Array.isArray(existingClasses) ? existingClasses : [];
  const incoming = Array.isArray(incomingClasses) ? incomingClasses : [];

  const merged = twMerge([...existing, ...incoming].filter(Boolean).join(' '));
  return uniqueTokens(tokenizeClassString(merged));
}

/**
 * Get classes from `existingClasses` that are removed when `candidateClass` is merged.
 * @param {string[]} existingClasses
 * @param {string} candidateClass
 * @returns {string[]}
 */
export function getConflictingClasses(existingClasses = [], candidateClass = '') {
  const base = Array.isArray(existingClasses) ? existingClasses.filter(Boolean) : [];
  const candidate = String(candidateClass || '').trim();
  if (!candidate) return [];

  const mergedSet = new Set(mergeClassTokens(base, [candidate]));
  return base.filter((cls) => cls !== candidate && !mergedSet.has(cls));
}

/**
 * Create a preview class handler for a specific builder
 * @param {Function} getActiveElement - Function that returns the active element in the builder
 * @returns {{ applyPreviewClass: Function, clearPreview: Function }}
 */
export function createPreviewHandler(getActiveElement) {
  let lastPreviewClass = null;

  /**
   * Apply a preview class to the active element, replacing conflicting classes
   * @param {string} previewClass - The class to preview
   * @param {Object} metadata - Metadata about the preview
   * @param {boolean} metadata.isPreview - Whether this is a preview (true) or clear (false)
   */
  function applyPreviewClass(previewClass, metadata = {}) {
    const { isPreview = true } = metadata;

    const activeElement = getActiveElement();
    if (!activeElement) return;

    // Clear previous preview
    if (lastPreviewClass && activeElement.classList.contains(lastPreviewClass)) {
      activeElement.classList.remove(lastPreviewClass);
    }

    if (!isPreview || !previewClass) {
      lastPreviewClass = null;
      return;
    }

    // Remove classes that conflict with the preview class.
    const existingClasses = Array.from(activeElement.classList).filter((cls) => cls !== 'winden-preview');
    const classesToRemove = getConflictingClasses(existingClasses, previewClass);
    classesToRemove.forEach((cls) => activeElement.classList.remove(cls));

    // Add preview class
    activeElement.classList.add(previewClass);
    lastPreviewClass = previewClass;
  }

  /**
   * Clear any active preview
   */
  function clearPreview() {
    applyPreviewClass(null, { isPreview: false });
  }

  return { applyPreviewClass, clearPreview };
}

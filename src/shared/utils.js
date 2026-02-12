/**
 * Shared utilities for Winden page builder integrations
 */

/**
 * Compare two arrays for equality (order-insensitive).
 * Sorts copies before comparing to handle CSS class lists
 * where order doesn't matter.
 *
 * @param {Array} arr1
 * @param {Array} arr2
 * @returns {boolean}
 */
export function arraysEqual(arr1, arr2) {
    if (arr1 === arr2) return true;
    if (!Array.isArray(arr1) || !Array.isArray(arr2) || arr1.length !== arr2.length)
        return false;
    return [...arr1].sort().toString() === [...arr2].sort().toString();
}

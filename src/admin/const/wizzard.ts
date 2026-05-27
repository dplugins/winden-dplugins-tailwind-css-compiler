/**
 * Wizzard Constants
 * Single source of truth for Wizzard default values.
 */

/**
 * Default Winden step names used by the Wizzard (spacing, fontSize, borderRadius).
 * Ascending order: xs (smallest) → 2xl (largest). Mirrors Tailwind's own size
 * scale so users already familiar with class names like `text-lg` recognise
 * them. Existing saved states keep whatever step names the user has — only
 * fresh installs pick up these defaults.
 */
export const DEFAULT_WINDEN_STEPS = ["xs", "sm", "base", "md", "lg", "xl", "2xl"] as const;

/**
 * Default Winden step names as comma-separated string
 * Used for input field default values
 */
export const DEFAULT_WINDEN_STEPS_STRING = DEFAULT_WINDEN_STEPS.join(", ");

import type { FontFamilyEntry } from "@/types/wizzard";

/**
 * Predefined font family presets
 * Each preset contains a set of named font stacks
 */
export const fontPresets: Record<string, FontFamilyEntry[]> = {
    preset1: [
        { name: 'display', value: ['Oswald', 'sans-serif'] },
        { name: 'body', value: ["'Open Sans'", 'serif'] }
    ],
    preset2: [
        { name: 'display', value: ['Oswald', 'sans-serif'] },
        { name: 'subtitle', value: ['Oswald', 'sans-serif'] },
        { name: 'body', value: ["'Open Sans'", 'serif'] }
    ]
};

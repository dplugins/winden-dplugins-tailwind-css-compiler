import type { BreakpointEntry } from "@/types/wizzard";

/**
 * Predefined breakpoint presets for responsive design
 * Each preset contains a set of named breakpoints with pixel values
 */
export const breakpointsPresets: Record<string, BreakpointEntry[]> = {
    preset1: [
        { name: 'mob', value: 600 },
        { name: 'tab', value: 1200 },
        { name: 'desk', value: 1680 }
    ],
    preset2: [
        { name: 'mobile', value: 480 },
        { name: 'tablet', value: 1024 },
        { name: 'desktop', value: 1440 }
    ],
    preset3: [
        { name: 'sm', value: 640 },
        { name: 'md', value: 768 },
        { name: 'lg', value: 1024 },
        { name: 'xl', value: 1280 }
    ]
};

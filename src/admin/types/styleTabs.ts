/**
 * Style tab types for multi-tab CSS/SCSS editor
 */

export type LayerType = 'none' | 'theme' | 'base' | 'components' | 'utilities';

export interface StyleTab {
    id: string;
    name: string;
    content: string;
    layer: LayerType;
    order: number;
    isLocked?: boolean; // If true, this tab cannot be renamed, moved, or deleted
}

export interface StyleTabsState {
    tabs: StyleTab[];
    activeTabId: string;
}

export const DEFAULT_LAYER_OPTIONS: Array<{ value: LayerType; label: string; description: string }> = [
    { value: 'none', label: 'No Layer', description: 'Add CSS without any @layer wrapper' },
    { value: 'theme', label: '@layer theme', description: 'Theme layer - for design tokens and theme variables' },
    { value: 'base', label: '@layer base', description: 'Base layer - for element defaults and resets' },
    { value: 'components', label: '@layer components', description: 'Components layer - for component classes' },
    { value: 'utilities', label: '@layer utilities', description: 'Utilities layer - for utility classes' },
];

/**
 * Generates a new style tab with default values
 */
export function createStyleTab(name: string = 'New Style', layer: LayerType = 'none', content: string = '', isLocked: boolean = false): StyleTab {
    return {
        id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        name,
        content,
        layer,
        order: Date.now(),
        isLocked,
    };
}

/**
 * Combines multiple style tabs into a single CSS string with layer wrappers
 * Also adds comments to identify which tab each section comes from
 * Preserves empty tabs so they are not lost on save/reload
 */
export function combineStyleTabs(tabs: StyleTab[]): string {
    // Sort by order
    const sortedTabs = [...tabs].sort((a, b) => a.order - b.order);

    return sortedTabs
        .map(tab => {
            const trimmedContent = tab.content.trim();

            // Add source comment to help with debugging and preserve empty tabs
            const sourceComment = `/* Tab: ${tab.name} ${tab.layer !== 'none' ? `(@layer ${tab.layer})` : ''} */`;

            // If empty, just return the marker comment to preserve the tab
            if (!trimmedContent) {
                return sourceComment;
            }

            if (tab.layer === 'none') {
                return `${sourceComment}\n${trimmedContent}`;
            }

            return `${sourceComment}\n@layer ${tab.layer} {\n${trimmedContent}\n}`;
        })
        .join('\n\n');
}

/**
 * Parse combined CSS back into individual tabs
 * This is for backward compatibility with existing single-tab content
 */
const VALID_LAYERS: LayerType[] = ['none', 'theme', 'base', 'components', 'utilities'];
const TAB_MARKER_REGEX = /\/\*\s*Tab:\s*([^*]+?)(?:\s*\(@layer\s*(theme|base|components|utilities)\))?\s*\*\//g;

const normalizeLayer = (layer?: string): LayerType => {
    if (!layer) {
        return 'none';
    }

    return VALID_LAYERS.includes(layer as LayerType) ? (layer as LayerType) : 'none';
};

const stripLayerWrapper = (rawContent: string, layer: LayerType): string => {
    if (layer === 'none') {
        return rawContent.trim();
    }

    const trimmed = rawContent.trim();
    if (!trimmed.startsWith(`@layer ${layer}`)) {
        return trimmed;
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return trimmed;
    }

    return trimmed.slice(firstBrace + 1, lastBrace).trim();
};

export function parseContentIntoTabs(content: string): StyleTab[] {
    const fallbackTab = () => {
        const tab = createStyleTab('Main Style', 'none', content?.trim() ?? '', true);
        tab.order = 0;
        return [tab];
    };

    if (!content || content.trim() === '') {
        return fallbackTab();
    }

    TAB_MARKER_REGEX.lastIndex = 0;
    const tabs: StyleTab[] = [];
    let currentMeta: { name: string; layer: LayerType } | null = null;
    let previousEndIndex = 0;
    let orderCounter = 0;

    let match: RegExpExecArray | null;

    while ((match = TAB_MARKER_REGEX.exec(content)) !== null) {
        if (currentMeta) {
            const rawSection = content.slice(previousEndIndex, match.index);
            const cleanedContent = stripLayerWrapper(rawSection, currentMeta.layer);
            // Lock the tab if it's named "Main Style"
            const isLocked = currentMeta.name === 'Main Style';
            const tab = createStyleTab(currentMeta.name, currentMeta.layer, cleanedContent, isLocked);
            tab.order = orderCounter++;
            tabs.push(tab);
        } else {
            const leadingContent = content.slice(0, match.index).trim();
            if (leadingContent) {
                const tab = createStyleTab('Main Style', 'none', leadingContent, true);
                tab.order = orderCounter++;
                tabs.push(tab);
            }
        }

        currentMeta = {
            name: (match[1] || '').trim() || `Tab ${orderCounter + 1}`,
            layer: normalizeLayer(match[2]),
        };
        previousEndIndex = match.index + match[0].length;
    }

    if (currentMeta) {
        const rawSection = content.slice(previousEndIndex);
        const cleanedContent = stripLayerWrapper(rawSection, currentMeta.layer);
        // Lock the tab if it's named "Main Style"
        const isLocked = currentMeta.name === 'Main Style';
        const tab = createStyleTab(currentMeta.name, currentMeta.layer, cleanedContent, isLocked);
        tab.order = orderCounter++;
        tabs.push(tab);
    }

    if (tabs.length === 0) {
        return fallbackTab();
    }

    return tabs;
}

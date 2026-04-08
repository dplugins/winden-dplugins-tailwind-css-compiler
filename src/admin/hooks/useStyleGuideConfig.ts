import { useState, useEffect, useContext } from 'react';
import { WizzardContext } from '@hooks/wizzardContext';
import type { WizzardState } from '@/types/wizzard';
import '@/types/global.d.ts';

interface StyleGuideTheme {
    zIndex: string[];
    aspectRatio: string[];
    accentColor: Record<string, any>;
    fontSizes: Record<string, any>;
    fontFamilies: Record<string, any>;
    fontWeights: Record<string, any>;
    letterSpacing: Record<string, any>;
    lineHeights: Record<string, any>;
    spacing: Record<string, any>;
    screens: Record<string, any>;
    shadows: Record<string, any>;
    borderRadius: Record<string, any>;
    widths: Record<string, any>;
}

interface UseStyleGuideConfigProps {
    scssContent: string;
    jsContent: string;
}

interface UseStyleGuideConfigReturn extends StyleGuideTheme {
    hasConfig: boolean;
}

const defaultTheme: StyleGuideTheme = {
    zIndex: [],
    aspectRatio: [],
    accentColor: {},
    fontSizes: {},
    fontFamilies: {},
    fontWeights: {},
    letterSpacing: {},
    lineHeights: {},
    spacing: {},
    screens: {},
    shadows: {},
    borderRadius: {},
    widths: {},
};

/**
 * Hook for extracting and managing StyleGuide configuration
 */
export function useStyleGuideConfig({
    scssContent,
    jsContent,
}: UseStyleGuideConfigProps): UseStyleGuideConfigReturn {
    const { localWizzardState } = useContext(WizzardContext) as { localWizzardState: WizzardState };
    const [hasConfig, setHasConfig] = useState<boolean>(false);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
    const [theme, setTheme] = useState<StyleGuideTheme>(defaultTheme);

    // Wait for config extractor to be available
    useEffect(() => {
        const waitForConfig = () => {
            return new Promise<string>((resolve) => {
                const checkConfig = () => {
                    const shouldWait = localStorage.getItem('_wait_for_config');

                    if (window.extractStyleGuideConfig && !shouldWait) {
                        resolve('v4');
                    } else {
                        requestAnimationFrame(checkConfig);
                    }
                };
                checkConfig();
            });
        };

        waitForConfig().then(() => {
            setHasConfig(true);
        });

        // Set up global refresh function
        window.refreshStyleGuide = () => {
            setRefreshTrigger(prev => prev + 1);
        };

        return () => {
            delete window.refreshStyleGuide;
        };
    }, []);

    // Extract configuration when content changes
    useEffect(() => {
        if (!hasConfig) return;

        const timeoutId = setTimeout(() => {
            const extractConfig = async () => {
                try {
                    if (!window.extractStyleGuideConfig) return;

                    let wizardContent = '';
                    let windenStylesContent = '';

                    // PRIORITY FIX: Use React state first (up-to-date), fall back to window object (stale)
                    // This ensures Style Guide shows changes immediately after save
                    windenStylesContent = scssContent || window.winden_editor?.scss || '';
                    wizardContent = localWizzardState?.configCode || window.winden_editor?.wizzard?.configCode || '';

                    const combinedContent = wizardContent + '\n' + windenStylesContent;

                    const result = await window.extractStyleGuideConfig(jsContent || '', wizardContent, windenStylesContent);

                    if (result.success && result.config.theme) {
                        const extractedTheme = result.config.theme;
                        const newTheme: StyleGuideTheme = { ...defaultTheme };

                        if (extractedTheme.zIndex) {
                            newTheme.zIndex = Object.keys(extractedTheme.zIndex).map(key => `z-${key}`);
                        }

                        if (extractedTheme.aspectRatio) {
                            newTheme.aspectRatio = Object.keys(extractedTheme.aspectRatio).map(key => `aspect-${key}`);
                        }

                        if (extractedTheme.accentColor) {
                            newTheme.accentColor = filterAccentColors(extractedTheme.accentColor, combinedContent);
                        }

                        if (extractedTheme.fontSize) {
                            newTheme.fontSizes = extractedTheme.fontSize;
                        }

                        if (extractedTheme.fontFamily) {
                            newTheme.fontFamilies = extractedTheme.fontFamily;
                        }

                        if (extractedTheme.fontWeight) {
                            newTheme.fontWeights = extractedTheme.fontWeight;
                        }

                        if (extractedTheme.letterSpacing) {
                            newTheme.letterSpacing = extractedTheme.letterSpacing;
                        }

                        if (extractedTheme.lineHeight) {
                            newTheme.lineHeights = extractedTheme.lineHeight;
                        }

                        if (extractedTheme.spacing) {
                            newTheme.spacing = extractedTheme.spacing;
                        }

                        if (extractedTheme.screens) {
                            newTheme.screens = extractedTheme.screens;
                        }

                        if (extractedTheme.borderRadius) {
                            newTheme.borderRadius = extractedTheme.borderRadius;
                        }

                        if (extractedTheme.dropShadow) {
                            newTheme.shadows = extractedTheme.dropShadow;
                        }

                        if (extractedTheme.width) {
                            newTheme.widths = extractedTheme.width;
                        }

                        setTheme(newTheme);
                    } else {
                        console.error('StyleGuide: Failed to extract configuration:', result);
                    }
                } catch (error) {
                    console.error('StyleGuide: Error extracting configuration:', error);
                }
            };

            extractConfig();
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [hasConfig, localWizzardState, scssContent, jsContent, refreshTrigger]);

    return {
        hasConfig,
        ...theme,
    };
}

/**
 * Filter accent colors based on defined colors in content
 */
function filterAccentColors(
    accentColor: Record<string, any>,
    combinedContent: string
): Record<string, any> {
    // Pattern captures full color names like "blue-light", "blue-dark" but excludes shade numbers
    // - ([a-z][a-z0-9]*) - first word starts with letter
    // - (?:-[a-z][a-z0-9]*)* - followed by optional hyphen-separated words (starting with letters, not numbers)
    // - (?:-\d+)? - optionally followed by a shade number like -500
    const wizardColorPattern = /--color-([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)(?:-\d+)?:/gi;
    const definedColors = new Set<string>();
    let match;

    while ((match = wizardColorPattern.exec(combinedContent)) !== null) {
        definedColors.add(match[1].toLowerCase());
    }

    return Object.fromEntries(
        Object.entries(accentColor).filter(([key, value]) => {
            if (key === 'inherit' || key === 'auto' || key === 'transparent' || key === 'current') {
                return false;
            }

            if (combinedContent.includes('--color-*: initial')) {
                const colorName = key.toLowerCase();
                if (!definedColors.has(colorName)) {
                    return false;
                }
            }

            if (typeof value === 'string' && value === 'initial') {
                return false;
            }

            if (typeof value === 'object') {
                const hasNonInitialValue = Object.values(value).some(v => v !== 'initial');
                return hasNonInitialValue;
            }

            return true;
        })
    );
}

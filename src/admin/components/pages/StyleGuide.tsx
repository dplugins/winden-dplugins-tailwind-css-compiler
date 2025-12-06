import React, { useState, useEffect, useContext } from 'react';
import Title from './StyleGuide/Title';
import ZIndex from './StyleGuide/ZIndex';
import AspectRatio from './StyleGuide/AspectRatio';
import Color from './StyleGuide/Color';
import Typography from './StyleGuide/Typography';
import Space from './StyleGuide/Space';
import Screens from './StyleGuide/Screens';
import Shadow from './StyleGuide/Shadow';
import BorderRadius from './StyleGuide/BorderRadius';
import Width from './StyleGuide/Width';
import { WizzardContext } from '@hooks/wizzardContext';

declare global {
    interface Window {
        fullTailwindConfig: any;
        extractStyleGuideConfig: any;
    }
}

function StyleGuide({ scssContent, jsContent, settings }) {
    const { localWizzardState } = useContext(WizzardContext);
    const [hasConfig, setHasConfig] = useState<boolean>(false);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
    const [zIndexClassNames, setZIndexClassNames] = useState<Array<String>>([]);
    const [aspectRatioClassNames, setAspectRatioClassNames] = useState<Array<String>>([]);
    const [accentColor, setAccentColor] = useState({});
    const [fontSizes, setFontSizes] = useState({});
    const [fontFamilies, setFontFamilies] = useState({});
    const [fontWeights, setFontWeights] = useState({});
    const [letterSpacing, setLetterSpacing] = useState({});
    const [lineHeights, setLineHeights] = useState({});
    const [spacing, setSpacing] = useState({});
    const [screens, setScreens] = useState({});
    const [shadows, setShadows] = useState({});
    const [borderRadius, setBorderRadius] = useState({});
    const [widths, setWidths] = useState({});

    // Effect to detect available configuration extractors
    useEffect(() => {
        const waitForConfig = () => {
            return new Promise((resolve) => {
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

        waitForConfig().then((config: any) => {
            setHasConfig(true);
        });

        // Set up global refresh function that can be called from outside
        (window as any).refreshStyleGuide = () => {
            // console.log('🔍 StyleGuide: Manual refresh triggered');
            setRefreshTrigger(prev => prev + 1);
        };

        return () => {
            delete (window as any).refreshStyleGuide;
        };
    }, []);

    // Effect to extract configuration when content changes
    useEffect(() => {
        if (!hasConfig) return;

        // Add a small delay to prevent excessive re-extractions
        const timeoutId = setTimeout(() => {
            // console.log('🔍 StyleGuide: Extracting configuration from current content...');

            const extractConfig = async () => {
                try {
                    if (window.extractStyleGuideConfig) {
                        // console.log('🔍 StyleGuide: Loading Tailwind v4 configuration...');

                        // Use window.winden_editor if available (same as autocomplete pattern)
                        let wizardContent = '';
                        let windenStylesContent = '';

                        if (window.winden_editor?.scss) {
                            windenStylesContent = window.winden_editor.scss;
                            // console.log('🔍 StyleGuide: Using scss content from window.winden_editor');
                        } else {
                            windenStylesContent = scssContent || '';
                            // console.log('🔍 StyleGuide: Using scss content from props');
                        }

                        // For color filtering, check both wizard and styles content
                        if (window.winden_editor?.wizzard?.configCode) {
                            wizardContent = window.winden_editor.wizzard.configCode;
                            // console.log('🔍 StyleGuide: Using wizard content from window.winden_editor');
                        } else {
                            wizardContent = localWizzardState?.configCode || '';
                            // console.log('🔍 StyleGuide: Using wizard content from props');
                        }

                        // Combine wizard and styles for color detection
                        const combinedContent = wizardContent + '\n' + windenStylesContent;

                        // console.log('🔍 StyleGuide: Wizard content length:', wizardContent.length);
                        // console.log('🔍 StyleGuide: Winden styles content length:', windenStylesContent.length);
                        // console.log('🔍 StyleGuide: jsContent length:', jsContent?.length || 0);

                        const result = await window.extractStyleGuideConfig(jsContent || '', wizardContent, windenStylesContent);

                        // console.log('🔍 StyleGuide: Extraction result:', result);
                        
                        if (result.success && result.config.theme) {
                            const theme = result.config.theme;
                            // console.log('🔍 StyleGuide: Theme extracted:', theme);

                            if (theme.zIndex) {
                                setZIndexClassNames(Object.keys(theme.zIndex).map(key => `z-${key}`));
                            }

                            if (theme.aspectRatio) {
                                setAspectRatioClassNames(Object.keys(theme.aspectRatio).map(key => `aspect-${key}`));
                            }

                            if (theme.accentColor) {
                                // Extract color names from combined wizard and styles content
                                const wizardColorPattern = /--color-([a-z0-9]+)(?:-\d+)?:/gi;
                                const definedColors = new Set();
                                let match;
                                while ((match = wizardColorPattern.exec(combinedContent)) !== null) {
                                    definedColors.add(match[1].toLowerCase());
                                }
                                const filteredAccentColors = Object.fromEntries(
                                    Object.entries(theme.accentColor).filter(([key, value]) => {
                                        // Filter out special keywords and initial values
                                        if (key === 'inherit' || key === 'auto' || key === 'transparent' || key === 'current') return false;

                                        // If using --color-*: initial, only include colors explicitly defined
                                        if (combinedContent.includes('--color-*: initial')) {
                                            const colorName = key.toLowerCase();
                                            if (!definedColors.has(colorName)) {
                                                return false;
                                            }
                                        }

                                        // Filter out colors with 'initial' value (can be nested object or direct value)
                                        if (typeof value === 'string' && value === 'initial') return false;
                                        if (typeof value === 'object') {
                                            // Check if all nested values are 'initial'
                                            const hasNonInitialValue = Object.values(value).some(v => v !== 'initial');
                                            return hasNonInitialValue;
                                        }

                                        return true;
                                    })
                                );
                                setAccentColor(filteredAccentColors);
                                // console.log('🔍 StyleGuide: Set accent colors:', filteredAccentColors);
                            }

                            if (theme.fontSize) {
                                setFontSizes(theme.fontSize);
                                // console.log('🔍 StyleGuide: Set font sizes:', theme.fontSize);
                            }

                            if (theme.fontFamily) {
                                setFontFamilies(theme.fontFamily);
                                // console.log('🔍 StyleGuide: Set font families:', theme.fontFamily);
                            }

                            if (theme.fontWeight) {
                                setFontWeights(theme.fontWeight);
                                // console.log('🔍 StyleGuide: Set font weights:', theme.fontWeight);
                            }

                            if (theme.letterSpacing) {
                                setLetterSpacing(theme.letterSpacing);
                                // console.log('🔍 StyleGuide: Set letter spacing:', theme.letterSpacing);
                            }

                            if (theme.lineHeight) {
                                setLineHeights(theme.lineHeight);
                                // console.log('🔍 StyleGuide: Set line heights:', theme.lineHeight);
                            }

                            if (theme.spacing) {
                                setSpacing(theme.spacing);
                                // console.log('🔍 StyleGuide: Set spacing:', theme.spacing);
                            }

                            if (theme.screens) {
                                setScreens(theme.screens);
                                // console.log('🔍 StyleGuide: Set screens:', theme.screens);
                            }

                            if (theme.borderRadius) {
                                setBorderRadius(theme.borderRadius);
                                // console.log('🔍 StyleGuide: Set border radius:', theme.borderRadius);
                            }

                            if (theme.dropShadow) {
                                setShadows(theme.dropShadow);
                                // console.log('🔍 StyleGuide: Set shadows:', theme.dropShadow);
                            }

                            if (theme.width) {
                                setWidths(theme.width);
                                // console.log('🔍 StyleGuide: Set widths:', theme.width);
                            }
                        } else {
                            console.error('🔍 StyleGuide: Failed to extract configuration:', result);
                        }
                    }
                } catch (error) {
                    console.error('🔍 StyleGuide: Error extracting configuration:', error);
                }
            };
            
            extractConfig();
        }, 100); // Small delay to prevent excessive re-extractions

        return () => clearTimeout(timeoutId);
    }, [hasConfig, localWizzardState, scssContent, jsContent, refreshTrigger]);

    // console.log('🔍 StyleGuide: Rendering with config:', {
    //     hasConfig,
    //     accentColor: Object.keys(accentColor),
    //     fontSizes: Object.keys(fontSizes),
    //     fontFamilies: Object.keys(fontFamilies),
    //     spacing: Object.keys(spacing)
    // });

    return (
        <div className="flex h-fit flex-auto flex-col">
            {hasConfig ? (
                <>
                    <div className='p-8 styleguide-grid'>
                        <Title text="Colors" link="https://tailwindcss.com/docs/customizing-colors" />
                        <Color colors={accentColor} />
                        <Title text="Typography" link="https://tailwindcss.com/docs/font-family" />
                        <Typography
                            fontSizes={fontSizes}
                            fontFamilies={fontFamilies}
                            fontWeight={fontWeights}
                            letterSpacing={letterSpacing}
                            lineHeights={lineHeights}
                        />
                        <Title text="Screens" link="https://tailwindcss.com/docs/screens" />
                        <Screens screens={screens} />
                        <Title text="Space" link="https://tailwindcss.com/docs/customizing-spacing" />
                        <Space classNames={spacing} />
                        <Title text="Widths" link="https://tailwindcss.com/docs/width" />
                        <Width widths={widths} />
                        <Title text="Border Radius" link="https://tailwindcss.com/docs/border-radius" />
                        <BorderRadius borderRadiusObj={borderRadius} />
                        <Title text="Shadows" link="https://tailwindcss.com/docs/box-shadow" />
                        <Shadow shadows={shadows} />
                    </div>
                </>
            ) : (
                <div>Loading StyleGuide...</div>
            )}
        </div>
    );
}

export default StyleGuide;

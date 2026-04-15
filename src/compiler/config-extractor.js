/**
 * Configuration Extractor for Tailwind CSS v4
 * Extracts breakpoints, colors, spacing, font sizes from CSS custom properties
 */

/**
 * Convert JS config object to CSS custom properties
 * @param {string} jsConfigString - The JS config as a string
 * @returns {string} - CSS custom properties string
 */
export function convertJsConfigToCss(jsConfigString) {
    if (!jsConfigString || typeof jsConfigString !== 'string') {
        console.error('[winden] convertJsConfigToCss: Invalid input - expected non-empty string');
        return '';
    }

    try {
        // Remove 'export default' and parse the JS object
        const cleanConfig = jsConfigString.replace(/export\s+default\s*/, '').trim();

        if (!cleanConfig) {
            console.error('[winden] convertJsConfigToCss: Config string is empty after cleaning');
            return '';
        }

        // Use Function constructor to parse the config object
        // Note: This is safer than eval but still executes user code
        // Consider replacing with a proper parser in the future
        let config;
        try {
            config = (new Function(`return ${cleanConfig}`))();
        } catch (parseError) {
            console.error('[winden] convertJsConfigToCss: Failed to parse config object', {
                error: parseError.message,
                snippet: cleanConfig.substring(0, 100)
            });
            return '';
        }

        if (!config || typeof config !== 'object') {
            console.error('[winden] convertJsConfigToCss: Parsed config is not an object');
            return '';
        }

        let css = '';

        // Convert colors
        if (config.theme?.extend?.colors) {
            Object.entries(config.theme.extend.colors).forEach(([colorName, colorValue]) => {
                if (typeof colorValue === 'string') {
                    css += `--color-${colorName}: ${colorValue};\n`;
                } else if (typeof colorValue === 'object') {
                    Object.entries(colorValue).forEach(([shade, shadeValue]) => {
                        if (shade === 'DEFAULT') {
                            css += `--color-${colorName}: ${shadeValue};\n`;
                        } else {
                            css += `--color-${colorName}-${shade}: ${shadeValue};\n`;
                        }
                    });
                }
            });
        }

        // Convert spacing
        if (config.theme?.extend?.spacing) {
            Object.entries(config.theme.extend.spacing).forEach(([spacingName, spacingValue]) => {
                css += `--spacing-${spacingName}: ${spacingValue};\n`;
            });
        }

        // Convert font sizes
        if (config.theme?.extend?.fontSize) {
            Object.entries(config.theme.extend.fontSize).forEach(([fontSizeName, fontSizeValue]) => {
                if (typeof fontSizeValue === 'string') {
                    css += `--text-${fontSizeName}: ${fontSizeValue};\n`;
                } else if (Array.isArray(fontSizeValue)) {
                    css += `--text-${fontSizeName}: ${fontSizeValue[0]};\n`;
                }
            });
        }

        // Convert screens
        if (config.theme?.extend?.screens) {
            Object.entries(config.theme.extend.screens).forEach(([screenName, screenValue]) => {
                css += `--breakpoint-${screenName}: ${screenValue};\n`;
            });
        }

        return css;
    } catch (error) {
        console.error('[winden] convertJsConfigToCss: Unexpected error', {
            error: error.message,
            stack: error.stack
        });
        return '';
    }
}

/**
 * Extract colors from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with color values
 */
export function extractColors(cssContent) {
    const colors = {};
    let hasReset = false;

    // Check if there's a color reset (--color-*: initial;)
    if (cssContent.includes('--color-*: initial;') || cssContent.includes('--color-*:initial;')) {
        hasReset = true;
    }

    // Match color custom properties
    const colorMatches = cssContent.match(/--color-([^:]+):\s*([^;]+);/g) || [];

    colorMatches.forEach(match => {
        const colorName = match.match(/--color-([^:]+):/)?.[1];
        const colorValue = match.match(/:\s*([^;]+);/)?.[1];

        if (colorName && colorValue && colorName !== '*' && colorValue.trim() !== 'initial') {
            // Handle nested color objects (e.g., red-50, red-100, etc.)
            // Important: Multi-word color names like "blue-light" should stay together
            // Only numeric suffixes (50, 100, 200, etc.) are shade values
            const parts = colorName.split('-');

            // Find the last numeric part (if any) - that's the shade
            // Everything before it is the color name
            let baseColor = colorName;
            let shade = 'DEFAULT';

            if (parts.length >= 2) {
                const lastPart = parts[parts.length - 1];
                // Check if the last part is numeric (a shade like 50, 100, 200, 500, etc.)
                if (/^\d+$/.test(lastPart)) {
                    // Last part is a shade number
                    baseColor = parts.slice(0, -1).join('-');
                    shade = lastPart;
                }
                // If last part is not numeric, the whole thing is the color name
            }

            if (!colors[baseColor]) {
                colors[baseColor] = {};
            }
            colors[baseColor][shade] = colorValue.trim();
        }
    });

    // Clean up colors that only have DEFAULT values
    Object.keys(colors).forEach(colorName => {
        const colorObj = colors[colorName];
        if (typeof colorObj === 'object' && Object.keys(colorObj).length === 1 && colorObj['DEFAULT']) {
            // If there's only a DEFAULT value, make it the main color
            colors[colorName] = colorObj['DEFAULT'];
        }
    });

    // If there's a reset, mark it so the merge logic clears defaults
    if (hasReset) {
        colors.__reset__ = true;
    }

    return colors;
}

/**
 * Extract spacing values from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with spacing values
 */
export function extractSpacing(cssContent) {
    const spacing = {};
    let hasReset = false;

    // Check if there's a spacing reset (--spacing-*: initial;)
    if (cssContent.includes('--spacing-*: initial;') || cssContent.includes('--spacing-*:initial;')) {
        hasReset = true;
    }

    // Match spacing custom properties
    const spacingMatches = cssContent.match(/--spacing-([^:]+):\s*([^;]+);/g) || [];

    spacingMatches.forEach(match => {
        const spacingName = match.match(/--spacing-([^:]+):/)?.[1];
        const spacingValue = match.match(/:\s*([^;]+);/)?.[1];

        if (spacingName && spacingValue) {
            const trimmedValue = spacingValue.trim();
            // Filter out wildcard names and initial values
            if (spacingName === '*' || trimmedValue === 'initial') return;
            spacing[spacingName] = trimmedValue;
        }
    });

    // If there's a reset, mark it so the merge logic clears defaults
    if (hasReset) {
        spacing.__reset__ = true;
    }

    return spacing;
}

/**
 * Extract font sizes from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with font size values
 */
export function extractFontSizes(cssContent) {
    const fontSizes = {};
    let hasReset = false;

    // Check if there's a font size reset (--text-*: initial;)
    if (cssContent.includes('--text-*: initial;') || cssContent.includes('--text-*:initial;')) {
        hasReset = true;
    }

    // Match text size custom properties
    const textMatches = cssContent.match(/--text-([^:]+):\s*([^;]+);/g) || [];

    textMatches.forEach(match => {
        const textName = match.match(/--text-([^:]+):/)?.[1];
        const textValue = match.match(/:\s*([^;]+);/)?.[1];

        if (textName && textValue) {
            const trimmedValue = textValue.trim();

            // Filter out wildcard names and initial values
            if (textName === '*' || trimmedValue === 'initial') return;

            // Filter out line-height and shadow properties
            const isLineHeight = textName.includes('line-height') || textName.includes('--line-height');
            const isShadow = textName.includes('shadow') || textName.startsWith('shadow');
            const hasInvalidChars = textName.includes('(') || textName.includes(')') || textName.includes(';');

            // Only include actual font size properties
            if (!isLineHeight && !isShadow && !hasInvalidChars) {
                fontSizes[textName] = trimmedValue;
            }
        }
    });

    // If there's a reset, mark it so the merge logic clears defaults
    if (hasReset) {
        fontSizes.__reset__ = true;
    }

    return fontSizes;
}

/**
 * Extract breakpoints from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with breakpoint values
 */
export function extractBreakpoints(cssContent) {
    const breakpoints = {};
    let hasReset = false;
    
    // Check if there's a breakpoint reset (--breakpoint-*: initial;)
    if (cssContent.includes('--breakpoint-*: initial;')) {
        hasReset = true;
    }
    
    // Match breakpoint custom properties
    const breakpointMatches = cssContent.match(/--breakpoint-([^:]+):\s*([^;]+);/g) || [];
    
    breakpointMatches.forEach(match => {
        const breakpointName = match.match(/--breakpoint-([^:]+):/)?.[1];
        const breakpointValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (breakpointName && breakpointValue) {
            const trimmedValue = breakpointValue.trim();
            // Filter out wildcard names and initial values
            if (breakpointName !== '*' && trimmedValue !== 'initial') {
                breakpoints[breakpointName] = trimmedValue;
            }
        }
    });
    
    // If there's a reset, mark it in the result
    if (hasReset) {
        breakpoints.__reset__ = true;
    }
    
    return breakpoints;
}

/**
 * Extract font families from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with font family values
 */
export function extractFontFamilies(cssContent) {
    const fontFamilies = {};
    
    // Match font family custom properties - only capture actual font families
    // Exclude font weights and other font-related properties
    const fontMatches = cssContent.match(/--font-([^:]+):\s*([^;]+);/g) || [];
    
    fontMatches.forEach(match => {
        const fontName = match.match(/--font-([^:]+):/)?.[1];
        const fontValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (fontName && fontValue) {
            // Filter out font weights and other non-font-family properties
            const isFontWeight = fontName.includes('weight') || fontName.includes('font-weight');
            const isFontFeature = fontName.includes('feature') || fontName.includes('variation');
            const isFontVariation = fontName.includes('variation');
            const isDefaultFont = fontName.includes('default');
            
            // Only include actual font family names (sans, serif, mono, etc.)
            if (!isFontWeight && !isFontFeature && !isFontVariation && !isDefaultFont) {
                fontFamilies[fontName] = fontValue.trim();
            }
        }
    });
    
    return fontFamilies;
}

/**
 * Extract font weights from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with font weight values
 */
export function extractFontWeights(cssContent) {
    const fontWeights = {};
    
    // Match font weight custom properties
    const fontWeightMatches = cssContent.match(/--font-weight-([^:]+):\s*([^;]+);/g) || [];
    
    fontWeightMatches.forEach(match => {
        const weightName = match.match(/--font-weight-([^:]+):/)?.[1];
        const weightValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (weightName && weightValue) {
            fontWeights[weightName] = weightValue.trim();
        }
    });
    
    return fontWeights;
}

/**
 * Extract letter spacing from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with letter spacing values
 */
export function extractLetterSpacing(cssContent) {
    const letterSpacing = {};
    
    // Match tracking custom properties (Tailwind v4 uses --tracking-* for letter spacing)
    const trackingMatches = cssContent.match(/--tracking-([^:]+):\s*([^;]+);/g) || [];
    
    trackingMatches.forEach(match => {
        const trackingName = match.match(/--tracking-([^:]+):/)?.[1];
        const trackingValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (trackingName && trackingValue) {
            letterSpacing[trackingName] = trackingValue.trim();
        }
    });
    
    // Also match letter-spacing properties that are part of text properties
    const textLetterSpacingMatches = cssContent.match(/--text-([^:]+)-letter-spacing:\s*([^;]+);/g) || [];
    
    textLetterSpacingMatches.forEach(match => {
        const spacingName = match.match(/--text-([^:]+)-letter-spacing:/)?.[1];
        const spacingValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (spacingName && spacingValue) {
            letterSpacing[spacingName] = spacingValue.trim();
        }
    });
    
    return letterSpacing;
}

/**
 * Extract line heights from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with line height values
 */
export function extractLineHeights(cssContent) {
    const lineHeights = {};
    
    // Match line height custom properties
    const lineHeightMatches = cssContent.match(/--line-height-([^:]+):\s*([^;]+);/g) || [];
    
    lineHeightMatches.forEach(match => {
        const heightName = match.match(/--line-height-([^:]+):/)?.[1];
        const heightValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (heightName && heightValue) {
            lineHeights[heightName] = heightValue.trim();
        }
    });
    
    // Also match line-height properties that are part of text properties
    const textLineHeightMatches = cssContent.match(/--text-([^:]+)-line-height:\s*([^;]+);/g) || [];
    
    textLineHeightMatches.forEach(match => {
        const heightName = match.match(/--text-([^:]+)-line-height:/)?.[1];
        const heightValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (heightName && heightValue) {
            lineHeights[heightName] = heightValue.trim();
        }
    });
    
    return lineHeights;
}

/**
 * Extract border radius from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with border radius values
 */
export function extractBorderRadius(cssContent) {
    const borderRadius = {};
    
    // Match border radius custom properties
    const borderRadiusMatches = cssContent.match(/--radius-([^:]+):\s*([^;]+);/g) || [];
    
    borderRadiusMatches.forEach(match => {
        const radiusName = match.match(/--radius-([^:]+):/)?.[1];
        const radiusValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (radiusName && radiusValue) {
            borderRadius[radiusName] = radiusValue.trim();
        }
    });
    
    return borderRadius;
}

/**
 * Extract shadows from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with shadow values
 */
export function extractShadows(cssContent) {
    const shadows = {};
    
    // Match shadow custom properties
    const shadowMatches = cssContent.match(/--shadow-([^:]+):\s*([^;]+);/g) || [];
    
    shadowMatches.forEach(match => {
        const shadowName = match.match(/--shadow-([^:]+):/)?.[1];
        const shadowValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (shadowName && shadowValue) {
            shadows[shadowName] = shadowValue.trim();
        }
    });
    
    return shadows;
}

/**
 * Extract widths from CSS custom properties
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with width values
 */
export function extractWidths(cssContent) {
    const widths = {};
    
    // Match spacing custom properties (Tailwind v4 width utilities are based on --spacing)
    const spacingMatches = cssContent.match(/--spacing-([^:]+):\s*([^;]+);/g) || [];
    
    spacingMatches.forEach(match => {
        const spacingName = match.match(/--spacing-([^:]+):/)?.[1];
        const spacingValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (spacingName && spacingValue) {
            // Convert spacing values to width values
            // Width utilities use the same spacing scale
            widths[spacingName] = spacingValue.trim();
        }
    });
    
    // Also match container width custom properties
    const containerMatches = cssContent.match(/--container-([^:]+):\s*([^;]+);/g) || [];
    
    containerMatches.forEach(match => {
        const containerName = match.match(/--container-([^:]+):/)?.[1];
        const containerValue = match.match(/:\s*([^;]+);/)?.[1];
        
        if (containerName && containerValue) {
            // Container widths are specific width values
            widths[containerName] = containerValue.trim();
        }
    });
    
    return widths;
}

/**
 * Extract all configuration values from CSS content
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} - Object with all extracted configuration
 */
export function extractAllConfig(cssContent) {
    return {
        colors: extractColors(cssContent),
        spacing: extractSpacing(cssContent),
        fontSizes: extractFontSizes(cssContent),
        breakpoints: extractBreakpoints(cssContent),
        fontFamilies: extractFontFamilies(cssContent),
        fontWeights: extractFontWeights(cssContent),
        letterSpacing: extractLetterSpacing(cssContent),
        lineHeights: extractLineHeights(cssContent),
        borderRadius: extractBorderRadius(cssContent),
        shadows: extractShadows(cssContent),
        widths: extractWidths(cssContent)
    };
}

/**
 * Extract configuration from multiple sources and merge them
 * @param {Object} sources - Object with different CSS sources
 * @returns {Object} - Merged configuration object
 */
export function extractConfigFromSources(sources) {
    const configs = {};
    
    // Extract from each source
    Object.keys(sources).forEach(sourceName => {
        if (sources[sourceName]) {
            let cssContent = sources[sourceName];

            // If this is the JS config source, convert it to CSS
            if ((sourceName === 'tailwindDefaults' || sourceName === 'jsConfig') && (cssContent.includes('export default') || cssContent.includes('theme:'))) {
                cssContent = convertJsConfigToCss(cssContent);
            }

            configs[sourceName] = extractAllConfig(cssContent);
        }
    });
    
    // Merge configurations (Tailwind defaults -> Wizard -> Winden styles)
    const merged = {
        colors: {},
        spacing: {},
        fontSizes: {},
        breakpoints: {},
        fontFamilies: {},
        fontWeights: {},
        letterSpacing: {},
        lineHeights: {},
        borderRadius: {},
        shadows: {},
        widths: {}
    };
    
    // Merge in order: Tailwind defaults, JS config, Wizard, Winden styles
    const mergeOrder = ['tailwindDefaults', 'jsConfig', 'wizard', 'windenStyles'];
    
    mergeOrder.forEach(sourceName => {
        if (configs[sourceName]) {
            Object.keys(merged).forEach(category => {
                if (configs[sourceName][category]) {
                    const sourceConfig = configs[sourceName][category];

                    // Handle wildcard reset (--*: initial;) for any category
                    if (sourceConfig.__reset__) {
                        // Reset: clear defaults and only include new custom values
                        const cleanConfig = { ...sourceConfig };
                        delete cleanConfig.__reset__;
                        merged[category] = cleanConfig;
                    } else {
                        // Normal merge
                        merged[category] = {
                            ...merged[category],
                            ...sourceConfig
                        };
                    }
                }
            });
        }
    });
    
    return {
        merged,
        sources: configs
    };
}

/**
 * Convert extracted config to StyleGuide format
 * @param {Object} config - The extracted configuration
 * @returns {Object} - Configuration in StyleGuide format
 */
export function convertToStyleGuideFormat(config) {
    return {
        theme: {
            colors: config.colors,
            spacing: config.spacing,
            fontSize: config.fontSizes,
            screens: config.breakpoints,
            fontFamily: config.fontFamilies,
            fontWeight: config.fontWeights,
            letterSpacing: config.letterSpacing,
            lineHeight: config.lineHeights,
            borderRadius: config.borderRadius,
            dropShadow: config.shadows,
            width: config.widths,
            // Add default values for missing properties
            zIndex: {},
            aspectRatio: {},
            accentColor: config.colors // Use colors as accent colors
        }
    };
}
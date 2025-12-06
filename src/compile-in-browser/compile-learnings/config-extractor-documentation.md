# Configuration Extractor for Tailwind CSS v4

This module provides functions to extract and merge Tailwind CSS v4 configuration values from CSS custom properties, replacing the removed `resolveConfig` functionality.

## Overview

Tailwind CSS v4 removed the `resolveConfig` function, making it impossible to programmatically access theme values. This module solves this by parsing CSS custom properties that Tailwind v4 uses to define its configuration.

## Features

- **Extract Colors**: Parse `--color-*` custom properties
- **Extract Spacing**: Parse `--spacing-*` custom properties  
- **Extract Font Sizes**: Parse `--text-*` custom properties
- **Extract Breakpoints**: Parse `--breakpoint-*` custom properties
- **Extract Font Families**: Parse `--font-*` custom properties
- **Extract Font Weights**: Parse `--font-weight-*` custom properties
- **Extract Letter Spacing**: Parse `--letter-spacing-*` custom properties
- **Extract Line Heights**: Parse `--line-height-*` custom properties
- **Extract Border Radius**: Parse `--radius-*` custom properties
- **Extract Shadows**: Parse `--shadow-*` custom properties
- **Extract Widths**: Parse `--width-*` custom properties
- **Merge Multiple Sources**: Combine Tailwind defaults, wizard configurations, and Winden styles
- **StyleGuide Integration**: Convert extracted config to StyleGuide format

## API Reference

### Core Functions

#### `extractAllConfig(cssContent)`
Extracts all configuration values from CSS content.

**Parameters:**
- `cssContent` (string): The CSS content to parse

**Returns:**
- `Object`: Object containing all extracted configuration values

```javascript
const config = extractAllConfig(cssContent);
console.log(config.colors); // { red: { '500': 'oklch(...)' } }
console.log(config.spacing); // { 'fluid-sm': 'clamp(...)' }
```

#### `extractConfigFromSources(sources)`
Extracts and merges configuration from multiple CSS sources.

**Parameters:**
- `sources` (Object): Object with different CSS sources
  - `tailwindDefaults` (string): Default Tailwind CSS
  - `wizard` (string): Wizard configuration CSS
  - `windenStyles` (string): Winden styles CSS

**Returns:**
- `Object`: Merged configuration with precedence (Tailwind defaults → Wizard → Winden styles)

```javascript
const sources = {
  tailwindDefaults: defaultCss,
  wizard: wizardCss,
  windenStyles: windenCss
};
const result = extractConfigFromSources(sources);
```

#### `convertToStyleGuideFormat(config)`
Converts extracted configuration to the format expected by StyleGuide components.

**Parameters:**
- `config` (Object): The extracted configuration

**Returns:**
- `Object`: Configuration in StyleGuide format with `theme` structure

```javascript
const styleGuideConfig = convertToStyleGuideFormat(extractedConfig);
// Returns: { theme: { colors: {...}, spacing: {...}, ... } }
```

### Individual Extractors

#### `extractColors(cssContent)`
Extracts color values from `--color-*` custom properties.

#### `extractSpacing(cssContent)`
Extracts spacing values from `--spacing-*` custom properties.

#### `extractFontSizes(cssContent)`
Extracts font size values from `--text-*` custom properties.

#### `extractBreakpoints(cssContent)`
Extracts breakpoint values from `--breakpoint-*` custom properties.

#### `extractFontFamilies(cssContent)`
Extracts font family values from `--font-*` custom properties.

#### `extractFontWeights(cssContent)`
Extracts font weight values from `--font-weight-*` custom properties.

#### `extractLetterSpacing(cssContent)`
Extracts letter spacing values from `--letter-spacing-*` custom properties.

#### `extractLineHeights(cssContent)`
Extracts line height values from `--line-height-*` custom properties.

#### `extractBorderRadius(cssContent)`
Extracts border radius values from `--radius-*` custom properties.

#### `extractShadows(cssContent)`
Extracts shadow values from `--shadow-*` custom properties.

#### `extractWidths(cssContent)`
Extracts width values from `--width-*` custom properties.

## Usage Examples

### Basic Configuration Extraction

```javascript
import { extractAllConfig } from './config-extractor.js';

const cssContent = `
  @theme static {
    --color-action-500: oklch(60.94% 0.2501 29.23);
    --spacing-fluid-sm: clamp(0.9375rem, 0.919rem + 0.0926vw, 1rem);
    --text-fluid-base: clamp(1.125rem, 1.088rem + 0.1852vw, 1.25rem);
  }
`;

const config = extractAllConfig(cssContent);
console.log(config.colors); // { primary: { '500': 'oklch(60.94% 0.2501 29.23)' } }
console.log(config.spacing); // { 'fluid-sm': 'clamp(0.9375rem, 0.919rem + 0.0926vw, 1rem)' }
```

### Multi-Source Configuration

```javascript
import { extractConfigFromSources } from './config-extractor.js';

const sources = {
  tailwindDefaults: defaultTailwindCss,
  wizard: wizardConfigurationCss,
  windenStyles: windenStylesCss
};

const result = extractConfigFromSources(sources);
console.log(result.merged); // Final merged configuration
console.log(result.sources); // Individual source configurations
```

### StyleGuide Integration

```javascript
import { extractConfigFromSources, convertToStyleGuideFormat } from './config-extractor.js';

// Extract configuration from multiple sources
const sources = {
  tailwindDefaults: defaultCss,
  wizard: wizardCss,
  windenStyles: windenCss
};

const extractedConfig = extractConfigFromSources(sources);
const styleGuideConfig = convertToStyleGuideFormat(extractedConfig.merged);

// Use with StyleGuide components
<Color colors={styleGuideConfig.theme.colors} />
<Typography fontSizes={styleGuideConfig.theme.fontSize} />
<Space classNames={styleGuideConfig.theme.spacing} />
```

### Browser Usage

```javascript
// Available globally in browser
const result = await window.extractTailwindConfig('', wizardCss, windenStylesCss);
const styleGuideResult = await window.extractStyleGuideConfig('', wizardCss, windenStylesCss);

if (result.success) {
  console.log('Extracted config:', result.config);
}

if (styleGuideResult.success) {
  console.log('StyleGuide config:', styleGuideResult.config);
}
```

## Merging Strategy

The configuration extractor uses a specific merging strategy:

1. **Tailwind Defaults**: Base configuration from Tailwind CSS v4
2. **Wizard Configuration**: User-defined configurations from the wizard
3. **Winden Styles**: Additional styles from the Winden interface

Each subsequent source can override values from previous sources, allowing for customization while maintaining defaults.

## StyleGuide Integration

The module provides seamless integration with the existing StyleGuide components:

- **Automatic Format Conversion**: Converts extracted config to StyleGuide format
- **Backward Compatibility**: Works with existing StyleGuide components
- **Tailwind v4 Support**: Enables StyleGuide for Tailwind v4 users

### StyleGuide Format

The `convertToStyleGuideFormat` function transforms extracted configuration into the format expected by StyleGuide components:

```javascript
{
  theme: {
    colors: { /* extracted colors */ },
    spacing: { /* extracted spacing */ },
    fontSize: { /* extracted font sizes */ },
    screens: { /* extracted breakpoints */ },
    fontFamily: { /* extracted font families */ },
    fontWeight: { /* extracted font weights */ },
    letterSpacing: { /* extracted letter spacing */ },
    lineHeight: { /* extracted line heights */ },
    borderRadius: { /* extracted border radius */ },
    dropShadow: { /* extracted shadows */ },
    width: { /* extracted widths */ },
    zIndex: {}, // Default empty
    aspectRatio: {}, // Default empty
    accentColor: { /* colors as accent colors */ }
  }
}
```

## Benefits

1. **Replaces `resolveConfig`**: Provides the same functionality that was removed in Tailwind v4
2. **Multi-Source Support**: Combines configurations from multiple sources
3. **StyleGuide Compatibility**: Enables StyleGuide for Tailwind v4
4. **Real-time Updates**: Extracts configuration from current CSS
5. **Custom Property Parsing**: Handles Tailwind v4's CSS custom property format
6. **Extensible**: Easy to add new property extractors

## Browser Compatibility

The module is designed to work in modern browsers and includes:

- ES6+ features
- Async/await support
- CSS custom property parsing
- Blob URL creation for dynamic imports

## Error Handling

All functions include comprehensive error handling:

- Graceful fallbacks for missing properties
- Detailed error messages
- Safe defaults for failed extractions
- Console logging for debugging

## Testing

Use the provided test files to verify functionality:

- `test-config-extractor.html`: Basic configuration extraction
- `test-winden-integration.html`: Winden integration testing
- `test-styleguide-integration.html`: StyleGuide integration testing

## Future Enhancements

- Support for additional CSS custom properties
- Performance optimizations for large configurations
- Caching mechanisms for repeated extractions
- Additional StyleGuide component integrations 
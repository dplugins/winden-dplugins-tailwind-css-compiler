# Tailwind CSS v4 Plugins

This build includes the following Tailwind CSS plugins bundled natively instead of loading from esm.sh:

## Included Plugins

- **@tailwindcss/typography** - Beautiful typography defaults for plain HTML content
- **@tailwindcss/forms** - Better form element styling
- **@tailwindcss/container-queries** - Container query utilities

## Built-in Features (No Plugin Needed)

The following features are now built into Tailwind CSS v4 and don't require plugins:

- **line-clamp** - Line clamping utilities (built-in)
- **aspect-ratio** - Aspect ratio utilities (built-in)

## Usage

The plugins are automatically available when you use the `@plugin` directive in your CSS:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/container-queries";
```

## Example Classes

### Typography Plugin
- `prose` - Apply typography styles to content
- `prose-lg` - Larger typography scale
- `prose-sm` - Smaller typography scale

### Forms Plugin
- `form-input` - Style input elements
- `form-textarea` - Style textarea elements
- `form-select` - Style select elements
- `form-checkbox` - Style checkbox elements
- `form-radio` - Style radio elements

### Container Queries Plugin
- `@container` - Define a container query context
- `@lg:` - Apply styles when container is large
- `@md:` - Apply styles when container is medium
- `@sm:` - Apply styles when container is small

### Built-in Features
- `line-clamp-1` through `line-clamp-6` - Line clamping
- `aspect-video` - 16:9 aspect ratio
- `aspect-square` - 1:1 aspect ratio
- `aspect-auto` - Auto aspect ratio

## Installation

The plugins are automatically bundled with the build. No additional installation is required.

## Build

Run the build to include the plugins:

```bash
npm run build
```

The bundled file will be available at `../../../build_cache/v4.js`. 
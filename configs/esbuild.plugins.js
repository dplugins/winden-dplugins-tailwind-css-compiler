const path = require('path');
const fs = require('fs');
const { sassPlugin } = require('esbuild-sass-plugin');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');

/**
 * Create a Sass plugin with PostCSS/Tailwind processing
 * Shared between admin and autocomplete builds
 *
 * @param {string[]} loadPaths - Array of paths to resolve imports from
 * @returns {object} esbuild Sass plugin
 */
const createSassPlugin = (loadPaths = ['./src']) =>
  sassPlugin({
    loadPaths,
    async transform(source, resolveDir, filePath) {
      const { css } = await postcss([tailwindcss()]).process(source, {
        from: filePath,
      });
      return css;
    },
  });

// Custom plugin to handle SVG imports as React components
const svgPlugin = {
  name: 'svgr',
  setup(build) {
    build.onLoad({ filter: /\.svg$/ }, async (args) => {
      const svg = await fs.promises.readFile(args.path, 'utf8');

      // Clean up SVG and convert to React component
      const componentCode = `
        import * as React from 'react';
        const SvgComponent = (props) => (
          ${svg.replace(/<svg/, '<svg {...props}')}
        );
        export default SvgComponent;
        export { SvgComponent as ReactComponent };
      `;

      return {
        contents: componentCode,
        loader: 'jsx',
      };
    });
  },
};

// Custom plugin to handle path aliases
const aliasPlugin = {
  name: 'alias',
  setup(build) {
    const rootDir = path.resolve(__dirname, '..');
    const aliases = {
      '@': path.resolve(rootDir, 'src/admin'),
      '@pages': path.resolve(rootDir, 'src/admin/components/pages'),
      '@layout': path.resolve(rootDir, 'src/admin/components/layout'),
      '@components': path.resolve(rootDir, 'src/admin/components'),
      '@navigation': path.resolve(rootDir, 'src/admin/components/navigation'),
      '@parts': path.resolve(rootDir, 'src/admin/components/parts'),
      '@el': path.resolve(rootDir, 'src/admin/components/elements'),
      '@ui': path.resolve(rootDir, 'src/admin/components/ui'),
      '@functions': path.resolve(rootDir, 'src/admin/functions'),
      '@const': path.resolve(rootDir, 'src/admin/const'),
      '@hooks': path.resolve(rootDir, 'src/admin/hooks'),
      '@types': path.resolve(rootDir, 'src/admin/types'),
      '@utils': path.resolve(rootDir, 'src/admin/utils'),
    };

    // Handle alias resolution with automatic extension resolution
    Object.entries(aliases).forEach(([alias, aliasPath]) => {
      build.onResolve({ filter: new RegExp(`^${alias.replace('/', '\\/')}(/.*)?$`) }, (args) => {
        const relativePath = args.path.replace(alias, '');
        let resolvedPath = path.join(aliasPath, relativePath);

        // Try to resolve with extensions
        const extensions = ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

        // Check if file exists as-is
        if (fs.existsSync(resolvedPath)) {
          const stats = fs.statSync(resolvedPath);
          if (stats.isFile()) {
            return { path: resolvedPath };
          }
        }

        // Try with extensions
        for (const ext of extensions) {
          const testPath = resolvedPath + ext;
          if (fs.existsSync(testPath)) {
            return { path: testPath };
          }
        }

        // If nothing found, let esbuild handle the error
        return { path: resolvedPath };
      });
    });
  },
};

// Custom plugin to handle Monaco Editor
const monacoPlugin = {
  name: 'monaco-editor',
  setup(build) {
    const rootDir = path.resolve(__dirname, '..');
    build.onResolve({ filter: /^monaco-editor$/ }, (args) => {
      return {
        path: path.resolve(rootDir, 'node_modules/monaco-editor/esm/vs/editor/editor.main.js'),
        namespace: 'file',
      };
    });
  },
};

// Force color-2-name to use ESM entry instead of browser IIFE
// The package's "browser" field points to an IIFE that esbuild can't extract named exports from
const color2namePlugin = {
  name: 'color-2-name-esm',
  setup(build) {
    const rootDir = path.resolve(__dirname, '..');
    build.onResolve({ filter: /^color-2-name$/ }, () => {
      return {
        path: path.resolve(rootDir, 'node_modules/color-2-name/lib/index.js'),
      };
    });
  },
};

// Custom plugin to handle WordPress externals
const wordpressExternalsPlugin = {
  name: 'wordpress-externals',
  setup(build) {
    // Packages that should NOT be externalized (will be bundled)
    const bundledPackages = ['react-dom/client'];

    // Map package names to WordPress globals
    // Note: prop-types is NOT included here - it will be bundled instead
    // Note: react-dom/client is NOT included - it will be bundled for React 18 support
    const externalsMap = {
      'react': 'window.React',
      'react-dom': 'window.ReactDOM',
      '@wordpress/element': 'window.wp.element',
      '@wordpress/components': 'window.wp.components',
      '@wordpress/block-editor': 'window.wp.blockEditor',
      '@wordpress/blocks': 'window.wp.blocks',
      '@wordpress/data': 'window.wp.data',
      '@wordpress/compose': 'window.wp.compose',
      '@wordpress/hooks': 'window.wp.hooks',
      'lodash': 'window.lodash',
    };

    // Handle all WordPress packages
    build.onResolve({ filter: /^@wordpress\// }, (args) => {
      if (bundledPackages.includes(args.path)) {
        return undefined; // Let esbuild bundle it
      }
      return {
        path: args.path,
        namespace: 'wordpress-external',
      };
    });

    // Handle specific externals
    Object.keys(externalsMap).forEach((pkg) => {
      build.onResolve({ filter: new RegExp(`^${pkg.replace('/', '\\/')}$`) }, (args) => {
        if (bundledPackages.includes(args.path)) {
          return undefined; // Let esbuild bundle it
        }
        return {
          path: args.path,
          namespace: 'wordpress-external',
        };
      });
    });

    // Also handle react-dom/client specifically
    build.onResolve({ filter: /^react-dom\/client$/ }, (args) => {
      // Don't externalize - let esbuild bundle it
      return undefined;
    });

    // Load externals as global references
    build.onLoad({ filter: /.*/, namespace: 'wordpress-external' }, (args) => {
      const globalVar = externalsMap[args.path] || `window.wp.${args.path.replace('@wordpress/', '')}`;

      return {
        contents: `module.exports = ${globalVar}`,
        loader: 'js',
      };
    });
  },
};

// Custom plugin to remove Monaco CDN URL from @monaco-editor/loader
// WordPress.org requirement: No external CDN resources
// The CDN URL is never used because we call loader.config({ monaco }) with bundled Monaco
const monacoCdnRemoverPlugin = {
  name: 'monaco-cdn-remover',
  setup(build) {
    build.onLoad({ filter: /@monaco-editor[/\\]loader/ }, async (args) => {
      const fs = require('fs');
      let contents = await fs.promises.readFile(args.path, 'utf8');

      // Replace CDN URL with empty string - the URL is never used anyway
      // because we configure the loader with bundled Monaco in App.tsx
      contents = contents.replace(
        /https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@[^/]+\/min\/vs/g,
        './monaco-local'
      );

      return {
        contents,
        loader: 'js',
      };
    });
  },
};

module.exports = {
  createSassPlugin,
  svgPlugin,
  aliasPlugin,
  monacoPlugin,
  color2namePlugin,
  wordpressExternalsPlugin,
  monacoCdnRemoverPlugin,
};

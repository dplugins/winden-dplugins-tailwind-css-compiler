const path = require('path');
const fs = require('fs');

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

module.exports = {
  svgPlugin,
  aliasPlugin,
  monacoPlugin,
  wordpressExternalsPlugin,
};

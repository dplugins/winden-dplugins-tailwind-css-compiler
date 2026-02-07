const esbuild = require('esbuild');
const fs = require('fs');
const { createSassPlugin } = require('./esbuild.plugins');

// Track dependencies globally per build
const dependencyTrackers = new Map();

// Custom plugin for WordPress externals with dependency tracking
const createWordPressExternalsPlugin = (trackerId) => ({
  name: 'wordpress-externals',
  setup(build) {
    const externalsMap = {
      '@wordpress/element': { global: 'window.wp.element', wpDep: 'wp-element' },
      '@wordpress/components': { global: 'window.wp.components', wpDep: 'wp-components' },
      '@wordpress/block-editor': { global: 'window.wp.blockEditor', wpDep: 'wp-block-editor' },
      '@wordpress/blocks': { global: 'window.wp.blocks', wpDep: 'wp-blocks' },
      '@wordpress/data': { global: 'window.wp.data', wpDep: 'wp-data' },
      '@wordpress/compose': { global: 'window.wp.compose', wpDep: 'wp-compose' },
      '@wordpress/hooks': { global: 'window.wp.hooks', wpDep: 'wp-hooks' },
      'react': { global: 'window.React', wpDep: 'react' },
      'react-dom': { global: 'window.ReactDOM', wpDep: 'react-dom' },
      'react-dom/client': { global: 'window.ReactDOM', wpDep: 'react-dom' }, // React 18 createRoot API
      'lodash': { global: 'window.lodash', wpDep: 'lodash' },
    };

    // Track which dependencies are actually used
    const usedDeps = new Set();
    dependencyTrackers.set(trackerId, usedDeps);

    // Handle WordPress packages
    build.onResolve({ filter: /^@wordpress\// }, (args) => {
      const external = externalsMap[args.path];
      if (external) {
        usedDeps.add(external.wpDep);
      }
      return {
        path: args.path,
        namespace: 'wordpress-external',
      };
    });

    // Handle specific externals
    Object.keys(externalsMap).forEach((pkg) => {
      build.onResolve({ filter: new RegExp(`^${pkg.replace('/', '\\/')}$`) }, (args) => {
        const external = externalsMap[args.path];
        if (external) {
          usedDeps.add(external.wpDep);
        }
        return {
          path: args.path,
          namespace: 'wordpress-external',
        };
      });
    });

    // Load externals as global references
    build.onLoad({ filter: /.*/, namespace: 'wordpress-external' }, (args) => {
      const external = externalsMap[args.path];
      const globalVar = external ? external.global : `window.wp.${args.path.replace('@wordpress/', '')}`;

      return {
        contents: `module.exports = ${globalVar}`,
        loader: 'js',
      };
    });
  },
});

// Shared Sass plugin from centralized config
// Include both ./src and ./pro/src for free and pro integrations
const sharedSassPlugin = createSassPlugin(['./src', './pro/src']);

// Base options shared by all builds
const createBuildOptions = (entryPoint, useBundledReact = false, trackerId = '', outputDir = 'build/') => {
  // Determine output path based on source location
  let outfile;
  if (entryPoint.startsWith('./pro/src/')) {
    // Pro integrations:
    // ./pro/src/plain-classes/bricks/index.js -> ./pro/build/plain-classes/bricks/index.js
    // ./pro/src/winden-classes/bricks/index.js -> ./pro/build/winden-classes/bricks/index.js
    outfile = entryPoint.replace('./pro/src/', './pro/build/');
  } else {
    // Free integrations: ./src/tailwind-autocomplete/core/index.ts -> ./build/tailwind-autocomplete/core/index.js
    outfile = entryPoint.replace('./src/', './build/');
  }

  // Ensure .ts files output as .js
  outfile = outfile.replace(/\.ts$/, '.js');

  return {
    entryPoints: [entryPoint],
    bundle: true,
    outfile: outfile,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    loader: {
      '.js': 'jsx',
      '.jsx': 'jsx',
      '.ts': 'ts',
      '.tsx': 'tsx',
      '.css': 'css',
      '.scss': 'css',
    },
    plugins: useBundledReact ? [sharedSassPlugin] : [createWordPressExternalsPlugin(trackerId), sharedSassPlugin],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    },
    assetNames: '[name]',
    chunkNames: '[name]',
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    metafile: true,
    external: useBundledReact ? [] : undefined,
  };
};

// Free integrations (included in WordPress.org distribution)
const freeIntegrations = [
  { path: './src/plain-classes/winauto-component/index.js', bundleReact: false },
  // Plain Classes - Tags-based autocomplete (old system, free for Gutenberg)
  { path: './src/plain-classes/gutenberg/index.js', bundleReact: false },
  // Winden Classes - core library and Gutenberg panel (FREE)
  { path: './src/winden-classes/core/index.ts', bundleReact: true },        // Core autocomplete library
  { path: './src/winden-classes/core/ui.ts', bundleReact: false },          // Reusable UI component
  { path: './src/winden-classes/gutenberg/index.js', bundleReact: false },  // Gutenberg panel
];

// Pro integrations (require license) - only include if pro folder exists
const proIntegrations = [
  // Plain Classes - Tags-based autocomplete (old system)
  { path: './pro/src/plain-classes/bricks/index.js', bundleReact: false },
  { path: './pro/src/plain-classes/elementor/index.js', bundleReact: false },
  { path: './pro/src/plain-classes/oxygen/index.js', bundleReact: false },
  { path: './pro/src/plain-classes/oxygen6/index.js', bundleReact: false },
  { path: './pro/src/plain-classes/builderius/index.js', bundleReact: false },
  // Winden Classes - new system (pro builders)
  { path: './pro/src/winden-classes/bricks/index.js', bundleReact: false },     // Bricks panel
  { path: './pro/src/winden-classes/oxygen/index.js', bundleReact: false },     // Oxygen Classic panel
  { path: './pro/src/winden-classes/oxygen6/index.js', bundleReact: false },    // Oxygen 6 panel
  { path: './pro/src/winden-classes/elementor/index.js', bundleReact: false },  // Elementor panel
];

// Check if pro folder exists
const proFolderExists = fs.existsSync('./pro/src/plain-classes');

// Combined integrations for build - only include pro if folder exists
const integrations = proFolderExists
  ? [...freeIntegrations, ...proIntegrations]
  : freeIntegrations;

if (!proFolderExists) {
  console.log('ℹ️  Pro folder not found - building free version only');
}

// Generate PHP asset file with proper dependencies
function generateAssetFile(outputPath, dependencies = []) {
  const assetFile = outputPath.replace('.js', '.asset.php');
  const depsArray = Array.from(dependencies);
  const depsString = depsArray.length > 0 ? depsArray.map(dep => `'${dep}'`).join(', ') : '';

  const assetContent = `<?php return array(
  'dependencies' => array(${depsString}),
  'version' => '${Date.now()}'
);`;

  fs.writeFileSync(assetFile, assetContent);
}

function getIntegrationKey(integrationPath) {
  return integrationPath
    .replace(/^\.\//, '')
    .replace(/^pro\/src\//, 'pro-')
    .replace(/^src\//, '')
    .replace(/\/index\.(js|jsx|ts|tsx)$/, '')
    .replace(/[\\/]/g, '-');
}

// Build all integrations in parallel
async function build() {
  try {
    console.log('🔨 Building autocomplete scripts...');
    console.log(`   Building ${integrations.length} integrations in parallel...\n`);

    // Build all integrations concurrently
    const buildPromises = integrations.map(async (integration) => {
      const name = getIntegrationKey(integration.path);
      const strategy = integration.bundleReact ? 'React bundled' : 'WordPress externals';
      const trackerId = `build-${name}`;

      console.log(`   → ${name.padEnd(20)} (${strategy})`);

      const buildOptions = createBuildOptions(integration.path, integration.bundleReact, trackerId);
      const result = await esbuild.build(buildOptions);

      // Generate asset file with dependencies
      if (result.metafile) {
        const outputs = Object.keys(result.metafile.outputs);
        if (outputs.length > 0) {
          const outputFile = outputs[0];
          const deps = integration.bundleReact ? [] : Array.from(dependencyTrackers.get(trackerId) || []);
          generateAssetFile(outputFile, deps);
        }
      }

      return { name, success: true };
    });

    await Promise.all(buildPromises);

    console.log('\n✅ Autocomplete build completed successfully');
  } catch (error) {
    console.error('❌ Autocomplete build failed:', error);
    process.exit(1);
  }
}

// Watch all integrations
async function watch() {
  try {
    console.log('🔨 Building autocomplete scripts (watch mode)...');
    console.log(`   Watching ${integrations.length} integrations...\n`);

    const contexts = await Promise.all(
      integrations.map(async (integration) => {
        const name = getIntegrationKey(integration.path);
        const trackerId = `watch-${name}`;
        const buildOptions = createBuildOptions(integration.path, integration.bundleReact, trackerId);

        // Add rebuild notification plugin
        buildOptions.plugins.push({
          name: `rebuild-notify-${name}`,
          setup(build) {
            build.onEnd((result) => {
              if (result.errors.length > 0) {
                console.error(`❌ ${name} build failed:`, result.errors);
                return;
              }

              // Generate asset file
              if (result.metafile) {
                const outputs = Object.keys(result.metafile.outputs);
                if (outputs.length > 0) {
                  const outputFile = outputs[0];
                  const deps = integration.bundleReact ? [] : Array.from(dependencyTrackers.get(trackerId) || []);
                  generateAssetFile(outputFile, deps);
                }
              }

              const time = new Date().toLocaleTimeString();
              console.log(`✅ ${name} rebuilt at ${time}`);
            });
          },
        });

        return esbuild.context(buildOptions);
      })
    );

    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log('👀 Watching all integrations for changes...');
  } catch (error) {
    console.error('❌ Autocomplete watch setup failed:', error);
    process.exit(1);
  }
}

// Run build or watch based on arguments
const isWatch = process.argv.includes('--watch');
if (isWatch) {
  watch();
} else {
  build();
}

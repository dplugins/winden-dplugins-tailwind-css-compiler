const esbuild = require('esbuild');
const { sassPlugin } = require('esbuild-sass-plugin');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
const { copy } = require('esbuild-plugin-copy');
const path = require('path');
const fs = require('fs');
const { svgPlugin, aliasPlugin, monacoPlugin, wordpressExternalsPlugin } = require('./esbuild.plugins');

// Build configuration for admin UI
const buildOptions = {
  entryPoints: {
    'admin/index': './src/admin/index.js',
  },
  bundle: true,
  outdir: 'build',
  format: 'iife',      // Note: ESM with splitting has chunk.js conflicts - keeping IIFE for now
                       // Lazy components are still beneficial: reduces parsing time & memory
  platform: 'browser',
  target: ['es2020'],
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.ts': 'tsx',
    '.tsx': 'tsx',
    '.css': 'css',
    '.scss': 'css',
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.gif': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.eot': 'file',
  },
  plugins: [
    wordpressExternalsPlugin,
    aliasPlugin,
    svgPlugin,
    monacoPlugin,
    sassPlugin({
      loadPaths: ['./src'],
      async transform(source, resolveDir, filePath) {
        const { css } = await postcss([tailwindcss()]).process(source, {
          from: filePath,
        });
        return css;
      },
    }),
    copy({
      resolveFrom: 'cwd',
      assets: [
        {
          from: ['./src/admin/block.json'],
          to: ['./build/admin'],
        },
      ],
    }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  assetNames: '[name]',
  chunkNames: '[name]',
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
  metafile: true,
};

// Build function
async function build() {
  try {
    console.log('🔨 Building admin UI...');

    // Build Monaco workers (only CSS/SCSS)
    await esbuild.build({
      entryPoints: {
        'admin/css.worker': 'node_modules/monaco-editor/esm/vs/language/css/css.worker.js',
        'admin/editor.worker': 'node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
      },
      bundle: true,
      outdir: 'build',
      format: 'iife',
      minify: process.env.NODE_ENV === 'production',
      target: ['es2020'],
    });
    console.log('  ✓ Built Monaco workers (CSS/SCSS only)');

    // Then build the main application
    const result = await esbuild.build(buildOptions);

    // Generate asset manifest and PHP files
    if (result.metafile) {
      const outputs = Object.entries(result.metafile.outputs);

      // Create PHP asset files for WordPress
      outputs.forEach(([file]) => {
        if (file.endsWith('.js') && !file.includes('.worker.js')) {
          const assetFile = file.replace('.js', '.asset.php');
          const dependencies = ['react', 'react-dom', 'wp-element'];
          const depsString = dependencies.map(dep => `'${dep}'`).join(', ');

          const assetContent = `<?php return array(
  'dependencies' => array(${depsString}),
  'version' => '${Date.now()}'
);`;

          fs.writeFileSync(assetFile, assetContent);
        }
      });
    }

    console.log('✅ Admin build completed successfully');
  } catch (error) {
    console.error('❌ Admin build failed:', error);
    process.exit(1);
  }
}

// Watch function for development
async function watch() {
  try {
    console.log('🔨 Building admin UI (watch mode)...');

    // Build Monaco workers (only CSS/SCSS)
    await esbuild.build({
      entryPoints: {
        'admin/css.worker': 'node_modules/monaco-editor/esm/vs/language/css/css.worker.js',
        'admin/editor.worker': 'node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
      },
      bundle: true,
      outdir: 'build',
      format: 'iife',
      minify: process.env.NODE_ENV === 'production',
      target: ['es2020'],
    });
    console.log('  ✓ Built Monaco workers (CSS/SCSS only)');

    // Create context with onRebuild callback
    const context = await esbuild.context({
      ...buildOptions,
      plugins: [
        ...buildOptions.plugins,
        {
          name: 'rebuild-notify',
          setup(build) {
            build.onEnd((result) => {
              if (result.errors.length > 0) {
                console.error('❌ Build failed:', result.errors);
                return;
              }

              // Generate PHP asset files
              if (result.metafile) {
                const outputs = Object.entries(result.metafile.outputs);
                outputs.forEach(([file]) => {
                  if (file.endsWith('.js') && !file.includes('.worker.js')) {
                    const assetFile = file.replace('.js', '.asset.php');
                    const dependencies = ['react', 'react-dom', 'wp-element'];
                    const depsString = dependencies.map(dep => `'${dep}'`).join(', ');

                    const assetContent = `<?php return array(
  'dependencies' => array(${depsString}),
  'version' => '${Date.now()}'
);`;

                    fs.writeFileSync(assetFile, assetContent);
                  }
                });
              }

              console.log('✅ Admin rebuild completed at', new Date().toLocaleTimeString());
            });
          },
        },
      ],
    });

    await context.watch();
    console.log('👀 Watching admin files for changes...');
  } catch (error) {
    console.error('❌ Admin watch setup failed:', error);
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

/**
 * The Monaco-based HTML editor used by "HTML to blocks" in the block editor.
 *
 * Kept out of the Gutenberg bundle on purpose: Monaco is ~1.5 MB and the block
 * editor loads on every post edit, while this modal opens only when asked for.
 * The bundle and its two workers are fetched at that point, from this folder.
 */
const esbuild = require('esbuild');


const OUT_DIR = 'build/winden-classes/html-editor';

const workerOptions = {
  entryPoints: {
    'html.worker': './node_modules/monaco-editor/esm/vs/language/html/html.worker.js',
    'editor.worker': './node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
  },
  bundle: true,
  outdir: OUT_DIR,
  format: 'iife',
  target: ['es2020'],
  minify: process.env.NODE_ENV === 'production',
};

const buildOptions = {
  entryPoints: { index: './src/winden-classes/html-editor/index.ts' },
  bundle: true,
  outdir: OUT_DIR,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  loader: {
    '.ts': 'ts',
    '.css': 'css',
    '.ttf': 'file',
  },
  plugins: [],
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production') },
  // Winden's own Tailwind compiler leaves a browserify-style `window.process`
  // behind — `{ versions: { node: '18.0.0' } }` with no `env`. Monaco reads that
  // as "running under Node" and dies on `process.env.CI` before it draws
  // anything. Shadowing the name for the length of this bundle is the only fix
  // that does not depend on load order.
  banner: { js: '(function(process){' },
  footer: { js: '})(undefined);' },
  assetNames: '[name]',
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
};

async function build() {
  await esbuild.build(workerOptions);
  await esbuild.build(buildOptions);
  console.log('✅ HTML editor build completed');
}

async function watch() {
  await esbuild.build(workerOptions);
  const context = await esbuild.context(buildOptions);
  await context.watch();
  console.log('👀 Watching HTML editor…');
}

if (process.argv.includes('--watch')) {
  watch();
} else {
  build().catch((error) => {
    console.error('❌ HTML editor build failed:', error);
    process.exit(1);
  });
}

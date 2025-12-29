import { build } from "esbuild";
import { polyfillNode } from "esbuild-plugin-polyfill-node";
import inlineImportPlugin from "esbuild-plugin-inline-import";
import chokidar from "chokidar";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Entry point - compiler source files
const entryPoint = path.join(rootDir, "src/compiler/index.js");
const watchPath = path.join(rootDir, "src/compiler");
const outputFile = path.join(rootDir, "build/compiler/tailwindcss-compiler.js");

if (process.argv.includes("--watch")) {

  const watcher = chokidar.watch(watchPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
  });

  watcher.on("change", (filePath) => {
    console.log(`${filePath} has been changed. Rebuilding...`);
    build({
      entryPoints: [entryPoint],
      bundle: true,
      minify: true,
      treeShaking: true,
      legalComments: "none",
      outfile: "./build/index.js",
      plugins: [
        inlineImportPlugin(),
        polyfillNode({
          polyfills: {
            fs: true,
            path: true,
          },
        }),
      ],
    }).catch(() => { });
  });
} else {
  build({
    entryPoints: [entryPoint],
    bundle: true,
    minify: true,
    treeShaking: true,
    legalComments: "none",
    platform: 'browser',
    outfile: outputFile,
    plugins: [
      polyfillNode({
        polyfills: {
          fs: true,
          path: true,
          process: true,
          buffer: true,
        },
      }),
      inlineImportPlugin(),
    ],
  }).then(() => {
    console.log('✅ Tailwind compiler built successfully');
  }).catch((err) => {
    console.error('❌ Build failed:', err);
    process.exit(1);
  });
}

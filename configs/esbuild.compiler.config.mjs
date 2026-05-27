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

const compilerBuildOptions = {
  entryPoints: [entryPoint],
  bundle: true,
  minify: true,
  treeShaking: true,
  legalComments: "none",
  platform: "browser",
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
};

async function buildCompiler() {
  await build(compilerBuildOptions);
  console.log("✅ Tailwind compiler built successfully");
}

if (process.argv.includes("--watch")) {
  let isBuilding = false;
  let hasPendingBuild = false;

  const queueBuild = async (reason = "change") => {
    if (isBuilding) {
      hasPendingBuild = true;
      return;
    }

    isBuilding = true;
    hasPendingBuild = false;

    try {
      if (reason !== "startup") {
        console.log(`🔁 Compiler rebuild triggered (${reason})`);
      }
      await buildCompiler();
    } catch (err) {
      console.error("❌ Compiler rebuild failed:", err);
    } finally {
      isBuilding = false;
      if (hasPendingBuild) {
        hasPendingBuild = false;
        queueBuild("queued");
      }
    }
  };

  await queueBuild("startup");

  const watcher = chokidar.watch(watchPath, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
  });

  watcher.on("change", (filePath) => {
    queueBuild(filePath);
  });
  watcher.on("add", (filePath) => {
    queueBuild(filePath);
  });
  watcher.on("unlink", (filePath) => {
    queueBuild(filePath);
  });

  console.log(`👀 Watching compiler sources: ${watchPath}`);
} else {
  buildCompiler().catch((err) => {
    console.error("❌ Build failed:", err);
    process.exit(1);
  });
}

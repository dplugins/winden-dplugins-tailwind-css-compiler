#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Root directory (parent of configs/)
const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir); // Change working directory to project root

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'blue') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  log(`✓ Copied: ${path.basename(src)} → ${dest}`, 'green');
}

function getPackageVersion(packageName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(`node_modules/${packageName}/package.json`, 'utf8'));
    return packageJson.version;
  } catch (e) {
    return 'unknown';
  }
}

async function build() {
  log('🏗️  Building Winden SCSS Compiler...', 'blue');

  // Clean scss-compiler directory
  const scssDir = 'build/scss-compiler';
  if (fs.existsSync(scssDir)) {
    fs.rmSync(scssDir, { recursive: true });
    log('✓ Cleaned scss-compiler directory', 'green');
  }
  fs.mkdirSync(scssDir, { recursive: true });

  // Get package versions for documentation
  const sassVersion = getPackageVersion('sass');
  const immutableVersion = getPackageVersion('immutable');

  log(`📦 Using Sass v${sassVersion}`, 'yellow');
  log(`📦 Using Immutable v${immutableVersion}`, 'yellow');

  // 1. Copy and minify Dart Sass
  log('🔧 Processing Dart Sass...', 'blue');
  const sassSource = 'node_modules/sass/sass.dart.js';
  const sassMinified = 'build/scss-compiler/sass.dart.min.js';

  if (!fs.existsSync(sassSource)) {
    log('❌ Error: sass.dart.js not found in node_modules/sass/', 'red');
    process.exit(1);
  }

  // Minify Dart Sass
  log('⚡ Minifying Dart Sass (this may take a moment)...', 'yellow');
  execSync(`npx terser ${sassSource} --compress --mangle --output ${sassMinified}`);

  const originalSize = (fs.statSync(sassSource).size / 1024 / 1024).toFixed(1);
  const minifiedSize = (fs.statSync(sassMinified).size / 1024 / 1024).toFixed(1);
  const savings = ((1 - fs.statSync(sassMinified).size / fs.statSync(sassSource).size) * 100).toFixed(0);

  log(`✓ Dart Sass minified: ${originalSize}MB → ${minifiedSize}MB (${savings}% smaller)`, 'green');

  // 2. Bundle dependencies with esbuild (tree-shaking!)
  log('📦 Bundling SCSS compiler module...', 'blue');

  try {
    execSync(`npx esbuild src/scss-compiler/bundle.js --bundle --minify --target=es2020 --format=esm --outfile=build/scss-compiler/scss-compiler.min.js`, {
      stdio: 'inherit'
    });

    const bundleSize = (fs.statSync('build/scss-compiler/scss-compiler.min.js').size / 1024).toFixed(1);
    log(`✓ SCSS compiler module bundled: ${bundleSize}KB`, 'green');

    // Also create a development version (not minified, easier to debug)
    execSync(`npx esbuild src/scss-compiler/bundle.js --bundle --target=es2020 --format=esm --outfile=build/scss-compiler/scss-compiler.js`, {
      stdio: 'inherit'
    });

    const devBundleSize = (fs.statSync('build/scss-compiler/scss-compiler.js').size / 1024).toFixed(1);
    log(`✓ Development bundle created: ${devBundleSize}KB (readable)`, 'green');

  } catch (error) {
    log(`❌ esbuild failed: ${error.message}`, 'red');
    process.exit(1);
  }

  // 3. Create build info
  const buildInfo = {
    buildDate: new Date().toISOString(),
    versions: {
      sass: sassVersion,
      immutable: immutableVersion
    },
    files: {
      'sass.dart.min.js': `${minifiedSize}MB (${savings}% smaller than original)`,
      'scss-compiler.min.js': `${(fs.statSync('build/scss-compiler/scss-compiler.min.js').size / 1024).toFixed(1)}KB`,
      'scss-compiler.js': `${(fs.statSync('build/scss-compiler/scss-compiler.js').size / 1024).toFixed(1)}KB (dev)`
    }
  };

  fs.writeFileSync('build/scss-compiler/build-info.json', JSON.stringify(buildInfo, null, 2));
  log('✓ Build info created', 'green');

  // Calculate total size
  const totalSize = fs.readdirSync(scssDir)
    .reduce((total, file) => {
      const filePath = path.join(scssDir, file);
      if (fs.statSync(filePath).isFile()) {
        return total + fs.statSync(filePath).size;
      }
      return total;
    }, 0);

  log('\n🎉 SCSS Compiler build complete!', 'green');
  log(`📊 Total size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`, 'yellow');
  log('📁 Files built in build/scss-compiler/ directory', 'blue');
}

// Run build
build().catch(error => {
  log(`❌ Build failed: ${error.message}`, 'red');
  process.exit(1);
});

// Modern ES module entry point for esbuild bundling
import * as Immutable from "immutable";

// Self-hosted Dart Sass bundle with tree-shaking
// This replaces the old manual script loading approach

class SassCompiler {
  constructor() {
    this.sass = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return this.sass;

    try {
      // console.log(
      //   "🔄 Loading bundled Dart Sass with tree-shaken dependencies..."
      // );

      // Load the Dart Sass core (still need to load this dynamically)
      await this.loadDartSass();

      // console.log("✅ Dart Sass initialized with optimized dependencies!");
      this.isInitialized = true;
      return this.sass;
    } catch (error) {
      console.error("❌ Failed to initialize Sass:", error);
      throw error;
    }
  }

  async loadDartSass() {
    return new Promise((resolve, reject) => {
      // Get the plugin base URL dynamically
      const getPluginBaseUrl = () => {
        if (window.funculoSettings && window.funculoSettings.pluginUrl) {
          return window.funculoSettings.pluginUrl;
        }

        const scripts = document.getElementsByTagName("script");
        for (let script of scripts) {
          if (script.src && script.src.includes("/fancoolo/")) {
            const pluginUrl =
              script.src.substring(0, script.src.indexOf("/fancoolo/")) +
              "/fancoolo/";
            return pluginUrl;
          }
        }

        const currentUrl = window.location.origin + window.location.pathname;
        if (currentUrl.includes("/wp-admin/")) {
          const baseUrl =
            currentUrl.substring(0, currentUrl.indexOf("/wp-admin/")) +
            "/wp-content/plugins/fancoolo/";
          return baseUrl;
        }

        return "/wp-content/plugins/fancoolo/";
      };

      const sassUrl =
        getPluginBaseUrl() + "dist/scss-compiler/sass.dart.min.js";

      // Check if sass.dart.min.js is already loaded
      const sassAlreadyLoaded = Array.from(
        document.getElementsByTagName("script")
      ).some((script) => script.src === sassUrl);

      // If already loaded and _cliPkgExports exists, use it
      if (
        sassAlreadyLoaded &&
        globalThis._cliPkgExports &&
        globalThis._cliPkgExports.length > 0
      ) {
        try {
          const _cliPkgLibrary = globalThis._cliPkgExports.pop();
          if (globalThis._cliPkgExports.length === 0)
            delete globalThis._cliPkgExports;

          const _cliPkgExports = {};
          _cliPkgLibrary.load({ immutable: Immutable }, _cliPkgExports);

          this.sass = {
            compile: _cliPkgExports.compile,
            compileString: _cliPkgExports.compileString,
            compileAsync: _cliPkgExports.compileAsync,
            compileStringAsync: _cliPkgExports.compileStringAsync,
            info: _cliPkgExports.info,
          };

          resolve(this.sass);
          return;
        } catch (error) {
          reject(error);
          return;
        }
      }

      const script = document.createElement("script");
      script.src = sassUrl;
      script.onload = () => {
        try {
          // Get the Sass library from global exports (Dart Sass pattern)
          const _cliPkgLibrary = globalThis._cliPkgExports.pop();
          if (globalThis._cliPkgExports.length === 0)
            delete globalThis._cliPkgExports;

          const _cliPkgExports = {};
          // Pass the bundled & tree-shaken Immutable instead of global window.Immutable
          _cliPkgLibrary.load({ immutable: Immutable }, _cliPkgExports);

          // Make Sass available
          this.sass = {
            compile: _cliPkgExports.compile,
            compileString: _cliPkgExports.compileString,
            compileAsync: _cliPkgExports.compileAsync,
            compileStringAsync: _cliPkgExports.compileStringAsync,
            info: _cliPkgExports.info,
          };

          resolve(this.sass);
        } catch (error) {
          reject(error);
        }
      };
      script.onerror = () => reject(new Error("Failed to load Dart Sass"));

      // Only append if not already loaded
      if (!sassAlreadyLoaded) {
        document.head.appendChild(script);
      }
    });
  }

  async compileString(scss, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.sass.compileString(scss, {
      style: "expanded",
      quietDeps: true,
      verbose: false,
      ...options,
    });
  }
}

// Export for global use (backward compatibility)
window.SassCompiler = SassCompiler;

export default SassCompiler;

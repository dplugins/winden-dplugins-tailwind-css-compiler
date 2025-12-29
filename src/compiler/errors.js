/**
 * Winden Compilation Error Classes
 * Provides typed errors with context for better debugging
 */

/**
 * Base compilation error
 */
export class WindenCompilationError extends Error {
  constructor(message, code, phase, details = {}) {
    super(message);
    this.name = 'WindenCompilationError';
    this.code = code;
    this.phase = phase; // 'scss', 'bundling', 'tailwind', 'plugin', 'config'
    this.details = details;

    // Capture stack trace (V8 only, but widely supported)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      phase: this.phase,
      details: this.details,
      stack: this.stack
    };
  }

  toString() {
    let str = `[${this.phase.toUpperCase()}] ${this.message}`;

    if (this.details && Object.keys(this.details).length > 0) {
      str += '\n\nDetails:';
      for (const [key, value] of Object.entries(this.details)) {
        if (key === 'suggestion') {
          str += `\n  💡 ${value}`;
        } else {
          str += `\n  ${key}: ${value}`;
        }
      }
    }

    return str;
  }
}

/**
 * SCSS preprocessing error
 */
export class WindenSCSSError extends WindenCompilationError {
  constructor(originalError, context = {}) {
    const line = originalError.line || context.line;
    const column = originalError.column || context.column;

    let message = `SCSS compilation failed: ${originalError.message}`;
    if (line) {
      message += ` (line ${line}${column ? `, column ${column}` : ''})`;
    }

    super(
      message,
      'SCSS_ERROR',
      'scss',
      {
        line,
        column,
        suggestion: 'Check your SCSS syntax. Common issues: missing semicolons, unmatched braces, invalid nesting.',
        ...context
      }
    );
    this.originalError = originalError;
  }
}

/**
 * Plugin loading error
 */
export class WindenPluginError extends WindenCompilationError {
  constructor(pluginUrl, originalError, context = {}) {
    super(
      `Failed to load plugin from ${pluginUrl}`,
      'PLUGIN_ERROR',
      'plugin',
      {
        pluginUrl,
        originalError: originalError.message,
        suggestion: 'Check your internet connection and verify the plugin URL is correct. Ensure the URL points to a valid JavaScript module.',
        ...context
      }
    );
    this.originalError = originalError;
  }
}

/**
 * Tailwind compilation error
 */
export class WindenTailwindError extends WindenCompilationError {
  constructor(originalError, context = {}) {
    super(
      `Tailwind compilation failed: ${originalError.message}`,
      'TAILWIND_ERROR',
      'tailwind',
      {
        suggestion: 'Check your @theme directive syntax and ensure all custom properties are valid.',
        ...context
      }
    );
    this.originalError = originalError;
  }
}

/**
 * CSS bundling error
 */
export class WindenBundlingError extends WindenCompilationError {
  constructor(originalError, context = {}) {
    super(
      `CSS bundling failed: ${originalError.message}`,
      'BUNDLING_ERROR',
      'bundling',
      {
        suggestion: 'Check your @import directives and ensure all referenced files exist.',
        ...context
      }
    );
    this.originalError = originalError;
  }
}

/**
 * Config loading error
 */
export class WindenConfigError extends WindenCompilationError {
  constructor(originalError, configPreview = '', context = {}) {
    super(
      `Configuration loading failed: ${originalError.message}`,
      'CONFIG_ERROR',
      'config',
      {
        configPreview: configPreview.substring(0, 200) + (configPreview.length > 200 ? '...' : ''),
        suggestion: 'Check your JavaScript config for syntax errors. Ensure exports are valid.',
        ...context
      }
    );
    this.originalError = originalError;
  }
}

/**
 * Stylesheet loading error (for @import directives)
 */
export class WindenStylesheetError extends WindenCompilationError {
  constructor(stylesheetId, originalError, context = {}) {
    super(
      `Failed to load stylesheet: ${stylesheetId}`,
      'STYLESHEET_ERROR',
      'bundling',
      {
        stylesheetId,
        originalError: originalError.message,
        suggestion: 'Verify the stylesheet path or URL is correct and accessible.',
        ...context
      }
    );
    this.originalError = originalError;
  }
}

/**
 * Format error for user-friendly display
 * @param {Error} error - Error to format
 * @returns {Object} Formatted error object
 */
export function formatError(error) {
  if (error instanceof WindenCompilationError) {
    return {
      success: false,
      error: error.toString(),
      errorDetails: error.toJSON()
    };
  }

  // Generic error fallback
  return {
    success: false,
    error: error.message || String(error),
    errorDetails: {
      name: error.name || 'Error',
      message: error.message || String(error),
      stack: error.stack
    }
  };
}

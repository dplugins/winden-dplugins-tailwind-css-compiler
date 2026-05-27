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

    let message = `The SCSS couldn't be compiled: ${originalError.message}`;
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
        suggestion: 'Look in the Style tab for a missing semicolon, an unclosed `{` or `}`, or an extra comma.',
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
      `Couldn't load the plugin "${pluginUrl}"`,
      'PLUGIN_ERROR',
      'plugin',
      {
        pluginUrl,
        originalError: originalError.message,
        suggestion: 'Check the spelling of the plugin name in your `@plugin` line, then try again.',
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
      `Tailwind couldn't compile: ${originalError.message}`,
      'TAILWIND_ERROR',
      'tailwind',
      {
        suggestion: 'Look in your `@theme { ... }` block for a malformed value or property name.',
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
      `Couldn't bundle the CSS: ${originalError.message}`,
      'BUNDLING_ERROR',
      'bundling',
      {
        suggestion: 'An `@import` path can\'t be found. Check the spelling and make sure the file exists.',
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
      `Couldn't load the Config: ${originalError.message}`,
      'CONFIG_ERROR',
      'config',
      {
        configPreview: configPreview.substring(0, 200) + (configPreview.length > 200 ? '...' : ''),
        suggestion: 'Look in the Config tab for a missing comma, bracket, or quote.',
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
      `Couldn't load the stylesheet "${stylesheetId}"`,
      'STYLESHEET_ERROR',
      'bundling',
      {
        stylesheetId,
        originalError: originalError.message,
        suggestion: 'Check the file path or URL in the `@import` line.',
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
      // Single clean line for the message field — no embedded newlines.
      // Rich, multi-line structured info lives in errorDetails so the UI
      // can render it properly (title, message, hint, etc.) instead of
      // dumping the whole toString() as one runtext blob.
      error: error.message,
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

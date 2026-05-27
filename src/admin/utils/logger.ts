/**
 * Structured logger for Winden admin.
 *
 * - Production: only warnings and errors are logged.
 * - Development (WP_DEBUG): all levels are logged with timing data.
 *
 * Usage:
 *   import { log } from '@/utils/logger';
 *   log.info('Save', 'Starting save', { jsLen: 1234 });
 *   log.time('Save');
 *   // ... work ...
 *   log.timeEnd('Save');
 */

declare global {
  interface Window {
    WINDEN_DEBUG?: boolean;
  }
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDebug = (): boolean =>
  typeof window !== 'undefined' && !!window.WINDEN_DEBUG;

const minLevel = (): number => (isDebug() ? 0 : 2); // debug/info in dev, warn/error in prod

function emit(
  level: LogLevel,
  phase: string,
  message: string,
  data?: Record<string, unknown>
) {
  if (LEVEL_PRIORITY[level] < minLevel()) return;

  // Consistent [winden:scope] format across compiler / listeners / admin
  // (see #25). Phase is lowercased so callers don't have to think about case.
  const tag = `[winden:${phase.toLowerCase()}]`;
  const fn =
    level === 'error'
      ? console.error
      : level === 'warn'
        ? console.warn
        : console.log;

  if (data && Object.keys(data).length > 0) {
    fn(tag, message, data);
  } else {
    fn(tag, message);
  }
}

export const log = {
  debug: (phase: string, message: string, data?: Record<string, unknown>) =>
    emit('debug', phase, message, data),

  info: (phase: string, message: string, data?: Record<string, unknown>) =>
    emit('info', phase, message, data),

  warn: (phase: string, message: string, data?: Record<string, unknown>) =>
    emit('warn', phase, message, data),

  error: (phase: string, message: string, data?: Record<string, unknown>) =>
    emit('error', phase, message, data),

  /** Start a named timer (dev-only). */
  time: (label: string) => {
    if (isDebug()) console.time(`[winden:timer] ${label}`);
  },

  /** End a named timer (dev-only). */
  timeEnd: (label: string) => {
    if (isDebug()) console.timeEnd(`[winden:timer] ${label}`);
  },
};

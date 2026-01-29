/**
 * Centralized API Client for Winden
 *
 * Provides a unified interface for all WordPress AJAX requests with:
 * - Automatic nonce handling
 * - AbortSignal support for cancellation
 * - Typed responses
 * - Consistent error handling
 */

import { getAjaxUrl } from './ajaxUrl';
import type { WordPressAjaxResponse, WindenSettings, CacheStatus } from '@/types/api.d';

// ============================================
// Error Classes
// ============================================

/**
 * Base error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Network error (fetch failed, timeout, etc.)
 */
export class NetworkError extends ApiError {
  constructor(message: string, public status?: number) {
    super(message, 'NETWORK_ERROR', { status });
    this.name = 'NetworkError';
  }
}

/**
 * WordPress AJAX error (success: false)
 */
export class AjaxError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AJAX_ERROR', details);
    this.name = 'AjaxError';
  }
}

// ============================================
// Types
// ============================================

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  signal?: AbortSignal;
  /** Skip adding nonce to request (for public endpoints) */
  skipNonce?: boolean;
}

// ============================================
// Core API Client
// ============================================

/**
 * Make a WordPress AJAX request
 *
 * @param action - WordPress AJAX action name
 * @param options - Request options
 * @returns Typed response data
 * @throws {NetworkError} If fetch fails
 * @throws {AjaxError} If WordPress returns success: false
 *
 * @example
 * // GET request
 * const settings = await apiRequest<WindenSettings>('winden_get_settings');
 *
 * @example
 * // POST request with body
 * await apiRequest('winden_save_settings', {
 *   method: 'POST',
 *   body: { autocomplete_gutenberg: true }
 * });
 *
 * @example
 * // With abort signal
 * const controller = new AbortController();
 * const data = await apiRequest('winden_get_cache', { signal: controller.signal });
 */
export async function apiRequest<T = unknown>(
  action: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, signal, skipNonce = false } = options;

  const url = `${getAjaxUrl()}?action=${action}`;

  const fetchOptions: RequestInit = {
    method,
    signal,
  };

  if (method === 'POST' && body) {
    fetchOptions.headers = {
      'Content-Type': 'application/json',
    };

    const requestBody = skipNonce
      ? body
      : { ...body, '_nonce': window.nonce };

    fetchOptions.body = JSON.stringify(requestBody);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`, response.status);
  }

  const result: WordPressAjaxResponse<T> = await response.json();

  if (!result.success) {
    const errorMessage = typeof result.data === 'string'
      ? result.data
      : 'Request failed';
    throw new AjaxError(errorMessage, { action, response: result });
  }

  return result.data;
}

/**
 * Safe API request that catches AbortError silently
 * Use this in useEffect hooks where component unmount is expected
 *
 * @returns Promise that resolves to data or null (on abort/error)
 *
 * @example
 * useEffect(() => {
 *   const controller = new AbortController();
 *
 *   safeApiRequest<WindenSettings>('winden_get_settings', {
 *     signal: controller.signal
 *   }).then(data => {
 *     if (data) setSettings(data);
 *   });
 *
 *   return () => controller.abort();
 * }, []);
 */
export async function safeApiRequest<T = unknown>(
  action: string,
  options: RequestOptions = {}
): Promise<T | null> {
  try {
    return await apiRequest<T>(action, options);
  } catch (error) {
    // Silently ignore AbortError (expected on component unmount)
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    // Log other errors but don't throw
    console.error(`[Winden API] ${action} failed:`, error);
    return null;
  }
}

// ============================================
// Typed API Methods
// ============================================

/**
 * Fetch Winden settings
 */
export async function fetchSettingsApi(signal?: AbortSignal): Promise<WindenSettings | null> {
  return safeApiRequest<WindenSettings>('winden_get_settings', { signal });
}

/**
 * Save Winden settings
 */
export async function saveSettingsApi(settings: WindenSettings): Promise<void> {
  await apiRequest('winden_save_settings', {
    method: 'POST',
    body: settings as Record<string, unknown>,
  });
}

/**
 * Fetch cache status
 */
export async function fetchCacheStatusApi(signal?: AbortSignal): Promise<CacheStatus | null> {
  return safeApiRequest<CacheStatus>('winden_get_cache', { signal });
}

/**
 * Save compiled cache
 */
export async function saveCacheApi(payload: {
  styles?: string;
  status?: 'completed' | 'failed';
  errors?: string;
}): Promise<void> {
  await apiRequest('winden_save_cache', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Save content (JS, SCSS, Wizzard)
 */
export async function saveContentApi(payload: {
  javascript?: string;
  scss?: string;
  wizzard?: string;
  css?: string;
}): Promise<void> {
  await apiRequest('winden_save_content', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Update Wizzard state only
 */
export async function updateWizzardStateApi(wizzardData: string): Promise<void> {
  await apiRequest('winden_update_wizzard_state', {
    method: 'POST',
    body: { wizzard: wizzardData },
  });
}

/**
 * Fetch content (JS, SCSS, Wizzard)
 */
export async function fetchContentApi(signal?: AbortSignal): Promise<{
  javascript?: string;
  scss?: string;
  wizzard?: string;
  compiled_scss?: string;
} | null> {
  return safeApiRequest('winden_get_content', { signal });
}

/**
 * Fetch autocomplete classes
 */
export async function fetchClassesApi(signal?: AbortSignal): Promise<string[] | null> {
  return safeApiRequest<string[]>('winden_get_classes', { signal });
}

/**
 * Scan files for classes
 */
export async function scanFilesApi(paths: string[]): Promise<{
  classes?: string[];
  count?: number;
} | null> {
  return safeApiRequest('winden_scan_files', {
    method: 'POST',
    body: { paths },
  });
}

// ============================================
// Exports
// ============================================

export const api = {
  request: apiRequest,
  safeRequest: safeApiRequest,
  // Settings
  fetchSettings: fetchSettingsApi,
  saveSettings: saveSettingsApi,
  // Cache
  fetchCacheStatus: fetchCacheStatusApi,
  saveCache: saveCacheApi,
  // Content
  fetchContent: fetchContentApi,
  saveContent: saveContentApi,
  updateWizzardState: updateWizzardStateApi,
  // Classes
  fetchClasses: fetchClassesApi,
  scanFiles: scanFilesApi,
};

export default api;

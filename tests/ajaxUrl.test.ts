import { describe, expect, it, vi } from 'vitest';

import { buildAjaxUrl, getAjaxUrl } from '@utils/ajaxUrl';

/**
 * `window.ajaxUrl` and `window.windenAutoCompile` are localised by PHP via
 * wp_localize_script. tests/setup.ts deletes both before every test, so each
 * case here starts with neither present.
 */
describe('getAjaxUrl', () => {
  it('prefers window.ajaxUrl', () => {
    window.ajaxUrl = 'https://example.test/wp-admin/admin-ajax.php';

    expect(getAjaxUrl()).toBe('https://example.test/wp-admin/admin-ajax.php');
  });

  it('falls back to windenAutoCompile.ajaxUrl', () => {
    window.windenAutoCompile = { ajaxUrl: '/nested/wp/wp-admin/admin-ajax.php' };

    expect(getAjaxUrl()).toBe('/nested/wp/wp-admin/admin-ajax.php');
  });

  it('prefers window.ajaxUrl over the windenAutoCompile fallback', () => {
    window.ajaxUrl = '/primary.php';
    window.windenAutoCompile = { ajaxUrl: '/fallback.php' };

    expect(getAjaxUrl()).toBe('/primary.php');
  });

  it('throws rather than guessing a path when neither is localised', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // Guessing /wp-admin/admin-ajax.php would break subdirectory installs,
    // so a missing URL is a hard error by design.
    expect(() => getAjaxUrl()).toThrow(/AJAX URL not configured/);
  });

  it('logs an error before throwing, to name the PHP-side cause', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => getAjaxUrl()).toThrow();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('wp_localize_script'));
  });

  it('treats an empty windenAutoCompile object as unconfigured', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.windenAutoCompile = {};

    expect(() => getAjaxUrl()).toThrow();
  });
});

describe('buildAjaxUrl', () => {
  it('appends the action as a query parameter', () => {
    window.ajaxUrl = 'https://example.test/wp-admin/admin-ajax.php';

    expect(buildAjaxUrl('winden_cache')).toBe(
      'https://example.test/wp-admin/admin-ajax.php?action=winden_cache'
    );
  });

  it('propagates the missing-URL error instead of returning a broken string', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => buildAjaxUrl('winden_cache')).toThrow(/AJAX URL not configured/);
  });
});

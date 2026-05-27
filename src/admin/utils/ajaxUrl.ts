/**
 * Get the WordPress AJAX URL
 *
 * This URL is set via wp_localize_script in PHP and should always be available.
 * We do NOT construct fallback URLs because WordPress can be installed in non-standard
 * directories where /wp-admin/admin-ajax.php would not be correct.
 *
 * @throws Error if ajaxUrl is not available (indicates PHP setup issue)
 * @returns The AJAX URL from window.ajaxUrl
 */
export function getAjaxUrl(): string {
  // Check multiple possible sources for the AJAX URL
  // All of these are set via wp_localize_script in PHP using admin_url('admin-ajax.php')
  if (window.ajaxUrl) {
    return window.ajaxUrl;
  }

  if (window.windenAutoCompile?.ajaxUrl) {
    return window.windenAutoCompile.ajaxUrl;
  }

  // If we reach here, the PHP hasn't properly localized the script
  // This is a configuration error that needs to be fixed in PHP, not worked around in JS
  console.error('[winden:admin] ajaxUrl not available. Ensure wp_localize_script is called before this script runs.');
  throw new Error('Winden: AJAX URL not configured. Please check plugin setup.');
}

/**
 * Build a full AJAX URL with action parameter
 * @param action - The WordPress AJAX action name
 * @returns Full URL with action query parameter
 */
export function buildAjaxUrl(action: string): string {
  return `${getAjaxUrl()}?action=${action}`;
}

<?php

namespace Winden\App\Admin;

/**
 * Migration Notice for Tailwind v3 to v4 upgrade
 *
 * Shows a one-time admin notice prompting users to upgrade from v3 to v4
 */
class MigrationNotice
{
    public function __construct()
    {
        add_action('admin_notices', [$this, 'show_v4_migration_notice']);
        add_action('wp_ajax_winden_dismiss_v4_notice', [$this, 'dismiss_notice']);
    }

    /**
     * Show v4 migration notice
     */
    public function show_v4_migration_notice()
    {
        // Only show on Winden admin page
        $screen = get_current_screen();
        if (!$screen || $screen->id !== 'toplevel_page_winden') {
            return;
        }

        // Check if already dismissed
        if (get_option('winden_v4_notice_dismissed')) {
            return;
        }

        // Check if still on v3
        $options = get_option('winden_options', []);
        if (isset($options['tailwind_version']) && $options['tailwind_version'] === 'v3') {
            ?>
            <style>
                #wpbody-content #winden-v4-notice {
                    position: fixed;
                    z-index: 100000000;
                    display: block !important;
                    top: 4rem;
                    left: 25%;
                    width: 50%;
                    box-shadow: 10px 10px 400px 0px rgba(0,0,0,0.75);
                        -webkit-box-shadow: 10px 10px 400px 0px rgba(0,0,0,0.75);
                        -moz-box-shadow: 10px 10px 400px 0px rgba(0,0,0,0.75);
                }

                #wpbody-content #winden-v4-notice pre, 
                #wpbody-content #winden-v4-notice code, 
                #wpbody-content #winden-v4-notice kbd {
                    padding: 3px 5px 2px;
                    margin: 0 1px;
                    background: #f0f0f1 !important;
                    font-size: 13px;
                }

                #wpbody-content #winden-v4-notice pre {
                    padding: 1rem;
                }
            </style>
            <div class="notice notice-info is-dismissible" id="winden-v4-notice" style="padding: 15px;">
                <h3 style="margin-top: 0;">🎉 Winden: Upgrade to Tailwind v4</h3>
                <p>Your site is currently using <strong>Tailwind v3</strong>. The next time you click <strong>"Save"</strong>, Winden will automatically upgrade to <strong>Tailwind v4</strong>.</p>

                <h2>Next steps to make compile possible</h2>

                <h4>Replace this code in style tab:</h4>
                <p> 
                    <pre><code>
@tailwind base;
@tailwind components;
@tailwind utilities;
                    </code></pre>
                    
                </p>

                <h4>With this code in style tab:</h4>
                <p>

<pre><code id="v4-code-snippet">@layer theme, base, components, utilities;

@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);</code></pre>

                    <button
                        id="copy-v4-code"
                        type="button"
                        class="button button-primary"
                        style="margin-top: 20px;"
                    >
                        📋 Copy v4 Code to Clipboard
                    </button>
                </p>
            </div>
            <script>
                (function() {
                    const notice = document.getElementById('winden-v4-notice');
                    if (notice) {
                        // Handle dismiss button
                        const dismissButton = notice.querySelector('.notice-dismiss');
                        if (dismissButton) {
                            dismissButton.addEventListener('click', function() {
                                fetch('<?php echo esc_url(admin_url('admin-ajax.php')); ?>', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                    },
                                    body: new URLSearchParams({
                                        action: 'winden_dismiss_v4_notice',
                                        nonce: '<?php echo esc_js(wp_create_nonce('winden_dismiss_v4')); ?>'
                                    })
                                });
                            });
                        }

                        // Handle copy button
                        const copyButton = document.getElementById('copy-v4-code');
                        const codeSnippet = document.getElementById('v4-code-snippet');

                        if (copyButton && codeSnippet) {
                            copyButton.addEventListener('click', function() {
                                const textToCopy = codeSnippet.textContent;

                                // Use modern clipboard API
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    navigator.clipboard.writeText(textToCopy).then(function() {
                                        // Change button text to show success
                                        const originalText = copyButton.textContent;
                                        copyButton.textContent = '✅ Copied!';
                                        copyButton.style.backgroundColor = '#00a32a';

                                        // Reset button after 2 seconds
                                        setTimeout(function() {
                                            copyButton.textContent = originalText;
                                            copyButton.style.backgroundColor = '';
                                        }, 2000);
                                    }).catch(function(err) {
                                        console.error('Failed to copy text: ', err);
                                        alert('Failed to copy. Please copy manually.');
                                    });
                                } else {
                                    // Fallback for older browsers
                                    const textArea = document.createElement('textarea');
                                    textArea.value = textToCopy;
                                    textArea.style.position = 'fixed';
                                    textArea.style.left = '-9999px';
                                    document.body.appendChild(textArea);
                                    textArea.select();

                                    try {
                                        document.execCommand('copy');
                                        const originalText = copyButton.textContent;
                                        copyButton.textContent = '✅ Copied!';
                                        copyButton.style.backgroundColor = '#00a32a';

                                        setTimeout(function() {
                                            copyButton.textContent = originalText;
                                            copyButton.style.backgroundColor = '';
                                        }, 2000);
                                    } catch (err) {
                                        console.error('Fallback copy failed: ', err);
                                        alert('Failed to copy. Please copy manually.');
                                    }

                                    document.body.removeChild(textArea);
                                }
                            });
                        }
                    }
                })();
            </script>
            <?php
        }
    }

    /**
     * Handle notice dismissal
     */
    public function dismiss_notice()
    {
        check_ajax_referer('winden_dismiss_v4', 'nonce');
        update_option('winden_v4_notice_dismissed', true);
        wp_send_json_success();
    }
}

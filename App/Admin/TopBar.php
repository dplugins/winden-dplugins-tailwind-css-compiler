<?php namespace Winden\App\Admin;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class TopBar
{
    public function __construct()
    {
        add_action('admin_bar_menu', [$this, 'add_top_bar_link'], 100);
        add_action('admin_init', [$this, 'handle_toggle']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_topbar_styles']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_topbar_styles']);
    }

    /**
     * Enqueue topbar styles
     * WordPress.org requirement: Use wp_add_inline_style instead of echo
     */
    public function enqueue_topbar_styles()
    {
        if (!is_admin_bar_showing()) {
            return;
        }

        // Check if we are on the settings page - don't add styles there
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading WordPress admin page parameter, not processing user input
        if (isset($_GET['page']) && $_GET['page'] === 'winden') {
            return;
        }

        // Register a dummy style handle to attach inline styles to
        wp_register_style('winden-topbar', false);
        wp_enqueue_style('winden-topbar');
        wp_add_inline_style('winden-topbar', '
            #wp-admin-bar-winden_dplugins_editor a {
                background-color: #32393d !important;
                padding: 0 10px !important;
            }
            #wp-admin-bar-winden_dplugins_editor .winden-topbar {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
            }
            #wp-admin-bar-winden_dplugins_editor a svg {
                width: 1rem !important;
                height: 1rem !important;
            }
        ');
    }

    /**
     * Handle AJAX toggle for breakpoint indicator
     */
    public function handle_toggle()
    {
        if (isset($_GET['winden_toggle_bp']) && check_admin_referer('winden_toggle_bp', 'nonce')) {
            if (!current_user_can('manage_options')) {
                wp_die('Unauthorized');
            }

            $current_status = get_option('winden_dplugins_breakpoint_indicator_enabled', 'no');
            $new_status = $current_status === 'yes' ? 'no' : 'yes';
            update_option('winden_dplugins_breakpoint_indicator_enabled', $new_status);

            // Redirect back to the previous page
            wp_safe_redirect(wp_get_referer() ? wp_get_referer() : admin_url());
            exit;
        }
    }

    public function add_top_bar_link($wp_admin_bar)
    {
        // Check if we are on the settings page
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading WordPress admin page parameter, not processing user input
        if (isset($_GET['page']) && $_GET['page'] === 'winden') {
            return; // Do not add the link on the settings page
        }

        // SVG icon for the admin bar - styles are enqueued via enqueue_topbar_styles()
        $svg = '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M20.0000801,0 C31.0456943,0 40,8.95434156 40,20 C40,31.0456584 31.0456943,40 20.0000801,40 C8.95433272,40 0,31.0456855 0,20 C0,8.95431454 8.95433272,0 20.0000801,0 Z M20.0000801,3.33198499 C10.7945253,3.33198499 3.33197164,10.7945235 3.33197164,20 C3.33197164,21.0913135 3.43685195,22.1581313 3.63708303,23.1909239 L3.68555815,23.075732 C7.24118391,24.5676128 10.362427,25.050991 13.2677187,24.7327848 C15.4845333,24.4899851 17.417562,23.8381353 19.8680498,22.6501083 L20.0187117,22.5755284 L20.6015312,22.2818208 L21.5013402,21.8333088 L22.1079592,21.5338435 L22.5440188,21.3206677 L22.9404749,21.1293303 L23.2302475,20.9921972 L23.3526798,20.9355596 L23.4883146,20.8746276 C24.8655285,20.2713962 26.0020748,19.9603987 27.1512195,19.9603987 C28.544431,19.9603987 29.8854811,20.4937554 30.8859805,21.4944972 C32.9315438,23.5400687 32.9315438,26.8564806 30.8859805,28.9020521 C28.8608729,30.9271678 25.5900625,30.947419 23.5400408,28.9628055 L23.4782952,28.9020521 L26.0720112,26.3083256 C26.6851047,26.9214216 27.679171,26.9214216 28.2922645,26.3083256 C28.9053579,25.6952297 28.9053579,24.7013196 28.2921101,24.0880692 C27.9930915,23.7889782 27.5895459,23.6284818 27.1511596,23.6284818 C26.6182139,23.6284644 25.9558065,23.8053231 25.0459975,24.197176 L24.9052389,24.2588819 L24.7339303,24.3378119 L24.4243233,24.4850898 L23.8234835,24.7775583 L23.37268,24.9998057 L21.6188874,25.8772313 L21.4632035,25.9531897 C18.669387,27.3073618 16.3685882,28.0831763 13.6670792,28.3790629 C10.9598606,28.6755748 8.13023536,28.4051957 5.10432575,27.4868062 C7.84641299,32.9324111 13.4869901,36.668015 20.0000801,36.668015 C29.2054972,36.668015 36.6680284,29.2054539 36.6680284,20 C36.6680284,19.5908687 36.6532876,19.1851802 36.6243081,18.7834365 C33.4713579,17.0582461 30.4445477,16.396836 27.3948289,16.5894439 C25.2939217,16.7221286 23.3217757,17.2175894 20.9761704,18.1277344 L20.674664,18.2461798 C20.5734598,18.2864152 20.4715406,18.3274055 20.3688679,18.3691546 L20.0585499,18.4966829 L20.0585499,18.4966829 L19.7493571,18.6263003 C19.6455051,18.6702436 19.5408534,18.7149255 19.4353651,18.7603499 L19.2105867,18.8585545 L17.359877,19.6808088 L16.6293872,20.0015144 L16.0312234,20.26082 L15.684196,20.4084061 L15.4868051,20.4901899 L15.4217581,20.5164194 C15.3052472,20.5628913 15.1908391,20.6075591 15.0783914,20.6504182 L14.856068,20.733723 C13.6472036,21.1786193 12.6640983,21.4042269 11.7175698,21.4042269 C10.3245615,21.4042269 8.98376421,20.8710096 7.98280877,19.8702886 C5.93724549,17.8247171 5.93724549,14.508145 7.98280877,12.4625735 C10.0079164,10.4374578 13.2787268,10.4172066 15.3287485,12.4018201 L15.3904941,12.4625735 L12.7967781,15.0563 C12.1836846,14.443204 11.1896183,14.443204 10.5765248,15.0563 C9.96343135,15.6693959 9.96343135,16.6634662 10.5763704,17.2764077 C10.8756769,17.5756442 11.2792599,17.7361438 11.7176297,17.7361438 C12.0963214,17.7361561 12.5963899,17.631633 13.2584566,17.4078414 L13.4082657,17.3561407 L13.5635072,17.3004775 L13.72428,17.2408159 L13.8906832,17.17712 C13.9188918,17.1661659 13.9473392,17.1550421 13.9760273,17.143748 L14.1753031,17.0635896 L14.4742815,16.9376657 L14.8517943,16.7750406 L15.6871741,16.4094605 L17.815662,15.4644092 L18.1625016,15.315083 C21.4924812,13.893859 24.172207,13.1175804 27.1636302,12.9286543 C30.0005324,12.7494871 32.8233547,13.1744831 35.6632628,14.2882919 C33.3320675,7.89591583 27.1990283,3.33198499 20.0000801,3.33198499 Z" fill="currentColor"/></svg>';
        $icon = '<div class="winden-topbar">' . $svg . 'Edit Winden</div>';

        $args = array(
            'id'    => 'winden_dplugins_editor',  // Unique ID for the link.
            'title' => $icon,  // The text of the link.
            'href'  => admin_url('admin.php?page=winden'),  // The URL where the link points.
            'meta'  => array(
                'title'  => 'Open Winden Editor',
                'icon'   => sprintf('data:image/svg+xml;base64,%s', base64_encode($icon))
            )
        );
        $wp_admin_bar->add_node($args);

        // Add submenu for Breakpoint Indicator
        $is_enabled = get_option('winden_dplugins_breakpoint_indicator_enabled', 'no') === 'yes';
        $status_icon = $is_enabled ? '✓ ' : '';

        $wp_admin_bar->add_node(array(
            'parent' => 'winden_dplugins_editor',
            'id'     => 'winden_breakpoint_indicator',
            'title'  => $status_icon . 'Breakpoint Indicator',
            'href'   => wp_nonce_url(admin_url('admin.php?winden_toggle_bp=1'), 'winden_toggle_bp', 'nonce'),
            'meta'   => array(
                'title' => $is_enabled ? 'Breakpoint Indicator (Enabled)' : 'Breakpoint Indicator (Disabled)'
            )
        ));
    }
}

new TopBar();

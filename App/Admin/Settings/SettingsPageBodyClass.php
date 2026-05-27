<?php namespace Winden\App\Admin\Settings;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

class SettingsPageBodyClass
{
    public function __construct()
    {
        add_filter('admin_body_class', [$this, 'home_admin_body_class']);
    }

    public function home_admin_body_class($classes)
    {
        // Check if we are on the winden page
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading WordPress admin page parameter, not processing user input
        if (isset($_GET['page']) && $_GET['page'] === 'winden') {
            // Retrieve the winden_options from the database
            $settings = get_option('winden_dplugins_options', [
                'folded_sidebar' => false
            ]);

            if (isset($settings['folded_sidebar']) && $settings['folded_sidebar']) {
                $classes .= ' folded'; // Add your custom class
            }
        }
        return $classes;
    }
}

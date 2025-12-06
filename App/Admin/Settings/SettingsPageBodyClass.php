<?php

namespace Winden\App\Admin\Settings;

class SettingsPageBodyClass
{
    public function __construct()
    {
        add_filter('admin_body_class', [$this, 'home_admin_body_class']);
    }

    public function home_admin_body_class($classes)
    {
        // Check if we are on the winden page
        if (isset($_GET['page']) && $_GET['page'] === 'winden') {
            // Retrieve the winden_options from the database
            $settings = get_option('winden_options', [
                'folded_sidebar' => false
            ]);

            if (isset($settings['folded_sidebar']) && $settings['folded_sidebar']) {
                $classes .= ' folded'; // Add your custom class
            }
        }
        return $classes;
    }
}

new SettingsPageBodyClass();

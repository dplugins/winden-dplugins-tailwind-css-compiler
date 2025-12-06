<?php

/**
 * Plugin Name: Winden - Tailwind CSS
 * Plugin URI:  https://dplugins.com/products/winden/
 * Description: Universal Tailwind CSS integration for WordPress Page Builders.
 * Version: 1.0.0
 * Author: DPlugins
 * Author URI: https://dplugins.com/
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 6.3
 * Tested up to: 6.9
 * Requires PHP: 8.0
 * Text Domain: winden
 */

define('WINDEN_WEBSITE_URL', get_site_url());
define('WINDEN_UPLOADS_URL', wp_upload_dir());
define('WINDEN_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WINDEN_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WINDEN_ASSETS_DIR', plugin_dir_url(__FILE__) . 'assets/');

// Include the Composer autoload
require __DIR__ . '/vendor/autoload.php';

use Winden\App\App;

new App();

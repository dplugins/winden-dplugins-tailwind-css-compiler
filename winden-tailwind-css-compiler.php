<?php

/**
 * Plugin Name: Winden - Tailwind CSS Compiler
 * Plugin URI:  https://dplugins.com/products/winden/
 * Description: Universal Tailwind CSS integration for WordPress Page Builders.
 * Version: 1.0.0
 * Author: DPlugins
 * Author URI: https://dplugins.com/
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 6.2
 * Tested up to: 6.9
 * Requires PHP: 7.4
 * Text Domain: winden-tailwind-css-compiler
 */

if (!defined('ABSPATH')) exit; // Exit if accessed directly

define('WINDTACS_WEBSITE_URL', get_site_url());
define('WINDTACS_UPLOADS_URL', wp_upload_dir());
define('WINDTACS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WINDTACS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WINDTACS_ASSETS_DIR', plugin_dir_url(__FILE__) . 'assets/');

// Include the Composer autoload
require __DIR__ . '/vendor/autoload.php';

use Winden\App\App;

new App();

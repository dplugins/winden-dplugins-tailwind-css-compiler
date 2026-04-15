<?php

/**
 * Plugin Name: Winden — Tailwind CSS Compiler with Full WordPress Integration
 * Plugin URI:  https://dplugins.com/products/winden/
 * Description: Universal Tailwind CSS integration for WordPress Page Builders.
 * Version: 1.2.2
 * Author: DPlugins
 * Author URI: https://dplugins.com/
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 6.2
 * Tested up to: 6.9.1
 * Requires PHP: 7.4
 * Text Domain: winden-dplugins-tailwind-css-compiler
 */

if (!defined('ABSPATH')) exit; // Exit if accessed directly

// Extract version and text domain from plugin header
$windtacs_plugin_data = get_file_data(__FILE__, ['Version' => 'Version', 'TextDomain' => 'Text Domain']);

// Plugin constants
define('WINDTACS_VERSION', $windtacs_plugin_data['Version']);
define('WINDTACS_TEXT_DOMAIN', $windtacs_plugin_data['TextDomain']);
unset($windtacs_plugin_data); // Clean up global variable
define('WINDTACS_WEBSITE_URL', get_site_url());
define('WINDTACS_UPLOADS_URL', wp_upload_dir());
define('WINDTACS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WINDTACS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WINDTACS_ASSETS_DIR', plugin_dir_url(__FILE__) . 'assets/');

// Include the Composer autoload
require __DIR__ . '/vendor/autoload.php';

use Winden\App\App;

new App();

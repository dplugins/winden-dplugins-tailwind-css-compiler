<?php
namespace Winden\App\PageBuilder;

if (!defined('ABSPATH')) exit;

use Winden\App\Assets\Providers\ProvidersHelpers;

/**
 * Gutenberg Winden Classes Integration
 *
 * Adds autocomplete to the native "Additional CSS class(es)" field
 * in the block editor. Uses native block attributes for storage.
 */
class GutenbergWindenClasses
{
    public function __construct()
    {
        // Enqueue autocomplete assets in block editor
        add_action('enqueue_block_editor_assets', [$this, 'enqueueAutocompleteAssets'], 99999);

        // Enqueue Winden classes JavaScript
        add_action('enqueue_block_editor_assets', [$this, 'enqueueWindenClassesJS'], 99999);
    }

    /**
     * Enqueue Tailwind Autocomplete assets in block editor
     */
    public function enqueueAutocompleteAssets()
    {
        ProvidersHelpers::enqueueWindenClassesCore();
    }

    /**
     * Enqueue JavaScript for Winden classes functionality
     */
    public function enqueueWindenClassesJS()
    {
        $js_path = WINDTACS_PLUGIN_DIR . 'build/winden-classes/gutenberg/index.js';
        if (!file_exists($js_path)) {
            return;
        }

        // Enqueue external JS file with autocomplete as dependency
        wp_enqueue_script(
            'winden-gutenberg-classes',
            WINDTACS_PLUGIN_URL . 'build/winden-classes/gutenberg/index.js',
            ['winden-tailwind-autocomplete', 'wp-data', 'wp-element'],
            filemtime($js_path),
            true
        );

        ProvidersHelpers::localizeWindenClassesData('winden-gutenberg-classes', 'windenGutenbergClasses');
    }
}

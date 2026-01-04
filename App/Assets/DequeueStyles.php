<?php namespace Winden\App\Assets;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

use Winden\App\Helpers\Builders;

class DequeueStyles
{
    public function __construct()
    {
        add_action('wp_enqueue_scripts', [$this, 'dequeueAssets'], 9999);
        add_action('wp_print_styles', [$this, 'dequeueAssets'], 9999);
    }

    public function dequeueAssets()
    {
        $settings = get_option('winden_dplugins_options', [
            'dequeue_styles_gutenberg' => false,
            'dequeue_styles_bricks' => false,
            'dequeue_styles_oxygen' => false,
        ]);
        
        if (Builders::isBricksEditorFrame() || Builders::isFrontend()) {
            if ($settings['dequeue_styles_bricks'] ?? false) {
                // Dequeue and deregister Bricks styles
                $bricks_styles = [
                    'bricks-frontend',
                    'bricks-admin',
                    'bricks-default-content',
                    'bricks-frontend-inline',
                    'bricks-element-posts',
                    'bricks-isotope',
                    'bricks-element-post-author',
                    'bricks-element-post-comments',
                    'bricks-element-post-navigation',
                    'bricks-element-post-sharing',
                    'bricks-element-post-taxonomy',
                    'bricks-element-related-posts',
                    'bricks-404',
                ];

                foreach ($bricks_styles as $style) {
                    wp_dequeue_style($style);
                    wp_deregister_style($style);
                }
            }
        }

        if ($settings['dequeue_styles_gutenberg'] ?? false) {
            // wp_deregister_style('wp-block-library');      // Removes: block styles (buttons, galleries, .alignleft/right/center)
            wp_deregister_style('classic-theme-styles');  // Removes: legacy button fallback styles
            wp_deregister_style('global-styles');         // Removes: theme.json CSS variables & .has-*-color classes
        }

        if ($settings['dequeue_styles_oxygen'] ?? false) {
            add_filter('style_loader_tag', function ($tag, $handle) {
                if (str_contains($handle, 'oxygen-universal-styles') || str_contains($handle, 'oxygen-cache') || $handle == 'oxygen') {
                    return null;
                }
                return $tag;
            }, 10, 2);
        }
    }
}

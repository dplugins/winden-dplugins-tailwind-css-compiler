<?php

namespace Winden\App\Caching\Crawlers;

use Winden\App\Caching\StringParser;

class FancooloCrawler
{
    use StringParser;

    private array $posts;

    public function __construct(array $posts)
    {
        $this->posts = $posts;
    }

    public function classes(): array
    {
        $classes = [];

        foreach ($this->posts as $post) {
            // Skip if not a funculo post type
            if ($post->post_type !== 'funculo') {
                continue;
            }

            // Scan _funculo_block_php meta (PHP code)
            $blockPhp = get_post_meta($post->ID, '_funculo_block_php', true);
            if (!empty($blockPhp) && is_string($blockPhp)) {
                $phpClasses = $this->parseString($blockPhp);
                $classes = array_merge($classes, $phpClasses);
            }

            // Scan _funculo_block_js meta (JavaScript code)
            $blockJs = get_post_meta($post->ID, '_funculo_block_js', true);
            if (!empty($blockJs) && is_string($blockJs)) {
                $jsClasses = $this->parseString($blockJs);
                $classes = array_merge($classes, $jsClasses);
            }

            // Scan _funculo_symbol_php meta (PHP code)
            $symbolPhp = get_post_meta($post->ID, '_funculo_symbol_php', true);
            if (!empty($symbolPhp) && is_string($symbolPhp)) {
                $symbolClasses = $this->parseString($symbolPhp);
                $classes = array_merge($classes, $symbolClasses);
            }
        }

        // Also scan generated render.php files from fancoolo-blocks.
        // This ensures classes from the "Content" tab are picked up even if
        // templates were transformed during file generation.
        $renderFileClasses = $this->scanGeneratedRenderFiles();
        if (!empty($renderFileClasses)) {
            $classes = array_merge($classes, $renderFileClasses);
        }

        return array_unique($classes);
    }

    /**
     * Scan generated fancoolo block render.php files.
     *
     * @return array
     */
    private function scanGeneratedRenderFiles(): array
    {
        $classes = [];
        $baseDir = $this->resolveFancooloBlocksDir();

        if (!$baseDir || !is_dir($baseDir)) {
            return $classes;
        }

        $renderFiles = glob($baseDir . '/*/render.php');
        if (!$renderFiles || !is_array($renderFiles)) {
            return $classes;
        }

        foreach ($renderFiles as $renderFile) {
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Reading local generated template file
            $content = file_get_contents($renderFile);
            if ($content === false || $content === '') {
                continue;
            }

            $classes = array_merge($classes, $this->parseString($content));
        }

        return array_unique($classes);
    }

    /**
     * Resolve fancoolo-blocks directory.
     *
     * @return string|null
     */
    private function resolveFancooloBlocksDir(): ?string
    {
        if (defined('FANCOOLO_BLOCKS_DIR') && is_string(FANCOOLO_BLOCKS_DIR) && FANCOOLO_BLOCKS_DIR !== '') {
            return FANCOOLO_BLOCKS_DIR;
        }

        if (defined('WP_PLUGIN_DIR') && is_string(WP_PLUGIN_DIR) && WP_PLUGIN_DIR !== '') {
            return WP_PLUGIN_DIR . '/fancoolo-blocks';
        }

        return null;
    }
}

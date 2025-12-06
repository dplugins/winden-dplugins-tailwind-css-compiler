<?php

namespace Winden\App\Helpers;

class SettingsOptions
{
    public static function getWindenOptions()
    {
        $options = get_option('winden_options', [
            'css_preprocessor' => 'css',
            'autocomplete_gutenberg' => false,
            'autocomplete_bricks' => false,
            'autocomplete_oxygen' => false,
            'autocomplete_oxygen6' => false,
            'autocomplete_elementor' => false,
            'compiled_css' => false,
            'cdn_for_admin' => false,
        ]);

        // Always force v4, even if old database value exists
        $options['tailwind_version'] = 'v4';

        return $options;
    }
}

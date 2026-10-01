<?php namespace Winden\App\Blocks;
if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * The blocks Winden ships, and the block-editor extensions that go with them.
 *
 * Free feature: Tailwind markup is made of things core blocks cannot hold — an
 * `<img>` without a figure, `aria-hidden` and `style="clip-path: …"` on a
 * decorative div — and this is where those get a home.
 *
 * - `winden/image` — registered from its `block.json` in `build/blocks/image`,
 *   with `render.php` answering the featured-image case.
 * - `winden/text` — one inline element (`<time>`, `<span>`, `<code>`) with its
 *   attributes and classes on the element rather than on a paragraph wrapper.
 * - `winden/icon` — the `<svg>` as written. `core/icon` holds a *name* from
 *   `WP_Icons_Registry`, so markup sent there renders as nothing at all.
 * - `build/blocks/html-attributes/index.js` — adds `htmlAttributes` to core
 *   blocks and the "Winden" group variation. Enqueued on every block editor
 *   screen, not only when the Winden Classes panel is on: a group saved with
 *   attributes must be read back by the same save function or the editor
 *   flags it as invalid.
 * - `safe_style_css` — `clip-path` and its relatives are what Tailwind
 *   components put in a `style` attribute; without this, users who lack
 *   `unfiltered_html` lose them on save.
 */
class Blocks
{
    public function __construct()
    {
        add_action('init', [$this, 'register_blocks']);
        add_action('enqueue_block_editor_assets', [$this, 'enqueue_html_attributes']);
        add_action('admin_init', [$this, 'add_canvas_styles']);
        add_filter('safe_style_css', [$this, 'allow_component_styles']);
        add_filter('wp_kses_allowed_html', [$this, 'allow_svg'], 10, 2);
        add_filter('safecss_filter_attr_allow_css', [$this, 'allow_shape_functions'], 10, 2);
        add_filter('render_block_data', [$this, 'without_layout']);
        // After `wp_render_layout_support_flag`, which runs at 10
        add_filter('render_block', [$this, 'drop_layout_placeholder_class'], 11, 2);
    }

    /**
     * A Winden Group has no layout of its own, and core has to be told so.
     *
     * With no `layout` attribute the layout support falls back to the block's
     * default — flow — and writes `is-layout-flow` on the element, which the
     * theme's block-gap rule (`:root :where(.is-layout-flow) > *`, unlayered)
     * then uses to put a margin on every child. Tailwind markup set its own
     * gaps, and nothing in a class can win against an unlayered rule.
     *
     * `wp_render_layout_support_flag` writes a class only for a type it has a
     * definition for and generates no styles for one it does not, so a type it
     * does not know is the opt-out. Applied here at render time rather than
     * stored, so a Winden Group saved before this behaves the same. The
     * editor does the same in `src/blocks/html-attributes/index.js`.
     *
     * @param array $parsed_block The block about to render.
     * @return array
     */
    public function without_layout($parsed_block)
    {
        if (!is_array($parsed_block) || ($parsed_block['blockName'] ?? '') !== 'core/group') {
            return $parsed_block;
        }
        $attrs = $parsed_block['attrs'] ?? [];
        if (empty($attrs['windenGroup']) && empty($attrs['windenShape'])) {
            return $parsed_block;
        }
        if (!empty($attrs['layout'])) {
            return $parsed_block;
        }
        $parsed_block['attrs']['layout'] = ['type' => 'none'];
        return $parsed_block;
    }

    /**
     * The layout flag always writes `wp-block-group-{layout class}`, so with
     * no layout class it leaves `wp-block-group-` behind. Harmless, and gone.
     *
     * @param string $content The rendered block.
     * @param array  $block   The parsed block.
     * @return string
     */
    public function drop_layout_placeholder_class($content, $block)
    {
        if (($block['blockName'] ?? '') !== 'core/group' || ($block['attrs']['layout']['type'] ?? '') !== 'none') {
            return $content;
        }
        $processor = new \WP_HTML_Tag_Processor($content);
        if ($processor->next_tag()) {
            $processor->remove_class('wp-block-group-');
        }
        return $processor->get_updated_html();
    }

    public function register_blocks()
    {
        foreach (['image' => 'winden/image', 'text' => 'winden/text', 'icon' => 'winden/icon'] as $dir => $name) {
            $path = WINDTACS_PLUGIN_DIR . 'build/blocks/' . $dir;
            if (!file_exists($path . '/block.json')) {
                continue;
            }
            register_block_type($path);
            wp_set_script_translations(generate_block_asset_handle($name, 'editorScript'), 'winden-dplugins-tailwind-css-compiler');
        }
    }

    /**
     * The block-editor stylesheet, inside the canvas.
     *
     * `enqueue_block_editor_assets` loads into the editor page, not into the
     * iframe the blocks are rendered in — so a rule about a block's own markup
     * never reaches it. `add_editor_style` is what WordPress injects into the
     * canvas, and it takes a URL.
     *
     * Needed for the Winden Shape variation, whose whole job is to hide the
     * variation picker core draws inside an empty group.
     */
    public function add_canvas_styles()
    {
        $css = WINDTACS_PLUGIN_DIR . 'build/blocks/html-attributes/index.css';
        if (!file_exists($css)) {
            return;
        }

        add_editor_style(WINDTACS_PLUGIN_URL . 'build/blocks/html-attributes/index.css');
    }

    public function enqueue_html_attributes()
    {
        $js = WINDTACS_PLUGIN_DIR . 'build/blocks/html-attributes/index.js';
        if (!file_exists($js)) {
            return;
        }

        $asset_file = WINDTACS_PLUGIN_DIR . 'build/blocks/html-attributes/index.asset.php';
        $asset = file_exists($asset_file) ? include $asset_file : [];

        wp_enqueue_script(
            'winden-blocks-html-attributes',
            WINDTACS_PLUGIN_URL . 'build/blocks/html-attributes/index.js',
            array_unique(array_merge($asset['dependencies'] ?? [], [
                'wp-blocks',
                'wp-hooks',
                'wp-element',
                'wp-compose',
                'wp-block-editor',
                'wp-components',
                'wp-i18n',
                'wp-primitives',
            ])),
            $asset['version'] ?? filemtime($js),
            true
        );

        // Expand/collapse a whole subtree from the block's ⋮ menu. Its own
        // bundle: it is about List View, not about attributes, and it is
        // wanted on every block-editor screen either way.
        $list_view = WINDTACS_PLUGIN_DIR . 'build/blocks/list-view/index.js';
        if (file_exists($list_view)) {
            $list_view_asset_file = WINDTACS_PLUGIN_DIR . 'build/blocks/list-view/index.asset.php';
            $list_view_asset = file_exists($list_view_asset_file) ? include $list_view_asset_file : [];

            wp_enqueue_script(
                'winden-blocks-list-view',
                WINDTACS_PLUGIN_URL . 'build/blocks/list-view/index.js',
                array_unique(array_merge($list_view_asset['dependencies'] ?? [], [
                    'wp-plugins',
                    'wp-block-editor',
                    'wp-components',
                    'wp-data',
                    'wp-element',
                    'wp-i18n',
                ])),
                $list_view_asset['version'] ?? filemtime($list_view),
                true
            );
        }

        // The same stylesheet for the editor's own chrome: the attribute rows
        // live in the inspector, which is outside the canvas. Built all along
        // and enqueued by nothing until now.
        $css = WINDTACS_PLUGIN_DIR . 'build/blocks/html-attributes/index.css';
        if (file_exists($css)) {
            wp_enqueue_style(
                'winden-blocks-html-attributes',
                WINDTACS_PLUGIN_URL . 'build/blocks/html-attributes/index.css',
                [],
                filemtime($css)
            );
        }
        wp_set_script_translations('winden-blocks-html-attributes', 'winden-dplugins-tailwind-css-compiler');

    }

    /**
     * SVG in post content, for people without `unfiltered_html`.
     *
     * Measured: `wp_kses_post()` on a heroicon returns the empty string —
     * `svg` is in no allowed list, so an editor or a multisite admin saving a
     * page loses every icon on it, silently, while an administrator on a
     * single site keeps them. That difference is the bug.
     *
     * An allowlist of drawing elements and their geometry, nothing else. No
     * `script`, no `a`, no `use` and no `foreignObject`: those are the parts of
     * SVG that can navigate or execute, and an icon needs none of them.
     * Handlers are impossible by construction — `on*` is simply not listed.
     *
     * @param array[] $tags    Allowed tags, keyed by tag name.
     * @param string  $context The `wp_kses` context.
     * @return array[]
     */
    public function allow_svg($tags, $context)
    {
        if ('post' !== $context || !is_array($tags)) {
            return $tags;
        }

        // What core lets any element wear. Spelled out rather than taken from
        // `_wp_add_global_attributes()`, which is private.
        $global = [
            'class' => true, 'id' => true, 'style' => true, 'role' => true,
            'data-*' => true, 'title' => true, 'lang' => true, 'dir' => true,
            'aria-hidden' => true, 'aria-label' => true, 'aria-labelledby' => true,
            'aria-describedby' => true, 'aria-current' => true, 'aria-live' => true,
        ];

        // Presentation, shared by every drawing element
        $paint = [
            'fill' => true, 'fill-opacity' => true, 'fill-rule' => true,
            'stroke' => true, 'stroke-width' => true, 'stroke-opacity' => true,
            'stroke-linecap' => true, 'stroke-linejoin' => true,
            'stroke-dasharray' => true, 'stroke-dashoffset' => true,
            'stroke-miterlimit' => true, 'opacity' => true, 'color' => true,
            'transform' => true, 'clip-path' => true, 'clip-rule' => true,
            'mask' => true, 'vector-effect' => true, 'shape-rendering' => true,
            'focusable' => true,
        ];

        $box = ['x' => true, 'y' => true, 'width' => true, 'height' => true, 'rx' => true, 'ry' => true];

        $svg = [
            'svg' => array_merge($global, $paint, [
                'xmlns' => true, 'xmlns:xlink' => true, 'viewbox' => true,
                'width' => true, 'height' => true, 'preserveaspectratio' => true,
                'overflow' => true, 'version' => true, 'x' => true, 'y' => true,
            ]),
            'g' => array_merge($global, $paint),
            'path' => array_merge($global, $paint, ['d' => true, 'pathlength' => true]),
            'circle' => array_merge($global, $paint, ['cx' => true, 'cy' => true, 'r' => true]),
            'ellipse' => array_merge($global, $paint, ['cx' => true, 'cy' => true, 'rx' => true, 'ry' => true]),
            'line' => array_merge($global, $paint, ['x1' => true, 'y1' => true, 'x2' => true, 'y2' => true]),
            'polyline' => array_merge($global, $paint, ['points' => true]),
            'polygon' => array_merge($global, $paint, ['points' => true]),
            'rect' => array_merge($global, $paint, $box),
            'defs' => $global,
            'symbol' => array_merge($global, $paint, ['viewbox' => true, 'preserveaspectratio' => true]),
            'lineargradient' => array_merge($global, [
                'x1' => true, 'y1' => true, 'x2' => true, 'y2' => true,
                'gradientunits' => true, 'gradienttransform' => true, 'spreadmethod' => true,
            ]),
            'radialgradient' => array_merge($global, [
                'cx' => true, 'cy' => true, 'r' => true, 'fx' => true, 'fy' => true,
                'gradientunits' => true, 'gradienttransform' => true, 'spreadmethod' => true,
            ]),
            'stop' => array_merge($global, ['offset' => true, 'stop-color' => true, 'stop-opacity' => true]),
            'clippath' => array_merge($global, ['clippathunits' => true]),
            'mask' => array_merge($global, $box, ['maskunits' => true, 'maskcontentunits' => true]),
            'pattern' => array_merge($global, $box, [
                'patternunits' => true, 'patterncontentunits' => true,
                'patterntransform' => true, 'viewbox' => true,
            ]),
            'text' => array_merge($global, $paint, [
                'x' => true, 'y' => true, 'dx' => true, 'dy' => true,
                'text-anchor' => true, 'dominant-baseline' => true,
                'font-family' => true, 'font-size' => true, 'font-weight' => true,
                'letter-spacing' => true,
            ]),
            'tspan' => array_merge($global, $paint, ['x' => true, 'y' => true, 'dx' => true, 'dy' => true]),
            'title' => $global,
            'desc' => $global,
        ];

        return array_merge($tags, $svg);
    }

    /**
     * Inline styles a Tailwind component is made of and `wp_kses` would drop.
     *
     * Values are still sanitised by `safecss_filter_attr`; this only widens
     * which properties survive.
     *
     * @param string[] $properties
     * @return string[]
     */
    public function allow_component_styles($properties)
    {
        return array_values(array_unique(array_merge((array) $properties, [
            'clip-path',
            'mask',
            'mask-image',
            'mask-size',
            'mask-position',
            'mask-repeat',
            '-webkit-mask',
            '-webkit-mask-image',
            'aspect-ratio',
            'inset',
            'transform',
            'translate',
            'rotate',
            'scale',
            'opacity',
            'filter',
            'backdrop-filter',
            'mix-blend-mode',
        ])));
    }

    /**
     * Shape and transform functions in a value.
     *
     * `safecss_filter_attr` strips `var()`, `calc()` and friends before it
     * looks for a stray `(`, and rejects anything with one left — which is
     * every `clip-path: polygon(…)` and `transform: translateX(…)`. Those two
     * properties are let through when the value is nothing but the named
     * functions over numbers, units and separators.
     *
     * @param bool   $allow  What kses decided.
     * @param string $tested The declaration, known functions already removed.
     * @return bool
     */
    public function allow_shape_functions($allow, $tested)
    {
        if ($allow) {
            return $allow;
        }

        $declaration = trim((string) $tested);
        $shape = '(?:polygon|inset|circle|ellipse|path|rect|xywh)';
        $transform = '(?:translate[XYZ3d]*|rotate[XYZ3d]*|scale[XYZ3d]*|skew[XY]?|matrix3?d?|perspective)';
        // Numbers, units, percentages, commas, spaces, slashes, keywords —
        // and quotes only for path("…") data
        $arguments = '[a-z0-9%.,\s\-\/\'"]*';

        if (preg_match('/^clip-path\s*:\s*' . $shape . '\(' . $arguments . '\)(\s+[a-z-]+)?$/i', $declaration)) {
            return true;
        }
        if (preg_match('/^transform\s*:\s*(?:' . $transform . '\(' . $arguments . '\)\s*)+$/i', $declaration)) {
            return true;
        }
        return $allow;
    }
}

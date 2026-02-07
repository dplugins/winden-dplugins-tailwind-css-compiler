/**
 * Initial settings configuration for the plugin
 */
export const initialSettings = {
  // tailwind_version removed - always v4 now
  autocomplete_gutenberg: false,
  autocomplete_bricks: false,
  autocomplete_oxygen: false,
  autocomplete_oxygen6: false,
  autocomplete_elementor: false,
  autocomplete_builderius: false,
  // Winden Classes autocomplete
  winden_classes_gutenberg: false,
  winden_classes_bricks: false,
  winden_classes_oxygen: false,
  winden_classes_oxygen6: false,
  winden_classes_elementor: false,
  // Autocomplete mode (which tab is selected)
  autocomplete_mode: 'plain-classes' as 'plain-classes' | 'winden-classes',
  dequeue_styles_gutenberg: false,
  dequeue_styles_bricks: false,
  dequeue_styles_oxygen: false,
  dequeue_styles_oxygen6: false,
  register_wizzard_data_in_fse: false,
  disable_dev_mode: false,
  folded_sidebar: false,
  scan_path: '',
  scan_file_formats: [] as string[],
  css_preprocessor: 'css' as 'css' | 'scss',
};

export type Settings = typeof initialSettings;

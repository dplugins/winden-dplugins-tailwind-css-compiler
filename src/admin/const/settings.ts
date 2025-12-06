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
  dequeue_styles_gutenberg: false,
  dequeue_styles_bricks: false,
  dequeue_styles_oxygen: false,
  dequeue_styles_oxygen6: false,
  register_wizzard_data_in_fse: false,
  disable_dev_mode: false,
  folded_sidebar: false,
  scan_path: '',
  scan_file_formats: [] as string[],
  save_config_file: false,
  css_preprocessor: 'css' as 'css' | 'scss',
};

export type Settings = typeof initialSettings;

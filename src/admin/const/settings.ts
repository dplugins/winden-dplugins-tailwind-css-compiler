/**
 * Editor tab identifiers used by Header + TabContent.
 */
export type EditorTabKey = 'style' | 'javascript' | 'wizzard' | 'styleguide';

export interface EditorTabSetting {
  value: EditorTabKey;
  visible: boolean;
}

export const DEFAULT_EDITOR_TABS: EditorTabSetting[] = [
  { value: 'style', visible: true },
  { value: 'javascript', visible: true },
  { value: 'wizzard', visible: true },
  { value: 'styleguide', visible: true },
];

export const EDITOR_TAB_LABELS: Record<EditorTabKey, string> = {
  style: 'Style',
  javascript: 'Config',
  wizzard: 'Wizzard',
  styleguide: 'Style Guide',
};

/**
 * Normalize editor_tabs from saved settings — drops unknown keys,
 * appends any missing known tabs (so new tabs added in a future release
 * still show up for existing users), preserves saved order otherwise.
 */
export function normalizeEditorTabs(raw: unknown): EditorTabSetting[] {
  const known = new Set<EditorTabKey>(DEFAULT_EDITOR_TABS.map((t) => t.value));
  const seen = new Set<EditorTabKey>();
  const result: EditorTabSetting[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === 'object' && known.has((item as any).value)) {
        const value = (item as any).value as EditorTabKey;
        if (!seen.has(value)) {
          result.push({ value, visible: (item as any).visible !== false });
          seen.add(value);
        }
      }
    }
  }
  for (const t of DEFAULT_EDITOR_TABS) {
    if (!seen.has(t.value)) result.push({ ...t });
  }
  return result;
}

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
  editor_tabs: DEFAULT_EDITOR_TABS,
};

export type Settings = typeof initialSettings;

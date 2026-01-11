/**
 * API and Settings type definitions for Winden
 * Replaces usage of `any` with proper types
 */

// ============================================
// WordPress AJAX Response Types
// ============================================

/**
 * Standard WordPress AJAX response wrapper
 */
export interface WordPressAjaxResponse<T = unknown> {
  success: boolean;
  data: T;
}

/**
 * WordPress AJAX error response
 */
export interface WordPressAjaxError {
  success: false;
  data: string | { message: string };
}

// ============================================
// Cache Status Types
// ============================================

/**
 * Cache status returned from backend
 */
export interface CacheStatus {
  status: 'completed' | 'failed' | 'pending' | 'none';
  lastUpdated?: string;
  fileSize?: number;
  errors?: string;
  cssLength?: number;
}

/**
 * Cache error object
 */
export interface CacheError {
  title: string;
  message: string;
}

/**
 * Cache save payload
 */
export interface CachePayload {
  styles?: string;
  status?: 'completed' | 'failed';
  errors?: string;
}

// ============================================
// Settings Types
// ============================================

/**
 * Winden plugin settings
 */
export interface WindenSettings {
  // Autocomplete settings
  autocomplete_gutenberg?: boolean;
  autocomplete_bricks?: boolean;
  autocomplete_bricks2?: boolean;
  autocomplete_oxygen?: boolean;
  autocomplete_oxygen6?: boolean;
  autocomplete_elementor?: boolean;

  // File scanning settings
  scan_path?: string[];
  scan_file_formats?: string[];

  // Production settings
  disable_dev_mode?: boolean;
  inline_compiled_css?: boolean;

  // FSE integration settings
  register_wizzard_data_in_fse?: boolean;

  // Other settings (extensible)
  [key: string]: boolean | string | string[] | number | undefined;
}

// ============================================
// Editor State Types (React Query)
// ============================================

/**
 * File state in editor
 */
export interface FileState {
  name: string;
  content: string;
  language?: string;
  isModified?: boolean;
}

/**
 * Editor state (array of files)
 */
export type EditorState = FileState[];

/**
 * Payload for updating editor content
 */
export interface EditorPayload {
  files?: FileState[];
  _nonce?: string;
}

// ============================================
// Helpers State Types (React Query)
// ============================================

/**
 * Helper options state
 */
export interface HelpersState {
  sidebarOpen?: boolean;
  lastTab?: string;
  recentColors?: string[];
  [key: string]: boolean | string | string[] | number | undefined;
}

/**
 * Payload for updating helper options
 */
export interface HelpersPayload {
  [key: string]: boolean | string | string[] | number | undefined;
}

// ============================================
// Broadcast Channel Types
// ============================================

/**
 * Broadcast message data payload
 */
export interface BroadcastMessageData {
  javascript?: string;
  scss?: string;
  wizzard?: string;
  css?: string;
  settings?: WindenSettings;
}

/**
 * Listener callback type for broadcast messages
 */
export type BroadcastListener<T = BroadcastMessageData> = (data: T) => void;

// ============================================
// Save Handler Types
// ============================================

/**
 * Content refs for save handler
 */
export interface ContentRefs {
  jsContentRef: React.MutableRefObject<string>;
  scssContentRef: React.MutableRefObject<string>;
}

/**
 * Save handler function signature
 */
export type SaveHandler = (
  jsContentRef?: React.MutableRefObject<string>,
  scssContentRef?: React.MutableRefObject<string>
) => void | Promise<void>;

// ============================================
// Window Global Extensions
// ============================================

declare global {
  interface Window {
    // AJAX and WordPress
    ajaxUrl?: string;
    websiteUrl?: string;
    uploadUrl?: string;
    nonce?: string;

    // Tailwind compiler
    tailwindify?: (
      classes: string[],
      css: string,
      config: string,
      preprocessor: string
    ) => Promise<{ css?: string; error?: { message: string } }>;

    tailwindifyClasses?: (css: string) => Promise<string[]>;

    // Winden data
    windenAutoCompile?: {
      ajaxUrl?: string;
      nonce?: string;
    };

    windenStyleTabs?: import('./styleTabs').StyleTab[];
  }
}

// ============================================
// Type Guards
// ============================================

/**
 * Type guard for CacheStatus
 */
export function isCacheStatus(obj: unknown): obj is CacheStatus {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'status' in obj &&
    typeof (obj as CacheStatus).status === 'string'
  );
}

/**
 * Type guard for WindenSettings
 */
export function isWindenSettings(obj: unknown): obj is WindenSettings {
  return typeof obj === 'object' && obj !== null;
}

/**
 * Type guard for FileState
 */
export function isFileState(obj: unknown): obj is FileState {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as FileState).name === 'string' &&
    'content' in obj &&
    typeof (obj as FileState).content === 'string'
  );
}

/**
 * Type guard for EditorState (array of FileState)
 */
export function isEditorState(obj: unknown): obj is EditorState {
  return Array.isArray(obj) && obj.every(isFileState);
}

export {};

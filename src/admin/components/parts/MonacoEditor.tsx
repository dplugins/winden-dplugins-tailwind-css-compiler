/**
 * Monaco, and everything it drags with it, behind one dynamic import.
 *
 * `monacoSetup` pulls `monaco-editor/editor.main` — the full entry, kept
 * deliberately so the CSS language server survives — which is 3.84 MB across
 * two chunks. Imported at module scope from `App.tsx` it loaded on the Wizzard
 * and the Style Guide too, where there is no editor at all.
 *
 * The environment has to be configured before an editor mounts, so it happens
 * here rather than in `App.tsx`: this module is the chunk boundary, and
 * anything that renders an editor imports it from here.
 */

import Editor from '@monaco-editor/react';
import { setupMonaco } from '@/config/monacoSetup';

setupMonaco();

export type { Monaco } from '@monaco-editor/react';
export default Editor;

/**
 * Winden Classes — the HTML editor behind "HTML to blocks"
 *
 * A textarea was enough while the modal only took a paste. Writing markup in
 * one is not: no tag closing, no Emmet, no idea whether `bg-blu-500` is a class
 * that exists. Monaco already ships with the plugin for the style editor, so
 * this is the same editor pointed at HTML.
 *
 * It is a bundle of its own, loaded the first time the modal opens. Monaco is
 * ~1.5 MB; the block editor should not carry that on every page load for a
 * feature most sessions never touch.
 */

// Only what an HTML editor needs. Importing `monaco-editor` pulls every
// language and language service Monaco ships — 4.5 MB against 1.3 MB for this.
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/features/register.all.js';
import 'monaco-editor/languages/definitions/html/register.js';
import { htmlDefaults } from 'monaco-editor/languages/features/html/register.js';
import { emmetHTML } from 'emmet-monaco-es';

import { LAYOUT_ATTRIBUTE, GROUP_LAYOUTS } from '../core/html-to-blocks';

interface MountOptions {
    value?: string;
    onChange?: (value: string) => void;
    /** Run the HTML formatter over the initial value — block markup arrives unbroken */
    format?: boolean;
    /**
     * Called once the formatter has settled, so a caller can take its baseline
     * from what is actually on screen. The formatter rewrites the markup
     * before anyone types a character; a caller comparing against what it
     * handed over reads that as an edit.
     */
    onFormatted?: () => void;
    /** `vs` or `vs-dark`; follows the editor Gutenberg is drawing when left out */
    theme?: string;
    /**
     * Caret in and out. The docked editor applies what it holds when it loses
     * focus, and ignores incoming changes while it has it — those are its own
     * echo coming back from the document.
     */
    onFocus?: () => void;
    onBlur?: () => void;
    /** The line the caret is on, 1-based — for pointing the editor's selection at a block */
    onCursorLine?: (line: number) => void;
}

interface MountedEditor {
    getValue: () => string;
    /**
     * Resolves once the new value has been through the formatter. Pass
     * `{ format: false }` to skip it — the markup is set either way.
     */
    setValue: (value: string, options?: { format?: boolean }) => Promise<void>;
    focus: () => void;
    /** Mark the lines a block occupies, and bring them into view. `null` clears it. */
    highlight: (range: { start: number; end: number } | null, options?: { caret?: boolean }) => void;
    /** What `highlight` last marked — read by tests, which cannot see decorations */
    getHighlight: () => { start: number; end: number } | null;
    /** The line the caret is on, 1-based */
    getCaretLine: () => number | null;
    layout: () => void;
    dispose: () => void;
}

// Not `extends Window`: the core bundle declares its own richer
// `WindenAutocomplete` on the global, and this file only needs the one method
interface EditorWindow {
    windenHtmlEditor?: {
        mount: (container: HTMLElement, options?: MountOptions) => MountedEditor;
        /** The editor showing right now — the modal is a singleton, and tests drive it */
        current: MountedEditor | null;
    };
    MonacoEnvironment?: { getWorker: (workerId: string, label: string) => Worker };
    WindenAutocomplete?: { getClassData?: () => { classes?: string[]; variants?: string[]; breakpoints?: string[] } };
    /** The blocks written as a tag, described by the bundle that owns the registry */
    windenBlockVocabulary?: () => ComponentBlock[];
}

interface ComponentAttribute {
    name: string;
    type?: string;
    values?: string[] | null;
}

interface ComponentTemplate {
    tag: string;
    children: ComponentTemplate[];
}

interface ComponentBlock {
    tag: string;
    name: string;
    title: string;
    parent?: string[] | null;
    /** Written back as this tag when reopened, rather than as a marker */
    emits?: boolean;
    /** What the block arrives with, the way the inserter gives it */
    children?: ComponentTemplate[];
    attributes: ComponentAttribute[];
}

const win = window as unknown as EditorWindow;

/**
 * The blocks written as a tag: `<core-columns>`, and what it takes.
 *
 * A vocabulary you have to already know is one nobody writes. Typing `<core`
 * offered nothing at all before this — Monaco's HTML service knows the
 * standard element set and no more — so the one thing this editor could say
 * about blocks was the one thing it did not.
 *
 * Matched anywhere in the tag rather than only at the front, because someone
 * who wants columns types `col`, not `core`.
 */
/**
 * How well a tag answers what was typed, as a sort key.
 *
 * Someone typing `col` means Columns, not Social Icons — and no one types
 * `core-` to narrow anything, so the namespace is skipped when ranking.
 */
function rank(tag: string, typed: string): string {
    if (!typed) return '1';
    const local = tag.slice(tag.indexOf('-') + 1);
    if (local.startsWith(typed)) return '0';
    if (tag.startsWith(typed)) return '1';
    return '2';
}

/**
 * A block and its children as one snippet, the way the inserter hands it over.
 *
 * Columns without columns in it is not what anyone means by a Columns block,
 * and writing the pair out by hand is the work this is meant to save.
 * Every empty spot is a tabstop, in reading order, so Tab walks the thing you
 * just inserted rather than leaving you to click into it.
 */
function templateSnippet(tag: string, children: ComponentTemplate[] | undefined, stop: { at: number }, indent = ''): string {
    if (!children || children.length === 0) {
        stop.at += 1;
        return `${tag}>$${stop.at}</${tag}>`;
    }

    const inner = children
        .map((child) => `${indent}  <${templateSnippet(child.tag, child.children, stop, `${indent}  `)}`)
        .join('\n');
    return `${tag}>\n${inner}\n${indent}</${tag}>`;
}

function registerBlockTagCompletion(): void {
    const vocabulary = () => win.windenBlockVocabulary?.() ?? [];

    /** `width` is a string but takes `33.33%`, so a snippet stop beats a value list */
    const attributeSnippet = (attribute: ComponentAttribute): string => {
        if (attribute.values && attribute.values.length > 0) {
            return `${attribute.name}="\${1|${attribute.values.join(',')}|}"`;
        }
        if (attribute.type === 'boolean') return `${attribute.name}="\${1|true,false|}"`;
        return `${attribute.name}="$1"`;
    };

    monaco.languages.registerCompletionItemProvider('html', {
        triggerCharacters: ['<', ' ', '-'],
        provideCompletionItems(model, position) {
            const blocks = vocabulary();
            if (blocks.length === 0) return { suggestions: [] };

            const line = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // Never inside a value: `class="core"` is a class, not a tag
            if (/=\s*["'][^"']*$/.test(line)) return { suggestions: [] };

            // Writing the tag itself: `<`, then whatever has been typed of it
            const naming = /<([a-zA-Z][\w-]*)?$/.exec(line);
            if (naming) {
                const typed = (naming[1] ?? '').toLowerCase();
                const range = new monaco.Range(
                    position.lineNumber,
                    position.column - typed.length,
                    position.lineNumber,
                    position.column
                );

                return {
                    // Re-query on every keystroke. Left complete, Monaco keeps
                    // the list returned for the bare `<` and fuzzy-filters it
                    // itself — which matches `col` against `core-loginout` as
                    // a subsequence and buries `core-columns` under it.
                    incomplete: true,
                    suggestions: blocks
                        .filter((block) => !typed || block.tag.includes(typed))
                        .map((block) => ({
                            label: block.tag,
                            // `col` should reach Columns before Social Icons.
                            // Ranked on the name without its namespace, since
                            // nobody is typing `core-` to narrow anything.
                            sortText: `${rank(block.tag, typed)}${block.tag}`,
                            filterText: block.tag,
                            kind: monaco.languages.CompletionItemKind.Class,
                            detail: block.emits
                                ? `${block.title} — a block, written as a tag`
                                : `${block.title} — inserted as a block`,
                            documentation: [
                                "Its settings are attributes; anything left out keeps the block's own default.",
                                block.parent?.length
                                    ? `Only valid inside <${block.parent.map((name) => name.replace(/\//g, '-')).join('>, <')}>.`
                                    : '',
                                block.emits
                                    ? ''
                                    : 'Reopening this page shows it as a marker rather than as this tag — it is handed back untouched instead of being rewritten.',
                            ].filter(Boolean).join(' '),
                            insertText: (() => {
                                const stop = { at: 0 };
                                const body = templateSnippet(block.tag, block.children, stop);
                                // `$0` is where the caret lands last; without
                                // it Tab from the final child leaves the block
                                return `${body}$0`;
                            })(),
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range,
                        })),
                };
            }

            // Inside a component tag: what that block can be told
            const open = /<([a-zA-Z][\w-]*)(?:\s[^<>]*)?$/.exec(line);
            const block = open ? blocks.find((candidate) => candidate.tag === open[1].toLowerCase()) : undefined;
            if (!block) return { suggestions: [] };

            const typed = /[^\s<>"'=/]*$/.exec(line)?.[0] ?? '';
            const range = new monaco.Range(
                position.lineNumber,
                position.column - typed.length,
                position.lineNumber,
                position.column
            );

            const written = line.toLowerCase();
            const suggestions = block.attributes
                // Offering an attribute the tag already wears is offering a duplicate
                .filter((attribute) => !new RegExp(`\\s${attribute.name}\\s*=`).test(written))
                .filter((attribute) => !typed || attribute.name.includes(typed.toLowerCase()))
                .map((attribute) => ({
                    label: attribute.name,
                    kind: monaco.languages.CompletionItemKind.Property,
                    detail: `${block.title} setting${attribute.type ? ` (${attribute.type})` : ''}`,
                    insertText: attributeSnippet(attribute),
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range,
                }));

            // The escape hatch for a setting with a shape — a layout, a focal point
            if (!written.includes('data-wp-attrs') && (!typed || 'data-wp-attrs'.includes(typed.toLowerCase()))) {
                suggestions.push({
                    label: 'data-wp-attrs',
                    kind: monaco.languages.CompletionItemKind.Property,
                    detail: 'Settings that are not a single value, as JSON',
                    insertText: 'data-wp-attrs=\'{"$1": $2}\'',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range,
                });
            }

            return { suggestions };
        },
    });
}

/**
 * Where this bundle came from — the workers sit beside it. Read at load time
 * because `document.currentScript` is only meaningful while the script runs.
 */
const BASE_URL = (() => {
    const src = (document.currentScript as HTMLScriptElement | null)?.src;
    return src ? src.replace(/[^/]*$/, '') : '';
})();

win.MonacoEnvironment = {
    getWorker(_workerId: string, label: string): Worker {
        const worker = label === 'html' || label === 'handlebars' || label === 'razor'
            ? 'html.worker.js'
            : 'editor.worker.js';
        return new Worker(`${BASE_URL}${worker}`);
    },
};

/**
 * The container tags whose group can take a layout — the same list the
 * converter maps to `core/group`, minus the ones that are a group only because
 * their tag has to survive (`dt`, `figcaption`).
 */
const LAYOUT_TAGS = /<(div|section|article|header|footer|main|aside|nav)\b[^>]*$/i;

/** What each layout costs, said once, where the choice is made */
/**
 * Letters of `data-wp-layout` to type before it is offered.
 *
 * One, not two. Monaco caches a provider's answer for the length of a word and
 * filters it client-side as the word grows, so a provider that declines at one
 * letter is not asked again at two — `incomplete: true` did not change that,
 * measured. One letter is the first call, which keeps this honest, and the
 * behaviour is the same where it matters: nothing appears on the space.
 */
const MIN_PREFIX = 1;

const LAYOUT_DOCS: Record<string, string> = {
    constrained: 'Group — content width from the theme, children stacked',
    row: 'Row — flex, no wrap. Core emits is-layout-flex and its own gap; Tailwind `flex gap-4` already does that',
    stack: 'Stack — flex, vertical. Same core layout CSS as Row',
    grid: 'Grid — core grid layout, columns from the block’s own controls rather than `grid-cols-*`',
};

/**
 * `data-wp-layout`, and the four names it takes.
 *
 * A group’s variation is an attribute nobody can guess the spelling of, and
 * Monaco’s HTML service knows only the standard attribute set — so left alone
 * the one thing this editor can say about blocks is the one thing it did not.
 */
function registerLayoutCompletion(): void {
    const values = Object.keys(GROUP_LAYOUTS);

    monaco.languages.registerCompletionItemProvider('html', {
        // The values get their quote; `data-` re-triggers on the hyphen Monaco
        // does not count as part of a word. Space is deliberately not here.
        triggerCharacters: ['"', "'", '-'],
        provideCompletionItems(model, position) {
            const line = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // Inside the attribute already: offer the values it takes
            const open = new RegExp(`\\s${LAYOUT_ATTRIBUTE}\\s*=\\s*(["\'])((?:(?!\\1).)*)$`, 'i').exec(line);
            if (open) {
                const written = /[^\s]*$/.exec(open[2])?.[0] ?? '';
                const valueRange = new monaco.Range(
                    position.lineNumber,
                    position.column - written.length,
                    position.lineNumber,
                    position.column
                );
                return {
                    suggestions: values.map((value) => ({
                        label: value,
                        kind: monaco.languages.CompletionItemKind.EnumMember,
                        insertText: value,
                        documentation: LAYOUT_DOCS[value],
                        range: valueRange,
                    })),
                };
            }

            // Writing the tag itself, and not inside any attribute’s quotes
            const inValue = /=\s*["\'][^"\']*$/.test(line);
            if (inValue || !LAYOUT_TAGS.test(line)) return { suggestions: [] };
            if (line.includes(LAYOUT_ATTRIBUTE)) return { suggestions: [] };

            // What has been typed of the attribute name. Monaco's HTML word
            // stops at `-`, so `data-` reads as an empty word and the prefix
            // has to be taken off the line instead: back to the whitespace
            // that separates one attribute from the last.
            const typed = /[^\s<>"'=/]*$/.exec(line)?.[0] ?? '';
            // Wait for a letter. Every attribute in every tag is written
            // after a space, so offering it on the space itself put a one-item
            // list in the way of writing an ordinary div. From the first
            // letter it joins Monaco's own attribute list — `data-`, `dir`,
            // `draggable` — rather than arriving as a popup of its own.
            // Matched anywhere in the name rather than only at the front:
            // `lay` is what someone who half-remembers this reaches for.
            if (typed.length < MIN_PREFIX || !LAYOUT_ATTRIBUTE.includes(typed.toLowerCase())) {
                return { suggestions: [] };
            }

            const range = new monaco.Range(
                position.lineNumber,
                position.column - typed.length,
                position.lineNumber,
                position.column
            );

            return {
                suggestions: [{
                    label: LAYOUT_ATTRIBUTE,
                    kind: monaco.languages.CompletionItemKind.Property,
                    detail: 'Group variation — Group, Row, Stack or Grid',
                    documentation: 'Opt in to a core layout. Left out, the container arrives as a Winden Group: no layout CSS, so the Tailwind classes on it are the only thing positioning its children.',
                    insertText: `${LAYOUT_ATTRIBUTE}="\${1|${values.join(',')}|}"`,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range,
                }],
            };
        },
    });
}

/** Winden's own classes, offered inside `class="…"` — the point of the exercise */
function registerClassCompletion(): void {
    monaco.languages.registerCompletionItemProvider('html', {
        triggerCharacters: [' ', '"', "'", '-', ':'],
        provideCompletionItems(model, position) {
            const line = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // Inside an open class attribute? The last quote before the caret
            // has to belong to a class/className attribute that never closed.
            const attribute = /\sclass(?:Name)?\s*=\s*(["'])((?:(?!\1).)*)$/i.exec(line);
            if (!attribute) return { suggestions: [] };

            const written = attribute[2];
            const token = /[^\s]*$/.exec(written)?.[0] ?? '';
            const data = win.WindenAutocomplete?.getClassData?.();
            const classes = data?.classes ?? [];
            if (classes.length === 0) return { suggestions: [] };

            // A class can be worn by a breakpoint and any number of variants —
            // `md:hover:bg-red-500` — but only the last segment names a class,
            // and the list holds class names alone. Matching on the whole
            // token left everything prefixed with no suggestions at all:
            // nothing in the list starts with `md:`. The prefix stays out of
            // the replaced range too, so accepting one keeps it.
            const prefixEnd = token.lastIndexOf(':') + 1;
            const query = token.slice(prefixEnd).toLowerCase();

            const range = new monaco.Range(
                position.lineNumber,
                position.column - (token.length - prefixEnd),
                position.lineNumber,
                position.column
            );

            // Narrowed here before it is capped, never the other way round.
            // The list arrives alphabetically and runs past 23,000 on an
            // ordinary site, so handing Monaco a blind first-5,000 to filter
            // stopped inside `border-…`: `flex`, `p-4`, `text-xl` and every
            // class the user defined were not in the list it got to look at,
            // and `p-` came back offering `bg-pink-100`.
            const MAX_SUGGESTIONS = 200;
            const startsWith: string[] = [];
            const contains: string[] = [];
            for (const className of classes) {
                const lower = className.toLowerCase();
                if (lower.startsWith(query)) {
                    startsWith.push(className);
                    // Exact matches come first alphabetically often enough,
                    // and a full page of them is already more than anyone
                    // reads — but keep scanning for them, never stop early on
                    // the weaker `contains` half.
                    if (startsWith.length >= MAX_SUGGESTIONS) break;
                } else if (query && contains.length < MAX_SUGGESTIONS && lower.includes(query)) {
                    contains.push(className);
                }
            }

            // Monaco still ranks what it is given; this only decides what is
            // in the room.
            //
            // `incomplete` is what keeps the room current. Monaco otherwise
            // asks once — on the trigger character — and filters that answer
            // for the rest of the word. Typing `md:` triggers on the colon,
            // when the query is still empty and the answer is the first 200
            // classes alphabetically; `text-x` then filtered a list that never
            // had `text-xl` in it and the suggestions simply stopped coming.
            return {
                incomplete: true,
                suggestions: [...startsWith, ...contains]
                    .slice(0, MAX_SUGGESTIONS)
                    .map((className) => ({
                        label: className,
                        kind: monaco.languages.CompletionItemKind.Value,
                        insertText: className,
                        range,
                    })),
            };
        },
    });
}

let emmetLoaded = false;

/**
 * Monaco tokenizes newly-set content lazily — the view paints the plain text
 * first and colors it in once the tokenizer catches up a frame later, which
 * on a small editor reads as a white-then-colored flash on every selection.
 * `tokenization.forceTokenization` (used by Monaco's own "Force Retokenize"
 * command) isn't part of the public API surface, hence the cast; it's a
 * nicety, so a Monaco version that drops it just means the flash comes back,
 * not a crash.
 */
function forceTokenize(editor: monaco.editor.IStandaloneCodeEditor): void {
    const model = editor.getModel();
    if (!model) return;
    try {
        (model as unknown as { tokenization: { forceTokenization: (lineNumber: number) => void } })
            .tokenization.forceTokenization(model.getLineCount());
    } catch {
        /* best-effort */
    }
}

/**
 * The formatter indents; it does not break lines.
 *
 * Its default is `wrapLineLength: 120`, which cut a paragraph across five
 * physical lines. That reads as five lines to everything that works on one:
 * Home and Shift+End take the first of them, and deleting what looks like
 * "the paragraph" left the rest of the sentence behind as loose text with a
 * stray `</p>` after it — three blocks where there had been one. A newline
 * mid-sentence is also a `<br>` waiting to happen: `inlineHtml` collapses
 * them on the way back, but nothing should be putting them there to begin
 * with. One block, one line.
 */
function stopHardWrapping(): void {
    const current = htmlDefaults.options ?? {};
    htmlDefaults.setOptions({
        ...current,
        format: {
            ...current.format,
            // Not `0`: the service reads that as "unset" and falls back to its
            // own default. A number no line will reach says "never".
            //
            // Cast because the service's own defaults type every format field
            // as required while declaring them all optional on the way in —
            // spreading what it gave us back is not something it types for.
            wrapLineLength: 1_000_000,
        } as typeof current.format,
    });
}

export function mount(container: HTMLElement, options: MountOptions = {}): MountedEditor {
    if (!emmetLoaded) {
        // `div.card>p.text-sm{Hello}` + Tab, which is how this markup gets
        // written in every other editor
        // emmet-monaco-es types against the full `monaco-editor` namespace;
        // this bundle imports the editor API and the HTML language only
        emmetHTML(monaco as unknown as Parameters<typeof emmetHTML>[0]);
        registerClassCompletion();
        registerLayoutCompletion();
        registerBlockTagCompletion();
        stopHardWrapping();
        emmetLoaded = true;
    }

    const editor = monaco.editor.create(container, {
        value: options.value ?? '',
        language: 'html',
        // A dark box inside a white modal reads as broken, so this follows
        // whatever the block editor is wearing
        theme: options.theme ?? (document.body.classList.contains('is-dark-theme') ? 'vs-dark' : 'vs'),
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        fontSize: 13,
        lineNumbers: 'on',
        renderLineHighlight: 'none',
        scrollbar: { alwaysConsumeMouseWheel: false },
        // The modal is small; a suggest widget with docs attached fills it
        suggest: { showWords: false },
        quickSuggestions: { other: true, comments: false, strings: true },
    });
    forceTokenize(editor);

    /**
     * Set while the text is being replaced from code, so the caret landing at
     * 1:1 is not read as someone moving it — and so the formatter can tell a
     * reload from a keystroke.
     *
     * The panel follows the caret: move through the markup and the block is
     * selected. But `setValue` moves the caret too, to the top — so a reload
     * selected whatever is on the first line, which changed the selection,
     * which reloaded the panel for *that* block. Measured with a Columns block
     * open: the panel came back holding `<p>Left</p>`, and the edit that had
     * just been written was gone.
     */
    let settingValue = false;
    /** Set once somebody has actually typed, which the formatter must not run over */
    let userEdited = false;
    /** Set while the formatter is running, so its own reflow is not read as typing */
    let formatting = false;

    editor.onDidChangeModelContent(() => {
        if (!settingValue && !formatting) userEdited = true;
    });

    const runFormat = (): Promise<void> => Promise.resolve(
        editor.getAction('editor.action.formatDocument')?.run()
    ).catch(() => { /* formatter is a nicety */ });

    if (options.format && options.value) {
        // Serialized block markup is one long line, so it opens readable
        // rather than as a wall.
        //
        // As soon as the formatter will answer, not on a timer. The provider
        // arrives with a dynamic import of the HTML mode, so the first attempt
        // can land before it is there and do nothing at all — which is what
        // the 250ms wait was standing in for, and what made the markup visibly
        // reflow a beat after it appeared. Retrying on "nothing happened"
        // closes that gap without guessing at a number.
        //
        // And it never runs over someone who has started typing: reflowing the
        // document under the caret moves the text out from under them, and the
        // baseline it takes afterwards would swallow the edit — the panel
        // compares against it to decide there is nothing to apply.
        const attempt = async (tries: number): Promise<void> => {
            if (userEdited) return;

            const before = editor.getValue();
            formatting = true;
            await runFormat();
            formatting = false;

            // It did something, or there is nothing left to wait for
            if (editor.getValue() !== before || tries <= 0) return;

            await new Promise((resolve) => { setTimeout(resolve, 100); });
            return attempt(tries - 1);
        };

        attempt(12).then(() => options.onFormatted?.());
    } else {
        // Nothing to reformat, so the baseline is what was handed over
        setTimeout(() => options.onFormatted?.(), 0);
    }

    if (options.onChange) {
        editor.onDidChangeModelContent(() => options.onChange?.(editor.getValue()));
    }

    /**
     * Set while the text is being replaced from code, so the caret landing at
     * 1:1 is not read as someone moving it.
     *
     * The panel follows the caret: move through the markup and the block is
     * selected. But `setValue` moves the caret too, to the top — so a reload
     * selected whatever is on the first line, which changed the selection,
     * which reloaded the panel for *that* block. Measured with a Columns block
     * open: the panel came back holding `<p>Left</p>`, and the edit that had
     * just been written was gone.
     */
    /* settingValue is declared above, beside the formatter that reads it */

    if (options.onCursorLine) {
        editor.onDidChangeCursorPosition((event) => {
            if (settingValue) return;
            options.onCursorLine?.(event.position.lineNumber);
        });
    }

    if (options.onFocus) editor.onDidFocusEditorText(() => options.onFocus?.());
    if (options.onBlur) editor.onDidBlurEditorText(() => options.onBlur?.());

    // One collection, replaced each time: decorations do not stack up and there
    // is nothing to clean up when the block changes
    const marks = editor.createDecorationsCollection();
    let marked: { start: number; end: number } | null = null;

    const mounted: MountedEditor = {
        getValue: () => editor.getValue(),
        getHighlight: () => marked,
        getCaretLine: () => editor.getPosition()?.lineNumber ?? null,
        highlight: (range, options) => {
            marked = range;
            if (!range) {
                marks.clear();
                return;
            }

            // The caret follows the block when asked, to the first thing on
            // its first line; without focus, so List View keeps the keyboard.
            // The cursor event this raises selects the block the caret is
            // in — the one already selected — and stops there.
            if (options?.caret) {
                const column = editor.getModel()?.getLineFirstNonWhitespaceColumn(range.start) || 1;
                editor.setPosition({ lineNumber: range.start, column });
            }

            marks.set([{
                range: new monaco.Range(range.start, 1, range.end, 1),
                options: {
                    isWholeLine: true,
                    className: 'winden-html-dock-mark',
                    // The line numbers say which block too, without the eye
                    // having to find the shading first
                    linesDecorationsClassName: 'winden-html-dock-mark-gutter',
                },
            }]);
            editor.revealLinesInCenterIfOutsideViewport(range.start, range.end);
        },
        setValue: (value: string, options?: { format?: boolean }) => {
            settingValue = true;
            editor.setValue(value);
            forceTokenize(editor);
            // Long enough for the cursor events this caused, short enough that
            // the next real keystroke counts
            window.setTimeout(() => { settingValue = false; }, 150);
            if (options?.format === false) return Promise.resolve();

            // The worker needs the new model before it can format it
            return new Promise<void>((resolve) => setTimeout(resolve, 50)).then(runFormat);
        },
        focus: () => editor.focus(),
        layout: () => editor.layout(),
        // The model was created by `editor.create`, so the editor owns it —
        // disposing it here first left Monaco reading a dead model on teardown
        dispose: () => {
            if (win.windenHtmlEditor?.current === mounted) win.windenHtmlEditor.current = null;
            editor.dispose();
        },
    };

    if (win.windenHtmlEditor) win.windenHtmlEditor.current = mounted;
    return mounted;
}

win.windenHtmlEditor = { mount, current: null };

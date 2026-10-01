/**
 * Gutenberg Winden Classes Integration
 *
 * Mounts the class editor twice against the native className attribute (the
 * same value as "Additional CSS class(es)"): a plugin sidebar carrying the
 * visual helper plus the textarea, and a textarea-only copy in the block
 * inspector. Uses vanilla JS - no React needed.
 */

import './index.scss';

// Import core split mode utilities
import {
    syncToSplitTextareas,
    combineFromSplitTextareas,
} from '../core/split-mode';

// Visual class helper (DevTools-style property groups)
import { HelperPanel } from './helper/HelperPanel';
import { findUnknownClasses } from '../core/class-validation';
import { previewOverriddenUtilities } from '../core/helper-state';
import { explainClasses } from '../core/class-explanation';
import { findOverriddenClasses, forceClass, expectedBeside, mediaHolds, withVariantSiblings } from '../core/class-override';
import { htmlToBlockSeeds, stripGeneratedClasses, rootClassName, withRootClassName, preservedTag, componentOpenTag, componentContentAttribute, blockNameForTag, attributeToKebab, layoutValue, topLevelIndexAtLine, targetsAtLine, topLevelLineRange, lineRangeOfTarget, LAYOUT_ATTRIBUTE, PRESERVED_REF, PRESERVED_BLOCK } from '../core/html-to-blocks';
import { HTML_ATTRIBUTES_KEY } from '../../blocks/shared/html-attributes';
import { RuleTooltip, HOVER_DELAY_MS } from './helper/RuleTooltip';
import { getHelperIcon } from './helper/icons';
import { HELPER_SCHEMA } from '../core/helper-schema';
import { findComponentClasses } from '../core/component-classes';

(function() {
    'use strict';

    // Prevent duplicate initialization
    if (window.__windenClassesGutenbergInitialized) {
        return;
    }
    window.__windenClassesGutenbergInitialized = true;

    const { addFilter, removeFilter } = wp.hooks;
    const { createElement, Fragment, useState, useEffect, useRef } = wp.element;
    const { createHigherOrderComponent } = wp.compose;
    const { InspectorControls } = wp.blockEditor;

    const breakpoints = window.windenGutenbergClasses?.breakpoints || ['sm', 'md', 'lg', 'xl', '2xl'];


    /** The canvas iframe's document — where the compiled Tailwind actually lives */
    function canvasDocument() {
        const iframe = document.querySelector('iframe[name="editor-canvas"]')
            || document.querySelector('iframe.block-editor-iframe');
        if (!iframe) return null;
        try {
            return iframe.contentDocument || iframe.contentWindow?.document || null;
        } catch {
            return null;
        }
    }

    /**
     * Alt/Option+click on a canvas block: Gutenberg selects it as usual, then
     * the caret goes to its classes textarea instead of staying in the canvas.
     *
     * Acts on `click`, not `mousedown`: by then the browser has already put
     * focus in the canvas, so ours is the last word. The textarea is looked up
     * rather than reached through the panel, since the panel for the newly
     * selected block may not have rendered yet — it is retried for a few frames.
     *
     * The canvas iframe's document is replaced when the canvas is rebuilt
     * (device preview, template mode), and its events never reach this
     * document, so the listener is re-attached on DOM changes and iframe loads;
     * addEventListener ignores duplicates.
     */
    function focusClassesOnAltClick() {
        const focusTextarea = (framesLeft) => {
            const textarea = document.querySelector('.winden-classes-inspector textarea.winden-textarea-input');
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                return;
            }
            if (framesLeft > 0) {
                requestAnimationFrame(() => focusTextarea(framesLeft - 1));
            }
        };
        const onClick = (event) => {
            if (!event.altKey) return;
            setTimeout(() => focusTextarea(10), 0);
        };
        const attach = () => {
            const iframe = document.querySelector('iframe[name="editor-canvas"]');
            if (!iframe) return;
            iframe.addEventListener('load', attach);
            canvasDocument()?.addEventListener('click', onClick, true);
        };
        attach();
        new MutationObserver(attach).observe(document.body, { childList: true, subtree: true });
    }
    focusClassesOnAltClick();

    /**
     * One opener for two trees: the block toolbar renders inside the block, the
     * modal inside the plugin, and neither can reach the other's state.
     */
    const htmlBlocksListeners = new Set();
    const openHtmlBlocks = () => htmlBlocksListeners.forEach((listen) => listen());

    /**
     * Monaco, fetched the first time the modal opens.
     *
     * It is not enqueued: the bundle is ~4 MB, and the block editor loads on
     * every post edit while this modal opens in a minority of them.
     */
    const HTML_EDITOR_ASSETS = window.windenGutenbergClasses?.htmlEditor;
    let htmlEditorPromise = null;

    function loadHtmlEditor() {
        if (window.windenHtmlEditor) return Promise.resolve(window.windenHtmlEditor);
        if (htmlEditorPromise) return htmlEditorPromise;
        if (!HTML_EDITOR_ASSETS?.script) {
            return Promise.reject(new Error('The HTML editor has not been built.'));
        }

        htmlEditorPromise = new Promise((resolve, reject) => {
            if (HTML_EDITOR_ASSETS.style && !document.getElementById('winden-html-editor-css')) {
                const link = document.createElement('link');
                link.id = 'winden-html-editor-css';
                link.rel = 'stylesheet';
                link.href = HTML_EDITOR_ASSETS.style;
                document.head.appendChild(link);
            }

            const script = document.createElement('script');
            script.src = HTML_EDITOR_ASSETS.script;
            script.onload = () => {
                if (window.windenHtmlEditor) resolve(window.windenHtmlEditor);
                else reject(new Error('The HTML editor loaded but registered nothing.'));
            };
            script.onerror = () => reject(new Error('The HTML editor could not be loaded.'));
            document.head.appendChild(script);
        });

        return htmlEditorPromise;
    }

    /**
     * The blocks this converter can rebuild from markup — anything it emits.
     *
     * Everything else is not its HTML. A Query Loop keeps its query in
     * attributes no markup carries, `core/navigation` saves nothing at all, and
     * `core/columns` would come back as nested groups with the column widths
     * gone. Rebuilding those from HTML is silent destruction.
     */
    /** Registered with core so it shows in the Keyboard Shortcuts help modal */
    const HTML_BLOCKS_SHORTCUT = 'winden/html-to-blocks';

    const RECONSTRUCTIBLE = new Set([
        'core/group',
        'core/paragraph',
        'core/heading',
        'core/list',
        'core/list-item',
        // A bare <img> is the Winden image; core's own
        // <figure class="wp-block-image"> is core/image, and the gallery is a
        // figure of those. That class is the whole difference between them,
        // which is why it survives `stripGeneratedClasses`.
        'winden/image',
        // One inline element — `<time>`, `<span>`, `<code>` — standing where a
        // block goes. It is exactly its markup, so it round trips as markup.
        'winden/text',
        'core/image',
        'core/gallery',
        // `core/buttons` and `core/button` are deliberately absent. They were
        // here, and nothing ever emitted them: no rule in `html-to-blocks.ts`
        // produces either, so the claim bought them no markup and cost them
        // the marker that would have kept them safe. Measured — a Buttons
        // block holding one Button came back as
        // `group > group > paragraph`, with the button's own block gone and
        // its text left as a bare `<a>`.
        //
        // Out of this set they are markers, which is lossless, and writable as
        // `<core-buttons>`. Teaching the converter `wp-block-buttons` the way
        // `wp-block-image` is taught would let them be markup again — the
        // class is the only thing that identifies them — but the claim has to
        // come with the rule.
        // The SVG a component library shipped, kept as markup. `core/icon`
        // is deliberately absent: it holds a *name* from the icon registry,
        // so it is not its markup and there is no rule emitting it.
        'winden/icon',
        'core/table',
        'core/separator',
        'core/quote',
        'core/code',
        'core/preformatted',
        'core/html',
    ]);

    /**
     * Blocks written as a component tag rather than as their markup.
     *
     * A Columns block saves a `<div class="wp-block-columns">` whose widths
     * live in inline styles and whose every other setting core writes as a
     * class at save time. Reading that back is archaeology, and the nested
     * `<div>`s it flattens to are not the block that was there — measured: a
     * two-column row came back as a group holding two Winden Groups.
     *
     * So it is written as what it is — `<core-columns is-stacked-on-mobile>` —
     * and its children stay editable markup inside it, which a marker cannot
     * offer. Opt-in per block on purpose: the vocabulary is only worth its
     * noise where plain HTML would lie.
     */
    const COMPONENT_BLOCKS = new Set([
        'core/columns',
        'core/column',
        // Everything a Buttons block is lives outside its markup once the
        // generated classes are stripped: `wp-block-buttons` and
        // `wp-block-button` are the only thing naming either block, and
        // `wp-element-button` plus the colour classes are the block's own
        // doing. Left as markup it came back as `group > group > paragraph`.
        'core/buttons',
        'core/button',
    ]);

    /**
     * The block a component tag names — any block that is registered and is
     * not already its own markup.
     *
     * Wider than `COMPONENT_BLOCKS` on purpose, because the two directions
     * carry different risk. Writing a tag *builds* a block from attributes:
     * nothing existed before, so nothing can be lost, and a Post Title or a
     * Query Loop is reachable from the keyboard like anything else. Emitting
     * an existing block as a tag means serializing its every attribute, and
     * one missed is one lost — which is why that side stays curated and
     * everything else is handed back untouched as a marker.
     *
     * `RECONSTRUCTIBLE` blocks are excluded: those *are* their markup. Write
     * `<p>`, not `<core-paragraph>` — and a paragraph's text is a source
     * attribute with no inner blocks to put it in, so the tag would drop it.
     *
     * The registry check is what keeps a pasted `<my-widget>` custom HTML:
     * `my/widget` is not a block, so the tag names nothing.
     */
    function blockForTag(tag) {
        const name = blockNameForTag(tag);
        if (!name || RECONSTRUCTIBLE.has(name)) return null;
        return wp.blocks.getBlockType?.(name) ? name : null;
    }

    /** What the block itself declares — attribute types for coercion, and the parent rule */
    function blockSchema(name) {
        const type = wp.blocks.getBlockType?.(name);
        if (!type) return null;
        return { attributes: type.attributes || {}, parent: type.parent || null };
    }

    const CONVERT_OPTIONS = { blockForTag, blockSchema };

    /**
     * The vocabulary, described for the HTML editor's autocomplete.
     *
     * Nobody can guess `<core-columns is-stacked-on-mobile>`, and a tag you
     * have to already know is a tag nobody writes. The editor is a separate
     * bundle with no access to the block registry, so the description is put
     * on the global it already reads its class data from.
     *
     * Anything with a shape is left out: it has no attribute spelling and
     * belongs in `data-wp-attrs`, which is offered separately. So are
     * `className` and `anchor`, which are `class` and `id` here — Monaco
     * offers those already, and suggesting `class-name` would teach a spelling
     * that does not work.
     *
     * Attributes with a `source` stay in. They are parsed from markup
     * normally, but a block written as a tag *has* no markup — a Button's text
     * and href have nowhere else to live, so the tag has to be able to say
     * them.
     */
    const VOCABULARY_SCALARS = new Set(['string', 'number', 'integer', 'boolean', 'rich-text']);
    // Editor bookkeeping rather than anything the markup decides
    const VOCABULARY_SKIP = new Set(['className', 'anchor', 'lock', 'metadata']);

    /**
     * The children a block arrives with, the way the inserter gives them.
     *
     * Choosing Columns in Gutenberg does not hand you an empty Columns block —
     * it comes with its columns already in it, and typing the pair out by hand
     * is the work this vocabulary was meant to save. The block's own
     * `example.innerBlocks` is that template: two columns, a tab list beside
     * its panels, three social links. `allowedBlocks` stands in where there is
     * no example but only one thing may go inside.
     *
     * Only children that are tags themselves are scaffolded. A Cover's example
     * holds a paragraph, and a paragraph is markup here — `<p>` — so the space
     * is left as a tabstop rather than filled with a tag that should not exist.
     */
    const TEMPLATE_DEPTH = 3;

    function childTemplate(name, depth = 0) {
        if (depth >= TEMPLATE_DEPTH) return [];

        const type = wp.blocks.getBlockType?.(name);
        if (!type) return [];

        const example = type.example?.innerBlocks;
        const children = example?.length
            ? example.map((child) => child.name)
            : (type.allowedBlocks?.length === 1 ? type.allowedBlocks : []);

        return children
            // A paragraph inside a Cover is `<p>`, not a tag: scaffolding one
            // would be teaching the wrong spelling
            .filter((child) => !RECONSTRUCTIBLE.has(child) && wp.blocks.getBlockType?.(child))
            .map((child) => ({
                tag: preservedTag(child),
                children: childTemplate(child, depth + 1),
            }));
    }

    window.windenBlockVocabulary = () => (wp.blocks.getBlockTypes?.() || []).filter((type) => (
        !RECONSTRUCTIBLE.has(type.name)
        // Core's stand-ins for something that went wrong are not a vocabulary
        && !['core/missing', 'core/freeform'].includes(type.name)
    )).map((type) => {
        const name = type.name;
        const attributes = Object.entries(type?.attributes || {})
            .filter(([key, schema]) => {
                if (VOCABULARY_SKIP.has(key)) return false;
                const declared = Array.isArray(schema.type) ? schema.type[0] : schema.type;
                return VOCABULARY_SCALARS.has(declared);
            })
            .map(([key, schema]) => ({
                name: attributeToKebab(key),
                type: Array.isArray(schema.type) ? schema.type[0] : schema.type,
                values: schema.enum ? schema.enum.filter((value) => typeof value === 'string') : null,
            }));

        return {
            tag: preservedTag(name),
            name,
            title: type?.title || name,
            parent: type?.parent || null,
            // Whether reopening shows this tag again or a marker in its place.
            // Worth saying in the list rather than letting it surprise someone.
            emits: COMPONENT_BLOCKS.has(name),
            children: childTemplate(name),
            attributes,
        };
    });

    /** A block the HTML editor can show: as its own markup, or as a component tag */
    function isEditable(name) {
        return RECONSTRUCTIBLE.has(name) || COMPONENT_BLOCKS.has(name);
    }

    /**
     * The blocks to serialize for one block of the document: itself where its
     * markup is honest, a `<core-columns>` open tag and a close tag around its
     * children where it is not, and a `<core-query data-ref="0">` marker where
     * there is nothing to show — with the original kept aside under the index
     * the marker names.
     *
     * A list rather than a block, because a component tag is three siblings:
     * nothing serializes to an open tag, a subtree and a close tag on its own.
     *
     * Every stand-in is a `core/html` block, that being the one block whose
     * saved markup is whatever it is handed — so it survives serialization
     * untouched.
     */
    /**
     * A block that serializes to nothing at all.
     *
     * A Winden image before a file is chosen saves no `<img>`, and an empty
     * Custom HTML saves no markup — both are legitimate states of a block
     * someone is midway through setting up. Their markup being empty meant
     * they were simply absent from the code, and on a whole-page apply the
     * rebuild had nothing to rebuild them from, so they were deleted. Measured
     * on the test page: `winden/image` 1 → 0.
     */
    function savesNothing(block) {
        if (block.innerBlocks?.length) return false;

        try {
            return wp.blocks.getBlockContent(block).trim() === '';
        } catch {
            return false;
        }
    }

    function stagedBlocks(block, preserved) {
        // A component tag has to hold its children as markup, and no single
        // block serializes to an open tag, a subtree and a close tag — so it
        // is staged as three siblings. `getBlockContent` concatenates them in
        // order, which nests the text correctly.
        if (COMPONENT_BLOCKS.has(block.name)) {
            const tag = preservedTag(block.name);
            const schema = blockSchema(block.name);
            const open = componentOpenTag(block.name, block.attributes || {}, schema);

            // A Button's label is an attribute, not a child. Written between
            // the tags it is where anyone would look for it, and it is where
            // the way back reads it from — `text="…"` on the open tag was
            // read-only in practice: typing the label between the tags made a
            // paragraph inside the button instead.
            const content = componentContentAttribute(schema);
            const written = content ? String((block.attributes || {})[content] ?? '') : '';

            return [
                rawHtmlBlock(open),
                ...(written ? [rawHtmlBlock(written)] : []),
                ...(block.innerBlocks || []).flatMap((inner) => stagedBlocks(inner, preserved)),
                rawHtmlBlock(`</${tag}>`),
            ];
        }

        // Not "cannot be rebuilt" but "has nothing to show": either way the
        // markup cannot carry it, and a marker is how this says so
        if (!RECONSTRUCTIBLE.has(block.name) || savesNothing(block)) {
            const ref = String(preserved.length);
            preserved.push(block);
            const tag = preservedTag(block.name);
            return [rawHtmlBlock(`<${tag} ${PRESERVED_REF}="${ref}"></${tag}>`)];
        }

        return [{
            ...block,
            attributes: withLayoutAttribute(block),
            innerBlocks: (block.innerBlocks || []).flatMap((inner) => stagedBlocks(inner, preserved)),
        }];
    }

    /**
     * A `core/html` block that actually carries its markup.
     *
     * `core/html` saves nothing of its own — its `save` returns null and the
     * markup rides in `innerContent`, outside `attributes` entirely. So
     * `createBlock('core/html', { content })` serializes to
     * `<!-- wp:html /-->` with the content silently gone, which is how every
     * placeholder marker came out empty: a whole tree of Query Loops and
     * Navigations vanished the moment a container was opened as HTML. The
     * attribute is set as well as `innerContent` because the block's own edit
     * component reads it.
     */
    function rawHtmlBlock(content) {
        return {
            ...wp.blocks.createBlock('core/html', { content }),
            innerContent: [content],
        };
    }

    /**
     * The same group attributes with its variation spelled out in the markup.
     *
     * Row, Stack, Grid and Group are one `layout` attribute and nothing else —
     * the saved `<div class="wp-block-group">` is byte for byte the same for
     * all four, because core adds the layout classes when it renders, not when
     * it saves. Without this the variation is silently reset to a plain group
     * by the trip through HTML. It is written as `data-wp-layout`, the same
     * attribute the converter reads on the way back in, through
     * `htmlAttributes` so it lands on the element the block already saves.
     */
    function withLayoutAttribute(block) {
        if (block.name !== 'core/group') return block.attributes;

        // The name where the name is the whole story, the layout written out
        // where it is not: `constrained` alone lost `justifyContent`, which
        // shows up on the front end as `is-content-justification-center`
        // simply no longer being emitted
        const value = layoutValue(block.attributes?.layout);
        if (!value) return block.attributes;

        return {
            ...block.attributes,
            [HTML_ATTRIBUTES_KEY]: {
                ...(block.attributes?.[HTML_ATTRIBUTES_KEY] || {}),
                [LAYOUT_ATTRIBUTE]: value,
            },
        };
    }

    /**
     * A seed back into a real block — the other half of `stagedBlocks`.
     *
     * `preserved` is the aside that `blockMarkup` filled: a marker names an
     * index in it rather than describing a block, because a Query Loop cannot
     * be described in markup at all.
     */
    function buildSeed(seed, preserved) {
        if (seed.name === PRESERVED_BLOCK) {
            const original = preserved[Number(seed.attributes.ref)];
            if (!original) {
                throw new Error(`<${seed.attributes.blockName}> no longer names a block that was here`);
            }
            // Cloned, so the tree gets fresh client IDs the way every other
            // block in it does
            return wp.blocks.cloneBlock(original);
        }

        // Custom HTML is the one block whose markup lives outside
        // `attributes`, so it cannot be built the way the rest are
        if (seed.name === 'core/html') {
            return rawHtmlBlock(String(seed.attributes.content ?? ''));
        }

        return wp.blocks.createBlock(
            seed.name,
            seed.attributes,
            (seed.innerBlocks || []).map((inner) => buildSeed(inner, preserved))
        );
    }

    /**
     * The markup a block saves — the same HTML this modal turns back into
     * blocks. Inner blocks come back wrapped in `<!-- wp:paragraph -->`
     * delimiters, which are Gutenberg's bookkeeping rather than markup anyone
     * would edit, so they are dropped; the block tree is rebuilt from the HTML
     * on the way back regardless.
     */
    function blockMarkup(block, preserved) {
        try {
            if (!block) return '';
            const saved = stagedBlocks(block, preserved)
                .map((staged) => wp.blocks.getBlockContent(staged))
                .join('')
                .replace(/<!--\s*\/?\s*wp:[\s\S]*?-->/g, '')
                // Each removed delimiter leaves its own blank line behind
                .replace(/\n{2,}/g, '\n');
            return stripGeneratedClasses(saved);
        } catch {
            return '';
        }
    }

    /**
     * The tag a block writes, so an element in the markup can be traced back
     * to the block that wrote it.
     *
     * Only what the converter itself emits. A block whose tag depends on
     * content it does not carry — `core/html` is whatever was typed into it —
     * answers null and is matched by an ancestor instead.
     */
    function tagOfBlock(block) {
        const attributes = block.attributes ?? {};
        switch (block.name) {
            case 'core/heading': return `h${attributes.level ?? 2}`;
            case 'core/paragraph': return 'p';
            case 'core/group': return attributes.tagName ?? 'div';
            case 'core/list': return attributes.ordered ? 'ol' : 'ul';
            case 'core/list-item': return 'li';
            case 'core/quote': return 'blockquote';
            case 'core/code': return 'pre';
            case 'core/preformatted': return 'pre';
            case 'core/separator': return 'hr';
            case 'core/table': return 'table';
            case 'winden/icon': return 'svg';
            case 'winden/image': return 'img';
            case 'core/image': return 'figure';
            case 'core/gallery': return 'figure';
            default: return COMPONENT_BLOCKS.has(block.name) ? preservedTag(block.name) : null;
        }
    }

    /**
     * The block an element in the markup came from.
     *
     * Matched on tag and classes, and on *which* of the ones alike it is —
     * three identical cards are three blocks, and the caret is in one of them.
     * The targets arrive innermost first, so the deepest block that can be
     * recognised wins; a caret inside an `<a>` resolves to the paragraph
     * holding it, which is the block anyone would expect to be selected.
     */
    function blockAtTargets(roots, targets) {
        const flat = [];
        const walk = (blocks) => blocks.forEach((block) => {
            flat.push(block);
            walk(block.innerBlocks || []);
        });
        walk(roots);

        for (const target of targets) {
            const alike = flat.filter((block) => (
                tagOfBlock(block) === target.tag
                && (block.attributes?.className ?? '').trim() === target.className
            ));
            const found = alike[target.occurrence] ?? (alike.length === 1 ? alike[0] : null);
            if (found) return found.clientId;
        }

        return null;
    }

    /**
     * The other way round: how a block is recognised in the markup.
     *
     * The same triple `blockAtTargets` matches on — tag, classes, and which
     * one among the blocks alike — so that a block picked in List View lands
     * on the very element the caret would have selected it from. Null for a
     * block with no markup of its own (a marker, an opaque block).
     */
    function targetOfBlock(roots, clientId) {
        const flat = [];
        const walk = (blocks) => blocks.forEach((block) => {
            flat.push(block);
            walk(block.innerBlocks || []);
        });
        walk(roots);

        const block = flat.find((candidate) => candidate.clientId === clientId);
        const tag = block ? tagOfBlock(block) : null;
        if (!tag) return null;

        const className = (block.attributes?.className ?? '').trim();
        const alike = flat.filter((other) => (
            tagOfBlock(other) === tag
            && (other.attributes?.className ?? '').trim() === className
        ));
        return { tag, className, occurrence: Math.max(0, alike.indexOf(block)) };
    }

    /**
     * The classes the page refuses to honour, forced — for a whole tree at once.
     *
     * The panel measures one selected block and offers `absolute!` for what
     * the editor's unlayered CSS overrules. A pasted hero has thirty blocks,
     * and touring them one by one to press the same button is what this
     * replaces: after the canvas has rendered the new blocks and the watcher
     * has compiled their classes, every block is measured the same way and
     * the losers are rewritten with their `!`. Only genuine overrides: a class
     * beaten by another of the user's own (`overriddenBy`) is left as the
     * user wrote it, and variants (`md:flex`) cannot be measured so are not
     * touched.
     */
    /**
     * `sm:grid-cols-2` beside `grid-cols-1!`, forced so the media query counts.
     *
     * Pure string work — no canvas, no measuring — so it runs on every apply,
     * including a whole page, where the measuring pass is skipped for being a
     * `getComputedStyle` per class per block. It repairs what is already
     * written as well as what has just been forced: a document carrying
     * `grid-cols-1!` next to an untouched `lg:grid-cols-4` renders as one
     * column at every width until the variant is forced too.
     */
    async function carryVariants(blocks) {
        const doc = canvasDocument();
        if (!doc) return;

        const { updateBlockAttributes } = wp.data.dispatch('core/block-editor');
        const { getBlock } = wp.data.select('core/block-editor');

        const flat = [];
        const walk = (list) => list.forEach((block) => { flat.push(block); walk(block.innerBlocks || []); });
        walk(blocks);

        for (const block of flat) {
            const className = getBlock(block.clientId)?.attributes?.className;
            if (!className || !className.includes('!')) continue;

            const names = className.split(/\s+/).filter(Boolean);
            // What is already forced, named as the class it forces
            const already = names.filter((name) => name.endsWith('!')).map((name) => name.slice(0, -1));
            if (already.length === 0) continue;

            // Async, and it reads the canvas stylesheet: called without the
            // document it hands back a promise whose `.get` is undefined, and
            // every lookup silently misses
            let explanations;
            try {
                explanations = await explainClasses(names.map((name) => name.replace(/!$/, '')), doc);
            } catch {
                continue;
            }
            const carried = withVariantSiblings(
                names.map((name) => name.replace(/!$/, '')).join(' '),
                explanations,
                already
            );

            const next = names
                .map((name) => (carried.has(name.replace(/!$/, '')) ? forceClass(name) : name))
                .join(' ');
            if (next !== className) updateBlockAttributes(block.clientId, { className: next });
        }
    }

    async function forceOverriddenClasses(blocks) {
        const doc = canvasDocument();
        const win = doc?.defaultView;
        if (!doc || !win) return;

        // Let React paint the blocks, then make sure their classes are compiled
        // into the canvas — measuring before that reports every class as
        // overridden, because none of them has a rule yet
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (typeof win.compile === 'function') {
            try { await win.compile(); } catch { /* the watcher logs its own errors */ }
        }
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));

        const flat = [];
        const walk = (list) => list.forEach((block) => { flat.push(block); walk(block.innerBlocks || []); });
        walk(blocks);

        const { updateBlockAttributes } = wp.data.dispatch('core/block-editor');
        const { getBlock } = wp.data.select('core/block-editor');

        for (const block of flat) {
            // Custom HTML is not rendered as a block; its classes belong to
            // markup the canvas shows in a code box
            if (block.name === 'core/html') continue;
            const current = getBlock(block.clientId);
            const className = current?.attributes?.className;
            if (!className) continue;

            const element = doc.querySelector(`[data-block="${block.clientId}"]`);
            if (!element) continue;

            const names = className.split(/\s+/).filter(Boolean);
            let explanations;
            try {
                explanations = await explainClasses(names, doc);
            } catch {
                continue;
            }
            const style = win.getComputedStyle(element);
            const overridden = findOverriddenClasses(
                className,
                explanations,
                (property) => style.getPropertyValue(property).trim(),
                expectedBeside(element),
                mediaHolds(element)
            ).filter((entry) => !entry.overriddenBy);
            if (window.windenDebug) console.debug('[Winden] overrides', block.name, className, JSON.stringify(overridden));
            if (overridden.length === 0) continue;

            // …and the variants of whatever is forced, or `!important` on the
            // base class quietly beats every `sm:` and `lg:` rule beside it
            const forced = withVariantSiblings(
                className,
                explanations,
                overridden.map((entry) => entry.className)
            );
            const next = names.map((name) => (forced.has(name) ? forceClass(name) : name)).join(' ');
            if (next !== className) updateBlockAttributes(block.clientId, { className: next });
        }
    }

    /**
     * The panel header: the title, and at its far end the two halves of a
     * component library — save the classes on this block as one, or put a
     * saved one on this block. Icons rather than a labelled button, because
     * the pair reads as a pair and the header has room for nothing wider.
     */
    const SaveComponentIcon = createElement('svg', {
        viewBox: '0 -960 960 960', width: '20', height: '20', fill: 'currentColor', 'aria-hidden': 'true',
    },
        createElement('path', { d: 'M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z' })
    );
    const LoadComponentIcon = createElement('svg', {
        viewBox: '0 -960 960 960', width: '20', height: '20', fill: 'currentColor', 'aria-hidden': 'true',
    },
        createElement('path', { d: 'M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z' })
    );

    const OverriddenIcon = createElement('svg', {
        viewBox: '0 -960 960 960', width: '20', height: '20', fill: 'currentColor', 'aria-hidden': 'true',
    },
        createElement('path', { d: 'm40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Zm40-100Z' })
    );

    // WP's own .components-menu-items__item-icon CSS forces fill: currentColor
    // on a MenuItem icon, which turned a stroke-only lucide check into a solid
    // wedge (the path isn't closed, so filling it draws garbage). The other
    // icons in this file are filled Material Symbols glyphs for that reason —
    // matching them here instead of fighting WP's CSS with a stroke icon.
    const CheckIcon = createElement('svg', {
        viewBox: '0 -960 960 960', width: '20', height: '20', fill: 'currentColor', 'aria-hidden': 'true',
    },
        createElement('path', { d: 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z' })
    );

    /** The component classes the styles declare right now */
    function declaredComponents() {
        const options = (typeof window !== 'undefined' && window.tailwind_compiler_options) || {};
        return findComponentClasses(`${options.custom_css ?? ''}\n${options.style_css ?? ''}`);
    }

    /**
     * Save the current classes as a component class, or load a saved one.
     *
     * The Style Editor has supported `@layer components` all along, but reaching
     * it meant leaving the block and retyping the classes into an `@apply` by
     * hand. Saving writes the rule and puts the block on the new class, so the
     * look has one definition and every later instance follows it. Loading
     * lists what has been saved, so a component is picked rather than recalled.
     */
    function ComponentActions({ title, classString, onSaved, onChange, overridden }) {
        const [name, setName] = useState('');
        const [isNaming, setIsNaming] = useState(false);
        const [error, setError] = useState(null);
        const [isSaving, setIsSaving] = useState(false);
        const inputRef = useRef(null);

        useEffect(() => {
            if (isNaming && inputRef.current) inputRef.current.focus();
        }, [isNaming]);

        const settings = window.windenGutenbergClasses || {};
        // Without a nonce there is nothing to post to; say nothing rather than
        // offering a button that cannot work.
        const canSave = Boolean(settings.ajaxUrl && settings.nonce);

        const save = async () => {
            setIsSaving(true);
            setError(null);
            try {
                const response = await fetch(`${settings.ajaxUrl}?action=winden_save_component_class`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ _nonce: settings.nonce, name: name.trim(), classes: classString.trim() }),
                });
                const result = await response.json();

                if (!result?.success) {
                    setError(typeof result?.data === 'string' ? result.data : 'Could not save that.');
                    return;
                }

                // The page holds its own copy of the styles; without this the
                // rule exists on the server but nothing here can see it until
                // a reload — including the list that offers it back.
                const options = window.tailwind_compiler_options;
                if (options && typeof result.data?.scss === 'string') {
                    options.style_css = result.data.scss;
                    try {
                        if (window.parent && window.parent !== window && window.parent.tailwind_compiler_options) {
                            window.parent.tailwind_compiler_options.style_css = result.data.scss;
                        }
                    } catch {
                        // Cross-origin parent — nothing to update there
                    }
                }

                // The watcher caches style-tab.css in memory from page load, so
                // a bare compile() would reuse that stale copy — the file on
                // disk already has the new component, but reloadFiles is what
                // makes the watcher re-fetch it instead of serving the cache.
                const doc = canvasDocument();
                const win = doc?.defaultView;
                if (typeof win?.compile === 'function') {
                    try { await win.compile({ reloadFiles: true, force: true }); } catch { /* the watcher logs its own errors */ }
                }

                setIsNaming(false);
                setName('');
                onSaved(result.data.name);
            } catch {
                setError('Could not reach the server.');
            } finally {
                setIsSaving(false);
            }
        };

        const { Button, Dropdown, MenuGroup, MenuItem } = wp.components;
        const worn = new Set(classString.split(/\s+/).filter(Boolean));

        // Put the component on the block, or take it off — the same list
        // answers "which of these is it wearing", so the tick doubles as the
        // way back.
        const toggle = (componentName) => {
            const next = worn.has(componentName)
                ? [...worn].filter((token) => token !== componentName)
                : [...worn, componentName];
            onChange(next.join(' '));
        };

        const loadList = ({ onClose }) => {
            const components = declaredComponents();
            if (components.length === 0) {
                return createElement('p', { className: 'winden-load-component-empty' },
                    'No component classes yet. Save the classes on a block as one, and it will be listed here.'
                );
            }
            return createElement(MenuGroup, { className: 'winden-load-component-list', label: 'Component classes' },
                components.map((component) => createElement(MenuItem, {
                    key: component.name,
                    role: 'menuitemcheckbox',
                    isSelected: worn.has(component.name),
                    icon: worn.has(component.name) ? CheckIcon : null,
                    // The applied utilities are how a component is told apart
                    // from its neighbours; the name alone is what this list
                    // exists to spare the user remembering.
                    info: component.applies.length > 0
                        ? component.applies.join(' ')
                        : component.declarations.join('; '),
                    onClick: () => { toggle(component.name); onClose(); },
                }, component.name))
            );
        };

        return createElement(Fragment, null,
            createElement('div', { className: 'winden-classes-container-header' },
                title && WindenIcon,
                title && createElement('h3', null, title),
                createElement('div', { className: 'winden-component-actions' },
                    // Classes the page refuses to honour. Behind an icon rather
                    // than spelled out: the note is long, and a block wearing
                    // `absolute` under Gutenberg's own rules is not an
                    // emergency — the icon says there is something to read,
                    // and the panel stays a panel until it is asked.
                    overridden.count > 0 && createElement(Button, {
                        className: 'winden-overridden-trigger',
                        icon: OverriddenIcon,
                        label: overridden.count === 1
                            ? '1 class is overridden on this element'
                            : `${overridden.count} classes are overridden on this element`,
                        showTooltip: true,
                        size: 'compact',
                        isPressed: overridden.isOpen,
                        'aria-expanded': overridden.isOpen,
                        onClick: overridden.onToggle,
                    }),
                    canSave && createElement(Button, {
                        className: 'winden-save-component-trigger',
                        icon: SaveComponentIcon,
                        label: 'Save classes as a component',
                        showTooltip: true,
                        size: 'compact',
                        isPressed: isNaming,
                        disabled: !classString.trim(),
                        onClick: () => { setIsNaming((open) => !open); setError(null); },
                    }),
                    createElement(Dropdown, {
                        popoverProps: { placement: 'bottom-end', className: 'winden-load-component-popover' },
                        renderToggle: ({ isOpen, onToggle }) => createElement(Button, {
                            className: 'winden-load-component-trigger',
                            icon: LoadComponentIcon,
                            label: 'Load a component class',
                            showTooltip: true,
                            size: 'compact',
                            'aria-expanded': isOpen,
                            onClick: onToggle,
                        }),
                        renderContent: loadList,
                    })
                )
            ),
            isNaming && createElement('div', { className: 'winden-save-component' },
                createElement('input', {
                    ref: inputRef,
                    type: 'text',
                    className: 'winden-save-component-name',
                    value: name,
                    placeholder: 'Component name',
                    onChange: (event) => setName(event.target.value),
                    onKeyDown: (event) => {
                        if (event.key === 'Enter') { event.preventDefault(); save(); }
                        if (event.key === 'Escape') { event.preventDefault(); setIsNaming(false); setError(null); }
                    },
                }),
                createElement('button', {
                    type: 'button',
                    className: 'winden-save-component-confirm',
                    disabled: !name.trim() || isSaving,
                    onClick: save,
                }, isSaving ? 'Saving…' : 'Save'),
                createElement('button', {
                    type: 'button',
                    className: 'winden-save-component-cancel',
                    onClick: () => { setIsNaming(false); setError(null); },
                }, 'Cancel'),
                error && createElement('p', { className: 'winden-save-component-error' }, error)
            )
        );
    }

    /**
     * Fit a textarea to its content. The CSS min-height is the four-row floor,
     * so this only ever grows the box — no dragging the corner to read a long
     * class list, and no stale height left behind when the list shrinks.
     */
    function fitToContent(textarea) {
        if (!textarea) return;
        // scrollHeight covers content and padding but not the border, and the
        // box is border-box — without the borders the last line is clipped.
        const style = window.getComputedStyle(textarea);
        const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight + borders}px`;
    }

    /**
     * Winden Classes Panel Component
     * Uses native className attribute (syncs with "Additional CSS class(es)")
     *
     * `showHelper` controls the visual helper above the textarea. It is on in
     * the plugin sidebar, which has the height for it, and off in the block
     * inspector, where the textarea alone is what the block's own settings
     * should carry.
     */
    /**
     * `measurable` is false when the classes belong to an element inside the
     * block rather than to the block itself — custom HTML. Measuring the block
     * wrapper then answers about the wrong element: it reported an image's
     * `absolute inset-0 size-full` as three overridden classes, and the hover
     * preview styled the code box.
     */
    function WindenClassesPanel({ attributes, setAttributes, clientId, showHelper, title, measurable = true }) {
        const wrapperRef = useRef(null);
        const textareaRef = useRef(null);
        const splitRefs = useRef({});
        const [isSplitMode, setIsSplitMode] = useState(false);
        const [autocompleteInitialized, setAutocompleteInitialized] = useState(false);
        const previewClassRef = useRef(null);
        // Utilities taken off the element for the duration of a preview, so the
        // hovered value is the one the browser resolves. Put back on clear.
        const previewHiddenRef = useRef([]);

        // The class under the pointer, and what it does. The textarea sits on
        // top of the mirror, so the pointer never reaches the spans — they are
        // hit-tested by rectangle instead.
        const [hoveredClass, setHoveredClass] = useState(null);
        const [explanation, setExplanation] = useState(undefined);
        const hoverTimer = useRef(null);
        const pendingHover = useRef(null);

        useEffect(() => () => clearTimeout(hoverTimer.current), []);

        // Use native className attribute
        const className = attributes.className || '';

        // Classes the compiler cannot build. Computed once here and handed to
        // both the textarea mirror and the helper, so a keystroke costs one
        // validation rather than two.
        const [unknownClasses, setUnknownClasses] = useState([]);
        // Classes the page refuses to honour — `absolute` under Gutenberg's own
        // unlayered rules, say. Measured against the block itself, since only
        // the real element knows what actually won.
        const [overridden, setOverridden] = useState([]);
        // The note about them, folded away until its icon is pressed
        const [showOverridden, setShowOverridden] = useState(false);
        const mirrorRef = useRef(null);

        useEffect(() => {
            let current = true;
            const timer = setTimeout(() => {
                findUnknownClasses(className).then((unknown) => {
                    if (current) setUnknownClasses(unknown);
                });

                const doc = canvasDocument();
                const element = measurable ? doc?.querySelector(`[data-block="${clientId}"]`) : null;
                if (!doc || !element) {
                    setOverridden([]);
                    return;
                }

                const names = className.split(/\s+/).filter(Boolean);
                // Measured only once the watcher has compiled the class into the
                // canvas — before that the element has no rule for it and every
                // class reads as overridden. `compile` is the watcher's own,
                // cached by class list, so this costs nothing when it already ran.
                const win = doc.defaultView;
                const compiled = typeof win.compile === 'function'
                    ? Promise.resolve(win.compile()).catch(() => undefined)
                    : Promise.resolve();
                Promise.all([compiled, explainClasses(names, doc)]).then(([, explanations]) => {
                    if (!current || !element.isConnected) return;
                    const style = win.getComputedStyle(element);
                    setOverridden(findOverriddenClasses(
                        className,
                        explanations,
                        (property) => style.getPropertyValue(property).trim(),
                        expectedBeside(element),
                        mediaHolds(element)
                    ));
                });
            }, 500);
            return () => { current = false; clearTimeout(timer); };
        }, [className, clientId, measurable]);

        useEffect(() => {
            fitToContent(textareaRef.current);
        }, [className, isSplitMode, autocompleteInitialized]);

        // The mirror sits behind a transparent textarea, so it has to follow
        // the textarea's scrolling and any height change.
        useEffect(() => {
            const textarea = textareaRef.current;
            const mirror = mirrorRef.current;
            if (!textarea || !mirror) return;

            const syncScroll = () => {
                mirror.scrollTop = textarea.scrollTop;
                mirror.scrollLeft = textarea.scrollLeft;
            };
            const syncSize = () => {
                mirror.style.height = `${textarea.offsetHeight}px`;
            };

            textarea.addEventListener('scroll', syncScroll);
            const observer = new ResizeObserver(syncSize);
            observer.observe(textarea);
            syncSize();

            return () => {
                textarea.removeEventListener('scroll', syncScroll);
                observer.disconnect();
            };
        }, [autocompleteInitialized]);

        // Initialize autocomplete
        useEffect(() => {
            if (autocompleteInitialized || !wrapperRef.current || !textareaRef.current) {
                return;
            }

            const initAutocomplete = () => {
                if (typeof window.WindenAutocomplete === 'undefined') {
                    setTimeout(initAutocomplete, 200);
                    return;
                }

                const autocompleteData = window.winden_autocomplete ||
                    (window.parent && window.parent !== window ? window.parent.winden_autocomplete : null);

                let hasData = false;
                if (Array.isArray(autocompleteData) && autocompleteData.length > 0) {
                    hasData = true;
                } else if (autocompleteData && typeof autocompleteData === 'object' && Object.keys(autocompleteData).length > 0) {
                    hasData = true;
                }

                if (!hasData) {
                    setTimeout(initAutocomplete, 500);
                    return;
                }

                try {
                    if (breakpoints.length > 0) {
                        window.WindenAutocomplete.setBreakpoints(breakpoints);
                    }

                    window.WindenAutocomplete.create({
                        container: wrapperRef.current,
                        input: textareaRef.current,
                        maxSuggestions: 12,
                        dropdownClass: 'wcl-theme-light',
                        onChange: (value) => {
                            setAttributes({ className: value });
                        },
                        onPreview: (previewClass) => {
                            applyPreviewClass(previewClass);
                        }
                    });

                    setAutocompleteInitialized(true);
                } catch (e) {
                    console.error('[Winden Gutenberg] Autocomplete init error:', e);
                }
            };

            initAutocomplete();
        }, [autocompleteInitialized]);

        const handleHoverProbe = (event) => {
            const mirror = mirrorRef.current;
            const wrap = mirror?.parentElement;
            if (!mirror || !wrap) return;

            const { clientX, clientY } = event;
            // getClientRects, not getBoundingClientRect: a class that breaks
            // across two lines has a bounding box spanning both, which would
            // swallow every class on the line below it.
            const token = [...mirror.querySelectorAll('.winden-class-token')].find((span) =>
                [...span.getClientRects()].some((rect) =>
                    clientX >= rect.left && clientX <= rect.right
                    && clientY >= rect.top && clientY <= rect.bottom)
            );

            if (!token) {
                clearTimeout(hoverTimer.current);
                pendingHover.current = null;
                setHoveredClass(null);
                return;
            }

            const name = token.getAttribute('data-class');
            if (hoveredClass?.name === name || pendingHover.current === name) return;

            // Below the whole box rather than under the hovered line: the panel
            // is narrower than the rule is wide, so anchoring to the token
            // would only cover the classes being read. The autocomplete
            // dropdown lives in that spot too, so the rule moves above the box
            // while the dropdown is open rather than fighting it for the space.
            // Only once the pointer settles: moving along a class list would
            // otherwise show a rule for every class it passes over.
            clearTimeout(hoverTimer.current);
            pendingHover.current = name;
            hoverTimer.current = setTimeout(() => {
                const dropdown = document.querySelector('.winden-autocomplete-dropdown');
                setHoveredClass({ name, above: !!dropdown && dropdown.style.display !== 'none' });
            }, HOVER_DELAY_MS);
        };

        // Ask the compiler what the hovered class does, measuring it inside the
        // canvas — the admin page never loads the user's Tailwind.
        const hoveredName = hoveredClass?.name ?? null;
        useEffect(() => {
            if (!hoveredName) {
                setExplanation(undefined);
                return;
            }

            let current = true;
            setExplanation(undefined);
            explainClasses([hoveredName], canvasDocument()).then((explained) => {
                if (current) setExplanation(explained.get(hoveredName) ?? { declarations: [], conditions: [] });
            });
            return () => { current = false; };
        }, [hoveredName]);

        const applyPreviewClass = (previewClass) => {
            const iframeDocument = measurable ? canvasDocument() : null;
            if (!iframeDocument) {
                return;
            }

            const blockElement = iframeDocument.querySelector('[data-block="' + clientId + '"]');
            if (!blockElement) {
                return;
            }

            if (previewClassRef.current) {
                blockElement.classList.remove(previewClassRef.current);
            }
            blockElement.classList.remove('winden-preview');
            previewHiddenRef.current.forEach((utility) => blockElement.classList.add(utility));
            previewHiddenRef.current = [];

            if (previewClass) {
                const overridden = previewOverriddenUtilities(className, previewClass, HELPER_SCHEMA);
                overridden.forEach((utility) => blockElement.classList.remove(utility));
                previewHiddenRef.current = overridden;

                blockElement.classList.add(previewClass);
                blockElement.classList.add('winden-preview');
                previewClassRef.current = previewClass;
            } else {
                previewClassRef.current = null;
            }
        };

        useEffect(() => {
            return () => {
                applyPreviewClass(null);
            };
        }, []);

        // Sync textarea value when className changes externally.
        //
        // Compared trimmed on purpose: accepting a suggestion leaves the caret
        // past a trailing space, and the attribute it just wrote is trimmed —
        // so an exact comparison read its own edit as an external one, rewrote
        // the field without the space and sent the caret to the end. The next
        // class typed then landed against the last, `p-4` and `bg-red-500`
        // arriving as `p-4bg-red-500`.
        useEffect(() => {
            if (textareaRef.current && textareaRef.current.value.trim() !== className && !isSplitMode) {
                textareaRef.current.value = className;
            }
            if (isSplitMode) {
                syncToSplitMode();
            }
        }, [className]);

        // Sync to split mode textareas (uses core utility)
        const syncToSplitMode = () => {
            syncToSplitTextareas(
                className,
                (bp, value) => {
                    if (splitRefs.current[bp]) {
                        splitRefs.current[bp].value = value;
                        fitToContent(splitRefs.current[bp]);
                    }
                },
                breakpoints
            );
        };

        // Combine classes from split textareas (uses core utility)
        const combineClasses = () => {
            return combineFromSplitTextareas(
                (bp) => {
                    return splitRefs.current[bp] ? splitRefs.current[bp].value : '';
                },
                breakpoints
            );
        };

        // Toggle split mode
        const handleToggleSplit = () => {
            if (!isSplitMode) {
                setIsSplitMode(true);
                setTimeout(syncToSplitMode, 0);
            } else {
                const combined = combineClasses();
                setAttributes({ className: combined });
                setIsSplitMode(false);
            }
        };

        // Handle split textarea change
        const handleSplitChange = (event) => {
            fitToContent(event?.target);
            const combined = combineClasses();
            setAttributes({ className: combined });
        };

        // Single mode view
        // Rebuild the class string as spans so the unknown ones can be marked.
        // Whitespace is preserved verbatim: the mirror must wrap exactly as the
        // textarea does or the highlight drifts off the word.
        const unknownSet = new Set(unknownClasses);
        const overriddenMap = new Map(overridden.map((entry) => [entry.className, entry]));
        // Every class is a span, not just the unknown ones: the mirror lays out
        // exactly like the textarea, so these are what the pointer is tested
        // against to know which class it is over.
        const mirrorContent = (className.split(/(\s+)/)).map((part, index) =>
            /^\s+$/.test(part) || !part
                ? part
                : createElement('span', {
                    key: index,
                    className: [
                        'winden-class-token',
                        unknownSet.has(part) ? 'winden-class-unknown' : '',
                        overriddenMap.has(part) ? 'winden-class-overridden' : '',
                    ].filter(Boolean).join(' '),
                    'data-class': part,
                }, part)
        );

        const singleModeView = createElement('div', { className: 'winden-single-mode' },
            createElement('div', { className: 'winden-textarea-wrap' },
                createElement('div', {
                    ref: mirrorRef,
                    className: 'winden-textarea-base winden-textarea-mirror',
                    'aria-hidden': 'true',
                }, mirrorContent),
            createElement('textarea', {
                ref: textareaRef,
                className: 'winden-textarea-base winden-textarea-input',
                defaultValue: className,
                placeholder: 'e.g. bg-blue-500 text-white p-4',
                onChange: (e) => setAttributes({ className: e.target.value }),
                onMouseMove: handleHoverProbe,
                onMouseLeave: () => {
                    clearTimeout(hoverTimer.current);
                    pendingHover.current = null;
                    setHoveredClass(null);
                },
                onScroll: () => {
                    clearTimeout(hoverTimer.current);
                    pendingHover.current = null;
                    setHoveredClass(null);
                },
                spellCheck: false,
                autoComplete: 'off',
                autoCorrect: 'off',
                autoCapitalize: 'off'
            }),
            hoveredClass && createElement(RuleTooltip, {
                className: hoveredClass.name,
                explanation,
                // Under the box, or above it while the autocomplete dropdown
                // is using that space
                extraClass: hoveredClass.above ? 'is-above' : '',
            })
            )
        );

        // Split mode view
        const splitGroups = [
            createElement('div', { key: 'default', className: 'winden-split-group' },
                createElement('div', { className: 'winden-split-label' }, 'Default'),
                createElement('textarea', {
                    ref: (el) => { splitRefs.current[''] = el; },
                    className: 'winden-textarea-base winden-split-textarea',
                    placeholder: 'Classes without breakpoint',
                    onChange: handleSplitChange,
                    spellCheck: false,
                    autoComplete: 'off'
                })
            ),
            ...breakpoints.map(bp =>
                createElement('div', { key: bp, className: 'winden-split-group' },
                    createElement('div', { className: 'winden-split-label' }, bp.toUpperCase()),
                    createElement('textarea', {
                        ref: (el) => { splitRefs.current[bp] = el; },
                        className: 'winden-textarea-base winden-split-textarea',
                        placeholder: `${bp}: classes`,
                        onChange: handleSplitChange,
                        spellCheck: false,
                        autoComplete: 'off'
                    })
                )
            )
        ];

        const splitModeView = createElement('div', { className: 'winden-split-mode' }, splitGroups);

        // Toggle switch (same structure as Plain Classes)
        const toggleSwitch = createElement('label', { className: 'windauto--toggle--label', style: { marginTop: '12px' } },
            createElement('span', { className: `winauto--toggle ${isSplitMode ? 'is-checked' : ''}` },
                createElement('input', {
                    type: 'checkbox',
                    checked: isSplitMode,
                    onChange: handleToggleSplit
                }),
                createElement('span', { className: 'winauto--toggle_dot' })
            ),
            'Split Screens (by breakpoint)'
        );

        return createElement('div', {
            className: 'winden-classes-gutenberg-panel wcl-theme-light',
            ref: wrapperRef
        },
            showHelper && createElement(HelperPanel, {
                value: className,
                onChange: (next) => setAttributes({ className: next }),
                onPreview: applyPreviewClass,
                breakpoints: breakpoints,
                // Values resolve against the canvas: the admin page has no
                // Tailwind, so there is nothing to measure here.
                getCanvasDocument: canvasDocument,
            }),
            // The header, and above the textarea on purpose: the suggestion
            // list opens below it and covers whatever is there, so a control
            // underneath would take a click meant for it — or rather, would not.
            createElement(ComponentActions, {
                title,
                classString: className,
                // The block wears the component now; that is the point of
                // promoting it, and the utilities live in the rule.
                onSaved: (componentName) => setAttributes({ className: componentName }),
                onChange: (next) => setAttributes({ className: next }),
                overridden: {
                    count: overridden.length,
                    isOpen: showOverridden,
                    onToggle: () => setShowOverridden((open) => !open),
                },
            }),
            showOverridden && overridden.length > 0 && createElement('div', { className: 'winden-overridden-note' },
                overridden.map((entry) => createElement('p',
                    { key: entry.className, className: 'winden-overridden-line' },
                    createElement('code', null, entry.className),
                    entry.overriddenBy
                        ? ` is overridden by ${entry.overriddenBy} (${entry.property}: ${entry.actual})`
                        : ` sets ${entry.property}: ${entry.expected}, but the element shows ${entry.actual}`,
                    !entry.overriddenBy && createElement('button', {
                        type: 'button',
                        className: 'winden-overridden-fix',
                        onClick: () => setAttributes({
                            className: className
                                .split(/\s+/)
                                .map((name) => (name === entry.className ? forceClass(name) : name))
                                .join(' '),
                        }),
                    }, `Use ${forceClass(entry.className)}`)
                ))
            ),

            isSplitMode ? splitModeView : singleModeView,
            toggleSwitch
        );
    }

    /**
     * Winden Classes panel icon (same as Plain Classes)
     */
    const WindenIcon = createElement('svg', {
        height: '24px',
        viewBox: '0 -960 960 960',
        width: '24px',
        fill: 'currentColor'
    },
        createElement('path', { d: 'M164.62-520q-26.66 0-45.64-18.98T100-584.62v-130.76q0-26.66 18.98-45.64T164.62-780H520v260H164.62Zm0-40H480v-180H164.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v130.76q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92Zm0 380q-26.66 0-45.64-18.98T100-244.62v-130.76q0-26.66 18.98-45.64T164.62-440H600v260H164.62Zm0-40H560v-180H164.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v130.76q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92ZM680-180v-340h-80v-260h250.77l-80 204.62h78.46L680-180ZM200-280h60v-60h-60v60Zm0-340h60v-60h-60v60Zm-60 60V-740v180Zm0 340V-400v180Z' })
    );

    /**
     * The top bar already carries the Winden mark for the sidebar; a second
     * copy for the HTML modal would read as the same thing twice.
     */
    const CodeIcon = createElement('svg', {
        height: '24px',
        viewBox: '0 0 24 24',
        width: '24px',
        fill: 'none',
        'aria-hidden': 'true',
    },
        createElement('path', { fill: 'currentColor', d: 'M14 5.5C15.4871 5.5 16.1678 6.36421 16.756 7.1106C17.1171 7.56861 17.4438 7.98214 17.9002 8.12463C18.7002 8.37457 19.4 7.99959 20 6.99963C19.6 8.99963 18.6 10 17 10C15.5129 10 14.8322 9.13579 14.244 8.3894C13.8829 7.93139 13.5562 7.51813 13.0998 7.37537C12.2998 7.12543 11.6 7.50041 11 8.50037C11.4 6.50037 12.4 5.5 14 5.5Z' }),
        createElement('path', { fill: 'currentColor', d: 'M17 1C18.4871 1 19.1678 1.86421 19.756 2.6106C20.1171 3.06861 20.4438 3.48214 20.9002 3.62463C21.7002 3.87457 22.4 3.49959 23 2.49963C22.6 4.49963 21.6 5.5 20 5.5C18.5129 5.5 17.8322 4.63579 17.244 3.8894C16.8829 3.43139 16.5562 3.01786 16.0998 2.87537C15.2998 2.62543 14.6 3.00041 14 4.00037C14.4 2.00037 15.4 1 17 1Z' }),
        createElement('path', { fill: 'currentColor', d: 'M8.5004 8.5L4.19962 12.7998C4.09971 12.8998 4.10026 13.1002 4.3002 13.2002L8.60001 17.5L7.5004 18.5996L3.19962 14.2998C2.49993 13.5998 2.4998 12.4997 3.19962 11.7998L7.5004 7.5L8.5004 8.5Z' }),
        createElement('path', { fill: 'currentColor', d: 'M20.8002 11.7002C21.4999 12.4001 21.4999 13.4999 20.8002 14.2998L16.5004 18.5996L15.3998 17.5L19.6996 13.2002C19.7996 13.1002 19.7996 12.8998 19.6996 12.7998L18.3988 11.499C18.8936 11.2829 19.3535 11.0029 19.768 10.668L20.8002 11.7002Z' })
    );

    /**
     * Add Winden Classes panel to block inspector
     * Uses same structure as Plain Classes (no collapsible PanelBody)
     */
    const withWindenClassesPanel = createHigherOrderComponent((BlockEdit) => {
        return (props) => {
            const { attributes, setAttributes, clientId, isSelected } = props;

            const blockType = wp.blocks.getBlockType(props.name);
            const access = classAccess(
                { name: props.name, attributes },
                setAttributes
            );

            if (!access) {
                return createElement(BlockEdit, props);
            }

            const { BlockControls } = wp.blockEditor;
            const { ToolbarGroup, ToolbarButton } = wp.components;

            return createElement(Fragment, null,
                createElement(BlockEdit, props),
                // Where a block's own code lives: the toolbar in front of you,
                // not a command in the header about the document
                isSelected && BlockControls && createElement(BlockControls, { group: 'other' },
                    createElement(ToolbarGroup, null,
                        createElement(ToolbarButton, {
                            className: 'winden-html-blocks-block-trigger',
                            icon: CodeIcon,
                            label: isEditable(props.name)
                                ? 'Edit as HTML (Winden)'
                                : `${blockType?.title || props.name} is rendered by WordPress — its markup is not editable`,
                            disabled: !isEditable(props.name),
                            onClick: openHtmlBlocks,
                        })
                    )
                ),
                isSelected && createElement(InspectorControls, null,
                    createElement('div', { className: 'winden-classes-container winden-classes winden-classes-inspector' },
                        createElement(WindenClassesPanel, {
                            attributes: access.attributes,
                            setAttributes: access.setAttributes,
                            clientId,
                            measurable: access.measurable,
                            showHelper: false,
                            title: 'Winden Classes',
                        })
                    )
                )
            );
        };
    }, 'withWindenClassesPanel');

    addFilter(
        'editor.BlockEdit',
        'winden/with-winden-classes-panel',
        withWindenClassesPanel
    );

    /**
     * The panel's view of a block: its `className`, and a way to set it.
     *
     * `core/html` declares `customClassName: false` and has nowhere to keep a
     * class — but it is where this converter puts everything a block cannot
     * wear, an image with positioning classes or a gradient shape carrying a
     * `clip-path`, and those classes are exactly the ones a Tailwind user wants
     * to reach. So for custom HTML the panel reads and writes the class
     * attribute of the markup itself.
     */
    function classAccess(block, setAttributes) {
        if (block.name !== 'core/html') {
            const blockType = wp.blocks.getBlockType(block.name);
            if (blockType?.supports?.customClassName === false) return null;
            return { attributes: block.attributes, setAttributes, measurable: true };
        }

        // `innerContent` first, and it is not a fallback: as of WP 7.1 a mounted
        // `core/html` block has **no attributes at all** — measured, its
        // `attributes` is `{}` and the markup lives only here. Reading
        // `attributes.content` found nothing, so the panel refused every Custom
        // HTML block with "does not support custom classes".
        const markup = block.innerContent?.join('') || block.attributes.content || '';
        const classes = rootClassName(markup);
        // Several elements, or text beside one: there is no single class list
        if (classes === null) return null;

        return {
            // The class list lives on an element inside the markup, which the
            // editor does not render as a block — so nothing here is measurable
            measurable: false,
            attributes: { ...block.attributes, className: classes },
            setAttributes: (next) => {
                if (!('className' in next)) return setAttributes(next);

                // And writing the attribute is not enough either: it lands in
                // `attributes` and the block still saves what `innerContent`
                // holds. `rawHtmlBlock` sets both, which is why it exists.
                const updated = withRootClassName(markup, next.className ?? '');
                wp.data.dispatch('core/block-editor')
                    .replaceBlocks(block.clientId, rawHtmlBlock(updated));
            },
        };
    }

    /**
     * The same panel, with the helper, in its own editor sidebar.
     *
     * This is the only place the helper renders. Gutenberg treats plugin
     * sidebars and the block settings sidebar as mutually exclusive, so opening
     * this one hides block settings and gives the helper the full height of the
     * panel — which is what it needs. The inspector copy stays as a plain
     * textarea for quick edits without leaving the block's settings.
     *
     * It reads the selected block from the store rather than props, because it
     * renders outside the block's own tree.
     */
    /** The dock's size is remembered; whether it is open is not — see `dockEnabled` */
    const DOCK_HEIGHT_KEY = 'winden-html-dock-height';
    /** Its width when it hangs on the left — a separate memory, the axes differ */
    const DOCK_WIDTH_KEY = 'winden-html-dock-width';
    const DOCK_DEFAULT_SIZE = { bottom: 280, left: 480 };
    const DOCK_SIZE_KEY = { bottom: DOCK_HEIGHT_KEY, left: DOCK_WIDTH_KEY };

    /** Above this many blocks in one apply, the override measuring pass is skipped */
    const FORCE_OVERRIDES_LIMIT = 20;

    /**
     * Whether the dock is open, kept outside React.
     *
     * The switch is in the sidebar and the panel is not — the panel hangs
     * under the canvas and has to survive the sidebar being closed, which is
     * the first thing anyone does once the panel is open. Two components in
     * two trees reading one value, so the value cannot live in either.
     */
    const dockListeners = new Set();

    /**
     * Closed on every load, deliberately.
     *
     * It used to be remembered, and a remembered code panel is one that opens
     * over the canvas of a page you came to read, taking a third of the screen
     * and a 4 MB editor bundle with it. Opening it is a keystroke; leaving it
     * open across days is not something anyone asked for. The *size* is still
     * remembered — that is a preference, not a state.
     */
    let dockEnabled = false;

    /**
     * Whether it opens on the whole page rather than the selection.
     *
     * Module-level for the same reason as `dockEnabled`: the toolbar button
     * that asks for it and the panel that answers are in two different trees,
     * and the button has to work whether the panel is already open or not.
     */
    let dockWholePage = false;
    const wholePageListeners = new Set();

    /**
     * Which edge of the canvas the panel hangs from: `bottom` (the default)
     * or `left`, side by side with the canvas the way a playground splits.
     *
     * Remembered like the size, because it is a preference rather than a
     * state — someone who wants their code beside the page wants it there
     * tomorrow too. Module-level for the same reason as the other two: the
     * buttons are in the header and the panel is under the canvas.
     */
    const DOCK_SIDE_KEY = 'winden-html-dock-side';
    const DOCK_SIDES = ['bottom', 'left'];
    let dockSide = (() => {
        try {
            const stored = window.localStorage.getItem(DOCK_SIDE_KEY);
            return DOCK_SIDES.includes(stored) ? stored : 'bottom';
        } catch {
            return 'bottom';
        }
    })();
    const sideListeners = new Set();

    function setDockSide(next) {
        if (!DOCK_SIDES.includes(next)) return;
        dockSide = next;
        sideListeners.forEach((listen) => listen(next));
        try {
            window.localStorage.setItem(DOCK_SIDE_KEY, next);
        } catch { /* nothing to do about it */ }
    }

    function setDockEnabled(next, { wholePage = false } = {}) {
        dockEnabled = next;
        dockListeners.forEach((listen) => listen(next));
        setDockWholePage(next ? wholePage : false);
    }

    function setDockWholePage(next) {
        dockWholePage = next;
        wholePageListeners.forEach((listen) => listen(next));
    }

    function useDockEnabled() {
        const [value, setValue] = useState(dockEnabled);

        useEffect(() => {
            dockListeners.add(setValue);
            return () => dockListeners.delete(setValue);
        }, []);

        return value;
    }

    /** The whole-page switch, readable and settable from either tree */
    function useDockWholePage() {
        const [value, setValue] = useState(dockWholePage);

        useEffect(() => {
            wholePageListeners.add(setValue);
            return () => wholePageListeners.delete(setValue);
        }, []);

        return [value, setDockWholePage];
    }

    /** The panel's edge, readable and settable from either tree */
    function useDockSide() {
        const [value, setValue] = useState(dockSide);

        useEffect(() => {
            sideListeners.add(setValue);
            return () => sideListeners.delete(setValue);
        }, []);

        return [value, setDockSide];
    }

    /**
     * Where the dock hangs: the editor's own content column, so it spans the
     * canvas and stops short of both sidebars.
     *
     * There is no slot for this. `PluginSidebar` is the only dock a plugin is
     * given and it is ~250px wide, which markup does not fit in — measured,
     * with a single `<p>` and two attributes taking five wrapped lines. So the
     * panel is appended to the skeleton and re-appended if the editor rebuilds
     * it. Everything about that is unsupported, which is why every step below
     * gives up quietly rather than throwing: a missing skeleton means no dock,
     * not a broken editor.
     */
    const DOCK_HOSTS = [
        '.interface-interface-skeleton__content',
        '.edit-post-layout__content',
        '.editor-visual-editor',
    ];

    /** The edge, as classes on the host and on the column that lays it out */
    const DOCK_BESIDE_CLASS = 'winden-html-dock-beside';
    function markDockSide(node, beside) {
        node.classList.toggle('is-left', beside);
        node.parentElement?.classList.toggle(DOCK_BESIDE_CLASS, beside);
    }

    function useDockHost(enabled) {
        const [host, setHost] = useState(null);

        useEffect(() => {
            if (!enabled) {
                setHost(null);
                return undefined;
            }

            let node = null;
            const attach = () => {
                const parent = DOCK_HOSTS.reduce(
                    (found, selector) => found || document.querySelector(selector),
                    null
                );
                if (!parent) return;
                if (node && node.parentNode === parent) return;

                node = node || Object.assign(document.createElement('div'), {
                    className: 'winden-html-dock-host',
                });
                // A rebuilt skeleton is a new column; the old one's mark went
                // with it, so the host's own says which way it was laid out
                node.parentElement?.classList.remove(DOCK_BESIDE_CLASS);
                parent.appendChild(node);
                markDockSide(node, node.classList.contains('is-left'));
                setHost(node);
            };

            attach();
            // The skeleton is rebuilt when the editor changes shape — device
            // preview, distraction-free, opening the code editor — and takes
            // the panel with it
            const watcher = new MutationObserver(attach);
            watcher.observe(document.body, { childList: true, subtree: true });

            return () => {
                watcher.disconnect();
                if (node) markDockSide(node, false);
                node?.remove();
                node = null;
                setHost(null);
            };
        }, [enabled]);

        return host;
    }

    /** How long after the last keystroke the markup reaches the blocks */
    const DOCK_APPLY_DELAY_MS = 800;

    /**
     * The same editor as the modal, docked in the sidebar and following the
     * selection.
     *
     * The modal owns the screen, which means List View — the tool for moving
     * around a document — is unreachable while it is open. That is why the
     * modal grew a tree of its own. Docked and non-modal, the editor can
     * simply follow whatever is selected, and List View drives it for free.
     *
     * The cost is width: `PluginSidebar` is ~280px and does not resize, so
     * this suits a card or a paragraph rather than a whole hero. Which is why
     * it is opt-in and the modal stays.
     */
    function HtmlDockEditor({ ids, selected, selectedBlock, selectionIsScope, wholePage }) {
        const { replaceBlocks, insertBlocks, resetBlocks, selectBlock, multiSelect } = wp.data.useDispatch('core/block-editor');
        const [status, setStatus] = useState(HTML_EDITOR_ASSETS ? 'loading' : 'plain');
        const [error, setError] = useState(null);

        const preserved = useRef([]);
        const holder = useRef(null);
        const editor = useRef(null);
        // The blocks being edited, for a callback that fires after the render
        // that changed them
        // Always the list, never the string it arrives as: everything that
        // reads this maps over it
        const target = useRef(ids.split(' ').filter(Boolean));
        // What was last handed to the document. Typing that arrives back at
        // the same markup is not a change worth a new block tree.
        const applied = useRef('');
        // While the caret is in here, incoming block changes are this editor's
        // own echo: applying replaces the block, which reselects it, which
        // would otherwise reload canonical markup over a half-typed line
        const focused = useRef(false);
        // Set while this panel's own apply is on its way back through the store
        const echo = useRef(false);
        // Set while an undo or redo is on its way back, which must be shown
        // even though the caret is in here
        const reverting = useRef(false);
        // Whether the selection *is* what this panel is editing, rather than a
        // pointer into it. Kept in a ref because the editor's callbacks are
        // wired once at mount and would otherwise hold the first value.
        const selectionScopes = useRef(selectionIsScope);
        // Same reason: the editor outlives a switch between a block and the
        // whole page, and `apply` has to know which it is applying to
        const wholePageRef = useRef(wholePage);
        const timer = useRef(null);

        useEffect(() => {
            wholePageRef.current = wholePage;
        }, [wholePage]);

        useEffect(() => {
            selectionScopes.current = selectionIsScope;
        }, [selectionIsScope]);

        /**
         * The markup for a run of blocks, and the aside of what stands in for
         * what. One `preserved` across all of them, because the refs in the
         * markup index a single list.
         */
        /**
         * The same markup, whitespace aside.
         *
         * The editor formats what it is given, so the text it holds and the
         * text the store produces differ by indentation from the moment it
         * opens. Compared exactly, every tick of the store looked like
         * somebody else had edited the block and reloaded canonical markup
         * over the formatted document — which undid the formatting, and took
         * anything typed but not yet applied with it.
         *
         * Whitespace inside `<pre>` is the one place this is too coarse: a
         * change confined to it is missed, and the cost is a refresh that does
         * not happen rather than anything lost.
         */
        const sameMarkup = (a, b) => String(a).replace(/\s+/g, ' ').trim() === String(b).replace(/\s+/g, ' ').trim();

        const markupFor = (list) => {
            preserved.current = [];
            const store = wp.data.select('core/block-editor');
            return list
                .map((id) => {
                    const block = store.getBlock(id);
                    return block ? blockMarkup(block, preserved.current) : '';
                })
                .filter(Boolean)
                .join('\n');
        };

        const apply = () => {
            window.clearTimeout(timer.current);
            const value = editor.current?.getValue() ?? '';
            if (value === applied.current) return;

            if (window.windenDebug) {
                const store = wp.data.select('core/block-editor');
                console.debug('[Winden dock] apply', {
                    target: target.current,
                    alive: target.current.map((id) => Boolean(store.getBlock(id))),
                    focused: focused.current,
                    length: value.length,
                });
            }

            let seeds;
            try {
                seeds = htmlToBlockSeeds(value, undefined, CONVERT_OPTIONS);
            } catch {
                setError('That does not parse as HTML.');
                return;
            }

            // An empty editor is someone midway through a rewrite, not an
            // instruction to delete the block — the modal had a button to
            // press and could afford to take that literally; this cannot:
            // the panel follows the selection, and deleting the block it is
            // aimed at leaves the markup typed next with nowhere to go.
            //
            // The whole page is scoped by the block order, which is never
            // lost, and an empty page is something this editor can show. So
            // there, select-all and delete clears the page — measured, the
            // canvas used to keep every block until the next keystroke
            // brought a replacement — and the editor stays for what comes
            // next. Blank only: a comment left behind is still a rewrite.
            // `resetBlocks([])`, not `removeBlocks`: removing the last block
            // makes core insert its default paragraph, so the page came back
            // as one empty `<p></p>` — a reset is the state a new page starts
            // in, appender and all.
            if (seeds.length === 0) {
                if (!wholePageRef.current || value.trim() !== '' || target.current.length === 0) return;
                applied.current = value;
                setError(null);
                echo.current = true;
                resetBlocks([]);
                return;
            }

            try {
                const blocks = seeds.map((seed) => buildSeed(seed, preserved.current));
                applied.current = value;
                setError(null);

                // Replacing the block reselects it, and with the default
                // `initialPosition` of 0 core's `useFocusFirstElement` then
                // puts the caret into the new block's RichText — so typing,
                // pausing, and typing again landed the rest of the sentence
                // in the canvas, and a stray keystroke there made a new empty
                // paragraph that the panel duly followed. Measured: the
                // restore below fires on the next frame, which is *before*
                // that effect commits, so it never won the race. `null` is
                // the position that means "select, do not focus" — the same
                // one `selectBlock` gets below. The restore stays for whatever
                // else moves focus after a replace.
                const hadFocus = focused.current;
                echo.current = true;
                if (target.current.length > 0) {
                    replaceBlocks(target.current, blocks, undefined, null);
                } else {
                    // A whole page with nothing on it yet: there is no block
                    // to replace, and `replaceBlocks([])` puts nothing anywhere
                    insertBlocks(blocks, undefined, undefined, false);
                }

                // Replacing a run of blocks leaves one of them selected, and
                // when the selection is the run being edited that reads back
                // as "the run is one block now" — the panel re-scoped to it on
                // the first pause and the rest of the markup left the editor
                // under the caret. The run is still what is being edited, so
                // it stays selected. The whole page is scoped by the block
                // order instead and wants none of this: selecting every block
                // on every pause is only noise on the canvas.
                if (selectionScopes.current && blocks.length > 0) {
                    if (blocks.length > 1) {
                        multiSelect(blocks[0].clientId, blocks[blocks.length - 1].clientId);
                    } else {
                        selectBlock(blocks[0].clientId, null);
                    }
                }
                // Measuring is a probe and a `getComputedStyle` per class per
                // block. Worth it for a card; for a whole page on every pause
                // it is the thing that makes typing stutter, and the panel
                // still offers the same `!` one block at a time.
                // Measuring is a probe and a `getComputedStyle` per class per
                // block; on a whole page it is what makes typing stutter, so it
                // is limited. Carrying variants runs either way: a class that
                // is *already* forced never measures as overridden again — it
                // applies now — so without this the repair would only ever
                // reach markup being forced for the first time.
                const measured = blocks.length <= FORCE_OVERRIDES_LIMIT
                    ? forceOverriddenClasses(blocks)
                    : Promise.resolve();
                measured.then(() => carryVariants(blocks));
                if (hadFocus) {
                    window.requestAnimationFrame(() => editor.current?.focus());
                }
            } catch (buildError) {
                setError(`Could not build those blocks: ${buildError.message}.`);
            }
        };

        useEffect(() => {
            let cancelled = false;

            loadHtmlEditor()
                .then((api) => {
                    if (cancelled || !holder.current) return;
                    target.current = ids.split(' ').filter(Boolean);
                    const value = markupFor(target.current);
                    applied.current = value;
                    editor.current = api.mount(holder.current, {
                        value,
                        format: Boolean(value),
                        // A code surface under a white canvas. Following the
                        // admin scheme made it the brightest thing on screen.
                        theme: 'vs-dark',
                        onFormatted: () => { applied.current = editor.current?.getValue() ?? value; },
                        onChange: () => {
                            window.clearTimeout(timer.current);
                            timer.current = window.setTimeout(apply, DOCK_APPLY_DELAY_MS);
                        },
                        onFocus: () => { focused.current = true; },
                        // The other half of following the selection: move
                        // through the markup and the block moves with you, in
                        // List View and on the canvas both
                        onCursorLine: (line) => {
                            // With a run of blocks open, the selection is not
                            // a pointer into the markup — it *is* the markup's
                            // extent, and picking the block under the caret
                            // narrows it. The panel then read its own
                            // narrowing back as "a different block was
                            // chosen", reloaded down to that one block and
                            // took the focus with it: one click into a
                            // three-block editor left a one-block editor, and
                            // the character typed after it went nowhere.
                            //
                            // A single block and the whole page both keep the
                            // sync — there the selection can move without
                            // changing what is being edited.
                            if (selectionScopes.current) return;

                            const value = editor.current?.getValue() ?? '';
                            const store = wp.data.select('core/block-editor');

                            // The block the caret is actually in, however deep
                            // — a heading inside a card inside a group is the
                            // heading, not the group three levels up
                            const roots = target.current
                                .map((id) => store.getBlock(id))
                                .filter(Boolean);
                            const nested = blockAtTargets(roots, targetsAtLine(value, line));

                            // Falling back to the top-level block: better the
                            // container than nothing when the markup has been
                            // edited past recognising
                            const at = topLevelIndexAtLine(value, line);
                            const clientId = nested ?? target.current[at];
                            if (!clientId) return;

                            const selection = store.getSelectedBlockClientIds();
                            // Selecting what is already selected scrolls the
                            // canvas for nothing
                            if (selection.length === 1 && selection[0] === clientId) return;

                            if (window.windenDebug) {
                                console.debug('[Winden] caret line', line, '→ block', at, wp.data.select('core/block-editor').getBlock(clientId)?.name);
                            }

                            // `null` initial position: the default is 0, which
                            // puts the caret *in the block* — so every arrow
                            // key in here threw focus into the canvas and the
                            // next keystroke went to the post, not the markup.
                            selectBlock(clientId, null);
                        },
                        // Leaving is the other half of "on pause": clicking
                        // into the canvas should not need a pause first
                        onBlur: () => { focused.current = false; apply(); },
                    });
                    setStatus('ready');
                })
                .catch(() => {
                    if (!cancelled) setStatus('plain');
                });

            return () => {
                cancelled = true;
                window.clearTimeout(timer.current);
                editor.current?.dispose();
                editor.current = null;
            };
            // Mounted once; the selection is followed by the effect below
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        /**
         * Changes made anywhere else, shown here.
         *
         * The panel used to reload only when the *selection* changed, so a
         * class added in the sidebar — the helper's whole job — left the code
         * showing markup that was already out of date, and the next apply
         * wrote the stale version back over it.
         *
         * Not while the caret is in here: that text is being typed and is
         * newer than anything the store can offer. Not on this panel's own
         * echo either, which the `ids` effect already handles.
         */
        useEffect(() => {
            let timer = 0;

            const unsubscribe = wp.data.subscribe(() => {
                if (focused.current || echo.current || !editor.current) return;

                window.clearTimeout(timer);
                timer = window.setTimeout(() => {
                    if (focused.current || echo.current || !editor.current) return;

                    const value = markupFor(target.current);
                    // `applied` is what this panel last handed over or was
                    // handed; anything else is someone else's edit
                    if (!value || sameMarkup(value, applied.current)) return;

                    // Never over what is waiting to be applied. The caret
                    // being elsewhere does not make the text stale — it may
                    // have been typed a moment ago, or written by something
                    // driving the editor — and the pause that applies it is
                    // still coming.
                    if (editor.current.getValue() !== applied.current) return;

                    applied.current = value;
                    editor.current.setValue(value, { format: false });
                }, 200);
            });

            return () => {
                window.clearTimeout(timer);
                unsubscribe();
            };
        }, []);

        /**
         * The other direction: pick a block in List View or on the canvas and
         * its lines are marked here.
         *
         * Not while the caret is in this editor — that selection is this
         * editor's own doing, and scrolling the markup out from under someone
         * who is typing in it is the opposite of helpful.
         */
        useEffect(() => {
            if (!editor.current || focused.current) return;

            const value = editor.current.getValue();
            const store = wp.data.select('core/block-editor');

            // The block itself, however deep — the heading inside the card,
            // not the card. It used to stop at the top level, so picking a
            // heading in List View shaded the whole group around it and
            // picking anything inside a single open block shaded nothing.
            const roots = target.current.map((id) => store.getBlock(id)).filter(Boolean);
            const which = selectedBlock ? targetOfBlock(roots, selectedBlock) : null;
            const nested = which ? lineRangeOfTarget(value, which) : null;

            // Falling back to the top-level block: better the container than
            // nothing for a block the markup cannot name
            const at = target.current.indexOf(selected);
            const range = nested ?? (at === -1 ? null : topLevelLineRange(value, at));

            // The caret goes there too, so the next keystroke after a click in
            // the tree lands in that element rather than wherever the caret
            // was left. Placed, not focused: List View keeps the focus it has.
            // Only when the block itself was found — put on the container's
            // line instead, the cursor event would select the container and
            // take the selection away from the block that was just picked.
            editor.current.highlight(range, { caret: Boolean(nested) });
        }, [selected, selectedBlock, ids]);

        useEffect(() => {
            // Not while the caret is in here. The panel selects blocks as you
            // move through the markup, and following that selection back would
            // retarget mid-sentence — an apply would then replace one block
            // with the markup of all of them. An undo is the exception: it is
            // the one change from outside that has to win over what is typed,
            // because reverting it is the whole point.
            if (window.windenDebug) {
                console.debug('[Winden dock] ids', {
                    ids,
                    was: target.current.join(' '),
                    focused: focused.current,
                    echo: echo.current,
                    reverting: reverting.current,
                });
            }

            // Typing here, and the ids changed: two different things can have
            // done that, and only one of them may retarget the panel.
            //
            // The panel's own apply is the one that must. It replaced the
            // blocks, so the ids it was holding name blocks that no longer
            // exist — and the *next* apply, still aimed at those, lands
            // nowhere: the edit stays in the panel and the canvas goes on
            // without it. The text is left alone; it is newer than the store.
            //
            // The caret picking a different block is the one that must not.
            // Following that would retarget mid-sentence, and an apply would
            // then replace one block with the markup of all of them.
            if (focused.current && !reverting.current) {
                if (echo.current) {
                    echo.current = false;
                    target.current = ids.split(' ').filter(Boolean);
                    applied.current = editor.current?.getValue() ?? applied.current;
                }
                return;
            }

            target.current = ids.split(' ').filter(Boolean);
            if (!editor.current) return;

            // Applying replaces the blocks, which mints new client ids, which
            // arrives here looking exactly like "a different block was
            // picked". It is not — it is this panel's own echo, and reloading
            // on it put the caret back at 1:1 after every pause.
            //
            // The new ids still have to be taken: the old ones are gone, and
            // the next apply would be aimed at blocks that no longer exist.
            // Only the text is left alone. Comparing the markup instead was
            // tried and is not reliable — re-serializing rewrites `<img>` as
            // `<img/>` and reorders attributes, so it never compares equal.
            if (echo.current && !reverting.current) {
                echo.current = false;
                applied.current = editor.current.getValue();
                return;
            }

            reverting.current = false;

            const value = markupFor(target.current);
            if (window.windenDebug) {
                console.debug('[Winden dock] reload', {
                    ids: target.current.join(' '),
                    length: value.length,
                    same: value === applied.current,
                });
            }

            // Nothing new: these ids produce the markup this editor already
            // has. It happens at mount, where this effect runs once against
            // the value the editor was created with — and reloading over it
            // threw away the formatting the editor was in the middle of doing,
            // which is why the markup appeared as a wall and then reflowed a
            // beat later.
            if (sameMarkup(value, applied.current)) return;

            applied.current = value;
            setError(null);
            // Not formatted: the previous block's markup would otherwise sit
            // on screen, under this block's own label, for as long as the
            // formatter's worker round-trip takes — a stale-content flash
            // worse than the unformatted markup it was trying to avoid.
            editor.current.setValue(value, { format: false }).then(() => {
                applied.current = editor.current?.getValue() ?? value;
            });
        }, [ids]);

        /**
         * Undo, from inside the panel.
         *
         * Monaco eats ⌘Z before the editor's own shortcut ever sees it, and
         * its text history is wiped by `setValue` every time the panel follows
         * the selection — so inside here the key did nothing at all, and a
         * mistake typed into the markup could not be taken back.
         *
         * It undoes the *document*, not the text: every apply is already one
         * step in the post's history, that history survives switching blocks,
         * and reverting the change you just made is what the key is for. The
         * panel then reloads to show what came back, focus or no focus.
         */
        const onKeyDown = (event) => {
            const meta = event.metaKey || event.ctrlKey;
            if (!meta || event.key.toLowerCase() !== 'z') return;

            const editorStore = wp.data.select('core/editor');
            const redo = event.shiftKey;
            if (redo ? !editorStore.hasEditorRedo?.() : !editorStore.hasEditorUndo?.()) return;

            event.preventDefault();
            event.stopPropagation();

            reverting.current = true;
            const dispatchEditor = wp.data.dispatch('core/editor');
            if (redo) dispatchEditor.redo();
            else dispatchEditor.undo();

            // An undo that only changed attributes leaves the client ids
            // alone, so the effect that watches them never runs
            window.requestAnimationFrame(() => {
                if (!reverting.current || !editor.current) return;
                reverting.current = false;

                const value = markupFor(target.current);
                applied.current = value;
                editor.current.setValue(value, { format: false });
            });
        };

        return createElement('div', { className: 'winden-html-dock-editor-wrap', onKeyDownCapture: onKeyDown },
            createElement('div', {
                className: `winden-html-blocks-editor winden-html-dock-editor is-${status}`,
                ref: holder,
            }),
            error && createElement('p', { className: 'winden-html-blocks-error' }, error)
        );
    }

    /**
     * The dock's frame: the opt-in in the sidebar, and the panel itself
     * portalled across the bottom of the canvas.
     *
     * Split from the editor so the editor's hooks never run for a block whose
     * markup it cannot rebuild.
     */
    /** The remembered size for an edge, or its default */
    const storedDockSize = (side) => {
        try {
            return Number(window.localStorage.getItem(DOCK_SIZE_KEY[side])) || DOCK_DEFAULT_SIZE[side];
        } catch {
            return DOCK_DEFAULT_SIZE[side];
        }
    };

    function HtmlDock() {
        const enabled = useDockEnabled();
        const [side] = useDockSide();

        // One number, meaning height under the canvas and width beside it;
        // each edge remembers its own
        const [size, setSize] = useState(() => storedDockSize(side));
        useEffect(() => {
            setSize(storedDockSize(side));
        }, [side]);

        const host = useDockHost(enabled);

        // The host is a plain element outside React, and the layout change
        // happens on its *parent* — core's content column turns into a row.
        // Both are marked from here; `useDockHost` carries the parent's mark
        // over when the editor rebuilds the skeleton and the host moves.
        useEffect(() => {
            if (!host) return undefined;
            markDockSide(host, side === 'left');
            return () => markDockSide(host, false);
        }, [host, side]);

        // List View has no row for the document itself, so there is no way to
        // select the page from it — this is that row, kept here rather than
        // fought for in core's tree.
        const [wholePage, setWholePage] = useDockWholePage();

        // Strings, so the identity of an array does not re-render this on
        // every tick of the store
        const { ids, rootIds, name, selected, selectedBlock } = wp.data.useSelect((select) => {
            const store = select('core/block-editor');
            const selection = store.getSelectedBlockClientIds();
            const block = selection.length === 1 ? store.getBlock(selection[0]) : null;
            // The root of whatever is selected: a paragraph three groups deep
            // marks the group, which is the block the markup has a line for
            const one = selection.length === 1 ? selection[0] : '';
            const roots = store.getBlockOrder();

            return {
                ids: selection.join(' '),
                rootIds: roots.join(' '),
                name: block?.name ?? '',
                // The block itself, for the panel to find its lines
                selectedBlock: one,
                // `getBlockParents` is ordered outermost first, which is the
                // one that has a line in the markup — the immediate parent
                // would still be nested three groups down
                selected: one ? (store.getBlockParents(one)[0] || one) : '',
            };
        }, []);

        const targets = wholePage ? rootIds : ids;
        const count = targets ? targets.split(' ').length : 0;

        // One opaque block on its own has nothing to show. In a run of blocks
        // it is a marker among markup, which is a different thing entirely —
        // it rides along and comes back untouched.
        // The whole page is editable even when it is empty — that is how
        // markup gets onto a blank page, and how a page cleared from here
        // keeps its editor
        const editable = count > 1 || (count === 1 && (wholePage || isEditable(name))) || (wholePage && count === 0);

        const title = wholePage
            ? `whole page (${count} block${count === 1 ? '' : 's'})`
            : (count > 1
                ? `${count} blocks`
                : (name ? (wp.blocks.getBlockType(name)?.title || name) : ''));

        // The size the drag is currently at. `size` in the closure below is
        // whatever it was when the drag started, which is what was being
        // written back to storage — the size never survived a reload.
        const sizeRef = useRef(size);
        useEffect(() => {
            sizeRef.current = size;
        }, [size]);

        /**
         * Dragged from the edge that faces the canvas: the top when the panel
         * is under it (up is taller), the right when it is beside it (right
         * is wider).
         *
         * On the handle with pointer capture, not on `document`: the canvas is
         * an iframe, and an iframe swallows the pointer events that cross it.
         * Dragging toward the canvas — the only direction anyone drags this —
         * left the parent document hearing nothing the moment the cursor
         * entered it, which is why it looked broken.
         */
        const onResize = (event) => {
            event.preventDefault();
            const handle = event.currentTarget;
            const left = side === 'left';
            const start = left ? event.clientX : event.clientY;
            const startSize = sizeRef.current;

            const move = (moveEvent) => {
                const delta = left
                    ? moveEvent.clientX - start
                    : start - moveEvent.clientY;
                const next = Math.min(
                    Math.max(startSize + delta, left ? 240 : 120),
                    left ? window.innerWidth - 400 : window.innerHeight - 160
                );
                sizeRef.current = next;
                setSize(next);
            };

            const done = () => {
                handle.removeEventListener('pointermove', move);
                handle.removeEventListener('pointerup', done);
                handle.removeEventListener('pointercancel', done);
                try {
                    handle.releasePointerCapture(event.pointerId);
                } catch { /* already gone */ }
                try {
                    window.localStorage.setItem(DOCK_SIZE_KEY[side], String(Math.round(sizeRef.current)));
                } catch { /* nothing to do about it */ }
            };

            handle.setPointerCapture(event.pointerId);
            handle.addEventListener('pointermove', move);
            handle.addEventListener('pointerup', done);
            handle.addEventListener('pointercancel', done);
        };

        const { Button } = wp.components;
        const { createPortal } = wp.element;

        const panel = createElement('div', {
            className: `winden-html-dock-panel is-${side}`,
            style: side === 'left' ? { width: `${size}px` } : { height: `${size}px` },
        },
            createElement('div', {
                className: 'winden-html-dock-resize',
                onPointerDown: onResize,
                role: 'separator',
                'aria-orientation': side === 'left' ? 'vertical' : 'horizontal',
                'aria-label': 'Resize the HTML panel',
            }),
            createElement('div', { className: 'winden-html-dock-body' },
            createElement('div', { className: 'winden-html-dock-bar' },
                createElement('span', { className: 'winden-html-dock-title' },
                    title ? `HTML — ${title}` : 'HTML'),
                Button && createElement(Button, {
                    size: 'small',
                    variant: wholePage ? 'primary' : 'secondary',
                    onClick: () => setWholePage(!wholePage),
                }, 'Whole page'),
                Button && createElement(Button, {
                    size: 'small',
                    variant: 'tertiary',
                    onClick: () => setDockEnabled(false),
                }, 'Close')
            ),
            !targets && !wholePage && createElement('p', { className: 'winden-html-dock-note' },
                'Select a block, or press Whole page.'
            ),
            targets && !editable && createElement('p', { className: 'winden-html-dock-note' },
                `${title} is rendered by WordPress — its markup is not editable. Select it with another block, or press Whole page, to keep it as it is while editing around it.`
            ),
            // Deliberately not keyed on the blocks. Applying replaces them,
            // which mints new clientIds — a key would remount the editor on
            // every apply, taking the caret and the undo stack with it
            // mid-sentence. One editor, told what it is looking at.
            // `selectionIsScope`: with several blocks open the selection is
            // the run being edited, so the editor must not move it
            editable && createElement(HtmlDockEditor, {
                ids: targets,
                selected,
                selectedBlock,
                selectionIsScope: !wholePage && count > 1,
                wholePage,
            })
            )
        );

        return enabled && host ? createPortal(panel, host) : null;
    }

    /**
     * "Edit the whole page as HTML", in the header toolbar beside List View.
     *
     * A block's code opens from the block's own toolbar; the whole document is
     * not a block and has no toolbar of its own, so it belongs with the other
     * document-level controls. There is no slot fill for that toolbar —
     * Gutenberg exposes none — so the button is portalled in, and re-attached
     * when the editor rebuilds its chrome.
     *
     * The same mark as the block toolbar's, deliberately: one icon for one
     * idea. What separates them is where they sit and what they say — a block
     * against the whole page — not two drawings of the same thing.
     */

    function useHeaderToolbar() {
        const [host, setHost] = useState(null);

        useEffect(() => {
            const find = () => setHost(document.querySelector('.editor-header__toolbar') ?? null);
            find();

            // The editor rebuilds its header on mode changes; every step of
            // this gives up quietly, since a missing toolbar means no button
            // rather than a broken editor
            const observer = new MutationObserver(find);
            observer.observe(document.body, { childList: true, subtree: true });
            return () => observer.disconnect();
        }, []);

        return host;
    }

    /** A lucide mark from the helper's registry, sized for a header button */
    const dockSideIcon = (name) => createElement('span', {
        className: 'winden-html-dock-side-icon',
        'aria-hidden': 'true',
        dangerouslySetInnerHTML: { __html: getHelperIcon(name) ?? '' },
    });

    const DOCK_SIDE_BUTTONS = [
        { side: 'left', icon: 'panel-left', label: 'Dock the HTML panel beside the canvas' },
        { side: 'bottom', icon: 'panel-bottom', label: 'Dock the HTML panel under the canvas' },
    ];

    /**
     * The whole-page trigger, and — once a panel is open — where it sits.
     *
     * Two placement buttons after the `< >`, the way a playground offers
     * side-by-side or stacked. Only while the panel is showing: a choice
     * about a panel that is not there is noise in a toolbar that is already
     * full, and the preference is remembered, so they need not be visible to
     * take effect next time.
     */
    function HeaderButtons() {
        const host = useHeaderToolbar();
        const enabled = useDockEnabled();
        const [wholePage] = useDockWholePage();
        const [side, setSide] = useDockSide();
        // `Button`, not `ToolbarButton`: outside a `Toolbar` the latter has no
        // toolbar to take part in, and the header's own controls are Buttons
        const { Button: HeaderButton } = wp.components ?? {};
        const { createPortal } = wp.element;
        if (!host || !HeaderButton) return null;

        const showing = enabled && wholePage;
        const buttons = createElement(Fragment, null,
            createElement(HeaderButton, {
                className: 'winden-html-whole-page-trigger',
                icon: CodeIcon,
                size: 'compact',
                label: showing ? 'Stop editing the page as HTML (Winden)' : 'Edit the whole page as HTML (Winden)',
                isPressed: showing,
                onClick: () => (showing ? setDockEnabled(false) : setDockEnabled(true, { wholePage: true })),
            }),
            enabled && DOCK_SIDE_BUTTONS.map(({ side: which, icon, label }) => createElement(HeaderButton, {
                key: which,
                className: `winden-html-dock-side-trigger is-${which}`,
                icon: dockSideIcon(icon),
                size: 'compact',
                label,
                isPressed: side === which,
                onClick: () => setSide(which),
            }))
        );

        return createPortal(buttons, host);
    }

    /** The switch, which does live in the sidebar */
    function HtmlDockToggle() {
        const enabled = useDockEnabled();
        const { ToggleControl } = wp.components;
        if (!ToggleControl) return null;

        return createElement('div', { className: 'winden-html-dock-toggle' },
            createElement(ToggleControl, {
                __nextHasNoMarginBottom: true,
                label: 'Edit as HTML',
                help: enabled
                    ? 'Open under the canvas, following the selection.'
                    : 'Open a markup panel under the canvas.',
                checked: enabled,
                onChange: setDockEnabled,
            })
        );
    }

    function WindenClassesSidebar() {
        const { useSelect, useDispatch } = wp.data;

        const block = useSelect(
            (select) => select('core/block-editor').getSelectedBlock(),
            []
        );
        const { updateBlockAttributes } = useDispatch('core/block-editor');

        const access = block && classAccess(
            block,
            (next) => updateBlockAttributes(block.clientId, next)
        );

        // The classes panel and the markup dock answer different questions, so
        // one having nothing to say does not silence the other: `core/html`
        // has no class attribute of its own but very much has markup, and a
        // Query Loop is the other way round.
        const classes = () => {
            if (!block) {
                return createElement('div', { className: 'winden-classes-sidebar-empty' },
                    'Select a block to edit its classes.'
                );
            }

            if (!access) {
                const blockType = wp.blocks.getBlockType(block.name);
                return createElement('div', { className: 'winden-classes-sidebar-empty' },
                    `${blockType?.title || block.name} does not support custom classes.`
                );
            }

            return createElement('div', { className: 'winden-classes-container winden-classes winden-classes-sidebar' },
                createElement(WindenClassesPanel, {
                    attributes: access.attributes,
                    setAttributes: access.setAttributes,
                    clientId: block.clientId,
                    measurable: access.measurable,
                    showHelper: true,
                })
            );
        };

        return createElement(Fragment, null, classes(), createElement(HtmlDockToggle));
    }

    // PluginSidebar moved from wp.editPost to wp.editor in WP 6.6; support both
    const editorApi = wp.editor?.PluginSidebar ? wp.editor : wp.editPost;
    const { PluginSidebar, PluginSidebarMoreMenuItem } = editorApi ?? {};

    const { PluginMoreMenuItem } = editorApi ?? {};

    /**
     * The sidebar, plus the HTML-to-blocks command.
     *
     * A block's code opens from its own toolbar, from ⌃⌥H, from the command
     * palette (⌘K) and from the Options menu. All four open the same thing:
     * the panel under the canvas. There was a modal as well, which is what
     * this used to be — two editors for one job, and the one that could not
     * see the canvas while you typed in it was the one to go.
     */
    function WindenPlugin() {
        useEffect(() => {
            const open = () => setDockEnabled(true);
            htmlBlocksListeners.add(open);
            return () => htmlBlocksListeners.delete(open);
        }, []);

        /**
         * A shortcut for it, registered where core keeps them so it appears in
         * ⌘⇧/ beside the rest instead of being folklore. `access` is
         * Gutenberg's own modifier for block commands — ⌃⌥ on a Mac, ⇧⌥
         * elsewhere — and collides with nothing the browser claims.
         */
        useEffect(() => {
            wp.data.dispatch('core/keyboard-shortcuts')?.registerShortcut?.({
                name: HTML_BLOCKS_SHORTCUT,
                category: 'block',
                description: 'Edit the selected blocks as HTML.',
                keyCombination: { modifier: 'access', character: 'h' },
            });

            // Listened for here rather than through `useShortcut`, which never
            // fired: that hook delivers through `ShortcutProvider`'s own
            // element, and a plugin registered with `registerPlugin` renders
            // outside it. The canvas is an iframe and Gutenberg bubbles its
            // keydowns to this document — measured — so one listener covers
            // both the canvas and the chrome around it.
            //
            // The combination still comes from the store, so the registration
            // above stays the one place it is written down and a user who
            // rebinds it in core's UI is followed.
            const shortcuts = wp.data.select('core/keyboard-shortcuts');
            const onKeyDown = (event) => {
                const matched = (shortcuts.getAllShortcutKeyCombinations(HTML_BLOCKS_SHORTCUT) || [])
                    .some(({ modifier, character }) => (
                        wp.keycodes?.isKeyboardEvent?.[modifier]?.(event, character)
                    ));
                if (!matched) return;

                event.preventDefault();
                // Through the same fan-out the toolbar button uses, not this
                // component's own state: the script mounts more than one of
                // these, and the instance that owns the listener is not
                // always the instance whose modal is on screen — measured,
                // with the handler firing and nothing opening.
                openHtmlBlocks();
            };

            // Captured, not bubbled: the editor's own handlers sit between the
            // canvas iframe and this document and stop the event on the way up,
            // so a bubble-phase listener here saw the keydown in a probe and
            // never in the editor.
            document.addEventListener('keydown', onKeyDown, true);
            return () => document.removeEventListener('keydown', onKeyDown, true);
        }, []);

        // ⌘K knows about it too, which is where a command belongs
        if (wp.commands?.useCommand) {
            wp.commands.useCommand({
                name: 'winden/html-to-blocks',
                label: 'Edit as HTML',
                icon: CodeIcon,
                callback: ({ close }) => {
                    close();
                    setDockEnabled(true);
                },
            });
        }

        return createElement(Fragment, null,
            PluginSidebarMoreMenuItem && createElement(PluginSidebarMoreMenuItem, {
                target: 'winden-classes-sidebar',
                icon: WindenIcon,
            }, 'Winden Classes'),
            PluginMoreMenuItem && createElement(PluginMoreMenuItem, {
                icon: CodeIcon,
                onClick: () => setDockEnabled(true),
            }, 'Edit as HTML'),
            createElement(PluginSidebar, {
                name: 'winden-classes-sidebar',
                title: 'Winden Classes',
                icon: WindenIcon,
            }, createElement(WindenClassesSidebar)),
            createElement(HtmlDock),
            createElement(HeaderButtons)
        );
    }

    if (wp.plugins?.registerPlugin && PluginSidebar) {
        wp.plugins.registerPlugin('winden-classes-sidebar', {
            icon: WindenIcon,
            render: WindenPlugin,
        });
    }

})();

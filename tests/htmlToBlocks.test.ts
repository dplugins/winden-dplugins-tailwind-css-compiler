/**
 * Bringing a Tailwind component into the editor with its classes.
 *
 * Gutenberg's own handlers cannot: `rawHandler` returns one `core/html` block,
 * and `pasteHandler` drops the wrapper and every class — measured in a real
 * editor before this existed.
 */

import { describe, test, expect } from 'vitest';
import { htmlToBlockSeeds, stripGeneratedClasses, rootClassName, withRootClassName, preservedTag, componentOpenTag, blockNameForTag, coerceAttribute, layoutName, layoutValue, layoutFromValue, topLevelIndexAtLine, targetsAtLine, elementLineRanges, lineRangeOfTarget, LAYOUT_ATTRIBUTE, PRESERVED_BLOCK, type BlockSchema, type ConvertOptions, type BlockSeed } from '../src/winden-classes/core/html-to-blocks';

const shape = (blocks: BlockSeed[]): string[] => blocks.flatMap((seed) => [
    `${seed.name}:${seed.attributes.className ?? '-'}`,
    ...shape(seed.innerBlocks).map((line) => `  ${line}`),
]);

describe('htmlToBlockSeeds', () => {
    test('a card keeps its structure and every class', () => {
        const seeds = htmlToBlockSeeds(`
            <div class="rounded-xl bg-white p-6 shadow-lg">
              <h2 class="text-2xl font-bold">Card title</h2>
              <p class="mt-2 text-slate-600">Some description.</p>
              <a href="/more" class="btn btn-primary">Read more</a>
            </div>
        `);

        expect(shape(seeds)).toEqual([
            'core/group:rounded-xl bg-white p-6 shadow-lg',
            '  core/heading:text-2xl font-bold',
            '  core/paragraph:mt-2 text-slate-600',
            '  core/paragraph:-',
        ]);

        const [group] = seeds;
        expect(group.attributes.tagName).toBe('div');
        expect(group.innerBlocks[0].attributes).toMatchObject({ level: 2, content: 'Card title' });
        // The anchor is kept whole rather than rebuilt as a button block, whose
        // wrappers carry the theme's own padding and background
        expect(group.innerBlocks[2].attributes.content).toBe(
            '<a href="/more" class="btn btn-primary">Read more</a>'
        );
    });

    test('semantic containers keep their tag', () => {
        const [section] = htmlToBlockSeeds('<section class="py-16"><h3>Hi</h3><p>There</p></section>');
        expect(section.name).toBe('core/group');
        expect(section.attributes.tagName).toBe('section');
    });

    test('inline markup stays inside its block', () => {
        const [paragraph] = htmlToBlockSeeds('<p class="lead">Hello <strong>world</strong> and <a href="/x">link</a></p>');
        expect(paragraph.name).toBe('core/paragraph');
        expect(paragraph.attributes.content).toBe('Hello <strong>world</strong> and <a href="/x">link</a>');
    });

    test('a div of nothing but text becomes a paragraph wearing its classes', () => {
        const [seed] = htmlToBlockSeeds('<div class="text-sm text-slate-500">Fine print</div>');
        expect(seed.name).toBe('core/paragraph');
        expect(seed.attributes).toMatchObject({ className: 'text-sm text-slate-500', content: 'Fine print' });
    });

    test('lists become list blocks, items and all', () => {
        const [list] = htmlToBlockSeeds('<ul class="space-y-2"><li class="flex">One</li><li>Two</li></ul>');
        expect(list.name).toBe('core/list');
        expect(list.attributes).toMatchObject({ ordered: false, className: 'space-y-2' });
        expect(shape(list.innerBlocks)).toEqual(['core/list-item:flex', 'core/list-item:-']);

        const [ordered] = htmlToBlockSeeds('<ol><li>One</li></ol>');
        expect(ordered.attributes.ordered).toBe(true);
    });

    test('images become Winden images, source, alt and size intact', () => {
        const [image] = htmlToBlockSeeds('<img src="/hero.png" alt="Hero" width="800">');
        expect(image.name).toBe('winden/image');
        expect(image.attributes).toMatchObject({ url: '/hero.png', alt: 'Hero', width: 800 });
        expect(image.attributes.htmlAttributes).toBeUndefined();
    });

    test('an image wearing classes keeps them on the image', () => {
        // core/image puts className on the <figure> it wraps the image in, so
        // `absolute inset-0 object-cover` would style the wrapper and leave the
        // image sitting where it was — measured on a Tailwind hero. The Winden
        // image is the <img>, so the classes land where they were written.
        const [image] = htmlToBlockSeeds('<img src="/hero.png" alt="" class="absolute inset-0 size-full object-cover">');
        expect(image.name).toBe('winden/image');
        expect(image.attributes).toMatchObject({ url: '/hero.png', alt: '', className: 'absolute inset-0 size-full object-cover' });
    });

    test('what an image wears beyond src and alt rides along as attributes', () => {
        const [image] = htmlToBlockSeeds('<img src="/a.png" loading="lazy" decoding="async" aria-hidden="true" data-x="1" style="object-position: 30% 50%">');
        expect(image.attributes.htmlAttributes).toEqual({
            loading: 'lazy',
            decoding: 'async',
            'aria-hidden': 'true',
            'data-x': '1',
            style: 'object-position: 30% 50%',
        });
    });

    test('a foreign image keeps its URL and gives up nothing else', () => {
        // Pasted from a library or from someone else's WordPress: the src is
        // theirs and so is the id. WordPress reads `wp-image-12` at render
        // time and attaches whatever attachment 12 is *here* — another
        // photo's srcset on this one — so the id is refused and the class
        // goes with it.
        const [image] = htmlToBlockSeeds('<img src="https://cdn.example.com/a.png" class="wp-image-12 rounded-xl">');
        expect(image.name).toBe('winden/image');
        expect(image.attributes.id).toBeUndefined();
        expect(image.attributes.url).toBe('https://cdn.example.com/a.png');
        expect(image.attributes.className).toBe('rounded-xl');
    });

    test('a media library image gives up its wp-image class as the attachment id', () => {
        // `wp-image-12` is what WordPress reads to add srcset; the block keeps
        // it as `id` and writes the class back itself, so it is not a class the
        // user sees or has to keep
        const [image] = htmlToBlockSeeds('<img src="/a.png" class="wp-image-12 rounded-xl">');
        expect(image.attributes).toMatchObject({ id: 12, className: 'rounded-xl' });

        const [bare] = htmlToBlockSeeds('<img src="/a.png" class="wp-image-7">');
        expect(bare.attributes.id).toBe(7);
        expect(bare.attributes.className).toBeUndefined();
    });

    test('what a block cannot wear becomes htmlAttributes on it', () => {
        // The gradient blobs in every Tailwind hero: an empty div whose whole
        // appearance is a clip-path in a style attribute. Empty, so it is a
        // shape rather than a group — an empty group draws a placeholder card
        // inside the decoration.
        const [shape] = htmlToBlockSeeds('<div style="clip-path: polygon(0 0)" class="aspect-1097/845 opacity-20"></div>');
        expect(shape.name).toBe('core/group');
        expect(shape.attributes).toMatchObject({
            tagName: 'div',
            windenShape: true,
            className: 'aspect-1097/845 opacity-20',
            htmlAttributes: { style: 'clip-path: polygon(0 0)' },
        });
        expect(shape.innerBlocks).toEqual([]);

        const [decoration] = htmlToBlockSeeds('<div aria-hidden="true" class="blur-3xl"><span>x</span></div>');
        // Inline content, so it is a paragraph — still wearing aria-hidden
        expect(decoration.name).toBe('core/paragraph');
        expect(decoration.attributes).toMatchObject({ className: 'blur-3xl', htmlAttributes: { 'aria-hidden': 'true' } });

        const [heading] = htmlToBlockSeeds('<h2 data-testid="title" role="heading">Hi</h2>');
        expect(heading.name).toBe('core/heading');
        expect(heading.attributes.htmlAttributes).toEqual({ 'data-testid': 'title', role: 'heading' });
    });

    test('an event handler is the one attribute a block refuses', () => {
        // Spreading `onclick` onto a wrapper would run whatever was pasted, and
        // kses strips it for most users anyway — so it stays custom HTML
        const [button] = htmlToBlockSeeds('<div class="cta" onclick="go()">Go</div>');
        expect(button.name).toBe('core/html');
        expect(button.attributes.content).toContain('onclick');
    });

    test('a description list keeps its tags', () => {
        // The stats row of a Tailwind hero: dl > div > dt + dd
        const seeds = htmlToBlockSeeds(`
            <dl class="grid grid-cols-4">
              <div class="flex flex-col-reverse gap-1">
                <dt class="text-base/7">Offices <span>worldwide</span></dt>
                <dd class="text-4xl">12</dd>
              </div>
            </dl>
        `);
        expect(shape(seeds)).toEqual([
            'core/group:grid grid-cols-4',
            '  core/group:flex flex-col-reverse gap-1',
            '    core/group:text-base/7',
            '      core/paragraph:-',
            '    core/group:text-4xl',
            '      core/paragraph:-',
        ]);
        const [dl] = seeds;
        expect(dl.attributes.tagName).toBe('dl');
        expect(dl.attributes.windenGroup).toBe(true);
        // A plain div group is not marked
        expect(dl.innerBlocks[0].attributes.windenGroup).toBeUndefined();
        const [dt, dd] = dl.innerBlocks[0].innerBlocks;
        expect(dt.attributes.tagName).toBe('dt');
        expect(dt.innerBlocks[0].attributes.content).toBe('Offices <span>worldwide</span>');
        expect(dd.attributes.tagName).toBe('dd');
    });

    test('a figure is a group, and the image inside it a Winden image', () => {
        const [figure] = htmlToBlockSeeds('<figure class="m-0"><img src="/a.png" class="rounded"><figcaption>Cap</figcaption></figure>');
        expect(figure.attributes.tagName).toBe('figure');
        expect(figure.innerBlocks.map((seed) => seed.name)).toEqual(['winden/image', 'core/group']);
        expect(figure.innerBlocks[1].attributes.tagName).toBe('figcaption');
    });

    test('an id survives as the block anchor', () => {
        expect(htmlToBlockSeeds('<section id="pricing" class="py-16"><h2>Plans</h2></section>')[0].attributes)
            .toMatchObject({ anchor: 'pricing', className: 'py-16' });
    });

    test('a row of links stays a row, not a paragraph', () => {
        // grid/flex classes on a <p> with the links as its text is not the
        // layout anyone wrote
        const [row] = htmlToBlockSeeds('<div class="flex gap-8"><a href="/a">Open roles</a><a href="/b">Our values</a></div>');
        expect(row.name).toBe('core/group');
        expect(row.attributes.className).toBe('flex gap-8');
        expect(row.innerBlocks.map((seed) => seed.name)).toEqual(['core/paragraph', 'core/paragraph']);
        expect(row.innerBlocks[0].attributes.content).toBe('<a href="/a">Open roles</a>');
    });

    test('a link inside a sentence stays inside the sentence', () => {
        const [prose] = htmlToBlockSeeds('<div class="text-sm">Read the <a href="/docs">docs</a> first</div>');
        expect(prose.name).toBe('core/paragraph');
        expect(prose.attributes.content).toContain('<a href="/docs">docs</a>');
    });

    test('a standalone <time> is a Winden text, tag and datetime intact', () => {
        // It used to be `core/html`: `<time>` is an inline tag, so the converter
        // only saw it as content inside another block, and at block position no
        // rule matched it at all
        const [card] = htmlToBlockSeeds(
            '<div class="card"><time datetime="2022-10-10" class="block text-xs text-white/90">10th Oct 2022</time><h3 class="text-lg">Title</h3></div>'
        );

        expect(card.innerBlocks.map((seed) => seed.name)).toEqual(['winden/text', 'core/heading']);
        const [time] = card.innerBlocks;
        expect(time.attributes).toMatchObject({
            tagName: 'time',
            content: '10th Oct 2022',
            className: 'block text-xs text-white/90',
            htmlAttributes: { datetime: '2022-10-10' },
        });
    });

    test('a standalone span is a Winden text too, and keeps its inline markup', () => {
        const [card] = htmlToBlockSeeds(
            '<div class="card"><span class="badge">New <strong>today</strong></span><p>Body</p></div>'
        );
        expect(card.innerBlocks.map((seed) => seed.name)).toEqual(['winden/text', 'core/paragraph']);
        expect(card.innerBlocks[0].attributes).toMatchObject({
            tagName: 'span',
            content: 'New <strong>today</strong>',
            className: 'badge',
        });
    });

    test('an inline tag inside a sentence is still content, not a block', () => {
        // The rule is about block position only — prose must not fragment into
        // a block per emphasised word
        const [prose] = htmlToBlockSeeds('<p class="lead">Published <time datetime="2022-10-10">last Monday</time> by us</p>');
        expect(prose.name).toBe('core/paragraph');
        expect(prose.attributes.content).toBe('Published <time datetime="2022-10-10">last Monday</time> by us');
    });

    test('a div of only inline content is still one paragraph', () => {
        // A `<div>` saying one sentence is a paragraph, and the sentence stays
        // whole — this rule must not break that
        const [prose] = htmlToBlockSeeds('<div class="text-sm">Read the <span class="font-bold">docs</span> first</div>');
        expect(prose.name).toBe('core/paragraph');
        expect(prose.attributes.content).toContain('<span class="font-bold">docs</span>');
    });

    test('a Winden text survives its own saved markup', () => {
        const saved = '<time class="block text-xs" datetime="2022-10-10">10th Oct 2022</time>';
        const [again] = htmlToBlockSeeds(stripGeneratedClasses(saved));
        expect(again.name).toBe('winden/text');
        expect(again.attributes).toMatchObject({
            tagName: 'time',
            className: 'block text-xs',
            htmlAttributes: { datetime: '2022-10-10' },
        });
    });

    test('an inline tag with a handler is still kept as written', () => {
        const [raw] = htmlToBlockSeeds('<span onclick="go()" class="x">Click</span>');
        expect(raw.name).toBe('core/html');
    });

    test('a link around a heading is a group that is a link', () => {
        // The card link every component library is made of. It used to be one
        // paragraph holding the whole anchor as RichText content: `<h3>` is not
        // an inline format, so the heading stopped being a block at all.
        const [link] = htmlToBlockSeeds(
            '<a href="/post" class="block hover:bg-slate-50"><h3 class="mt-0.5 text-lg text-white">How to position your furniture for positivity</h3></a>'
        );

        expect(link.name).toBe('core/group');
        expect(link.attributes.tagName).toBe('a');
        expect(link.attributes.className).toBe('block hover:bg-slate-50');
        // `a` is not one of core's eight sectioning tags, so it is a Winden Group
        // without anyone choosing one
        expect(link.attributes.windenGroup).toBe(true);
        expect(link.attributes.htmlAttributes).toEqual({ href: '/post' });

        expect(shape(link.innerBlocks)).toEqual(['core/heading:mt-0.5 text-lg text-white']);
        expect(link.innerBlocks[0].attributes).toMatchObject({
            level: 3,
            content: 'How to position your furniture for positivity',
        });
    });

    test('a wrapper link keeps target and rel, and the attributes a card needs', () => {
        const [link] = htmlToBlockSeeds(
            '<a href="https://example.com" target="_blank" rel="noreferrer" aria-label="Read the post" data-analytics="card" style="view-transition-name: card">'
            + '<h3>Title</h3><p>Teaser</p></a>'
        );

        expect(link.name).toBe('core/group');
        expect(link.attributes.htmlAttributes).toEqual({
            href: 'https://example.com',
            target: '_blank',
            rel: 'noreferrer',
            'aria-label': 'Read the post',
            'data-analytics': 'card',
            style: 'view-transition-name: card',
        });
        expect(link.innerBlocks.map((seed) => seed.name)).toEqual(['core/heading', 'core/paragraph']);
    });

    test('an anchor wearing more than href is no longer custom HTML', () => {
        // `isRepresentable` runs before the tag is dispatched, and the anchor's
        // allowlist was class/id/href/target/rel — so a link with an aria-label
        // fell out as `core/html` and never reached a block at all
        const [prose] = htmlToBlockSeeds('<a href="/x" aria-label="More" class="underline">More</a>');
        expect(prose.name).toBe('core/paragraph');
        expect(prose.attributes.content).toContain('aria-label="More"');
    });

    test('a link with a handler is still kept exactly as written', () => {
        const [raw] = htmlToBlockSeeds('<a href="/x" onclick="go()"><h3>Title</h3></a>');
        expect(raw.name).toBe('core/html');
        expect(raw.attributes.content).toContain('onclick');
    });

    test('a linked logo is a link around a Winden image', () => {
        const [link] = htmlToBlockSeeds('<a href="/" class="shrink-0"><img src="/logo.svg" alt="Home" class="h-8 w-auto"></a>');
        expect(link.name).toBe('core/group');
        expect(link.attributes.tagName).toBe('a');
        expect(link.innerBlocks.map((seed) => seed.name)).toEqual(['winden/image']);
        expect(link.innerBlocks[0].attributes).toMatchObject({ url: '/logo.svg', alt: 'Home', className: 'h-8 w-auto' });
    });

    test('a nested anchor cannot happen: the parser unnests it first', () => {
        const seeds = htmlToBlockSeeds('<a href="/outer"><h3>Title</h3><a href="/inner">Inner</a></a>');
        expect(seeds.map((seed) => seed.name)).toEqual(['core/group', 'core/paragraph']);
        expect(seeds[0].innerBlocks.map((seed) => seed.name)).toEqual(['core/heading']);
    });

    test('a link group survives its own saved markup', () => {
        // Out through core/group's save — `wp-block-group` and all — and back:
        // the same block, not a group wrapped in another group
        const saved = '<a class="wp-block-group block hover:bg-slate-50" href="/post"><h3 class="text-lg">Title</h3></a>';
        const [again] = htmlToBlockSeeds(stripGeneratedClasses(saved));

        expect(again.name).toBe('core/group');
        expect(again.attributes.tagName).toBe('a');
        expect(again.attributes.className).toBe('block hover:bg-slate-50');
        expect(again.attributes.htmlAttributes).toEqual({ href: '/post' });
        expect(shape(again.innerBlocks)).toEqual(['core/heading:text-lg']);
    });

    test('a link asking for a layout gets one, and is not a Winden Group', () => {
        const [link] = htmlToBlockSeeds(`<a href="/post" ${LAYOUT_ATTRIBUTE}="stack"><h3>Title</h3><p>Teaser</p></a>`);
        expect(link.attributes.tagName).toBe('a');
        expect(link.attributes.layout).toEqual({ type: 'flex', orientation: 'vertical' });
        expect(link.attributes.windenGroup).toBeUndefined();
    });

    test('an SVG keeps its markup, its attributes and its classes', () => {
        const [icon] = htmlToBlockSeeds(
            '<svg viewBox="0 0 10 10" class="h-6 w-6" fill="none" aria-hidden="true"><path d="M0 0"/></svg>'
        );
        expect(icon.name).toBe('winden/icon');
        expect(icon.attributes.className).toBe('h-6 w-6');
        // The children ride in `content`; the SVG's own attributes ride beside
        // them, so the class list stays editable and the icon stays an icon
        expect(icon.attributes.content).toContain('<path');
        expect(icon.attributes.htmlAttributes).toMatchObject({
            viewbox: '0 0 10 10',
            fill: 'none',
            'aria-hidden': 'true',
        });
    });

    // `core/icon` looks like it takes markup and does not: its `icon` is a name
    // looked up in `WP_Icons_Registry`, and a miss renders nothing at all
    test('an SVG is never mapped onto the core icon block', () => {
        const seeds = htmlToBlockSeeds('<div><svg viewBox="0 0 10 10"><path d="M0 0"/></svg></div>');
        const names = JSON.stringify(seeds);
        expect(names).not.toContain('core/icon');
    });

    test('a table becomes a table', () => {
        const [table] = htmlToBlockSeeds(`
            <table class="w-full text-sm">
              <caption>Plans</caption>
              <thead><tr><th>Plan</th><th>Price</th></tr></thead>
              <tbody><tr><td>Free</td><td>0</td></tr><tr><td>Pro</td><td>9</td></tr></tbody>
              <tfoot><tr><td colspan="2">Billed yearly</td></tr></tfoot>
            </table>
        `);

        expect(table.name).toBe('core/table');
        expect(table.attributes.className).toBe('w-full text-sm');
        expect(table.attributes.caption).toBe('Plans');
        expect(table.attributes.head).toEqual([
            { cells: [{ content: 'Plan', tag: 'th' }, { content: 'Price', tag: 'th' }] },
        ]);
        expect(table.attributes.body).toEqual([
            { cells: [{ content: 'Free', tag: 'td' }, { content: '0', tag: 'td' }] },
            { cells: [{ content: 'Pro', tag: 'td' }, { content: '9', tag: 'td' }] },
        ]);
        // The span is kept: `core/table` declares `colspan` on each cell, and
        // this used to read the markup as representable and then drop it
        expect(table.attributes.foot).toEqual([
            { cells: [{ content: 'Billed yearly', tag: 'td', colspan: '2' }] },
        ]);
    });

    test('behaviour and foreign documents stay as markup', () => {
        const [form] = htmlToBlockSeeds('<form action="/x"><input name="q"></form>');
        expect(form.name).toBe('core/html');
        expect(form.attributes.content).toContain('<input');

        const [frame] = htmlToBlockSeeds('<iframe src="https://example.com"></iframe>');
        expect(frame.name).toBe('core/html');
    });

    test('a nav keeps being a nav', () => {
        const [nav] = htmlToBlockSeeds('<nav class="flex gap-4"><a href="/a">A</a></nav>');
        expect(nav.name).toBe('core/group');
        expect(nav.attributes.tagName).toBe('nav');
        expect(nav.innerBlocks[0].name).toBe('core/paragraph');
    });

    test('only a div collapses to a paragraph — semantics are not text', () => {
        // A section saying one sentence still means "section"
        const [section] = htmlToBlockSeeds('<section class="py-2">Just a sentence</section>');
        expect(section.name).toBe('core/group');
        expect(section.attributes.tagName).toBe('section');
    });

    test('nesting survives to the depth it was written', () => {
        const seeds = htmlToBlockSeeds(`
            <section class="a"><div class="b"><div class="c"><h4 class="d">Deep</h4></div></div></section>
        `);
        expect(shape(seeds)).toEqual([
            'core/group:a',
            '  core/group:b',
            '    core/group:c',
            '      core/heading:d',
        ]);
    });

    test("Gutenberg's own wp-block classes do not come back as user classes", () => {
        // Editing a block as HTML shows its saved markup, which carries the
        // class Gutenberg writes itself. Reading it back would append a copy
        // on every round trip.
        const [group] = htmlToBlockSeeds('<div class="wp-block-group grid gap-4"><p class="wp-block-paragraph text-sm">Hi</p></div>');
        expect(group.attributes.className).toBe('grid gap-4');
        expect(group.innerBlocks[0].attributes.className).toBe('text-sm');
    });

    test('a block wearing nothing but its generated class carries none', () => {
        const [group] = htmlToBlockSeeds('<div class="wp-block-group"><h2>Title</h2></div>');
        expect(group.attributes.className).toBeUndefined();
    });

    test('the plain tags map to the blocks that are those tags', () => {
        // The rule: base HTML wherever a block is that HTML. Only what cannot
        // be written as markup falls back to a marker.
        expect(htmlToBlockSeeds('<hr class="my-8">')[0]).toMatchObject({
            name: 'core/separator',
            attributes: { className: 'my-8' },
        });

        // Core's own quote, recognised by the class it writes — consumed here,
        // written again on save
        const [quote] = htmlToBlockSeeds('<blockquote class="wp-block-quote border-l-4"><p>Said it</p><cite>Someone</cite></blockquote>');
        expect(quote.name).toBe('core/quote');
        expect(quote.attributes).toMatchObject({ className: 'border-l-4', citation: 'Someone' });
        expect(quote.innerBlocks[0]).toMatchObject({ name: 'core/paragraph', attributes: { content: 'Said it' } });

        // A list whose items hold a block — the check icon in every pricing
        // card — is a Winden Group <ul> of Winden Group <li>s: core/list-item
        // is rich text, and RichText drops an <svg> on the floor
        const [features] = htmlToBlockSeeds(`<ul role="list" class="mt-8 space-y-3">
            <li class="flex gap-x-3"><svg class="h-6 w-5 flex-none" viewBox="0 0 20 20"><path d="M1 1"/></svg> 25 products</li>
            <li class="flex gap-x-3"><svg class="h-6 w-5 flex-none" viewBox="0 0 20 20"><path d="M1 1"/></svg> Advanced analytics</li>
        </ul>`);
        expect(features).toMatchObject({
            name: 'core/group',
            attributes: { tagName: 'ul', className: 'mt-8 space-y-3', windenGroup: true, htmlAttributes: { role: 'list' } },
        });
        expect(features.innerBlocks).toHaveLength(2);
        expect(features.innerBlocks[0]).toMatchObject({
            name: 'core/group',
            attributes: { tagName: 'li', className: 'flex gap-x-3', windenGroup: true },
        });
        expect(features.innerBlocks[0].innerBlocks.map((seed) => seed.name)).toEqual(['winden/icon', 'core/paragraph']);
        expect(features.innerBlocks[0].innerBlocks[1].attributes.content).toBe('25 products');
        // …while a list of sentences is still a list
        const [plain] = htmlToBlockSeeds('<ul class="list-disc"><li>One</li><li><strong>Two</strong></li></ul>');
        expect(plain.name).toBe('core/list');
        expect(plain.innerBlocks.map((seed) => seed.name)).toEqual(['core/list-item', 'core/list-item']);

        // A Tailwind blockquote is a styled element, not the block the theme
        // styles: core/quote's border and padding would beat its classes
        const [styled] = htmlToBlockSeeds('<blockquote class="text-xl font-semibold text-white"><p>Said it</p></blockquote>');
        expect(styled).toMatchObject({
            name: 'core/group',
            attributes: { tagName: 'blockquote', className: 'text-xl font-semibold text-white', windenGroup: true },
        });
        expect(styled.innerBlocks[0]).toMatchObject({ name: 'core/paragraph', attributes: { content: 'Said it' } });

        expect(htmlToBlockSeeds('<pre class="p-4"><code>npm run build</code></pre>')[0]).toMatchObject({
            name: 'core/code',
            attributes: { className: 'p-4', content: 'npm run build' },
        });

        expect(htmlToBlockSeeds('<pre>  spaced  </pre>')[0]).toMatchObject({
            name: 'core/preformatted',
            attributes: { content: 'spaced' },
        });
    });

    test('a marker wears the name of the block it stands in for', () => {
        expect(preservedTag('core/query')).toBe('core-query');
        expect(preservedTag('fancoolo/hero-banner')).toBe('fancoolo-hero-banner');
        // A block registered without a namespace still needs a hyphen to be a
        // custom element at all
        expect(preservedTag('legacy')).toBe('wp-legacy');

        const [preserved] = htmlToBlockSeeds('<core-query data-ref="2"></core-query>');
        expect(preserved).toMatchObject({
            name: PRESERVED_BLOCK,
            attributes: { ref: '2', blockName: 'core-query' },
        });
    });

    test('a custom element that is not a marker stays the markup it was', () => {
        // Someone else's web component in a pasted page is not our stand-in
        const [widget] = htmlToBlockSeeds('<my-widget data-id="7">Hi</my-widget>');
        expect(widget.name).toBe('core/html');
        expect(widget.attributes.content).toContain('<my-widget');
    });

    test('a whole Tailwind hero comes through as blocks, with nothing left as custom HTML', () => {
        // The "Work with us" hero from Tailwind Plus: a positioned background
        // image, two clip-path gradient blobs, a link row and a stats <dl>
        const seeds = htmlToBlockSeeds(`
            <div class="relative isolate overflow-hidden bg-gray-900 py-24 sm:py-32">
              <img src="https://images.unsplash.com/photo?w=2830" alt="" class="absolute inset-0 -z-10 size-full object-cover object-right md:object-center" />
              <div aria-hidden="true" class="hidden sm:absolute sm:-top-10 sm:right-1/2 sm:-z-10 sm:mr-10 sm:block sm:transform-gpu sm:blur-3xl">
                <div style="clip-path: polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%)" class="aspect-1097/845 w-274.25 bg-linear-to-tr from-[#ff4694] to-[#776fff] opacity-20"></div>
              </div>
              <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="mx-auto max-w-2xl lg:mx-0">
                  <h2 class="text-5xl font-semibold tracking-tight text-white sm:text-7xl">Work with us</h2>
                  <p class="mt-8 text-lg font-medium text-pretty text-gray-300 sm:text-xl/8">Anim aute id magna aliqua.</p>
                </div>
                <div class="grid grid-cols-1 gap-x-8 gap-y-6 text-base/7 font-semibold text-white sm:grid-cols-2 md:flex lg:gap-x-10">
                  <a href="#">Open roles <span aria-hidden="true">&rarr;</span></a>
                  <a href="#">Internship program <span aria-hidden="true">&rarr;</span></a>
                </div>
                <dl class="mt-16 grid grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
                  <div class="flex flex-col-reverse gap-1">
                    <dt class="text-base/7 text-gray-300">Offices worldwide</dt>
                    <dd class="text-4xl font-semibold tracking-tight text-white">12</dd>
                  </div>
                </dl>
              </div>
            </div>
        `);

        const names = (blocks: BlockSeed[]): string[] => blocks.flatMap((seed) => [seed.name, ...names(seed.innerBlocks)]);
        expect(names(seeds)).not.toContain('core/html');

        const [hero] = seeds;
        const [image, blob] = hero.innerBlocks;
        expect(image.name).toBe('winden/image');
        expect(image.attributes.className).toContain('object-cover');
        expect(blob.attributes.htmlAttributes).toEqual({ 'aria-hidden': 'true' });
        expect((blob.innerBlocks[0].attributes.htmlAttributes as Record<string, string>).style).toMatch(/^clip-path: polygon\(/);
    });

    test('empty input is not an error', () => {
        expect(htmlToBlockSeeds('')).toEqual([]);
        expect(htmlToBlockSeeds('   ')).toEqual([]);
    });
});

describe('classes on custom HTML', () => {
    // Everything a block cannot wear lands in core/html, which has nowhere to
    // keep a className — so the panel edits the markup's own class attribute
    test('reads the class list off a single element', () => {
        expect(rootClassName('<img src="/a.png" class="absolute inset-0">')).toBe('absolute inset-0');
        expect(rootClassName('<div></div>')).toBe('');
    });

    test('writes it back, and removes an attribute left empty', () => {
        expect(withRootClassName('<img src="/a.png" class="absolute">', 'absolute inset-0 size-full'))
            .toBe('<img src="/a.png" class="absolute inset-0 size-full">');
        expect(withRootClassName('<div class="blur-3xl"></div>', '  ')).toBe('<div></div>');
    });

    test('markup that is not one element is left alone', () => {
        // Two roots, or text beside the element: there is no "the" class here
        expect(rootClassName('<span>a</span><span>b</span>')).toBeNull();
        expect(rootClassName('text <span>a</span>')).toBeNull();
        expect(withRootClassName('<span>a</span><span>b</span>', 'p-4')).toBe('<span>a</span><span>b</span>');
    });
});

describe('stripGeneratedClasses', () => {
    test('takes out what the block wrote, keeps what the user wrote', () => {
        expect(stripGeneratedClasses('<div class="wp-block-group grid gap-4"><p>Hi</p></div>'))
            .toBe('<div class="grid gap-4"><p>Hi</p></div>');
    });

    test('an attribute left with nothing in it goes too', () => {
        expect(stripGeneratedClasses('<div class="wp-block-group"><p>Hi</p></div>'))
            .toBe('<div><p>Hi</p></div>');
    });

    test('markup without classes comes back as it went in', () => {
        expect(stripGeneratedClasses('<p>Hi</p>')).toBe('<p>Hi</p>');
        expect(stripGeneratedClasses('  ')).toBe('');
    });
});

/**
 * A group's variation is its `layout` attribute and nothing else, and the
 * saved markup is identical for all four — so without an attribute saying
 * which, every container came back a plain group.
 */
describe('data-wp-layout', () => {
    const layoutOf = (markup: string) => htmlToBlockSeeds(markup)[0];

    test('names the four variations core offers', () => {
        expect(layoutOf('<div data-wp-layout="constrained"><p>a</p></div>').attributes.layout)
            .toEqual({ type: 'constrained' });
        expect(layoutOf('<div data-wp-layout="row"><p>a</p></div>').attributes.layout)
            .toEqual({ type: 'flex', flexWrap: 'nowrap' });
        expect(layoutOf('<div data-wp-layout="stack"><p>a</p></div>').attributes.layout)
            .toEqual({ type: 'flex', orientation: 'vertical' });
        expect(layoutOf('<div data-wp-layout="grid"><p>a</p></div>').attributes.layout)
            .toEqual({ type: 'grid' });
    });

    test('the attribute is consumed, not left on the block as markup', () => {
        const group = layoutOf('<section data-wp-layout="grid" class="gap-4"><p>a</p></section>');
        expect(group.attributes.htmlAttributes).toBeUndefined();
        expect(group.attributes.className).toBe('gap-4');
        expect(group.attributes.tagName).toBe('section');
    });

    test('a layout and Winden Group cannot both be true — the markup wins', () => {
        // Winden Group is the variation that means "no layout"; a tag outside
        // core's own select would otherwise make this one anyway
        const figure = layoutOf('<figure data-wp-layout="row"><p>a</p></figure>');
        expect(figure.attributes.windenGroup).toBeUndefined();
        expect(figure.attributes.tagName).toBe('figure');

        // Same when it is `style` that would have forced a Winden Group
        const styled = layoutOf('<div data-wp-layout="grid" style="gap:1rem"><p>a</p></div>');
        expect(styled.attributes.windenGroup).toBeUndefined();
        expect(styled.attributes.htmlAttributes).toEqual({ style: 'gap:1rem' });
    });

    test('without it a container is what it always was', () => {
        const plain = layoutOf('<div class="flex gap-4"><p>a</p></div>');
        expect(plain.attributes.layout).toBeUndefined();
        // Not inferred from `flex`: core layout CSS would fight the class
        expect(plain.attributes.className).toBe('flex gap-4');
    });

    test('a name it does not know is ignored rather than guessed at', () => {
        const seed = layoutOf('<div data-wp-layout="masonry"><p>a</p></div>');
        expect(seed.attributes.layout).toBeUndefined();
        // Consumed all the same — a layout attribute is never content
        expect(seed.attributes.htmlAttributes).toBeUndefined();
    });

    test('asking for a layout keeps a div of text a container', () => {
        // A div of nothing but inline content is a paragraph wearing its
        // classes — but a paragraph has no layout to give
        expect(layoutOf('<div class="p-4">Just words</div>').name).toBe('core/paragraph');
        expect(layoutOf('<div data-wp-layout="stack" class="p-4">Just words</div>').name).toBe('core/group');
    });

    test('the attribute name is the one the writer-back uses', () => {
        expect(LAYOUT_ATTRIBUTE).toBe('data-wp-layout');
    });
});

describe('layoutName', () => {
    test('reads back every layout the converter writes', () => {
        expect(layoutName({ type: 'constrained' })).toBe('constrained');
        expect(layoutName({ type: 'flex', flexWrap: 'nowrap' })).toBe('row');
        expect(layoutName({ type: 'flex', orientation: 'vertical' })).toBe('stack');
        expect(layoutName({ type: 'grid' })).toBe('grid');
    });

    test('a flex layout with no orientation is a Row, as core reads it', () => {
        expect(layoutName({ type: 'flex' })).toBe('row');
        expect(layoutName({ type: 'flex', orientation: 'horizontal' })).toBe('row');
    });

    test('nothing to say about a group that has no layout', () => {
        expect(layoutName(undefined)).toBeNull();
        expect(layoutName(null)).toBeNull();
        expect(layoutName({})).toBeNull();
        expect(layoutName({ type: 'default' })).toBeNull();
        expect(layoutName('grid')).toBeNull();
    });
});

/**
 * A newline between words is whitespace in HTML. RichText disagrees and writes
 * a literal `<br>`, so a formatter wrapping a long paragraph to fit the editor
 * put a line break in the text every time it was applied.
 */
describe('line breaks in text', () => {
    test('a wrapped paragraph comes back as one line', () => {
        const [paragraph] = htmlToBlockSeeds('<p>In a village of La Mancha, the name of\n  which I have no desire to call to mind.</p>');
        expect(paragraph.attributes.content).toBe(
            'In a village of La Mancha, the name of which I have no desire to call to mind.'
        );
    });

    test('and so do headings, list items and cells', () => {
        const [heading] = htmlToBlockSeeds('<h2>A title that the\n  formatter split</h2>');
        expect(heading.attributes.content).toBe('A title that the formatter split');

        const [list] = htmlToBlockSeeds('<ul><li>An item that the\n  formatter split</li></ul>');
        expect(list.innerBlocks[0].attributes.content).toBe('An item that the formatter split');

        const [table] = htmlToBlockSeeds('<table><tbody><tr><td>A cell that the\n  formatter split</td></tr></tbody></table>');
        const body = table.attributes.body as { cells: { content: string }[] }[];
        expect(body[0].cells[0].content).toBe('A cell that the formatter split');
    });

    test('an explicit <br> is still a line break', () => {
        const [paragraph] = htmlToBlockSeeds('<p>First line<br>second line</p>');
        expect(paragraph.attributes.content).toBe('First line<br>second line');
    });

    test('but a <pre> keeps every newline it was given', () => {
        // Preformatted text is newlines — collapsing them is the one thing
        // that would destroy it
        const [pre] = htmlToBlockSeeds('<pre>one\ntwo\nthree</pre>');
        expect(pre.name).toBe('core/preformatted');
        expect(pre.attributes.content).toBe('one\ntwo\nthree');
    });
});

/**
 * Core writes `<figure class="wp-block-image">`; a Tailwind library writes a
 * bare `<figure>`. Same tag, different block, and the class is the whole
 * difference — so it survives `stripGeneratedClasses` and is consumed here.
 */
describe('core Image and Gallery', () => {
    test('a core image figure keeps its caption, size and id', () => {
        const [image] = htmlToBlockSeeds(
            '<figure class="wp-block-image size-large"><img src="/uploads/MtBlanc1.jpg" alt="" class="wp-image-9"><figcaption class="wp-element-caption">Mont Blanc appears—still, snowy, and serene.</figcaption></figure>'
        );

        expect(image.name).toBe('core/image');
        expect(image.attributes).toMatchObject({
            url: '/uploads/MtBlanc1.jpg',
            alt: '',
            id: 9,
            sizeSlug: 'large',
            caption: 'Mont Blanc appears—still, snowy, and serene.',
        });
        // The class that named the block is not a class the user wrote
        expect(image.attributes.className).toBeUndefined();
    });

    test('alignment and a link around the image come through', () => {
        const [image] = htmlToBlockSeeds(
            '<figure class="wp-block-image alignwide is-style-rounded"><a href="/about" target="_blank" rel="noreferrer"><img src="/uploads/a.png" alt="A"></a></figure>'
        );

        expect(image.attributes).toMatchObject({
            align: 'wide',
            href: '/about',
            linkDestination: 'custom',
            linkTarget: '_blank',
            rel: 'noreferrer',
            className: 'is-style-rounded',
        });
    });

    test('a link to the image itself is the media destination', () => {
        const [image] = htmlToBlockSeeds(
            '<figure class="wp-block-image"><a href="/uploads/a.png"><img src="/uploads/a.png" alt=""></a></figure>'
        );
        expect(image.attributes.linkDestination).toBe('media');
    });

    test('a gallery keeps its columns, its crop and its images', () => {
        const [gallery] = htmlToBlockSeeds(
            '<figure class="wp-block-gallery has-nested-images columns-2 is-cropped wp-block-gallery-2 is-layout-flex wp-block-gallery-is-layout-flex">'
            + '<figure class="wp-block-image"><img src="/uploads/lake.jpg" alt=""></figure>'
            + '<figure class="wp-block-image"><img src="/uploads/sediment.jpg" alt=""></figure>'
            + '</figure>'
        );

        expect(gallery.name).toBe('core/gallery');
        expect(gallery.attributes).toMatchObject({ columns: 2, imageCrop: true });
        // Everything the gallery wrote about itself, gone
        expect(gallery.attributes.className).toBeUndefined();
        expect(gallery.innerBlocks.map((seed) => seed.name)).toEqual(['core/image', 'core/image']);
        expect(gallery.innerBlocks[1].attributes.url).toBe('/uploads/sediment.jpg');
    });

    test('a gallery without is-cropped is not cropped', () => {
        const [gallery] = htmlToBlockSeeds(
            '<figure class="wp-block-gallery has-nested-images columns-3"><figure class="wp-block-image"><img src="/a.png" alt=""></figure></figure>'
        );
        expect(gallery.attributes).toMatchObject({ columns: 3, imageCrop: false });
    });

    test('a Tailwind figure is still a group holding a Winden image', () => {
        // No `wp-block-image`, so nobody wrote this as a core Image — the
        // classes belong on the image, which is the point of Winden image
        const [figure] = htmlToBlockSeeds(
            '<figure class="relative"><img src="/a.png" alt="" class="absolute inset-0 object-cover"></figure>'
        );
        expect(figure.name).toBe('core/group');
        expect(figure.attributes.tagName).toBe('figure');
        expect(figure.innerBlocks[0].name).toBe('winden/image');
        expect(figure.innerBlocks[0].attributes.className).toBe('absolute inset-0 object-cover');
    });

    test('the identity class survives the strip, the rest does not', () => {
        expect(stripGeneratedClasses('<figure class="wp-block-image size-large"><img src="/a.png"></figure>'))
            .toBe('<figure class="wp-block-image size-large"><img src="/a.png"></figure>');
        expect(stripGeneratedClasses('<div class="wp-block-group p-4"></div>'))
            .toBe('<div class="p-4"></div>');
    });
});

/**
 * The caret moving the selection: the nth element at depth zero is the nth
 * block, counted off the text because the formatter reflows it.
 */
describe('topLevelIndexAtLine', () => {
    const markup = [
        '<h3>winden/image</h3>',            // 1  → 0
        '<p>Some prose that the formatter', // 2  → 1
        '  wrapped onto a second line.</p>',// 3  → 1
        '<figure class="wp-block-gallery">',// 4  → 2
        '  <figure class="wp-block-image">',// 5  → 2
        '    <img src="/a.png" alt="">',    // 6  → 2
        '  </figure>',                      // 7  → 2
        '</figure>',                        // 8  → 2
        '<hr>',                             // 9  → 3
        '<h3>after</h3>',                   // 10 → 4
    ].join('\n');

    test('each line resolves to the block it is inside', () => {
        expect(topLevelIndexAtLine(markup, 1)).toBe(0);
        expect(topLevelIndexAtLine(markup, 2)).toBe(1);
        // A wrapped line is still the same block
        expect(topLevelIndexAtLine(markup, 3)).toBe(1);
        expect(topLevelIndexAtLine(markup, 4)).toBe(2);
        // Nested markup resolves to the block that contains it
        expect(topLevelIndexAtLine(markup, 6)).toBe(2);
        expect(topLevelIndexAtLine(markup, 8)).toBe(2);
    });

    test('a void tag does not open a level', () => {
        // `<hr>` never closes; counting it as open would put every later block
        // inside it
        expect(topLevelIndexAtLine(markup, 9)).toBe(3);
        expect(topLevelIndexAtLine(markup, 10)).toBe(4);
    });

    test('a self-closing tag does not either', () => {
        const text = '<img src="/a.png"/>\n<p>after</p>';
        expect(topLevelIndexAtLine(text, 2)).toBe(1);
    });

    test('a comment is not a tag', () => {
        const text = '<!-- <div> not really -->\n<p>after</p>';
        expect(topLevelIndexAtLine(text, 2)).toBe(0);
    });

    test('past the end is the last block, and empty markup is nothing', () => {
        expect(topLevelIndexAtLine(markup, 999)).toBe(4);
        expect(topLevelIndexAtLine('', 1)).toBe(-1);
    });
});

/**
 * The component vocabulary: a tag that names the block rather than markup that
 * happens to look like it.
 *
 * Columns is the case it exists for. Its widths hide in inline styles, its
 * settings are classes core writes at save time, and read back as HTML it is
 * two nested groups — the right pixels, the wrong block.
 */
describe('component tags', () => {
    // The real schemas, copied from wp-includes/blocks/*/block.json
    const SCHEMAS: Record<string, BlockSchema> = {
        'core/columns': {
            attributes: {
                verticalAlignment: { type: 'string' },
                isStackedOnMobile: { type: 'boolean', default: true },
            },
        },
        'core/column': {
            attributes: {
                verticalAlignment: { type: 'string' },
                width: { type: 'string' },
            },
            parent: ['core/columns'],
        },
        'core/buttons': { attributes: {} },
        'core/button': {
            attributes: {
                text: { type: 'rich-text', source: 'html' },
                url: { type: 'string', source: 'attribute' },
            },
            parent: ['core/buttons'],
        },
    };

    const options: ConvertOptions = {
        blockForTag: (tag) => {
            const name = blockNameForTag(tag);
            return name && name in SCHEMAS ? name : null;
        },
        blockSchema: (name) => SCHEMAS[name] ?? null,
    };

    test('a written component tag becomes the block it names', () => {
        const seeds = htmlToBlockSeeds(`
            <core-columns class="gap-8" vertical-alignment="center" is-stacked-on-mobile="false">
              <core-column width="33.33%"><h2 class="text-2xl">A</h2></core-column>
              <core-column width="66.66%"><p>B</p></core-column>
            </core-columns>
        `, undefined, options);

        expect(shape(seeds)).toEqual([
            'core/columns:gap-8',
            '  core/column:-',
            '    core/heading:text-2xl',
            '  core/column:-',
            '    core/paragraph:-',
        ]);

        // `false` and `"false"` are not the same thing: the string reads as
        // true everywhere the attribute is checked
        expect(seeds[0].attributes).toMatchObject({
            className: 'gap-8',
            verticalAlignment: 'center',
            isStackedOnMobile: false,
        });
        expect(seeds[0].innerBlocks[0].attributes.width).toBe('33.33%');
    });

    test('a bare attribute is true, the way HTML means it', () => {
        const [columns] = htmlToBlockSeeds('<core-columns is-stacked-on-mobile></core-columns>', undefined, options);
        expect(columns.attributes.isStackedOnMobile).toBe(true);
    });

    test('what has no attribute spelling rides in data-wp-attrs', () => {
        const [columns] = htmlToBlockSeeds(
            `<core-columns data-wp-attrs='{"layout":{"type":"flex"}}'></core-columns>`,
            undefined,
            options
        );
        expect(columns.attributes.layout).toEqual({ type: 'flex' });
    });

    test('an id is the anchor, as it is on every other block', () => {
        const [columns] = htmlToBlockSeeds('<core-columns id="pricing"></core-columns>', undefined, options);
        expect(columns.attributes.anchor).toBe('pricing');
    });

    test('the content attribute is written between the tags, not on them', () => {
        // Both directions say the same thing, so what the panel emits is what
        // someone can type back
        expect(componentOpenTag('core/button', { text: 'Read more', url: '/shop' }, SCHEMAS['core/button']))
            .toBe('<core-button url="/shop">');
    });

    test('a block with one possible parent is taken there rather than demoted', () => {
        // `core/column` declares `parent: ["core/columns"]`; built anywhere
        // else the editor flags it invalid rather than showing it. A column
        // written on its own is a column someone wants, and there is exactly
        // one place it can be — which is what Gutenberg does with a pasted one.
        const seeds = htmlToBlockSeeds('<core-column class="p-4"><p>Alone</p></core-column>', undefined, options);

        expect(shape(seeds)).toEqual([
            'core/columns:-',
            '  core/column:p-4',
            '    core/paragraph:-',
        ]);
    });

    /**
     * A Button's label is a `rich-text` attribute, not a child — so the text
     * written between the tags has to become that attribute. It used to become
     * a paragraph inside the button: a child a Button does not accept, with
     * the label left empty, which on the canvas is a button that is not there.
     */
    test("a component tag's text is the block's own content attribute", () => {
        const [buttons] = htmlToBlockSeeds(
            '<core-buttons><core-button>Read more</core-button></core-buttons>',
            undefined,
            options
        );

        const [button] = buttons.innerBlocks;
        expect(button.name).toBe('core/button');
        expect(button.attributes.text).toBe('Read more');
        expect(button.innerBlocks).toEqual([]);
    });

    test('the formatting inside it survives', () => {
        const [buttons] = htmlToBlockSeeds(
            '<core-buttons><core-button>Second <strong>bold</strong></core-button></core-buttons>',
            undefined,
            options
        );
        expect(buttons.innerBlocks[0].attributes.text).toBe('Second <strong>bold</strong>');
    });

    test('an empty one is an empty label, not a block with nothing in it', () => {
        const [buttons] = htmlToBlockSeeds(
            '<core-buttons><core-button></core-button></core-buttons>',
            undefined,
            options
        );
        expect(buttons.innerBlocks[0].attributes.text).toBe('');
        expect(buttons.innerBlocks[0].innerBlocks).toEqual([]);
    });

    test('the attribute spelling still works, and an empty body leaves it alone', () => {
        const [buttons] = htmlToBlockSeeds(
            '<core-buttons><core-button text="Buy" url="/shop"></core-button></core-buttons>',
            undefined,
            options
        );
        expect(buttons.innerBlocks[0].attributes).toMatchObject({ text: 'Buy', url: '/shop' });
    });

    test('an element that is a block of its own is still a child', () => {
        // Only phrasing content becomes the label; a paragraph is a paragraph
        const [columns] = htmlToBlockSeeds('<core-column><p>Body</p></core-column>', undefined, options);
        expect(columns.innerBlocks[0].innerBlocks[0].name).toBe('core/paragraph');
    });

    test('a custom element nobody registered stays the markup it is', () => {
        const seeds = htmlToBlockSeeds('<my-widget data-x="1">Hello</my-widget>', undefined, options);
        expect(seeds).toHaveLength(1);
        expect(seeds[0].name).toBe('core/html');
    });

    test('without a resolver the vocabulary is off, and nothing changes', () => {
        const seeds = htmlToBlockSeeds('<core-columns><p>A</p></core-columns>');
        expect(seeds[0].name).toBe('core/html');
    });

    test('a ref still means a block held aside, not one to build', () => {
        const seeds = htmlToBlockSeeds('<core-columns data-ref="0"></core-columns>', undefined, options);
        expect(seeds[0].name).toBe(PRESERVED_BLOCK);
        expect(seeds[0].attributes.ref).toBe('0');
    });
});

describe('componentOpenTag', () => {
    const COLUMNS: BlockSchema = {
        attributes: {
            verticalAlignment: { type: 'string' },
            isStackedOnMobile: { type: 'boolean', default: true },
        },
    };

    test('a block left as it came out of the inserter writes nothing', () => {
        expect(componentOpenTag('core/columns', { isStackedOnMobile: true }, COLUMNS)).toBe('<core-columns>');
    });

    test('class comes first, and true is a bare attribute', () => {
        expect(componentOpenTag('core/columns', {
            className: 'gap-8',
            isStackedOnMobile: false,
            verticalAlignment: 'center',
        }, COLUMNS)).toBe('<core-columns class="gap-8" is-stacked-on-mobile="false" vertical-alignment="center">');
    });

    test('anything with a shape goes to data-wp-attrs', () => {
        expect(componentOpenTag('core/group', { layout: { type: 'flex' } })).toBe(
            `<core-group data-wp-attrs="{&quot;layout&quot;:{&quot;type&quot;:&quot;flex&quot;}}">`
        );
    });

    test('what is written is what comes back', () => {
        const attributes = {
            className: 'gap-8 md:gap-12',
            anchor: 'pricing',
            verticalAlignment: 'center',
            isStackedOnMobile: false,
        };
        const markup = `${componentOpenTag('core/columns', attributes, COLUMNS)}</core-columns>`;

        const [columns] = htmlToBlockSeeds(markup, undefined, {
            blockForTag: (tag) => (blockNameForTag(tag) === 'core/columns' ? 'core/columns' : null),
            blockSchema: () => COLUMNS,
        });
        expect(columns.attributes).toEqual(attributes);
    });
});

describe('blockNameForTag', () => {
    test('splits at the first hyphen, so a hyphenated block name survives', () => {
        expect(blockNameForTag('core-columns')).toBe('core/columns');
        expect(blockNameForTag('core-media-text')).toBe('core/media-text');
        expect(blockNameForTag('fancoolo-hero')).toBe('fancoolo/hero');
        // What `preservedTag` writes for a block registered without a namespace
        expect(blockNameForTag('wp-standalone')).toBe('standalone');
        expect(blockNameForTag('div')).toBeNull();
    });

    test('every tag preservedTag writes reads back as the block it named', () => {
        for (const name of ['core/columns', 'core/media-text', 'fancoolo/hero']) {
            expect(blockNameForTag(preservedTag(name))).toBe(name);
        }
    });
});

describe('coerceAttribute', () => {
    test('a declared type decides, and a percentage stays a string', () => {
        expect(coerceAttribute('false', 'boolean')).toBe(false);
        expect(coerceAttribute('', 'boolean')).toBe(true);
        expect(coerceAttribute('3', 'number')).toBe(3);
        expect(coerceAttribute('33.33%', 'string')).toBe('33.33%');
    });

    test('with no schema the shape of the value decides', () => {
        expect(coerceAttribute('true')).toBe(true);
        expect(coerceAttribute('2')).toBe(2);
        expect(coerceAttribute('33.33%')).toBe('33.33%');
    });
});

/**
 * A layout the name cannot describe.
 *
 * `data-wp-layout="constrained"` says the type and nothing else, so a group
 * justified to the centre came back justified to nothing — visible on the
 * front end as `is-content-justification-center` no longer being emitted at
 * all. One attribute either way: the name while the name is the whole story,
 * the layout written out when it is not.
 */
describe('layouts with more than a name', () => {
    test('a plain variation is still written as its name', () => {
        expect(layoutValue({ type: 'constrained' })).toBe('constrained');
        expect(layoutValue({ type: 'flex', flexWrap: 'nowrap' })).toBe('row');
        expect(layoutValue({ type: 'grid' })).toBe('grid');
    });

    test('anything the name would lose is written out', () => {
        expect(layoutValue({ type: 'constrained', justifyContent: 'center' }))
            .toBe('{"type":"constrained","justifyContent":"center"}');
        expect(layoutValue({ type: 'grid', columnCount: 3 }))
            .toBe('{"type":"grid","columnCount":3}');
    });

    test('and read back as what it was', () => {
        expect(layoutFromValue('constrained')).toEqual({ type: 'constrained' });
        expect(layoutFromValue('{"type":"grid","columnCount":3}')).toEqual({ type: 'grid', columnCount: 3 });
        // Not a name and not JSON: no layout rather than a broken one
        expect(layoutFromValue('sideways')).toBeNull();
        expect(layoutFromValue('{oops')).toBeNull();
    });

    test('a justified group keeps its justification through the markup', () => {
        const layout = { type: 'constrained', justifyContent: 'center' };
        const seeds = htmlToBlockSeeds(`<div ${LAYOUT_ATTRIBUTE}='${layoutValue(layout)}'><p>A</p></div>`);
        expect(seeds[0].attributes.layout).toEqual(layout);
    });
});

/**
 * `core/table` saves `<figure><table></figure>`, and a figure is a container —
 * so the block came back as a group wrapping a table, and nested one layer
 * deeper on every round trip after that.
 */
describe('tables', () => {
    test('a figure wrapping a table is the table block', () => {
        const seeds = htmlToBlockSeeds(`
            <figure class="rounded-xl">
              <table class="has-fixed-layout">
                <tbody><tr><td>5.2</td></tr></tbody>
              </table>
              <figcaption>Releases</figcaption>
            </figure>
        `);

        expect(seeds).toHaveLength(1);
        expect(seeds[0].name).toBe('core/table');
        expect(seeds[0].attributes).toMatchObject({
            className: 'rounded-xl',
            hasFixedLayout: true,
            caption: 'Releases',
        });
    });

    test('a figure wrapping anything else is still a group', () => {
        const seeds = htmlToBlockSeeds('<figure><table><tbody><tr><td>a</td></tr></tbody></table><p>Not a caption</p></figure>');
        expect(seeds[0].name).toBe('core/group');
    });

    test('cells keep what they were wearing', () => {
        const seeds = htmlToBlockSeeds(`
            <table>
              <thead><tr><th scope="col">Version</th></tr></thead>
              <tbody><tr><td colspan="2" rowspan="3" data-align="center">5.2</td></tr></tbody>
            </table>
        `);

        const body = seeds[0].attributes.body as { cells: Record<string, string>[] }[];
        expect(body[0].cells[0]).toMatchObject({
            content: '5.2',
            tag: 'td',
            colspan: '2',
            rowspan: '3',
            align: 'center',
        });

        const head = seeds[0].attributes.head as { cells: Record<string, string>[] }[];
        expect(head[0].cells[0]).toMatchObject({ tag: 'th', scope: 'col' });
    });
});

/**
 * A tag that is only a label.
 *
 * `<button class="rounded-md p-3">Read more</button>` is a Tailwind component,
 * not behaviour, and went to custom HTML because `button` sat beside `iframe`
 * and `input` in the verbatim list. A Plain Group cannot hold it — a group
 * holds blocks, so the label would arrive as `<button><p>…</p></button>`, and
 * `<p>` is flow content inside an element that takes phrasing.
 */
describe('tags that are a label with text in them', () => {
    test('a plain button is the element, classes and attributes on it', () => {
        const [button] = htmlToBlockSeeds(
            '<button type="button" class="flex items-center p-3 rounded-md">Read more</button>'
        );

        expect(button.name).toBe('winden/text');
        expect(button.attributes).toMatchObject({
            tagName: 'button',
            content: 'Read more',
            className: 'flex items-center p-3 rounded-md',
            htmlAttributes: { type: 'button' },
        });
    });

    test('label, summary and legend go the same way', () => {
        for (const tag of ['label', 'summary', 'legend']) {
            const [seed] = htmlToBlockSeeds(`<${tag} class="text-sm">Text</${tag}>`);
            expect(seed.name).toBe('winden/text');
            expect(seed.attributes.tagName).toBe(tag);
        }
    });

    test('one holding a control stays exactly as written', () => {
        // A label wrapping a field is markup with behaviour, and the field is
        // the reason it was written that way
        const [label] = htmlToBlockSeeds('<label class="block"><span>Email</span><input name="email"></label>');
        expect(label.name).toBe('core/html');
    });

    /**
     * The commonest thing in a component library, and it used to be custom
     * HTML for having parts: measured across Tailwind's premium set, of 1,378
     * buttons only 415 hold nothing but text.
     */
    test('an icon button is a container wearing the tag', () => {
        const seeds = htmlToBlockSeeds(
            '<button type="button" class="inline-flex gap-x-1"><span>Solutions</span><svg viewBox="0 0 20 20"></svg></button>'
        );

        expect(shape(seeds)).toEqual([
            'core/group:inline-flex gap-x-1',
            '  winden/text:-',
            '  winden/icon:-',
        ]);
        expect(seeds[0].attributes).toMatchObject({
            tagName: 'button',
            windenGroup: true,
            htmlAttributes: { type: 'button' },
        });
    });

    test('a span holding an icon is one too', () => {
        const [span] = htmlToBlockSeeds('<span class="flex"><svg viewBox="0 0 1 1"></svg><span>Live</span></span>');
        expect(span.name).toBe('core/group');
        expect(span.attributes.tagName).toBe('span');
    });

    test('flow content inside one keeps it verbatim, because that markup is invalid', () => {
        // `<p>` is flow content; a button takes phrasing
        const [button] = htmlToBlockSeeds('<button><p>Read more</p></button>');
        expect(button.name).toBe('core/html');
    });
});

/**
 * Tailwind's library explains itself in comments — every flyout carries a
 * paragraph of "Entering: …". They are notes about the markup, not part of it.
 */
describe('comments', () => {
    test('are dropped at block position and inside content alike', () => {
        const seeds = htmlToBlockSeeds(`
            <div class="p-4">
              <!-- Flyout menu, show/hide based on state. -->
              <h2 class="text-xl">Title<!-- trailing note --></h2>
              <p>Text <!-- inline note --> after</p>
            </div>
        `);

        const json = JSON.stringify(seeds);
        expect(json).not.toContain('<!--');
        expect(json).not.toContain('Flyout menu');
        expect(seeds[0].innerBlocks[0].attributes.content).toBe('Title');
    });

    test('a handler keeps the whole thing verbatim', () => {
        const [button] = htmlToBlockSeeds('<button onclick="go()">Go</button>');
        expect(button.name).toBe('core/html');
    });

    test('the other verbatim tags are untouched', () => {
        for (const markup of ['<input name="q">', '<iframe src="/x"></iframe>', '<textarea>hi</textarea>']) {
            expect(htmlToBlockSeeds(markup)[0].name).toBe('core/html');
        }
    });
});

/**
 * An element with nothing in it is a decoration: a gradient blob, an overlay,
 * a divider, a spacer. It used to arrive as an empty group, which draws a
 * `components-placeholder` card inside itself — measured at 845px tall on the
 * Tailwind hero blob, where the shape is the only thing that should be there.
 */
describe('empty elements', () => {
    test('an empty div is a shape, wearing its classes and attributes', () => {
        const [shape] = htmlToBlockSeeds(
            '<div aria-hidden="true" class="blur-3xl" style="clip-path: polygon(0 0)"></div>'
        );

        expect(shape.name).toBe('core/group');
        expect(shape.attributes).toMatchObject({
            tagName: 'div',
            windenShape: true,
            className: 'blur-3xl',
            htmlAttributes: { 'aria-hidden': 'true', style: 'clip-path: polygon(0 0)' },
        });
        expect(shape.innerBlocks).toEqual([]);
    });

    test('whatever tag it was written as', () => {
        for (const tag of ['div', 'span', 'section', 'aside', 'figure']) {
            const [shape] = htmlToBlockSeeds(`<${tag} class="h-px bg-gray-200"></${tag}>`);
            expect(shape.name).toBe('core/group');
            expect(shape.attributes).toMatchObject({ tagName: tag, windenShape: true });
        }
    });

    test('whitespace is still empty', () => {
        const [shape] = htmlToBlockSeeds('<div class="h-8">\n   \n</div>');
        expect(shape.attributes.windenShape).toBe(true);
    });

    test('anything inside it is not', () => {
        expect(htmlToBlockSeeds('<div class="p-4">Text</div>')[0].name).toBe('core/paragraph');
        const [group] = htmlToBlockSeeds('<div class="p-4"><h2>Hi</h2></div>');
        expect(group.name).toBe('core/group');
        expect(group.attributes.windenShape).toBeUndefined();
    });
});

/**
 * Block → lines, the inverse of the caret → block mapping. A heading inside
 * a group used to mark the whole group: the mapping stopped at the top
 * level. What names an element is the same triple both ways — tag, classes,
 * and which one among those alike — so a round trip has to land on itself.
 */
describe('lineRangeOfTarget', () => {
    const markup = [
        '<div class="p-8">',            // 1
        '  <h2>Card title</h2>',        // 2
        '  <p class="text-sm">',        // 3
        '    Some text <a href="#">and a link</a>', // 4
        '  </p>',                        // 5
        '  <img src="a.png" class="w-full">', // 6
        '  <p class="text-sm">Second</p>',   // 7
        '</div>',                        // 8
        '<hr>',                          // 9
    ].join('\n');

    test('elementLineRanges pairs every opening tag with its close, voids included', () => {
        expect(elementLineRanges(markup)).toEqual([
            { start: 1, end: 8 },  // div
            { start: 2, end: 2 },  // h2
            { start: 3, end: 5 },  // p
            { start: 4, end: 4 },  // a
            { start: 6, end: 6 },  // img (void)
            { start: 7, end: 7 },  // second p
            { start: 9, end: 9 },  // hr (void, top level)
        ]);
    });

    test('a nested element is found by tag, classes and occurrence', () => {
        expect(lineRangeOfTarget(markup, { tag: 'h2', className: '', occurrence: 0 })).toEqual({ start: 2, end: 2 });
        expect(lineRangeOfTarget(markup, { tag: 'p', className: 'text-sm', occurrence: 0 })).toEqual({ start: 3, end: 5 });
        expect(lineRangeOfTarget(markup, { tag: 'p', className: 'text-sm', occurrence: 1 })).toEqual({ start: 7, end: 7 });
        expect(lineRangeOfTarget(markup, { tag: 'div', className: 'p-8', occurrence: 0 })).toEqual({ start: 1, end: 8 });
    });

    test('an occurrence past the end falls back only when there is exactly one alike', () => {
        expect(lineRangeOfTarget(markup, { tag: 'h2', className: '', occurrence: 5 })).toEqual({ start: 2, end: 2 });
        expect(lineRangeOfTarget(markup, { tag: 'p', className: 'text-sm', occurrence: 5 })).toBeNull();
        expect(lineRangeOfTarget(markup, { tag: 'section', className: '', occurrence: 0 })).toBeNull();
        expect(lineRangeOfTarget('', { tag: 'p', className: '', occurrence: 0 })).toBeNull();
    });

    test('round trips with targetsAtLine', () => {
        for (const line of [2, 4, 7]) {
            const [innermost] = targetsAtLine(markup, line);
            const range = lineRangeOfTarget(markup, innermost)!;
            expect(range.start).toBeLessThanOrEqual(line);
            expect(range.end).toBeGreaterThanOrEqual(line);
        }
    });
});

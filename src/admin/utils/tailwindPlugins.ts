/**
 * Tailwind plugins, as the CSS declares them.
 *
 * A plugin is a line in the Style tab — `@plugin "@tailwindcss/typography";` —
 * and the compiler resolves the name against the two it bundles, falling back
 * to esm.sh for anything else. Everything works today; what is missing is a way
 * to see which are on and switch one without hand-editing CSS.
 */

/** Shipped inside the compiler bundle, so these work with no network */
export const BUNDLED_PLUGINS = [
    { id: '@tailwindcss/typography', label: 'Typography', hint: 'prose classes for long-form content' },
    { id: '@tailwindcss/forms', label: 'Forms', hint: 'sane defaults for form controls' },
] as const;

/**
 * Plugins Tailwind v4 made redundant. The compiler still resolves them (as
 * no-ops) so an old Style tab keeps compiling; the picker shows the line
 * with a note instead of pretending it comes from esm.sh.
 */
export const BUILT_IN_PLUGINS = [
    { id: '@tailwindcss/container-queries', hint: 'built into Tailwind v4 — this line does nothing and can be removed' },
] as const;

/**
 * A declaration, enabled or commented out. Disabling keeps the line so the
 * choice — and its place in the file — survives being switched off for a
 * minute to see what a page looks like without it.
 */
export interface PluginEntry {
    name: string;
    enabled: boolean;
}

const PLUGIN_LINE = /^([ \t]*)(\/\*\s*)?@plugin\s+(["'])(.*?)\3\s*;?(\s*\*\/)?[ \t]*$/;

/** Plugins declared in `css`, enabled or not, in the order they appear */
export function listPlugins(css: string): PluginEntry[] {
    const entries: PluginEntry[] = [];

    for (const line of (css || '').split('\n')) {
        const match = line.match(PLUGIN_LINE);
        if (!match) continue;

        const name = match[4];
        if (entries.some((entry) => entry.name === name)) continue;
        entries.push({ name, enabled: !match[2] });
    }
    return entries;
}

/** Just the names that are actually in force */
export function enabledPlugins(css: string): string[] {
    return listPlugins(css).filter((entry) => entry.enabled).map((entry) => entry.name);
}

function findPlugin(css: string, name: string): PluginEntry | undefined {
    return listPlugins(css).find((entry) => entry.name === name);
}

/**
 * Add a plugin, after the last `@plugin`/`@import` so the declarations stay
 * together at the top where a reader expects them. Adding one that is already
 * there — even switched off — only turns it back on, rather than writing the
 * line twice.
 */
export function addPlugin(css: string, name: string): string {
    const plugin = name.trim();
    if (!plugin) return css;
    if (findPlugin(css, plugin)) return setPluginEnabled(css, plugin, true);

    const line = `@plugin "${plugin}";`;
    const anchors = [...(css || '').matchAll(/^[ \t]*(?:\/\*\s*)?@(?:plugin|import)[^\n]*\n?/gm)];
    if (anchors.length === 0) {
        return css ? `${line}\n${css}` : `${line}\n`;
    }

    const last = anchors[anchors.length - 1];
    const at = (last.index ?? 0) + last[0].length;
    const needsBreak = !last[0].endsWith('\n');
    return `${css.slice(0, at)}${needsBreak ? '\n' : ''}${line}\n${css.slice(at)}`;
}

/** Remove the declaration outright, enabled or not, and the gap it leaves */
export function removePlugin(css: string, name: string): string {
    const plugin = name.trim();
    if (!plugin) return css;

    const kept = (css || '')
        .split('\n')
        .filter((line) => {
            const match = line.match(PLUGIN_LINE);
            return !match || match[4] !== plugin;
        })
        .join('\n');

    return kept.replace(/\n{3,}/g, '\n\n');
}

/**
 * Switch a declaration off without losing it: the line is commented in place,
 * so the compiler ignores it and the file still says the plugin was chosen.
 */
export function setPluginEnabled(css: string, name: string, enabled: boolean): string {
    const plugin = name.trim();
    if (!plugin) return css;
    if (!findPlugin(css, plugin)) return enabled ? addPlugin(css, plugin) : css;

    return (css || '')
        .split('\n')
        .map((line) => {
            const match = line.match(PLUGIN_LINE);
            if (!match || match[4] !== plugin) return line;

            const [, indent, comment, quote] = match;
            const directive = `@plugin ${quote}${plugin}${quote};`;
            if (enabled) return comment ? `${indent}${directive}` : line;
            return comment ? line : `${indent}/* ${directive} */`;
        })
        .join('\n');
}

/**
 * A plugin name is an npm package: a scope is optional, a path after it is not
 * ours to judge. Rejecting quotes and semicolons keeps the line a line.
 */
export function isValidPluginName(name: string): boolean {
    return /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(\/[\w.-]+)*$/i.test(name.trim());
}

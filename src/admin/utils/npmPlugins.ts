/**
 * Finding a Tailwind plugin without leaving the editor.
 *
 * Typing a package name and hoping was the old flow: nothing said whether the
 * name existed, whether it was a Tailwind plugin at all, or — the expensive one
 * — whether it was written for v3, whose plugin API v4 does not share.
 *
 * The registry answers all three. Search is filtered by the keyword plugin
 * authors use, and each result's own manifest carries the Tailwind range it
 * declares, which is where v3-only packages give themselves away.
 */

export type TailwindSupport = 'v4' | 'v3-only' | 'unknown';

export interface PluginSearchResult {
    name: string;
    version: string;
    description: string;
    /** The package's page, so a choice can be checked rather than trusted */
    npmUrl: string;
    keywords: string[];
}

export interface PluginCompatibility {
    support: TailwindSupport;
    /** The declared range, shown as the reason behind the verdict */
    range: string | null;
}

const REGISTRY = 'https://registry.npmjs.org';

/**
 * A `keywords:` qualifier makes npm ignore the free text almost entirely —
 * searching `keywords:tailwindcss-plugin daisy` returns safe-area helpers and
 * never daisyUI. The word is added to the query instead, which ranks Tailwind
 * packages up without excluding the one actually being searched for, and the
 * results are filtered afterwards by what they say about themselves.
 */
export function buildSearchUrl(query: string, pluginsOnly = true, size = 20): string {
    const text = pluginsOnly ? `${query} tailwind` : query;
    return `${REGISTRY}/-/v1/search?text=${encodeURIComponent(text.trim())}&size=${size}`;
}

/**
 * Does the package present itself as a Tailwind package? Keywords are the
 * ecosystem's own signal; the name is the fallback for those that skip them.
 */
export function looksLikeTailwindPlugin(result: PluginSearchResult): boolean {
    return result.keywords.some((keyword) => /tailwind/i.test(keyword))
        || /tailwind/i.test(result.name);
}

export function parseSearchResults(payload: unknown): PluginSearchResult[] {
    const objects = (payload as { objects?: unknown[] })?.objects;
    if (!Array.isArray(objects)) return [];

    return objects.flatMap((entry) => {
        const pkg = (entry as { package?: Record<string, unknown> })?.package;
        if (!pkg || typeof pkg.name !== 'string') return [];

        return [{
            name: pkg.name,
            version: typeof pkg.version === 'string' ? pkg.version : '',
            description: typeof pkg.description === 'string' ? pkg.description : '',
            npmUrl: typeof (pkg.links as { npm?: string })?.npm === 'string'
                ? (pkg.links as { npm: string }).npm
                : `https://www.npmjs.com/package/${pkg.name}`,
            keywords: Array.isArray(pkg.keywords) ? pkg.keywords.filter((k): k is string => typeof k === 'string') : [],
        }];
    });
}

function compare(a: [number, number, number], b: [number, number, number]): number {
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * Does this range admit Tailwind 4?
 *
 * Ranges in the wild look like `^4.0.0`, `4.x`, `>=3.0.0 || >=4.0.0 || insiders`
 * and `>=3.0.0 || insiders` — note the last one *does* admit 4, since `>=3`
 * has no upper bound. Guessing from the string ("mentions 4") gets that wrong
 * in both directions, so each comparator is evaluated against 4.0.0.
 */
export function admitsTailwind4(range: string | null | undefined): boolean {
    if (!range) return false;
    const target: [number, number, number] = [4, 0, 0];

    return range.split('||').some((alternative) => {
        const comparators = alternative.trim().split(/\s+/).filter(Boolean);
        let usable = false;

        for (const comparator of comparators) {
            // A bare wildcard is a range in its own right: `*` admits anything
            if (/^(\*|x)$/i.test(comparator)) {
                usable = true;
                continue;
            }

            const match = comparator.match(/^(\^|~|>=|<=|>|<|=)?\s*v?(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?/i);
            if (!match) continue; // `insiders` and friends say nothing about versions
            usable = true;

            const [, operator = '=', major, minor, patch] = match;
            const wildcard = minor === 'x' || minor === '*' || patch === 'x' || patch === '*';
            const version: [number, number, number] = [
                Number(major),
                wildcard ? 0 : Number(minor ?? 0) || 0,
                wildcard ? 0 : Number(patch ?? 0) || 0,
            ];

            const admits = (() => {
                switch (operator) {
                    // ^4.x allows anything below 5; ^3.x stops short of 4
                    case '^': return version[0] === 4;
                    case '~': return version[0] === 4;
                    case '>': return compare(target, version) > 0;
                    case '>=': return compare(target, version) >= 0;
                    case '<': return compare(target, version) < 0;
                    case '<=': return compare(target, version) <= 0;
                    default: return version[0] === 4;
                }
            })();

            if (!admits) return false;
        }

        return usable;
    });
}

/** What a package's own manifest says about the Tailwind it expects */
export function classifyCompatibility(manifest: unknown): PluginCompatibility {
    const pkg = manifest as {
        peerDependencies?: Record<string, string>;
        dependencies?: Record<string, string>;
    } | null;

    const range = pkg?.peerDependencies?.tailwindcss ?? pkg?.dependencies?.tailwindcss ?? null;
    if (!range) return { support: 'unknown', range: null };

    return { support: admitsTailwind4(range) ? 'v4' : 'v3-only', range };
}

/** Search the registry. Rejects nothing: an empty query means no results. */
export async function searchPlugins(
    query: string,
    { pluginsOnly = true, signal }: { pluginsOnly?: boolean; signal?: AbortSignal } = {}
): Promise<PluginSearchResult[]> {
    if (!query.trim()) return [];

    const response = await fetch(buildSearchUrl(query, pluginsOnly), { signal });
    if (!response.ok) throw new Error(`Registry search failed (${response.status})`);

    const results = parseSearchResults(await response.json());
    return pluginsOnly ? results.filter(looksLikeTailwindPlugin) : results;
}

/** The published manifest for a package's latest version */
export async function fetchCompatibility(
    name: string,
    signal?: AbortSignal
): Promise<PluginCompatibility> {
    const response = await fetch(`${REGISTRY}/${name.replace(/^@/, '@')}/latest`, { signal });
    if (!response.ok) return { support: 'unknown', range: null };
    return classifyCompatibility(await response.json());
}

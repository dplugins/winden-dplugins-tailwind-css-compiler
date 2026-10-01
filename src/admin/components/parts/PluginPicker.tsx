import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@el/Button';
import { Input } from '@el/Input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@el/Dialog';
import { SwitchWithLabel } from '@el/SwitchWithLabel';
import { Checkbox } from '@el/Checkbox';
import DeleteOutlineOutlinedIcon from '@/assets/icons/DeleteOutlineOutlinedIcon.svg';
import {
    BUNDLED_PLUGINS,
    BUILT_IN_PLUGINS,
    addPlugin,
    enabledPlugins,
    listPlugins,
    removePlugin,
    setPluginEnabled,
} from '@utils/tailwindPlugins';
import {
    fetchCompatibility,
    searchPlugins,
    type PluginCompatibility,
    type PluginSearchResult,
} from '@utils/npmPlugins';

interface PluginPickerProps {
    /** The tab's CSS — plugins are declared in it, not in settings */
    css: string;
    onChange: (css: string) => void;
}

const SEARCH_DEBOUNCE_MS = 350;

/**
 * Which Tailwind plugins this site uses.
 *
 * `@plugin` has always resolved — three plugins are bundled, anything else is
 * fetched from esm.sh — but typing a package name told you nothing: whether it
 * existed, whether it was a Tailwind plugin, or whether it was written for v3,
 * whose plugin API v4 does not share. The registry answers all three, so the
 * field searches it rather than accepting a guess.
 */
export const PluginPicker: React.FC<PluginPickerProps> = ({ css, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [pluginsOnly, setPluginsOnly] = useState(true);
    const [v4Only, setV4Only] = useState(true);
    const [results, setResults] = useState<PluginSearchResult[]>([]);
    const [compatibility, setCompatibility] = useState<Record<string, PluginCompatibility>>({});
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestRef = useRef<AbortController | null>(null);

    const declared = listPlugins(css);
    const active = enabledPlugins(css);
    const bundledIds = BUNDLED_PLUGINS.map((plugin) => plugin.id) as readonly string[];
    const extras = declared.filter((entry) => !bundledIds.includes(entry.name));

    useEffect(() => {
        if (!isOpen || !query.trim()) {
            setResults([]);
            setError(null);
            return;
        }

        const timer = setTimeout(async () => {
            requestRef.current?.abort();
            const controller = new AbortController();
            requestRef.current = controller;

            setIsSearching(true);
            setError(null);
            try {
                const found = await searchPlugins(query, { pluginsOnly, signal: controller.signal });
                setResults(found);

                // Each package's own manifest decides the badge, so they are
                // fetched alongside rather than guessed from the search entry.
                found.forEach(async (result) => {
                    try {
                        const support = await fetchCompatibility(result.name, controller.signal);
                        setCompatibility((current) => ({ ...current, [result.name]: support }));
                    } catch {
                        // Leave it unlabelled rather than claim a verdict
                    }
                });
            } catch (searchError) {
                if ((searchError as Error)?.name !== 'AbortError') {
                    setError('Could not reach the npm registry.');
                }
            } finally {
                setIsSearching(false);
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [query, pluginsOnly, isOpen]);

    useEffect(() => () => requestRef.current?.abort(), []);

    // A package that declares nothing is kept: it cannot be shown to be v3, and
    // dropping it would hide daisyUI and friends, which declare no range at all.
    const shown = v4Only
        ? results.filter((result) => (compatibility[result.name]?.support ?? 'unknown') !== 'v3-only')
        : results;

    return (
        <>
            <Button variant="ghost" onClick={() => setIsOpen(true)}>
                Plugins{active.length > 0 ? ` (${active.length})` : ''}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Tailwind plugins</DialogTitle>
                        <DialogDescription>
                            Written into this tab as <code>@plugin</code> lines. The two below ship
                            with Winden and work offline; anything else is fetched from esm.sh when
                            the CSS compiles.
                        </DialogDescription>
                    </DialogHeader>

                    {/*
                      * Switching off comments the line out rather than deleting
                      * it, so a plugin can be taken out of the compile for a
                      * minute without losing the choice. Removing is the
                      * separate, deliberate act.
                      */}
                    {/*
                      * The bundled two are switched, never removed: they ship
                      * inside the compiler, so "gone" would only mean the line
                      * is missing — which is what off already means.
                      */}
                    <div className="bg-base-2 px-4 rounded">
                        {BUNDLED_PLUGINS.map((plugin) => {
                            const entry = declared.find((declaredPlugin) => declaredPlugin.name === plugin.id);
                            return (
                                <SwitchWithLabel
                                    key={plugin.id}
                                    label={`${plugin.label} — ${plugin.hint}`}
                                    name={plugin.id}
                                    checked={!!entry?.enabled}
                                    onChange={(enabled) => onChange(
                                        enabled ? addPlugin(css, plugin.id) : setPluginEnabled(css, plugin.id, false)
                                    )}
                                />
                            );
                        })}
                    </div>

                    {extras.length > 0 && (
                        <div className="bg-base-2 px-4 rounded">
                            {extras.map((entry) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <SwitchWithLabel
                                        className="flex-1"
                                        label={`${entry.name} — ${BUILT_IN_PLUGINS.find((plugin) => plugin.id === entry.name)?.hint ?? 'from esm.sh'}`}
                                        name={entry.name}
                                        checked={entry.enabled}
                                        onChange={(enabled) => onChange(setPluginEnabled(css, entry.name, enabled))}
                                    />
                                    <Button
                                        variant="ghost"
                                        aria-label={`Remove ${entry.name}`}
                                        onClick={() => onChange(removePlugin(css, entry.name))}
                                        icon={<DeleteOutlineOutlinedIcon className="h-4 w-4" />}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <Input
                            value={query}
                            placeholder="Search npm for a plugin"
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                        />

                        <Checkbox
                            checked={pluginsOnly}
                            onCheckedChange={(checked) => setPluginsOnly(checked === true)}
                            label="Only packages tagged as Tailwind plugins"
                        />

                        {/*
                          * v4 rewrote the plugin API, so a v3-only package does
                          * not load at all. Hiding them is more use than
                          * labelling them, since there is nothing to do with one.
                          */}
                        <Checkbox
                            checked={v4Only}
                            onCheckedChange={(checked) => setV4Only(checked === true)}
                            label="Only plugins that support Tailwind 4"
                        />

                        {isSearching && <p className="text-xsm">Searching…</p>}
                        {error && <p className="text-danger text-xsm">{error}</p>}
                        {!isSearching && !error && query.trim() && shown.length === 0 && (
                            <p className="text-xsm">
                                {results.length === 0
                                    ? 'Nothing found on npm for that.'
                                    : 'Only Tailwind 3 plugins matched. Uncheck the filter to see them.'}
                            </p>
                        )}

                        <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                            {shown.map((result) => {
                                const support = compatibility[result.name]?.support ?? 'unknown';
                                const range = compatibility[result.name]?.range;
                                const alreadyOn = declared.some((entry) => entry.name === result.name);

                                return (
                                    <li key={result.name} className="bg-base-2 rounded px-3 py-2 flex gap-3 items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium">{result.name}</span>
                                                <span className="text-xsm opacity-70">{result.version}</span>
                                                {/* The one thing the filter cannot say: nothing was declared */}
                                                {support === 'unknown' && (
                                                    <span className="text-xsm opacity-70">compatibility not declared</span>
                                                )}
                                            </div>
                                            <p className="text-xsm opacity-80">{result.description}</p>
                                            <a
                                                className="text-xsm underline"
                                                href={result.npmUrl}
                                                target="_blank"
                                                rel="noreferrer noopener"
                                            >
                                                View on npm{range ? ` — requires tailwindcss ${range}` : ''}
                                            </a>
                                        </div>

                                        <Button
                                            disabled={alreadyOn}
                                            onClick={() => onChange(addPlugin(css, result.name))}
                                        >
                                            {alreadyOn ? 'Added' : 'Add'}
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default PluginPicker;

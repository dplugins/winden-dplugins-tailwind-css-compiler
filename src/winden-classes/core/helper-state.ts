/**
 * Winden Classes Helper — state engine
 *
 * Pure functions mapping a class string to helper selections and back.
 * No DOM, no React. Conflict resolution delegates to tailwind-merge via
 * plain-classes/shared/preview-utils.js.
 *
 * Variant scoping: every function takes a `variantPrefix` (e.g. '' for the
 * base breakpoint, 'md' for md:). Tokens whose variant chain differs from the
 * prefix are never touched — they pass through with their original order — so
 * split-mode and hover:/focus: classes survive any toggle.
 */

import { splitClassVariants, mergeClassTokens } from '../../plain-classes/shared/preview-utils';
import type { HelperGroup, HelperOption, HelperProperty } from './helper-schema';

export type HelperSelections = Map<string, string>;

function tokenize(classString: string): string[] {
    return (classString || '').split(/\s+/).filter(Boolean);
}

/**
 * The utility without its importance marker, whichever side it is written on.
 *
 * Tailwind v4 puts it at the end — `sm:text-6xl!` — and v3 put it in front of
 * the utility, after the variant: `sm:!text-6xl`. **Both still compile in v4,
 * and both emit `!important`** (measured through the installed Tailwind, with
 * a fake control class proving the check), so markup in the wild carries
 * either and a panel that knows only one is blind to the other. Not merely
 * unmarked — undetected: `!font-bold` matched no option at all, so the row
 * showed nothing.
 *
 * Winden adds the marker *itself*: `forceOverriddenClasses` rewrites every
 * class the editor's own unlayered CSS beats, and `withVariantSiblings`
 * carries it onto the responsive siblings. So the panel was blinded by its own
 * output as well as by anything pasted.
 *
 * Matching ignores the marker; writing keeps it (see `importanceOf`).
 */
export function withoutImportant(utility: string): string {
    if (utility.endsWith('!')) return utility.slice(0, -1);
    if (utility.startsWith('!')) return utility.slice(1);
    return utility;
}

/** Does this utility carry the marker, either side of it? */
function isImportant(utility: string): boolean {
    return utility.endsWith('!') || utility.startsWith('!');
}

/**
 * '!' when the utility carries it, '' otherwise — appended to whatever
 * replaces it. Always appended, never prefixed: one canonical spelling goes
 * back, the way an older class name is read but not written.
 */
function importanceOf(utility: string): string {
    return isImportant(utility) ? '!' : '';
}

/**
 * The negative sign, unlike importance, has exactly one spelling and one
 * position: a leading '-' on the whole utility ('-top-2', never 'top--2' or
 * a suffix). Checked after peeling importance off, so it still finds the
 * sign under a legacy v3 '!' prefix ('!-top-2') the same as a v4 suffix
 * ('-top-2!').
 */
function isNegative(utility: string): boolean {
    return withoutImportant(utility).startsWith('-');
}

/** The utility without its leading negative sign, if any */
export function withoutNegative(utility: string): string {
    return utility.startsWith('-') ? utility.slice(1) : utility;
}

/** '-' when the utility carries it, '' otherwise — prefixed to whatever replaces it */
function negativeOf(utility: string): string {
    return isNegative(utility) ? '-' : '';
}

/** A utility's canonical spelling: no importance marker, no sign, either order */
function bareUtility(utility: string): string {
    return withoutNegative(withoutImportant(utility));
}

/** Does this option mean this utility? Its own value, an older spelling, or either wearing a `!` or `-` */
function optionMatches(option: HelperOption, utility: string): boolean {
    const bare = bareUtility(utility);
    return bare === option.value || (option.aliases?.includes(bare) ?? false);
}

/**
 * Is this option active among these utilities?
 *
 * The membership test for anything holding a *set* of what is in scope — the
 * panel's own has-a-value check among them. It has to be the same test the
 * detection uses, or the two disagree: with the alias known only to
 * `getActiveSelections`, `bg-gradient-to-r` auto-showed the From and To rows
 * and left the Gradient row that set them missing from the panel.
 *
 * Same shape of bug as theme tokens resolving only where options are rendered.
 * One resolver, used by both.
 */
export function optionIsActive(option: HelperOption, utilities: Set<string> | string[]): boolean {
    const set = utilities instanceof Set ? utilities : new Set(utilities);
    if (set.has(option.value)) return true;
    return option.aliases?.some((alias) => set.has(alias)) ?? false;
}

/** Every spelling a property answers to, importance aside */
function propertySpellings(properties: HelperProperty[]): Set<string> {
    const values = new Set<string>();
    for (const property of properties) {
        for (const option of property.options) {
            values.add(option.value);
            for (const alias of option.aliases ?? []) values.add(alias);
        }
    }
    return values;
}

function applyPrefix(utility: string, variantPrefix: string): string {
    return variantPrefix ? `${variantPrefix}:${utility}` : utility;
}

/** Utilities of tokens whose variant chain matches the prefix exactly */
function scopedUtilities(tokens: string[], variantPrefix: string): string[] {
    return tokens
        .map((token) => splitClassVariants(token))
        .filter(({ variants }) => variants === variantPrefix)
        .map(({ utility }) => utility);
}

function collectProperties(properties: HelperProperty[], out: HelperProperty[] = []): HelperProperty[] {
    for (const property of properties) {
        out.push(property);
        if (property.sideProperties) {
            collectProperties(property.sideProperties, out);
        }
        for (const branch of property.children ?? []) {
            collectProperties(branch.properties, out);
        }
    }
    return out;
}

/** Composes '' | 'md' | 'hover' | 'md:hover' from breakpoint + state */
export function composeVariantPrefix(breakpoint = '', state = ''): string {
    return [breakpoint, state].filter(Boolean).join(':');
}

/**
 * Set of utilities active in the given variant scope — for multi-active
 * highlighting. Sign stripped alongside importance: 'top-2' must read as
 * active whether the live class is 'top-2' or '-top-2' — the sign is
 * separate metadata (see `getNegativeUtilities`), not a different value.
 */
export function getScopedUtilities(classString: string, variantPrefix = ''): Set<string> {
    return new Set(scopedUtilities(tokenize(classString), variantPrefix).map(bareUtility));
}

/**
 * Which utilities in scope carry the importance marker.
 *
 * The panel showed `text-4xl` for a class that is `text-4xl!` — the textarea
 * right beside it showed the truth, so the two disagreed about the same
 * element. Rendering needs this set to say what the class actually is.
 */
export function getImportantUtilities(classString: string, variantPrefix = ''): Set<string> {
    return new Set(
        scopedUtilities(tokenize(classString), variantPrefix)
            .filter(isImportant)
            .map(bareUtility)
    );
}

/**
 * Which utilities in scope carry a leading negative sign — the '-' analogue
 * of `getImportantUtilities`, keyed the same way (fully bare) so `held`
 * values from `writtenUtilities` match directly.
 */
export function getNegativeUtilities(classString: string, variantPrefix = ''): Set<string> {
    return new Set(
        scopedUtilities(tokenize(classString), variantPrefix)
            .filter(isNegative)
            .map(bareUtility)
    );
}

/**
 * Add or remove the marker on one utility, in one variant scope.
 *
 * Unforcing is the interesting direction: a class is forced because something
 * unlayered beat it, so removing the marker hands the win back to whatever
 * that was. It is offered because the measurement can be wrong, or the CSS can
 * change — not because it is usually the right thing to do.
 */
export function toggleImportance(classString: string, utility: string, variantPrefix = ''): string {
    const bare = bareUtility(utility);
    return tokenize(classString)
        .map((token) => {
            const { variants, utility: own } = splitClassVariants(token);
            if (variants !== variantPrefix || bareUtility(own) !== bare) return token;
            // Off keeps whichever side it was on out of the result; on always
            // writes the v4 spelling, so a string does not end up with both.
            // The sign (if any) is untouched either way — always at the front,
            // the marker always at the back, so they never collide.
            const sign = negativeOf(own);
            const newMarker = isImportant(own) ? '' : '!';
            const next = sign + bareUtility(own) + newMarker;
            return applyPrefix(next, variants);
        })
        .join(' ');
}

/**
 * Add or remove the negative sign on one utility, in one variant scope —
 * the '-' analogue of `toggleImportance`. Same shape: find the live token by
 * its fully-bare spelling, flip the sign, keep whatever importance marker it
 * already carries.
 */
export function toggleNegative(classString: string, utility: string, variantPrefix = ''): string {
    const bare = bareUtility(utility);
    return tokenize(classString)
        .map((token) => {
            const { variants, utility: own } = splitClassVariants(token);
            if (variants !== variantPrefix || bareUtility(own) !== bare) return token;
            const marker = importanceOf(own);
            const sign = isNegative(own) ? '' : '-';
            return applyPrefix(sign + bareUtility(own) + marker, variants);
        })
        .join(' ');
}

/** Remove one exact token (variants included) from the class string */
export function removeToken(classString: string, token: string): string {
    return tokenize(classString).filter((t) => t !== token).join(' ');
}

/**
 * Utility prefix shared by ALL of a property's options ('p' for p-0…p-24,
 * 'bg' for the background palette), or null when options are heterogeneous
 * (display, transform, …). Gates the custom arbitrary-value input.
 */
export function arbitraryPrefixOf(property: HelperProperty): string | null {
    const first = property.options[0];
    if (!first || !first.value.includes('-')) return null;
    const prefix = first.value.replace(/-[^-]*$/, '');
    return property.options.every((o) => o.value.startsWith(`${prefix}-`)) ? prefix : null;
}

/** Active arbitrary value for a prefix (p-[13px]) among scoped utilities */
export function findArbitraryValue(utilities: Set<string> | string[], prefix: string): string | undefined {
    return [...utilities].find((utility) => utility.startsWith(`${prefix}-[`));
}

/**
 * Turn raw input into an arbitrary-value class: '13px' → 'p-[13px]',
 * '[13px]' → 'p-[13px]', a full class ('p-[13px]' or 'p-7') passes through.
 * Spaces become underscores per Tailwind's arbitrary-value syntax.
 */
export function buildArbitraryClass(prefix: string, input: string): string {
    const trimmed = input.trim().replace(/\s+/g, '_');
    if (!trimmed) return '';
    if (trimmed.startsWith(`${prefix}-`)) return trimmed;
    if (trimmed.startsWith('[')) return `${prefix}-${trimmed}`;
    return `${prefix}-[${trimmed}]`;
}

/** Every option a property owns, including those of its per-side children */
function ownedOptions(property: HelperProperty): HelperProperty[] {
    return property.sideProperties?.length ? property.sideProperties : [property];
}

/** Remove every active option of a property within the given variant scope */
export function clearProperty(classString: string, property: HelperProperty, variantPrefix = ''): string {
    const owned = ownedOptions(property);
    const optionValues = propertySpellings(owned);
    const prefixes = owned.map((p) => arbitraryPrefixOf(p)).filter((v): v is string => !!v);
    return tokenize(classString)
        .filter((token) => {
            const { variants, utility } = splitClassVariants(token);
            if (variants !== variantPrefix) return true;
            const bare = bareUtility(utility);
            if (optionValues.has(bare)) return false;
            if (prefixes.some((prefix) => bare.startsWith(`${prefix}-[`))) return false;
            return true;
        })
        .join(' ');
}

/**
 * Resolve which option is active for every property in the schema.
 * Conditional children are always resolved (visibility is a UI concern —
 * see getVisibleProperties) so state survives display switches.
 */
export function getActiveSelections(
    classString: string,
    schema: HelperGroup[],
    variantPrefix = ''
): HelperSelections {
    const utilities = new Set(scopedUtilities(tokenize(classString), variantPrefix));
    const selections: HelperSelections = new Map();

    for (const group of schema) {
        for (const property of collectProperties(group.properties)) {
            if (selections.has(property.id)) continue; // shared defs (gap) resolve once
            const active = property.options.find((option) =>
                [...utilities].some((utility) => optionMatches(option, utility))
            );
            if (active) selections.set(property.id, active.value);
        }
    }
    return selections;
}

/**
 * Utilities in scope that belong to a *different* side of the same sided
 * property — `pt-2`/`px-6` while editing padding "All", and the reverse.
 *
 * tailwind-merge treats `p-6 pt-2` as a redundancy and keeps only `p-6`, but
 * Tailwind emits `pt` after `p`, so the pair really means "6 everywhere, 2 on
 * top" and users write it deliberately. Editing one side must not silently
 * erase the others, so these are carried across the merge.
 */
function sidePeerUtilities(utilities: string[], property: HelperProperty): string[] {
    const peers = property.sidePeers;
    if (!peers?.length) return [];

    const owns = (prefix: string, utility: string) =>
        utility === prefix || utility.startsWith(`${prefix}-`);

    // Longest match wins: 'gap-x-2' is owned by 'gap-x', not by 'gap', so
    // editing the X side still replaces its own value.
    return utilities.filter((utility) => {
        const own = property.sidePrefix;
        const ownLength = own && owns(own, utility) ? own.length : -1;
        return peers.some((prefix) => owns(prefix, utility) && prefix.length > ownLength);
    });
}

/**
 * Toggle an option on/off within the given variant scope and return the new
 * class string. Out-of-scope tokens keep their original relative order.
 */
export function toggleOption(
    classString: string,
    option: HelperOption,
    property: HelperProperty,
    variantPrefix = ''
): string {
    const tokens = tokenize(classString);
    const inScope = scopedUtilities(tokens, variantPrefix);
    const isActive = inScope.some((utility) => optionMatches(option, utility));

    // Spellings tailwind-merge cannot see as conflicting with what is being
    // written: `text-4xl!` (importance) and `bg-gradient-to-r` (the v3 name).
    // Left in, they would survive the merge and sit beside the new value —
    // and the forced one would win. Only this property's own options, so the
    // sided behaviour below (`p-6 pt-2` kept deliberately) is untouched.
    const ownSpellings = propertySpellings([property]);
    const canonicalValues = new Set(property.options.map((o) => o.value));
    const ownPrefix = arbitraryPrefixOf(property);
    // A forced arbitrary value is the same problem one level down: it is not an
    // enumerated spelling, so nothing here recognised it, and tailwind-merge
    // will not conflict `text-[13px]!` with `text-5xl` across the marker.
    // Measured: the pair both survived and the forced one won, so choosing a
    // new value in the panel changed nothing on the canvas.
    const isOwn = (utility: string) => {
        const bare = bareUtility(utility);
        return ownSpellings.has(bare) || (!!ownPrefix && bare.startsWith(`${ownPrefix}-[`));
    };
    const isUnmergeable = (utility: string) => {
        const bare = bareUtility(utility);
        if (!isOwn(utility)) return false;
        // Only what the merge cannot resolve itself: a marker, a sign, an
        // older spelling, or an arbitrary value wearing either.
        return bare !== utility || !canonicalValues.has(bare);
    };

    // Written back with the marker and sign it replaces: the class was forced
    // (or negated) deliberately, and picking a new value from the panel does
    // not change that — same reasoning for both, so both carry over.
    const replaced = inScope.find(isOwn);
    const written = negativeOf(replaced ?? '') + option.value + importanceOf(replaced ?? '');

    let mergedUtilities: string[];
    if (isActive && property.allowNone !== false) {
        mergedUtilities = inScope.filter((utility) => !optionMatches(option, utility));
    } else if (isActive) {
        return classString.trim();
    } else {
        let base = inScope.filter((utility) => !isUnmergeable(utility));
        if (property.conflictsWith?.length) {
            const manual = new Set(property.conflictsWith);
            base = base.filter((utility) => !manual.has(utility));
        }
        const peers = sidePeerUtilities(base, property);
        mergedUtilities = mergeClassTokens(base, [written]);
        const kept = new Set(mergedUtilities);
        const dropped = peers.filter((utility) => !kept.has(utility));
        // Restored ahead of the merge result; the token loop below puts them
        // back at their original position anyway.
        if (dropped.length) mergedUtilities = [...dropped, ...mergedUtilities];
    }

    const survivors = new Set(mergedUtilities);
    const consumed = new Set<string>();
    const result: string[] = [];

    for (const token of tokens) {
        const { variants, utility } = splitClassVariants(token);
        if (variants !== variantPrefix) {
            result.push(token);
            continue;
        }
        if (survivors.has(utility) && !consumed.has(utility)) {
            result.push(token);
            consumed.add(utility);
        }
    }
    for (const utility of mergedUtilities) {
        if (!consumed.has(utility)) {
            result.push(applyPrefix(utility, variantPrefix));
            consumed.add(utility);
        }
    }

    return result.join(' ');
}

/** The property that owns a utility, by exact option or by arbitrary prefix */
function propertyOwning(utility: string, schema: HelperGroup[]): HelperProperty | undefined {
    let arbitraryMatch: HelperProperty | undefined;
    for (const group of schema) {
        for (const property of collectProperties(group.properties)) {
            if (property.options.some((option) => option.value === utility)) return property;
            const prefix = arbitraryPrefixOf(property);
            if (prefix && utility.startsWith(`${prefix}-[`)) arbitraryMatch = property;
        }
    }
    return arbitraryMatch;
}

/**
 * Utilities that must be hidden from the element while `previewClass` is being
 * hovered, so the canvas shows what clicking would actually produce.
 *
 * Adding the class alone is not enough: `p-2` on top of `p-12` changes nothing,
 * because the stylesheet — not the class attribute — decides which of two
 * same-property utilities wins. What toggling would drop has to drop here too,
 * and by the same rule, so the sides of a sided property survive the preview
 * exactly as they survive the click.
 */
export function previewOverriddenUtilities(
    classString: string,
    previewClass: string,
    schema: HelperGroup[],
    variantPrefix = ''
): string[] {
    if (!previewClass) return [];

    const inScope = scopedUtilities(tokenize(classString), variantPrefix);
    if (!inScope.length) return [];

    const property = propertyOwning(previewClass, schema);
    const protectedPeers = property ? new Set(sidePeerUtilities(inScope, property)) : new Set<string>();
    const kept = new Set(mergeClassTokens(inScope, [previewClass]));

    return inScope.filter((utility) => !kept.has(utility) && !protectedPeers.has(utility));
}

/**
 * Ids the panel should render without the user adding the row: the properties
 * an active conditional branch marks as `autoShow`. Selecting `flex` puts
 * direction, wrap and the alignment rows on screen the way a browser's element
 * inspector does, while the rest of the branch stays in the + menu.
 */
export function getAutoShownIds(group: HelperGroup, selections: HelperSelections): Set<string> {
    const ids = new Set<string>();

    const walk = (properties: HelperProperty[]): void => {
        for (const property of properties) {
            for (const branch of property.children ?? []) {
                if (!branch.when.includes(selections.get(property.id) ?? '')) continue;
                for (const id of branch.autoShow ?? []) ids.add(id);
                walk(branch.properties);
            }
        }
    };
    walk(group.properties);
    return ids;
}

/**
 * Flatten a group's properties in render order, expanding only the
 * conditional branches whose `when` matches the current selection.
 */
export function getVisibleProperties(group: HelperGroup, selections: HelperSelections): HelperProperty[] {
    const visible: HelperProperty[] = [];

    const walk = (properties: HelperProperty[]) => {
        for (const property of properties) {
            visible.push(property);
            const selected = selections.get(property.id);
            if (!selected) continue;
            for (const branch of property.children ?? []) {
                if (branch.when.includes(selected)) {
                    walk(branch.properties);
                }
            }
        }
    };

    walk(group.properties);
    return visible;
}

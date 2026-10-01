/**
 * Winden Classes — classes that are being overridden
 *
 * `absolute` does nothing in the block editor. Gutenberg's own stylesheet sets
 * `position` on the block wrapper *unlayered*, and unlayered CSS beats anything
 * in a layer — which is where every Tailwind utility lives — regardless of
 * specificity. The class is there, it compiles, and the element does not move
 * until it is written `absolute!`.
 *
 * That is not a property to hardcode: any utility colliding with an editor or
 * theme rule loses the same way. So it is measured instead — what the class
 * produces on its own, against what the element actually computes.
 */

import type { ClassExplanation, ClassDeclaration } from './class-explanation';

export interface OverriddenClass {
    className: string;
    /** The property that did not survive */
    property: string;
    /** What the class asks for */
    expected: string;
    /** What the element shows instead */
    actual: string;
    /** Another class in the same string that explains it, when there is one */
    overriddenBy?: string;
}

/** `absolute!` already forces itself; nothing to measure */
function isForced(className: string): boolean {
    return className.endsWith('!');
}

/** How a condition guarding a class is judged: does it hold here and now? */
export type ConditionHolds = (condition: string) => boolean;

/** Without a judge, nothing conditional is measured — it may simply not apply now */
const NEVER_HOLDS: ConditionHolds = () => false;

/**
 * Judge a class's `@media` conditions against the window the element is in.
 *
 * `xl:-mb-8` is a real rule in a canvas 1280px wide, and the theme's block-gap
 * rule beats it there exactly as it beats `-mb-8` — measured on a Tailwind
 * testimonial, where the base margin came back forced and the `xl:` one did
 * not, leaving the image flush with the section it was meant to overlap.
 * A media query the window answers "yes" to is in force and can be measured;
 * one it answers "no" to, and a state (`:hover`) or a container query, cannot.
 */
export function mediaHolds(element: Element): ConditionHolds {
    const view = element.ownerDocument?.defaultView;
    if (!view?.matchMedia) return NEVER_HOLDS;

    return (condition) => {
        const query = condition.match(/^@media\s+(.+)$/)?.[1];
        if (!query) return false;
        try {
            return view.matchMedia(query).matches;
        } catch {
            return false;
        }
    };
}

/**
 * Values differ in spelling more often than in meaning: `0px` and `0`, `rgb(0, 0, 0)`
 * and `rgb(0,0,0)`. Only a real difference is worth reporting.
 */
function sameValue(a: string, b: string): boolean {
    const normalise = (value: string) => value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/,\s+/g, ',')
        .replace(/\b0px\b/g, '0');
    return normalise(a) === normalise(b);
}

/** What a class should come to on this element, per property */
export type ExpectedValues = (className: string, declarations: ClassDeclaration[]) => (property: string) => string;

/**
 * A value relative to a box that is not this one cannot be judged here.
 *
 * `size-full` is `100%` of the parent — for width the same as the element's,
 * for height it depends on whether the parent has one — and `left-1/2` reads
 * as `50%` on anything not positioned. Reporting those as overridden was the
 * noise this exists to remove.
 */
function isRelative(declaration: ClassDeclaration): boolean {
    return declaration.value.includes('%');
}

/**
 * Measure a class's declarations where the element lives.
 *
 * The explanation's `computed` values come from a probe at the root of the
 * document, and that is the wrong place for anything relative: `size-full`
 * is `100%` of *this* parent, not of the body; `translate: -50%` stays a
 * percentage on the element and reads as `0px` on an empty probe; `blur-3xl`
 * is a `filter` built from custom properties the probe never had. Measured on
 * a sibling — same parent, same inherited context — the class produces what
 * the element would show if nothing overruled it, and only a real difference
 * is left.
 *
 * The probe is added and removed synchronously; nothing paints in between.
 */
export function expectedBeside(element: Element): ExpectedValues {
    return (className, declarations) => {
        const doc = element.ownerDocument;
        const parent = element.parentElement ?? doc.body;
        const view = doc.defaultView;
        if (!parent || !view) return () => '';

        const probe = doc.createElement(element.tagName.toLowerCase() === 'img' ? 'div' : element.tagName);
        // The class itself, for the custom properties its rule sets — the
        // explanation keeps only the printable declarations, and `translate:
        // var(--tw-translate-x) …` is nothing without them. The declarations
        // inline on top, so a theme rule that would beat the class on the
        // probe as well (an unlayered `h2 { font-size }`) does not hide that
        // it beats it on the element.
        probe.className = className;
        // `flex: none`: beside a flex item the probe is one too, and a row
        // already full shrinks it to nothing — `xl:w-96` measured `0px` where
        // the element showed 384px, and was forced for no reason. A class
        // declaring `flex` still wins, since the declarations go on after.
        probe.style.cssText = 'visibility:hidden;pointer-events:none;flex:none';
        for (const declaration of declarations) {
            probe.style.setProperty(declaration.property, declaration.value);
        }
        parent.appendChild(probe);
        try {
            const style = view.getComputedStyle(probe);
            const values = new Map(declarations.map((declaration) => [
                declaration.property,
                style.getPropertyValue(declaration.property).trim() || declaration.value,
            ]));
            return (property) => values.get(property) ?? '';
        } finally {
            probe.remove();
        }
    };
}

/**
 * Classes whose declarations the element does not actually carry.
 *
 * `explanations` holds what each class produces on its own — measured on a
 * throwaway element, so it is free of whatever the page does to this one.
 * `computed` reads the real element. `expected`, when given, measures the
 * class where the element lives instead of trusting the explanation's own
 * root-level measurement (see `expectedBeside`). `holds` judges a variant's
 * conditions: a `lg:` class is measured only when the window is that wide
 * (see `mediaHolds`), and without a judge no variant is measured at all.
 */
export function findOverriddenClasses(
    classString: string,
    explanations: Map<string, ClassExplanation>,
    computed: (property: string) => string,
    expected?: ExpectedValues,
    holds: ConditionHolds = NEVER_HOLDS
): OverriddenClass[] {
    const classNames = (classString || '').split(/\s+/).filter(Boolean);
    const overridden: OverriddenClass[] = [];

    // Which classes in this string touch a property, in the order written:
    // a later one winning is a conflict between the user's own classes, not
    // the editor overruling them.
    const declaredBy = new Map<string, string[]>();
    for (const className of classNames) {
        for (const declaration of explanations.get(className)?.declarations ?? []) {
            declaredBy.set(declaration.property, [...(declaredBy.get(declaration.property) ?? []), className]);
        }
    }

    for (const className of classNames) {
        if (isForced(className)) continue;

        const explanation = explanations.get(className);
        if (!explanation || !explanation.conditions.every(holds)) continue;

        const local = expected?.(className, explanation.declarations);
        for (const declaration of explanation.declarations) {
            if (local && isRelative(declaration)) continue;
            const expectedValue = local?.(declaration.property) || declaration.computed || declaration.value;
            const actual = computed(declaration.property);
            if (!actual || sameValue(expectedValue, actual)) continue;

            // Did one of the user's own classes win instead? A variant's
            // explanation carries no `computed` (nothing measures it at the
            // root), so the rival is measured beside the element too, or
            // `md:mb-6` beside `xl:mb-8` reads as the editor's doing.
            const rivals = (declaredBy.get(declaration.property) ?? []).filter((name) => name !== className);
            const winner = rivals.find((name) => {
                const rival = explanations.get(name);
                if (!rival) return false;
                const rivalLocal = expected?.(name, rival.declarations);
                return rival.declarations.some(
                    (rivalDeclaration) => rivalDeclaration.property === declaration.property
                        && sameValue(
                            rivalLocal?.(rivalDeclaration.property) || rivalDeclaration.computed || rivalDeclaration.value,
                            actual
                        )
                );
            });

            overridden.push({
                className,
                property: declaration.property,
                expected: expectedValue,
                actual,
                ...(winner ? { overriddenBy: winner } : {}),
            });
            break; // one reason per class is enough to act on
        }
    }

    return overridden;
}

/**
 * The classes that have to be forced *with* a forced one: its own variants.
 *
 * `!important` outranks a media query. So forcing `grid-cols-1` — because the
 * editor's own CSS overruled it — silently beat `sm:grid-cols-2` and
 * `lg:grid-cols-4`, and a four-column grid rendered as one column at every
 * width. The same for `mt-16!` against `sm:mt-20`, and `gap-y-12!` against
 * `sm:gap-y-16`: measured on a Tailwind stats block, where every base utility
 * came back forced and every responsive one did not.
 *
 * A variant is only measured while its media query holds (`mediaHolds`) — a
 * `lg:` rule is not in effect in a canvas that is not that wide — so the ones
 * outside the current width are never *found* as overridden. That is right,
 * and it is why they have to be carried: with all of them important, the media
 * query decides again, which is what the markup asked for.
 *
 * Only variants of a property the forced class sets. A plain sibling setting
 * the same property is the user's own conflict, and `overriddenBy` already
 * says so.
 */
/**
 * Whether two declarations are about the same thing.
 *
 * `p-6` sets `padding`; `lg:px-8` sets `padding-inline`. Comparing the names
 * literally answers "different property" and leaves the variant unforced,
 * which is the whole bug. A longhand of a shorthand counts as the same family,
 * and the two names that do not follow that shape get said out loud.
 */
const PROPERTY_FAMILIES: Record<string, string> = {
    'row-gap': 'gap',
    'column-gap': 'gap',
    top: 'inset',
    right: 'inset',
    bottom: 'inset',
    left: 'inset',
    'inset-inline': 'inset',
    'inset-block': 'inset',
};

export function sameProperty(a: string, b: string): boolean {
    const family = (name: string) => PROPERTY_FAMILIES[name] ?? name;
    const one = family(a);
    const two = family(b);
    return one === two || one.startsWith(`${two}-`) || two.startsWith(`${one}-`);
}

export function withVariantSiblings(
    classString: string,
    explanations: Map<string, ClassExplanation>,
    forced: Iterable<string>
): Set<string> {
    const all = new Set(forced);
    const classNames = (classString || '').split(/\s+/).filter(Boolean);

    const properties = new Set<string>();
    for (const className of all) {
        for (const declaration of explanations.get(className)?.declarations ?? []) {
            properties.add(declaration.property);
        }
    }
    if (properties.size === 0) return all;

    for (const className of classNames) {
        if (all.has(className)) continue;

        const explanation = explanations.get(className);
        // A variant, and one that touches something being forced
        if (!explanation || explanation.conditions.length === 0) continue;
        if (explanation.declarations.some((declaration) => (
            [...properties].some((property) => sameProperty(property, declaration.property))
        ))) {
            all.add(className);
        }
    }

    return all;
}

/** `absolute` → `absolute!`, leaving a class that already forces it alone */
export function forceClass(className: string): string {
    return className.endsWith('!') ? className : `${className}!`;
}

/**
 * SVG attribute names, in the case the SVG DOM insists on.
 *
 * `htmlAttributes` stores names lower-cased, which is right for HTML: the
 * parser is case-insensitive there and `ARIA-Hidden` and `aria-hidden` are the
 * same attribute. SVG is not HTML. Its DOM is case-sensitive, so an element
 * given `viewbox` has no viewBox at all — it draws at its intrinsic size and
 * every icon in the canvas comes out the wrong scale.
 *
 * Serialized markup hides this, because the HTML parser has an "adjust SVG
 * attributes" step that maps `viewbox` back to `viewBox` when it reads the
 * page. React's editor DOM goes through `setAttribute`, which does not.
 */

/** Every SVG attribute whose spelling is not simply lower-case */
const MIXED_CASE = [
    'attributeName', 'attributeType', 'baseFrequency', 'baseProfile', 'calcMode',
    'clipPathUnits', 'diffuseConstant', 'edgeMode', 'filterUnits', 'glyphRef',
    'gradientTransform', 'gradientUnits', 'kernelMatrix', 'kernelUnitLength',
    'keyPoints', 'keySplines', 'keyTimes', 'lengthAdjust', 'limitingConeAngle',
    'markerHeight', 'markerUnits', 'markerWidth', 'maskContentUnits', 'maskUnits',
    'numOctaves', 'pathLength', 'patternContentUnits', 'patternTransform',
    'patternUnits', 'pointsAtX', 'pointsAtY', 'pointsAtZ', 'preserveAlpha',
    'preserveAspectRatio', 'primitiveUnits', 'refX', 'refY', 'repeatCount',
    'repeatDur', 'requiredExtensions', 'requiredFeatures', 'specularConstant',
    'specularExponent', 'spreadMethod', 'startOffset', 'stdDeviation',
    'stitchTiles', 'surfaceScale', 'systemLanguage', 'tableValues', 'targetX',
    'targetY', 'textLength', 'viewBox', 'xChannelSelector', 'yChannelSelector',
    'zoomAndPan',
];

const BY_LOWERCASE: Record<string, string> = Object.fromEntries(
    MIXED_CASE.map((name) => [name.toLowerCase(), name])
);

/** `viewbox` → `viewBox`; anything already correct, or genuinely lower-case, is returned as it came */
export function svgAttributeName(name: string): string {
    return BY_LOWERCASE[name.toLowerCase()] ?? name;
}

/** The same props with SVG's own spellings restored */
export function withSvgAttributeCase(props: Record<string, unknown>): Record<string, unknown> {
    const fixed: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(props)) {
        fixed[svgAttributeName(name)] = value;
    }
    return fixed;
}

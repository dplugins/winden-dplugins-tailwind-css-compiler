/**
 * Round-tripping the Style tabs.
 *
 * A components tab opened with its first rule flush left and the rest still
 * indented: the wrapper was stripped with `.trim()`, which only touches the
 * ends of the string.
 */

import { describe, test, expect } from 'vitest';
import { combineStyleTabs, parseContentIntoTabs } from '../src/admin/types/styleTabs';

const STORED = `/* Tab: Main Style  */
@layer theme, base, components, utilities;

/* Tab: Components (@layer components) */
@layer components {
  .button-test {
    @apply btn btn-primary bg-red-300;
  }
  .testmarko {
    @apply p-2 bg-blue-500 text-yellow-100;
  }
}`;

describe('parseContentIntoTabs', () => {
    test('a layered tab opens evenly dedented', () => {
        const components = parseContentIntoTabs(STORED).find((tab) => tab.name === 'Components')!;

        expect(components.layer).toBe('components');
        expect(components.content).toBe([
            '.button-test {',
            '  @apply btn btn-primary bg-red-300;',
            '}',
            '.testmarko {',
            '  @apply p-2 bg-blue-500 text-yellow-100;',
            '}',
        ].join('\n'));
    });

    test('deeper nesting keeps its shape', () => {
        const content = `/* Tab: T (@layer components) */
@layer components {
  .card {
    &:hover {
      color: red;
    }
  }
}`;
        expect(parseContentIntoTabs(content).find((tab) => tab.name === 'T')!.content).toBe([
            '.card {',
            '  &:hover {',
            '    color: red;',
            '  }',
            '}',
        ].join('\n'));
    });
});

describe('round trip', () => {
    test('reading and writing back changes nothing', () => {
        expect(combineStyleTabs(parseContentIntoTabs(STORED))).toBe(STORED);
    });

    test('an unlayered tab is left exactly as it is', () => {
        const plain = '/* Tab: Main Style  */\n.a { color: red }';
        expect(combineStyleTabs(parseContentIntoTabs(plain))).toBe(plain);
    });
});

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Nothing may read an option key the migration deletes.
 *
 * App/Helpers/Migration.php renames seven keys for wordpress.org compliance and
 * calls delete_option() on each original. Three reads in pro/ were never updated
 * — two in Bricks2Data.php, one in Bricks2.php — so on any site that had run the
 * migration they returned their defaults permanently: the wizzard config came
 * back null, and an enabled "dequeue Bricks styles" silently stopped applying.
 *
 * Nothing caught it. The failure is silent by construction — every one of those
 * reads has a default, so there is no fatal, no warning and no console error for
 * an end-to-end check to notice, and the code path needs Bricks installed to run
 * at all. A source scan is the honest way to gate this: it costs nothing, needs
 * no WordPress, and fails the moment the pattern comes back.
 *
 * The rule is not "never name the old key" — the migration has to name both
 * sides, and a fallback read is correct because the migration runs on admin_init
 * while the front end does not. The rule is that a *lone* read of a deleted key,
 * with no new key in the same expression, is a bug.
 */
const PLUGIN_ROOT = join(__dirname, '..');
const MIGRATION = join(PLUGIN_ROOT, 'App/Helpers/Migration.php');

/** The rename map, read from the migration rather than duplicated here. */
function renamedKeys(): Array<[string, string]> {
  const source = readFileSync(MIGRATION, 'utf8');
  const map = source.match(/\$options_to_migrate\s*=\s*\[([\s\S]*?)\];/);
  if (!map) {
    throw new Error('could not find $options_to_migrate in Migration.php');
  }
  return [...map[1].matchAll(/'([^']+)'\s*=>\s*'([^']+)'/g)].map((m) => [m[1], m[2]]);
}

function phpFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'vendor' || entry === 'build' || entry === '.git') {
      continue;
    }
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      phpFiles(path, found);
    } else if (entry.endsWith('.php')) {
      found.push(path);
    }
  }
  return found;
}

describe('option keys the migration deletes', () => {
  const pairs = renamedKeys();

  it('the migration still renames the keys this test is about', () => {
    expect(pairs.length).toBeGreaterThan(0);
    expect(Object.fromEntries(pairs)).toHaveProperty('winden_editor', 'winden_dplugins_editor');
  });

  it('are never read on their own', () => {
    const offenders: string[] = [];

    for (const file of phpFiles(PLUGIN_ROOT)) {
      if (file === MIGRATION) {
        continue;
      }
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        for (const [oldKey, newKey] of pairs) {
          const readsOld = new RegExp(`get_option\\(\\s*['"]${oldKey}['"]`).test(line);
          // A fallback names both keys on the same line and is the correct shape.
          if (readsOld && !line.includes(newKey)) {
            offenders.push(`${relative(PLUGIN_ROOT, file)}:${index + 1}  ${line.trim()}`);
          }
        }
      });
    }

    expect(offenders, `these read an option key Migration.php deletes:\n  ${offenders.join('\n  ')}`)
      .toEqual([]);
  });
});

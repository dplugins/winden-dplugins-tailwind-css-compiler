/**
 * How a plugin failure is reported.
 *
 * `@plugin "dculus-ui"` — a component library, not a Tailwind plugin — used to
 * surface as "Tailwind couldn't compile: g is not a function", with the hint
 * pointing at the user's `@theme` block. The package that failed has to be
 * named, and a package that was never a plugin has to be told apart from one
 * that could not be fetched.
 */

import { describe, test, expect } from 'vitest';
import { WindenPluginError } from '../src/compiler/errors';

/** errors.js is plain JS; its `details` bag has no declared shape */
type PluginDetails = { pluginUrl: string; originalError: string; suggestion: string };

describe('WindenPluginError', () => {
    test('names the plugin when it could not be fetched', () => {
        const error = new WindenPluginError('daisyui', new Error('HTTP 404'));
        expect(error.message).toBe('Couldn\'t load the plugin "daisyui"');
        expect(error.phase).toBe('plugin');
    });

    test('says so plainly when the package is not a plugin at all', () => {
        const error = new WindenPluginError('dculus-ui', new Error('its default export is not a plugin'), {
            stage: 'run',
            suggestion: 'Component libraries cannot be loaded with @plugin.',
        });

        expect(error.message).toBe('The plugin "dculus-ui" failed while Tailwind was running it');
        const details = error.details as PluginDetails;
        expect(details.originalError).toBe('its default export is not a plugin');
        expect(details.suggestion).toContain('Component libraries');
    });

    test('carries the plugin through to the UI payload', () => {
        const error = new WindenPluginError('dculus-ui', new Error('boom'), { stage: 'run' });
        expect((error.toJSON().details as PluginDetails).pluginUrl).toBe('dculus-ui');
    });
});

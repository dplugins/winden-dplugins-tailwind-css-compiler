/**
 * A `process` Monaco can read, injected into every file that mentions one.
 *
 * Winden's own Tailwind compiler leaves a browserify-style `window.process`
 * behind — `{ versions: { node: '18.0.0' } }` with no `env`. Monaco's
 * `platform.js` reads that as "running under Node" and dies on
 * `process.env.CI` before it draws anything:
 *
 *     TypeError: Cannot read properties of undefined (reading 'CI')
 *
 * It never came up while the admin bundle was one IIFE: Monaco was evaluated
 * at load, before the compiler had set that global. As a lazy chunk it arrives
 * afterwards and finds the half-built object.
 *
 * Injected rather than imported. ES modules evaluate their imports before the
 * importing file's body, so no `import './shim'` can run early enough —
 * measured, the error survived that attempt. `inject` replaces the free
 * `process` identifier at build time, so every chunk carries its own.
 *
 * The html-editor bundle wraps itself in `(function(process){ … })(undefined)`
 * for the same reason; a wrapper cannot hold the imports splitting depends on.
 */

const existing = typeof globalThis.process === 'object' && globalThis.process !== null
    ? globalThis.process
    : {};

const shim = { ...existing, env: existing.env || {} };

export { shim as process };

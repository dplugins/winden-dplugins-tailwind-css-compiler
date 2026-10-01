/**
 * ESLint — bug-catching rules only.
 *
 * Scope is the JavaScript that TypeScript cannot check for us: the builder
 * integrations and the class helper's React layer, which has no component
 * tests. Style is deliberately not enforced; every rule here catches a real
 * defect class (stale hook closures, undefined variables, unreachable code).
 *
 * TypeScript files are covered by `npm run typecheck` instead —
 * typescript-eslint does not support TypeScript 7 yet (peer caps at <6.1.0),
 * so wiring it up would mean downgrading the compiler.
 */

import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
    {
        ignores: [
            'build/**',
            'pro/build/**',
            'node_modules/**',
            'vendor/**',
            'configs/**',
            'assets/**',
            '**/*.min.js',
        ],
    },
    {
        files: ['src/**/*.{js,jsx}', 'pro/src/**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                wp: 'readonly',
                jQuery: 'readonly',
                angular: 'readonly',
                bricks: 'readonly',
                oxygen: 'readonly',
                elementor: 'readonly',
                tailwind: 'readonly',
            },
        },
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...js.configs.recommended.rules,

            // Hook correctness — the class helper's React layer has no tests,
            // so a stale closure would otherwise reach the editor unnoticed.
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',

            // Noise from legacy builder code that is not worth churning now.
            'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            'no-prototype-builtins': 'off',
        },
    },
    {
        // Oxygen injects its Angular scope into these files at runtime.
        files: ['pro/src/plain-classes/oxygen/**/*.js', 'pro/src/winden-classes/oxygen/**/*.js'],
        languageOptions: {
            globals: {
                iframeScope: 'readonly',
                $scope: 'readonly',
                $rootScope: 'readonly',
                ct_ui_action: 'readonly',
            },
        },
    },
    {
        // The browser compiler carries an AMD shim, so `require` is defined
        // at runtime even though the bundle is ESM (see CLAUDE.md).
        files: ['src/compiler/**/*.js'],
        languageOptions: {
            globals: { require: 'readonly', module: 'writable', process: 'readonly' },
        },
    },
];

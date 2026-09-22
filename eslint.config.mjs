// @ts-check
/**
 * ESLint config for `@coolms/dtmpl-angular`.
 *
 * Written with the move, not after it: these files were linted as
 * `src/app/shell/**` and `src/app/features/documents/**` until they left the
 * admin's `src/` tree, and nothing reports that departure -- an extraction
 * takes code OUT of a tool's configured scope silently, which is how
 * core-angular's 30 files once sat unchecked.
 *
 * **One bar, not a fork.** The rules come from the same
 * `packages/eslint.config.base.mjs` factory core, the kit, the editor and the
 * admin use. The base is VENDORED here as `eslint.config.base.mjs`, a
 * byte-identical copy, which is what lets this package lint inside its own
 * repository where the shared file does not exist. `make check-fe` fails if a
 * copy drifts; fix drift by editing the canonical file and running
 * `node tools/sync-eslint-base.mjs`, never by editing the copy -- an edit in
 * place is reverted by the next sync, silently.
 *
 * The relaxed tier is inherited from the editor package, and for the same
 * reason: this dialog drives the Tiptap bridge, whose commands and node attrs
 * surface `any` at almost every boundary.
 */

import createBaseConfig from './eslint.config.base.mjs';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/** @type {import('typescript-eslint').ConfigArray} */
export default tseslint.config(
    ...createBaseConfig({ tseslint, globals }),

    // `tsconfig.lib.json` excludes specs, so a type-checked rule has no program
    // for them. They are type-checked by the admin's `tsconfig.spec.json`,
    // which names this package's specs explicitly.
    {
        ignores: ['dist/**', 'src/**/*.spec.ts'],
    },

    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.lib.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            '@angular-eslint': angular.tsPlugin,
        },
        processor: angular.processInlineTemplates,
        rules: {
            ...angular.configs.tsRecommended.at(-1).rules,

            '@angular-eslint/component-selector': [
                'warn',
                { type: 'element', prefix: ['app', 'cms', 'coolms'], style: 'kebab-case' },
            ],
            '@angular-eslint/directive-selector': [
                'warn',
                { type: 'attribute', prefix: ['app', 'cms', 'coolms'], style: 'camelCase' },
            ],
            '@angular-eslint/prefer-on-push-component-change-detection': 'warn',

            // Tiptap and ProseMirror are untyped at the seam; these were off
            // for this code in the admin and stay off here -- turning them on
            // would report the library, not this package.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',

            '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],

            // The admin's codebase-wide deferrals, carried over rather than
            // promoted in the same change that moved the directory.
            '@typescript-eslint/no-base-to-string': 'warn',
            '@typescript-eslint/consistent-type-imports': 'warn',
            '@typescript-eslint/prefer-nullish-coalescing': 'warn',
            '@typescript-eslint/no-redundant-type-constituents': 'warn',
            '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
            '@typescript-eslint/no-unnecessary-condition': 'warn',
            '@typescript-eslint/strict-boolean-expressions': 'warn',
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-misused-promises': 'warn',
            '@typescript-eslint/require-await': 'warn',
        },
    },

    {
        files: ['**/*.html'],
        ...tseslint.configs.disableTypeChecked,
    },
    {
        files: ['**/*.html'],
        languageOptions: { parser: angular.templateParser },
        plugins: { '@angular-eslint/template': angular.templatePlugin },
        rules: {
            ...angular.configs.templateRecommended.at(-1).rules,
            '@angular-eslint/template/click-events-have-key-events': 'warn',
            '@angular-eslint/template/interactive-supports-focus': 'warn',
            '@angular-eslint/template/alt-text': 'warn',
        },
    },
);

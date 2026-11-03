// What the linter holds the code to (PT-083 K5). tests/lint.test.js runs it over src; the tools and tests are outside the shipped build and are only checked by hand.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'tools/desktop/**', 'attack/**', 'review/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.es2024, process: 'readonly' } },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-cond-assign': 'off',
      'no-prototype-builtins': 'off',
      'no-fallthrough': 'error',
      'no-shadow-restricted-names': 'error',
      'no-useless-escape': 'off',
      'no-sparse-arrays': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
    },
  },
];

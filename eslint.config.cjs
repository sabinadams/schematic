const eslintConfigPrettier = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');
const typescript = require('@typescript-eslint/parser');
const sortKeysFix = require('eslint-plugin-sort-keys-fix');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/generated/**',
      '**/coverage/**',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescript,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      prettier: prettierPlugin,
      'sort-keys-fix': sortKeysFix,
    },
    rules: {
      ...eslintConfigPrettier.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'linebreak-style': ['error', 'unix'],
      'no-unused-vars': 'off',
      'prettier/prettier': [
        'error',
        {
          parser: 'typescript',
          singleQuote: true,
          useTabs: true,
        },
      ],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'sort-keys-fix/sort-keys-fix': 'error',
    },
  },
];

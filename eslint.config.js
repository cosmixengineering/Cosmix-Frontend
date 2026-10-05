import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'artifacts/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/modules/*/*'], message: 'Import a module through its public index.ts.' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'Do not render untrusted HTML. Review a concrete sanitization requirement first.',
        },
      ],
    },
  },
  {
    files: ['src/modules/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/**'],
              message: 'Use relative imports inside a module; coordinate cross-module contracts.',
            },
            {
              group: ['@/app/**', '@/pages/**'],
              message: 'Modules must not depend on application composition.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/utils/**/*.ts', 'src/types/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/**', '@/app/**'],
              message: 'Shared code must not depend on business modules or app composition.',
            },
          ],
        },
      ],
    },
  },
  { files: ['*.{js,ts}'], languageOptions: { globals: globals.node } },
);

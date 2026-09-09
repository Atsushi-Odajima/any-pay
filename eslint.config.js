import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'dev-dist', 'node_modules', '.tmp', 'src/types/database.ts', 'supabase/functions'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'error',
      // §6: Supabase クライアントは features/*/api.ts などデータ層からのみ参照する
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/shared/lib/supabase', '**/shared/lib/supabase', '@supabase/supabase-js'],
              message:
                'UI から Supabase を直接 import しない。features/<domain>/api.ts を経由すること（CLAUDE.md §6）',
            },
          ],
        },
      ],
      // §6: window / document の直参照は shared/platform の中に閉じ込める
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'shared/platform 経由で使うこと（CLAUDE.md §6）' },
        { name: 'document', message: 'shared/platform 経由で使うこと（CLAUDE.md §6）' },
      ],
    },
  },
  {
    // データ層・プラットフォーム層は例外
    files: [
      'src/features/**/api.ts',
      'src/features/**/realtime.ts',
      'src/shared/lib/**',
      'src/shared/platform/**',
      'src/main.tsx',
    ],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
    },
  },
  {
    files: ['tests/**', 'scripts/**', '*.config.{ts,js,mjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off', 'no-restricted-globals': 'off', 'no-restricted-imports': 'off' },
  },
);

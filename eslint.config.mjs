import eslint from '@eslint/js'
import astro from 'eslint-plugin-astro'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/.astro/**',
      '**/.wrangler/**',
      '**/build/**',
      '**/coverage/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/storybook-static/**',
      '**/test-results/**',
      '**/worker-configuration.d.ts',
      'packages/background-remover/tooling/.venv/**',
      'packages/data-ops/drizzle/meta/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,astro}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __BACKGROUND_ONNX_RUNTIME_VERSION__: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: reactHooks.configs.flat.recommended.plugins,
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    files: [
      'packages/react-components/.storybook/**/*.{jsx,tsx}',
      'packages/react-components/src/stories/**/*.{jsx,tsx}',
    ],
    rules: {
      // Storybook invokes decorator and render callbacks as React components.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: ['packages/react-components/src/components/**/*.{ts,tsx}'],
    rules: {
      // Empty extension interfaces intentionally keep exported component prop names stable.
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['apps/backend/**/*.{ts,tsx}', 'apps/frontend/worker/**/*.{js,ts}'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
)

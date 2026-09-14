import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import react from 'eslint-plugin-react'

/*
  ESLint (flat config) for this Vite + React project.
  Catches real code issues the other checks don't: undefined variables, unused
  variables, and React Hooks mistakes. Run with `npm run lint`.
*/
export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      // Count JSX references as "used" so imports/components aren't flagged.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off', // not needed with the modern JSX transform
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Ignore intentionally-unused args prefixed with _ (e.g. onStep(_, step)).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]

// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['figma/**', 'utils/vendor/x-text.js'],
  },
  {
    rules: {
      // Reliability / production cleanliness
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // `any` is an error in app code; tests may use it for deliberately partial fixtures and mocks.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/unified-signatures': 'warn',
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'import/first': 'off',
      'no-useless-escape': 'warn',
      'no-extra-boolean-cast': 'warn',
      // Vue 3 supports fragments; this rule is too strict for layouts.
      'vue/no-multiple-template-root': 'off',
    },
  },
  {
    files: ['tests/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
)

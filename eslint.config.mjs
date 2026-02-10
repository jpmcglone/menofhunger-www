// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Reliability / production cleanliness
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // This codebase predates enforcing these strictly via CI lint.
      // We'll tighten these over time (goal: fewer `any`s and unused vars).
      '@typescript-eslint/no-explicit-any': 'off',
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
)

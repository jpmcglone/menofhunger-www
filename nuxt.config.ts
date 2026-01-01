// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/test-utils',
    '@nuxt/ui',
    '@primevue/nuxt-module'
  ],
  css: ['~/assets/css/main.css', 'primeicons/primeicons.css'],
  ssr: true,
  routeRules: {
    // Static where it makes sense (fast marketing pages), SSR everywhere else.
    '/': { prerender: true },
    '/about': { prerender: true },
    '/test': { prerender: true }
  },
  primevue: {
    options: {
      ripple: true
    },
    importTheme: {
      from: '~/config/primevue.theme',
      as: 'MenOfHungerTheme'
    },
    // Avoid collisions with Nuxt UI composables (e.g. `useToast`)
    composables: {
      exclude: ['useToast']
    }
  },
  colorMode: {
    // Default to system preference; users can override and it will persist via storageKey.
    preference: 'system',
    fallback: 'light',
    classPrefix: '',
    classSuffix: '',
    storageKey: 'color-mode',
    system: true
  }
})
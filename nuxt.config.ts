// https://nuxt.com/docs/api/configuration/nuxt-config
import { siteConfig } from './config/site'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        // Preload custom cursors to avoid flicker (OS cursor showing briefly while assets load)
        { rel: 'preload', as: 'image', href: '/cursors/cursor.svg', type: 'image/svg+xml' },
        { rel: 'preload', as: 'image', href: '/cursors/cursor-hand.svg', type: 'image/svg+xml' },
        { rel: 'preload', as: 'image', href: '/cursors/cursor-light.svg', type: 'image/svg+xml' },
        { rel: 'preload', as: 'image', href: '/cursors/cursor-hand-light.svg', type: 'image/svg+xml' }
      ],
      title: siteConfig.meta.title
    }
  },
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
    // Default to dark for first-time visitors; users can still choose system/light/dark and it persists via storageKey.
    preference: 'dark',
    fallback: 'dark',
    classPrefix: '',
    classSuffix: '',
    storageKey: 'color-mode',
    system: true
  }
})
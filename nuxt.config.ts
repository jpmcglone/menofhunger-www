/// <reference types="node" />
// https://nuxt.com/docs/api/configuration/nuxt-config
import { siteConfig } from './config/site'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  // Keep devtools off in production builds (reduces bundle + memory).
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  runtimeConfig: {
    // Server-side base URL for calling the API during SSR.
    // Useful when the web server runs in a container/VM where `localhost` differs from the browser.
    // Configure via `.env`: NUXT_API_BASE_URL=http://api:3001
    apiBaseUrl: process.env.NUXT_API_BASE_URL || process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
    public: {
      // Used by the website to call the API (e.g. health checks).
      // Configure via `.env`: NUXT_PUBLIC_API_BASE_URL=http://localhost:3001
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
      // Public base URL for assets (Cloudflare R2 public bucket / custom domain).
      // Example: NUXT_PUBLIC_ASSETS_BASE_URL=https://moh-assets.<accountId>.r2.dev
      assetsBaseUrl: process.env.NUXT_PUBLIC_ASSETS_BASE_URL || ''
    }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
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
    '@nuxt/ui',
    '@primevue/nuxt-module'
  ],
  fonts: {
    // Social-app friendly: clean, modern sans with strong readability.
    // Loaded with swap to avoid FOIT.
    families: [
      {
        name: 'Inter',
        provider: 'google',
        weights: [400, 500, 600, 700],
        styles: ['normal'],
        subsets: ['latin'],
      },
      {
        // Serif headings: quiet authority, long-form vibe.
        name: 'Literata',
        provider: 'google',
        weights: [400, 600, 700],
        styles: ['normal'],
        subsets: ['latin'],
      },
    ],
  },
  css: ['~/assets/css/main.css', 'primeicons/primeicons.css', 'vue-advanced-cropper/dist/style.css'],
  ssr: true,
  // Render builds can be memory-constrained; sourcemaps are a big multiplier.
  vite: {
    build: {
      sourcemap: false
    }
  },
  nitro: {
    sourceMap: false,
    prerender: {
      // Avoid auto-prerendering internal content endpoints.
      // Nitro treats ignore entries as exact strings or regex; regex is safest.
      ignore: [/^\/__nuxt_content\//],
      crawlLinks: false
    }
  },
  routeRules: {
    // Static landing page (no app layout, no presence).
    '/': { prerender: true },

    // App-layout routes: client-only so presence/WebSocket state is correct on fresh launch.
    '/home': { ssr: false },
    '/explore': { ssr: false },
    '/notifications': { ssr: false },
    '/messages': { ssr: false },
    '/bookmarks': { ssr: false },
    '/bookmarks/**': { ssr: false },
    '/groups': { ssr: false },
    '/only-me': { ssr: false },
    '/online': { ssr: false },
    '/p/**': { ssr: false },
    '/u/**': { ssr: false },
    '/settings': { ssr: false },
    '/feedback': { ssr: false },
    '/terms': { ssr: false },
    '/privacy': { ssr: false },
    '/about': { ssr: false },
    '/admin': { ssr: false },
    '/admin/**': { ssr: false },
    '/status': { ssr: false },
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
    storageKey: 'color-mode'
  }
})
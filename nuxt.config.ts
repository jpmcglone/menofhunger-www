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
      assetsBaseUrl: process.env.NUXT_PUBLIC_ASSETS_BASE_URL || '',
      // VAPID public key for Web Push (must match API VAPID_PUBLIC_KEY).
      vapidPublicKey: (process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim(),
      // Facebook App ID for og:fb:app_id (fixes Sharing Debugger warning; improves link previews).
      facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID || ''
    }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // PWA + add-to-home meta
        { name: 'theme-color', content: '#ffffff' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: siteConfig.name }
      ],
      link: [
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'apple-touch-icon-precomposed', href: '/apple-touch-icon-precomposed.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }
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
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'emoji-picker',
    },
  },
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
      sourcemap: false,
      // CI warning noise: Nuxt/Vite warns at 500kB, but our largest client chunk is ~520kB minified.
      // Keep the warning meaningful without spamming logs.
      chunkSizeWarningLimit: 600,
    },
    plugins: [
      {
        name: 'nuxt-path-no-404',
        enforce: 'pre',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const path = req.url?.split('?')[0] ?? ''
            if (req.method === 'GET' && (path === '/_nuxt/' || path === '/_nuxt')) {
              res.statusCode = 204
              res.end()
              return
            }
            next()
          })
        }
      }
    ]
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
    // ——— SEO: SSR vs prerender ———
    // • SSR (ssr: true): Page is rendered on the server per request. Crawlers and link unfurlers
    //   get full HTML with correct <title>, og:*, and meta in the initial response. Use for any
    //   public or shareable page where meta depends on the URL (profiles, posts, landing).
    // • prerender: Page is rendered at build time and served as static HTML. Use only for
    //   truly static content (terms, privacy, about). Do not use for /u/* or /p/* (infinite set).
    // • ssr: false: Client-only; no meta in initial HTML. Use only for app-shell routes that
    //   need correct client state (presence, WebSocket) and are not shared as links.

    // Public shareable: SSR so link unfurls and crawlers get correct og:image, title, description.
    // /: middleware redirects logged-in users to /home (SSR); anonymous see landing.
    // SWR disabled: Nitro serves cached response before Nuxt cookie hooks run, causing
    // "Cannot append headers after they are sent" when useCookie writes Set-Cookie.
    '/': { ssr: true },
    // Cache SSR HTML for anonymous visitors only. Logged-in SSR can be personalized (cookies forwarded to API),
    // so bypass cache when `moh_session` cookie is present to avoid leaking viewer-specific state.
    '/u/**': {
      ssr: true,
      cache: {
        maxAge: 60,
        // IMPORTANT: keep SWR off. Nuxt may write Set-Cookie during render; SWR revalidation runs after
        // the cached response is sent and would trigger "Cannot append headers after they are sent".
        swr: false,
        // Avoid leaking viewer-specific SSR HTML by keying cache entries by Cookie.
        // This effectively makes anonymous users share one cache entry (cookie often empty),
        // while authenticated users get per-session cache keys.
        varies: ['cookie'],
      },
    },
    // Link preview + crawler hot path: cache SSR HTML for anonymous visitors (no session cookie).
    '/p/**': {
      ssr: true,
      cache: {
        maxAge: 60,
        // IMPORTANT: keep SWR off (see note above).
        swr: false,
        varies: ['cookie'],
      },
    },

    // Static content: prerender for fast, cacheable, indexable HTML.
    '/terms': { prerender: true },
    '/privacy': { prerender: true },
    '/about': { prerender: true },

    // App-shell: client-only so presence/WebSocket state is correct on fresh load.
    '/home': { ssr: false },
    '/explore': { ssr: false },
    '/notifications': { ssr: false },
    '/chat': { ssr: false },
    '/bookmarks': { ssr: false },
    '/bookmarks/**': { ssr: false },
    '/groups': { ssr: false },
    '/only-me': { ssr: false },
    '/online': { ssr: false },
    '/settings': { ssr: false },
    '/feedback': { ssr: false },
    '/admin': { ssr: false },
    '/admin/**': { ssr: false },
    '/status': { ssr: false },

    // ——— CDN / edge caching: reduce bandwidth and request load on www ———
    // Nitro build output + public assets. Use s-maxage so CDN caches; browsers use max-age.
    '/_nuxt/**': {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },
    '/images/**': {
      headers: {
        'cache-control': 'public, max-age=86400, stale-while-revalidate=86400',
      },
    },
    '/sounds/**': {
      headers: {
        'cache-control': 'public, max-age=86400, stale-while-revalidate=86400',
      },
    },
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
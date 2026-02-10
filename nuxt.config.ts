/// <reference types="node" />
// https://nuxt.com/docs/api/configuration/nuxt-config
import { siteConfig } from './config/site'

function hostFromUrl(raw: string | undefined | null): string | null {
  const s = String(raw || '').trim()
  if (!s) return null
  try {
    return new URL(s).hostname
  } catch {
    return null
  }
}

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
      sentry: {
        // DSN is safe to be public; Render should set this in prod.
        // Local dev can omit it to disable Sentry, or set it to test.
        dsn: (process.env.NUXT_PUBLIC_SENTRY_DSN || '').trim(),
        environment: (process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development').trim(),
      },
      // Public base URL for assets (Cloudflare R2 public bucket / custom domain).
      // Example: NUXT_PUBLIC_ASSETS_BASE_URL=https://moh-assets.<accountId>.r2.dev
      assetsBaseUrl: process.env.NUXT_PUBLIC_ASSETS_BASE_URL || '',
      // VAPID public key for Web Push (must match API VAPID_PUBLIC_KEY).
      vapidPublicKey: (process.env.NUXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim(),
      // Facebook App ID for og:fb:app_id (fixes Sharing Debugger warning; improves link previews).
      facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID || '',
      adsense: {
        enabled: String(process.env.NUXT_PUBLIC_ADSENSE_ENABLED || '').trim() === 'true',
        // Example: ca-pub-1234567890123456
        client: String(process.env.NUXT_PUBLIC_ADSENSE_CLIENT || '').trim(),
        // Example: 1234567890 (numeric string)
        railSlot: String(process.env.NUXT_PUBLIC_ADSENSE_RAIL_SLOT || '').trim(),
        feedSlot: String(process.env.NUXT_PUBLIC_ADSENSE_FEED_SLOT || '').trim(),
        // DEV ONLY: set to true to request test ads (AdSense supports data-adtest="on").
        adtest: String(process.env.NUXT_PUBLIC_ADSENSE_ADTEST || '').trim() === 'true',
      },
    }
  },

  app: {
    head: {
      // Keep AdSense loader off unless actually enabled + configured.
      // (Avoids noisy 400s in dev/staging when placeholders are present.)
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        // NOTE: Avoid iOS standalone (Add to Home Screen) full-bleed viewport behavior.
        // `viewport-fit=cover` + translucent status bar can cause content to render under the status bar
        // and appear shifted/clipped. Let iOS manage safe areas instead.
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // Hint to the browser that we support both schemes (affects UA surfaces + form controls).
        { name: 'color-scheme', content: 'light dark' },
        // iOS: avoid auto-linking phone numbers in app-like UI.
        { name: 'format-detection', content: 'telephone=no' },
        // AdSense site verification (safe; does not render ads by itself).
        ...(String(process.env.NUXT_PUBLIC_ADSENSE_ENABLED || '').trim() === 'true' &&
        /^ca-pub-\d+$/.test(String(process.env.NUXT_PUBLIC_ADSENSE_CLIENT || '').trim())
          ? [
              {
                name: 'google-adsense-account',
                content: String(process.env.NUXT_PUBLIC_ADSENSE_CLIENT || '').trim(),
              },
            ]
          : []),
        // PWA + add-to-home meta
        // Default theme-color (overridden at runtime to match in-app dark mode toggle).
        { name: 'theme-color', content: '#ffffff' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        // Prefer default status bar behavior in iOS standalone.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: siteConfig.name }
      ],
      // AdSense loader in initial HTML (only when enabled + client looks real).
      script:
        String(process.env.NUXT_PUBLIC_ADSENSE_ENABLED || '').trim() === 'true' &&
        /^ca-pub-\d+$/.test(String(process.env.NUXT_PUBLIC_ADSENSE_CLIENT || '').trim())
        ? [
            {
              async: true,
              src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
                String(process.env.NUXT_PUBLIC_ADSENSE_CLIENT || '').trim(),
              )}`,
              crossorigin: 'anonymous',
            },
          ]
        : [],
      link: [
        { rel: 'manifest', href: '/site.webmanifest' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'apple-touch-icon-precomposed', sizes: '180x180', href: '/apple-touch-icon-precomposed.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/android-chrome-192x192.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/android-chrome-512x512.png' },
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
    '@primevue/nuxt-module',
    '@sentry/nuxt/module'
  ],

  icon: {
    // Prefer local Iconify collections (more reliable + faster than remote).
    // Install the collections you use (e.g. `@iconify-json/tabler`) so they can be served from the Nuxt server bundle.
    serverBundle: 'local',
    // If an icon collection isn't installed, fail loudly rather than silently hitting the public Iconify API.
    fallbackToApi: false,
    // Speed up first paint: bundle common icons into the client so we don't need the
    // runtime /api/_nuxt_icon/* request waterfall for navigation + core UI.
    //
    // We keep serverBundle enabled so any non-bundled/dynamic icons still work.
    clientBundle: {
      // Scan app files for static icon usages.
      scan: {
        globInclude: [
          'components/**/*.{vue,ts}',
          'layouts/**/*.vue',
          'pages/**/*.vue',
          'composables/**/*.ts',
          'utils/**/*.ts',
        ],
        globExclude: ['node_modules', '.nuxt', '.output'],
      },
      // Explicitly include core nav icons (these are selected from TS objects, so scanning may miss them).
      icons: [
        // Primary nav (useAppNav)
        'tabler:home',
        'tabler:home-filled',
        'tabler:search',
        'tabler:bell',
        'tabler:bell-filled',
        'tabler:message-circle',
        'tabler:message-circle-filled',
        'tabler:bookmark',
        'tabler:bookmark-filled',
        'tabler:radio',
        'tabler:music',
        'heroicons-outline:user-group',
        'heroicons-solid:user-group',
        'heroicons-outline:user-circle',
        'heroicons-solid:user-circle',
        'heroicons-outline:eye-slash',
        'heroicons-solid:eye-slash',
        // Common core actions
        'tabler:plus',
        'tabler:login',
        'tabler:logout',
      ],
      // Guardrail: keep the icon client bundle from growing unbounded.
      // (Uncompressed size; the shipped gzip/brotli is much smaller.)
      sizeLimitKb: 512,
    },
  },

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

  css: ['~/assets/css/main.css'],
  ssr: true,

  image: {
    // Allow NuxtImg/IPX to optimize images from our asset host + API host.
    domains: Array.from(
      new Set(
        [
          hostFromUrl(process.env.NUXT_PUBLIC_ASSETS_BASE_URL),
          hostFromUrl(process.env.NUXT_API_BASE_URL),
          hostFromUrl(process.env.NUXT_PUBLIC_API_BASE_URL),
          hostFromUrl(siteConfig.url),
          'localhost',
          '127.0.0.1',
        ].filter(Boolean) as string[],
      ),
    ),
  },

  // Render builds can be memory-constrained; sourcemaps are a big multiplier.
  vite: {
    build: {
      sourcemap: false,
      // CI warning noise: Nuxt/Vite warns at 500kB, but our largest client chunk is ~520kB minified.
      chunkSizeWarningLimit: 600,
    },
    // Smoother dev: pre-bundle heavy deps so Vite doesn't re-transform them on every request.
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        '@vueuse/core',
        'primevue',
        'socket.io-client',
        'vue-advanced-cropper',
        'emoji-picker-element',
      ],
    },
    css: {
      // Slightly faster CSS HMR in dev (no source map for CSS).
      devSourcemap: false,
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
    // Public shareable: SSR for crawlers/link unfurls.
    // NOTE: We intentionally avoid Nitro's in-memory route cache here. It fragments by Cookie easily and can
    // increase memory churn on Render. Prefer CDN caching if/when Cloudflare is in front.
    '/u/**': { ssr: true },
    '/p/**': { ssr: true },

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
    '/sw-push.js': {
      headers: {
        // Service worker updates should propagate immediately (avoids “stuck” SW caching bugs).
        'cache-control': 'no-store, no-cache, must-revalidate',
      },
    },
    '/_nuxt/**': {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },
    // Nuxt Image (IPX) transformation output. Safe to cache at the edge (URLs include params).
    '/_ipx/**': {
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
  },

  sentry: {
    org: 'jp-mcglone',
    project: 'menofhunger-www'
  },

  sourcemap: {
    client: 'hidden'
  }
})
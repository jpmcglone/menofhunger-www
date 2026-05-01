/**
 * Push-only Service Worker. Shows OS notification only when no app tab has visibilityState === 'visible'.
 * Test payloads (payload.test === true or title "Test notification") are always shown.
 * On notification click: focus existing app window and navigate, or open a new window.
 */

// IMPORTANT: bump this whenever caching logic changes so old caches are purged.
self.__MOH_SW_VERSION = 'moh-sw-dev-1777671627222';
const CACHE_PREFIX = 'moh-sw'
const NUxT_ASSETS_CACHE = `${CACHE_PREFIX}:nuxt:${self.__MOH_SW_VERSION}`
const STATIC_ASSETS_CACHE = `${CACHE_PREFIX}:static:${self.__MOH_SW_VERSION}`

function isCacheablePath(pathname) {
  // DEV SAFETY:
  // Never cache Nuxt dev-server assets on localhost. Vite/Nuxt rewrites and dependency
  // re-optimization can change what a given URL returns between reloads; cache-first can
  // accidentally serve CSS for a JS module (or vice versa), triggering strict MIME errors.
  const host = self.location?.hostname || ''
  const isLocalhost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local')

  if (!isLocalhost && pathname.startsWith('/_nuxt/')) return { cacheName: NUxT_ASSETS_CACHE }
  if (pathname.startsWith('/images/')) return { cacheName: STATIC_ASSETS_CACHE }
  // DEV SAFETY: don't cache sounds on localhost (otherwise edits can appear "stuck" due to SW cache).
  if (!isLocalhost && pathname.startsWith('/sounds/')) return { cacheName: STATIC_ASSETS_CACHE }
  if (pathname.startsWith('/cursors/')) return { cacheName: STATIC_ASSETS_CACHE }

  // Icons/manifest
  // DEV SAFETY:
  // Avoid caching these on localhost because browsers can request favicons in surprising ways
  // (and "hard reload" semantics differ from normal reload), leading to confusing stale icons.
  if (!isLocalhost) {
    if (pathname === '/site.webmanifest') return { cacheName: STATIC_ASSETS_CACHE }
    if (pathname.startsWith('/android-chrome-')) return { cacheName: STATIC_ASSETS_CACHE }
    if (pathname.startsWith('/apple-touch-icon')) return { cacheName: STATIC_ASSETS_CACHE }
    if (pathname.startsWith('/favicon')) return { cacheName: STATIC_ASSETS_CACHE }
  }

  return null
}

function notificationPath(notification) {
  const data = notification?.data || {}
  const rawUrl = typeof data.url === 'string' ? data.url : ''
  if (!rawUrl) return ''
  try {
    return new URL(rawUrl, self.location.origin).pathname
  } catch {
    return rawUrl.startsWith('/') ? rawUrl.split(/[?#]/)[0] : ''
  }
}

function notificationMatchesCloseTarget(notification, target) {
  if (!notification || !target) return false
  if (target.all === true) return true

  const data = notification.data || {}
  const tag = String(notification.tag || data.tag || '')
  const kind = String(data.kind || '')
  const notificationId = String(data.notificationId || '')
  const path = notificationPath(notification)

  if (target.tags && tag && target.tags.has(tag)) return true
  if (target.kinds && kind && target.kinds.has(kind)) return true
  if (target.notificationIds && notificationId && target.notificationIds.has(notificationId)) return true
  if (target.paths && path && target.paths.has(path)) return true
  return false
}

function normalizeCloseNotificationMessage(data) {
  if (!data || data.type !== 'MOH_CLOSE_NOTIFICATIONS') return null
  return {
    all: data.all === true,
    kinds: new Set(Array.isArray(data.kinds) ? data.kinds.map(String).filter(Boolean) : []),
    tags: new Set(Array.isArray(data.tags) ? data.tags.map(String).filter(Boolean) : []),
    paths: new Set(Array.isArray(data.paths) ? data.paths.map(String).filter(Boolean) : []),
    notificationIds: new Set(Array.isArray(data.notificationIds) ? data.notificationIds.map(String).filter(Boolean) : [])
  }
}

async function closeNotificationsForTarget(target) {
  if (!target) return
  const notifications = await self.registration.getNotifications()
  await Promise.all(
    notifications.map(function (notification) {
      if (!notificationMatchesCloseTarget(notification, target)) return null
      notification.close()
      return null
    })
  )
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  const res = await fetch(request)
  // Only cache successful same-origin GETs.
  if (res && res.ok) {
    cache.put(request, res.clone()).catch(function () {})
  }
  return res
}

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    Promise.resolve()
      .then(function () {
        // Clean up old caches (best-effort).
        return caches.keys().then(function (keys) {
          return Promise.all(
            keys
              .filter(function (k) {
                return k.startsWith(CACHE_PREFIX) && k !== NUxT_ASSETS_CACHE && k !== STATIC_ASSETS_CACHE
              })
              .map(function (k) {
                return caches.delete(k)
              })
          )
        })
      })
      .then(function () {
        return self.clients.claim()
      })
  )
})

self.addEventListener('fetch', function (event) {
  const req = event.request
  if (!req || req.method !== 'GET') return

  const url = new URL(req.url)

  // Never cache the service worker itself; updates must propagate quickly.
  if (url.origin === self.location.origin && url.pathname === '/sw-push.js') return

  // Never cache API requests (cookie-auth + personalized responses).
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return

  // If cookies are present, bypass cache to avoid leaking personalized responses.
  if (req.headers.get('cookie')) return

  // Only cache same-origin static assets.
  if (url.origin !== self.location.origin) return

  const cacheInfo = isCacheablePath(url.pathname)
  if (!cacheInfo) return

  event.respondWith(cacheFirst(req, cacheInfo.cacheName))
})

self.addEventListener('push', function (event) {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    return
  }
  const title = payload.title || 'Notification'
  const body = payload.body || ''
  const tag = payload.tag || 'notification'
  const kind = payload.kind || 'generic'
  const url = payload.url || '/notifications'
  const icon = payload.icon || '/android-chrome-192x192.png'
  const badge = payload.badge || '/android-chrome-192x192.png'
  const renotify = payload.renotify === true
  const isTest = payload.test === true || title === 'Test notification'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      const hasVisibleWindow = clients.some(function (client) {
        return client.visibilityState === 'visible'
      })
      if (!isTest && hasVisibleWindow) return
      return self.registration.showNotification(title, {
        body,
        tag,
        icon,
        badge,
        renotify,
        data: { url, kind, tag }
      }).catch(function (err) {
        console.error('[sw-push] showNotification failed', err)
      })
    })
  )
})

self.addEventListener('message', function (event) {
  const target = normalizeCloseNotificationMessage(event.data)
  if (!target) return
  event.waitUntil(closeNotificationsForTarget(target))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const data = event.notification.data || {}
  let url = data.url || '/notifications'
  const kind = data.kind || 'generic'
  const tag = data.tag || ''
  // Append click-through params for analytics (client reads and sends to Posthog).
  const sep = url.includes('?') ? '&' : '?'
  const fullUrl = new URL(url + sep + 'from=push&kind=' + encodeURIComponent(kind) + '&tag=' + encodeURIComponent(tag), self.location.origin).href

  event.waitUntil(
    Promise.resolve()
      .then(function () {
        return closeNotificationsForTarget({
          all: false,
          kinds: new Set(),
          tags: tag ? new Set([String(tag)]) : new Set(),
          paths: new Set([notificationPath(event.notification)]),
          notificationIds: data.notificationId ? new Set([String(data.notificationId)]) : new Set()
        })
      })
      .then(function () {
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
          for (let i = 0; i < windowClients.length; i++) {
            if (windowClients[i].url.startsWith(self.registration.scope) && 'focus' in windowClients[i]) {
              windowClients[i].navigate(fullUrl)
              return windowClients[i].focus()
            }
          }
          if (self.clients.openWindow) return self.clients.openWindow(fullUrl)
        })
      })
      .catch(function () {
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl)
        }
      })
  )
})

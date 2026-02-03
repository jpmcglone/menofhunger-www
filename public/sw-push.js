/**
 * Push-only Service Worker. Shows OS notification only when no app tab has visibilityState === 'visible'.
 * Test payloads (payload.test === true or title "Test notification") are always shown.
 * On notification click: focus existing app window and navigate, or open a new window.
 */

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
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
  const url = payload.url || '/notifications'
  const icon = payload.icon || '/android-chrome-192x192.png'
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
        data: { url }
      }).catch(function (err) {
        console.error('[sw-push] showNotification failed', err)
      })
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/notifications'
  const fullUrl = new URL(url, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        if (windowClients[i].url.startsWith(self.registration.scope) && 'focus' in windowClients[i]) {
          windowClients[i].navigate(fullUrl)
          return windowClients[i].focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl)
    })
  )
})

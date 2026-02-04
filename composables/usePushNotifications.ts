/**
 * Web Push: request permission, subscribe with VAPID, and send subscription to the API.
 * The browser's native "Allow/Block notifications" prompt is triggered by Notification.requestPermission().
 * We auto-prompt when the user is logged in and permission is still "ask" (default); otherwise
 * the user can enable via Settings → Notifications. On logout or disable, unsubscribe and remove from API.
 */

const SW_PUSH_PATH = '/sw-push.js'
const PUSH_HAS_AUTO_PROMPTED_KEY = 'push-has-auto-prompted'

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function usePushNotifications() {
  const config = useRuntimeConfig()
  const vapidPublicKey = config.public.vapidPublicKey as string
  const { apiUrl, apiFetch } = useApiClient()
  const { user } = useAuth()

  const permission = ref<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const isSubscribed = ref(false)
  const isRegistering = ref(false)
  const errorMessage = ref<string | null>(null)
  const hasAutoPrompted = useState<boolean>(PUSH_HAS_AUTO_PROMPTED_KEY, () => false)

  const isSupported = computed(
    () =>
      import.meta.client &&
      typeof Notification !== 'undefined' &&
      'PushManager' in self
  )

  async function registerSw(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
    try {
      const reg = await navigator.serviceWorker.register(SW_PUSH_PATH, { scope: '/' })
      await reg.update()
      return reg
    } catch (e) {
      console.warn('[push] SW register failed', e)
      return null
    }
  }

  async function subscribe(): Promise<boolean> {
    if (!import.meta.client || !user.value?.id) return false
    if (!vapidPublicKey?.trim()) {
      errorMessage.value = 'Push notifications are not configured.'
      return false
    }
    if (typeof Notification === 'undefined' || !('PushManager' in self)) {
      errorMessage.value = 'This browser does not support push notifications.'
      return false
    }

    isRegistering.value = true
    errorMessage.value = null
    try {
      let perm = Notification.permission
      if (perm === 'default') {
        perm = await Notification.requestPermission()
      }
      permission.value = perm
      if (perm !== 'granted') {
        errorMessage.value = perm === 'denied' ? 'Permission denied.' : 'Permission not granted.'
        return false
      }

      const reg = await registerSw()
      if (!reg) {
        errorMessage.value = 'Could not register the notification service.'
        return false
      }

      let b64 = vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/')
      while (b64.length % 4) b64 += '='
      const keyBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes
      })

      const endpoint = sub.endpoint
      const p256dh = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      if (!p256dh || !auth) {
        errorMessage.value = 'Invalid subscription keys.'
        return false
      }

      await apiFetch('/notifications/push-subscribe', {
        method: 'POST',
        body: {
          endpoint,
          keys: { p256dh: arrayBufferToBase64Url(p256dh), auth: arrayBufferToBase64Url(auth) },
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
        }
      })
      isSubscribed.value = true
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to subscribe.'
      errorMessage.value = msg
      return false
    } finally {
      isRegistering.value = false
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!import.meta.client || !('serviceWorker' in navigator)) return
    errorMessage.value = null
    try {
      const reg = await registerSw()
      const sub = reg?.pushManager ? await reg.pushManager.getSubscription() : null
      if (sub) {
        const endpoint = sub.endpoint
        try {
          await apiFetch('/notifications/push-unsubscribe', { method: 'POST', body: { endpoint } })
        } catch {
          // best-effort remove on backend
        }
        await sub.unsubscribe()
      }
      isSubscribed.value = false
    } catch (e) {
      console.warn('[push] unsubscribe failed', e)
    }
  }

  /** Call when user logs out: unsubscribe and clear state. */
  async function onLogout(): Promise<void> {
    await unsubscribe()
    permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  }

  /**
   * Auto-prompt once per session when user is logged in and permission is still "ask".
   * Call from app layout (or similar) when auth is ready.
   */
  function tryAutoPrompt(): void {
    if (!import.meta.client || !user.value?.id) return
    if (!vapidPublicKey?.trim()) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
    if (hasAutoPrompted.value) return
    hasAutoPrompted.value = true
    void subscribe()
  }

  /**
   * When logged in on any app page: refresh subscription state and, if permission is already
   * granted but we're not subscribed, register (e.g. after enabling in browser settings or after
   * subscription was lost). Call liberally from app layout when auth is ready.
   */
  async function ensureSubscribedWhenGranted(): Promise<void> {
    if (!import.meta.client || !user.value?.id || !vapidPublicKey?.trim()) return
    if (typeof Notification === 'undefined' || !('PushManager' in self)) return
    if (Notification.permission !== 'granted') return
    if (isRegistering.value) return
    await refreshSubscriptionState()
    if (isSubscribed.value) return
    void subscribe()
  }

  /** Re-check subscription state (e.g. on app load when logged in). Also triggers SW update so latest sw-push.js is used. */
  async function refreshSubscriptionState(): Promise<void> {
    if (!import.meta.client || !('serviceWorker' in navigator) || !user.value?.id) return
    try {
      const reg = await registerSw()
      if (reg) void reg.update()
      const sub = reg?.pushManager ? await reg.pushManager.getSubscription() : null
      isSubscribed.value = !!sub
      permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
    } catch {
      isSubscribed.value = false
    }
  }

  return {
    permission: readonly(permission),
    isSubscribed: readonly(isSubscribed),
    isRegistering: readonly(isRegistering),
    errorMessage: readonly(errorMessage),
    isSupported: readonly(isSupported),
    subscribe,
    unsubscribe,
    onLogout,
    tryAutoPrompt,
    ensureSubscribedWhenGranted,
    refreshSubscriptionState,
    vapidConfigured: !!vapidPublicKey?.trim()
  }
}

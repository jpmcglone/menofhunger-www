/**
 * Web Push: request permission, subscribe with VAPID, and send subscription to the API.
 * The browser's native "Allow/Block notifications" prompt is triggered by Notification.requestPermission().
 * Permission is requested from Settings → Notifications after a user action.
 * On logout or disable, unsubscribe and remove from API.
 */

const SW_PUSH_PATH = '/sw-push.js'

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Brave/.test(ua)
  const isIosAlt = /CriOS|FxiOS|EdgiOS/.test(ua)
  return isSafari && !isIosAlt
}

function isStandaloneDisplay(): boolean {
  if (!import.meta.client) return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function pushOwnerUserId(user: { id?: string; accountKind?: string; accountSwitch?: { operatorUserId?: string } | null } | null | undefined): string | null {
  if (!user) return null
  if (user.accountSwitch?.operatorUserId) return user.accountSwitch.operatorUserId
  if (user.accountKind === 'page') return null
  return user.id ?? null
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  // With `noUncheckedIndexedAccess`, bytes[i] is number | undefined.
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function usePushNotifications() {
  const config = useRuntimeConfig()
  const vapidPublicKey = config.public.vapidPublicKey as string
  const { apiFetch } = useApiClient()
  const { user } = useAuth()

  const permission = ref<NotificationPermission | 'unsupported'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const isSubscribed = useState<boolean>('push-is-subscribed', () => false)
  const isRegistering = useState<boolean>('push-is-registering', () => false)
  const errorMessage = ref<string | null>(null)
  const hasPermissionWatcher = useState<boolean>('push-has-permission-watcher', () => false)
  // Tracks which userId the server-side push subscription is currently registered for.
  // If it doesn't match the logged-in user, we re-register (handles user switching).
  const subscribedForUserId = useState<string | null>('push-subscribed-user-id', () => null)

  const isSupported = computed(
    () =>
      import.meta.client &&
      typeof Notification !== 'undefined' &&
      'PushManager' in self
  )
  const isIosSafari = computed(() => import.meta.client && isIosDevice() && isSafariBrowser())
  const requiresInstall = computed(() => isIosSafari.value && !isStandaloneDisplay())

  async function registerSw(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
    try {
      const reg = await navigator.serviceWorker.register(SW_PUSH_PATH, { scope: '/' })
      // An update check must not prevent using an already working registration.
      void reg.update().catch(() => {})
      return reg.active ? reg : await navigator.serviceWorker.ready
    } catch (e) {
      console.warn('[push] SW register failed', e)
      return null
    }
  }

  function disabledKey(): string {
    return `push-disabled:${pushOwnerUserId(user.value) ?? 'anonymous'}`
  }

  function isExplicitlyDisabled(): boolean {
    try { return localStorage.getItem(disabledKey()) === 'true' } catch { return false }
  }

  async function subscribe(options: { automatic?: boolean } = {}): Promise<boolean> {
    if (!import.meta.client || !user.value?.id || isRegistering.value) return false
    if (options.automatic && isExplicitlyDisabled()) return false
    if (!vapidPublicKey?.trim()) {
      errorMessage.value = 'Push notifications are not configured.'
      return false
    }
    if (requiresInstall.value) {
      errorMessage.value = useIosAppLink().isConfigured
        ? 'Get the app to enable notifications on iOS, or install this site to your Home Screen.'
        : 'Install this site to your Home Screen to enable notifications on iOS Safari.'
      return false
    }
    if (typeof Notification === 'undefined' || !('PushManager' in self)) {
      errorMessage.value = 'This browser does not support push notifications.'
      return false
    }

    const ownerId = pushOwnerUserId(user.value)
    const preferenceKey = disabledKey()
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
      subscribedForUserId.value = ownerId
      if (!options.automatic) {
        try { localStorage.removeItem(preferenceKey) } catch { /* Storage may be unavailable. */ }
      }
      return true
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to subscribe.'
      errorMessage.value = msg
      return false
    } finally {
      isRegistering.value = false
    }
  }

  async function unsubscribe(options: { disable?: boolean } = {}): Promise<void> {
    if (!import.meta.client || !('serviceWorker' in navigator)) return
    if (options.disable !== false) {
      try { localStorage.setItem(disabledKey(), 'true') } catch { /* Best effort. */ }
    }
    errorMessage.value = null
    try {
      const reg = await registerSw()
      const sub = reg?.pushManager ? await reg.pushManager.getSubscription() : null
      if (sub) {
        const endpoint = sub.endpoint
        try {
          await apiFetch('/notifications/push-unsubscribe', {
            method: 'POST',
            body: { endpoint },
            mohUnauthorized: 'ignore',
          })
        } catch {
          // best-effort remove on backend
        }
        await sub.unsubscribe()
      }
      isSubscribed.value = false
      subscribedForUserId.value = null
    } catch (e) {
      console.warn('[push] unsubscribe failed', e)
    }
  }

  /** Call when user logs out: unsubscribe and clear state. */
  async function onLogout(): Promise<void> {
    await unsubscribe({ disable: false })
    permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  }

  /**
   * When logged in on any app page: refresh subscription state and, if permission is already
   * granted but we're not subscribed, register (e.g. after enabling in browser settings or after
   * subscription was lost). Call liberally from app layout when auth is ready.
   */
  async function ensureSubscribedWhenGranted(): Promise<void> {
    if (!import.meta.client || !user.value?.id || !vapidPublicKey?.trim()) return
    if (typeof Notification === 'undefined' || !('PushManager' in self)) return
    if (isRegistering.value || isExplicitlyDisabled()) return
    await refreshSubscriptionState()
    if (Notification.permission !== 'granted') return
    // Re-register if: (a) no browser subscription exists, or (b) the subscription is registered
    // for a different user — this handles the case where the browser subscription survived a
    // logout (e.g. network failure) and a new user has since logged in.
    const alreadyCorrectUser = isSubscribed.value && subscribedForUserId.value === pushOwnerUserId(user.value)
    if (alreadyCorrectUser) return
    await subscribe({ automatic: true })
  }

  /** Re-check subscription state (e.g. on app load when logged in). Also triggers SW update so latest sw-push.js is used. */
  async function refreshSubscriptionState(): Promise<void> {
    if (!import.meta.client || !('serviceWorker' in navigator) || !user.value?.id) return
    try {
      const reg = await registerSw()
      const sub = reg?.pushManager ? await reg.pushManager.getSubscription() : null
      isSubscribed.value = !!sub && Notification.permission === 'granted' && !isExplicitlyDisabled()
      permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
    } catch {
      isSubscribed.value = false
    }
  }

  async function watchPermissionChanges(): Promise<void> {
    if (!import.meta.client || hasPermissionWatcher.value) return
    if (typeof navigator === 'undefined' || !('permissions' in navigator)) return
    hasPermissionWatcher.value = true
    try {
      const status = await navigator.permissions.query({ name: 'notifications' as PermissionName })
      status.onchange = () => {
        permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
        if (permission.value === 'granted') {
          ensureSubscribedWhenGranted().catch(() => {})
          return
        }
        refreshSubscriptionState().catch(() => {})
      }
    } catch (e) {
      console.warn('[push] permission watcher failed', e)
    }
  }

  void watchPermissionChanges()

  return {
    permission: readonly(permission),
    isSubscribed: readonly(isSubscribed),
    isRegistering: readonly(isRegistering),
    errorMessage: readonly(errorMessage),
    isSupported: readonly(isSupported),
    isIosSafari: readonly(isIosSafari),
    requiresInstall: readonly(requiresInstall),
    subscribe,
    unsubscribe,
    onLogout,
    ensureSubscribedWhenGranted,
    refreshSubscriptionState,
    vapidConfigured: !!vapidPublicKey?.trim()
  }
}

const ANON_VIEW_COOKIE = 'moh_anon_view_id'

function generateAnonViewId(): string {
  if (import.meta.client && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `anon_${crypto.randomUUID().replace(/-/g, '')}`
  }
  return `anon_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function useAnonViewId() {
  const cookie = useCookie<string | null>(ANON_VIEW_COOKIE, {
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    default: () => null,
  })

  if (!cookie.value) {
    cookie.value = generateAnonViewId()
  }

  return computed(() => (cookie.value ?? '').trim() || null)
}

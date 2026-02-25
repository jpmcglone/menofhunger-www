import type { Ref } from 'vue'
import { isRecentTouch } from '~/utils/recent-touch'

function resolveUsername(u: string | Ref<string> | Ref<string | null> | null | undefined): string {
  const raw = typeof u === 'string' ? u : u?.value
  return String(raw ?? '').trim()
}

/** Returns true when the current route is that user's own profile page. */
function useIsCurrentProfile(username: () => string) {
  const route = useRoute()
  return computed(() => {
    const u = username().toLowerCase()
    if (!u) return false
    const segments = route.path.toLowerCase().split('/').filter(Boolean)
    return segments[0] === 'u' && segments[1] === u
  })
}

export function useUserPreviewTrigger(params: {
  username: string | Ref<string> | Ref<string | null> | null | undefined
  /** Optional: disable trigger handlers. */
  enabled?: boolean | Ref<boolean>
}) {
  const pop = useUserPreviewPopover()

  const enabled = computed(() => {
    const v = params.enabled
    if (typeof v === 'boolean') return v
    if (v && typeof v === 'object' && 'value' in v) return Boolean(v.value)
    return true
  })

  const isCurrentProfile = useIsCurrentProfile(() => resolveUsername(params.username))

  function onEnter(e: MouseEvent) {
    if (!enabled.value || isCurrentProfile.value || isRecentTouch()) return
    const u = resolveUsername(params.username)
    if (!u) return
    pop.onTriggerEnter({ username: u, event: e })
  }

  function onMove(e: MouseEvent) {
    if (!enabled.value || isCurrentProfile.value || isRecentTouch()) return
    pop.onTriggerMove(e)
  }

  function onLeave() {
    if (!enabled.value) return
    pop.onTriggerLeave()
  }

  return { onEnter, onMove, onLeave }
}

/**
 * Variant for use inside v-for loops where the username differs per item.
 * Returns handler functions that accept the username at call time.
 */
export function useUserPreviewMultiTrigger() {
  const pop = useUserPreviewPopover()
  const route = useRoute()

  function isCurrentProfile(username: string): boolean {
    const u = username.toLowerCase()
    const segments = route.path.toLowerCase().split('/').filter(Boolean)
    return segments[0] === 'u' && segments[1] === u
  }

  function onEnter(username: string | undefined | null, e: MouseEvent) {
    const u = (username ?? '').trim()
    if (!u || isCurrentProfile(u) || isRecentTouch()) return
    pop.onTriggerEnter({ username: u, event: e })
  }

  function onMove(e: MouseEvent) {
    if (isRecentTouch()) return
    pop.onTriggerMove(e)
  }

  function onLeave() {
    pop.onTriggerLeave()
  }

  return { onEnter, onMove, onLeave }
}


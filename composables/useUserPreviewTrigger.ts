import type { Ref } from 'vue'
import { isRecentTouch } from '~/utils/recent-touch'

function resolveUsername(u: string | Ref<string> | Ref<string | null> | null | undefined): string {
  const raw = typeof u === 'string' ? u : u?.value
  return String(raw ?? '').trim()
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

  function onEnter(e: MouseEvent) {
    if (!enabled.value || isRecentTouch()) return
    const u = resolveUsername(params.username)
    if (!u) return
    pop.onTriggerEnter({ username: u, event: e })
  }

  function onMove(e: MouseEvent) {
    if (!enabled.value || isRecentTouch()) return
    pop.onTriggerMove(e)
  }

  function onLeave() {
    if (!enabled.value) return
    pop.onTriggerLeave()
  }

  return { onEnter, onMove, onLeave }
}


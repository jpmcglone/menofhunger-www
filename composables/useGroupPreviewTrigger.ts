import type { Ref } from 'vue'
import { isRecentTouch } from '~/utils/recent-touch'
import type { CommunityGroupShell } from '~/types/api'

function resolveShell(
  s: CommunityGroupShell | Ref<CommunityGroupShell | null | undefined> | null | undefined,
): CommunityGroupShell | null {
  if (s == null) return null
  if (typeof s === 'object' && 'value' in s) {
    const v = (s as Ref<CommunityGroupShell | null | undefined>).value
    return v && v.id ? v : null
  }
  const plain = s as CommunityGroupShell
  return plain?.id ? plain : null
}

export function useGroupPreviewTrigger(params: {
  shell: CommunityGroupShell | Ref<CommunityGroupShell | null | undefined> | null | undefined
  enabled?: boolean | Ref<boolean>
}) {
  const pop = useGroupPreviewPopover()

  const enabled = computed(() => {
    const v = params.enabled
    if (typeof v === 'boolean') return v
    if (v && typeof v === 'object' && 'value' in v) return Boolean(v.value)
    return true
  })

  function onEnter(e: MouseEvent) {
    if (!enabled.value || isRecentTouch()) return
    const sh = resolveShell(params.shell)
    if (!sh) return
    pop.onTriggerEnter({ shell: sh, event: e })
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

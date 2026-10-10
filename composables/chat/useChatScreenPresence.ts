import { nextTick, onBeforeUnmount, onMounted } from 'vue'

type ScreenOwner = { active: boolean; conversationId: string | null }
// Client-only owners share one transport publisher. A hidden surface cannot clear
// the focused full-page conversation when multiple workspaces are mounted.
const owners = new Set<ScreenOwner>()
let lastPublished: { active: boolean; conversationId: string | null } | null = null

/** Only the foreground chat is being viewed; background sockets still receive messages. */
export function useChatScreenPresence(emit: (active: boolean, conversationId?: string | null) => void) {
  const owner: ScreenOwner = { active: false, conversationId: null }
  let disposed = false

  function publish() {
    if (typeof document === 'undefined') return
    const viewing = document.visibilityState === 'visible' && document.hasFocus()
    const focused = viewing ? [...owners].reverse().find(candidate => candidate.active) : null
    const active = Boolean(focused)
    const conversationId = focused?.conversationId ?? null
    if (lastPublished?.active === active && lastPublished.conversationId === conversationId) return
    lastPublished = { active, conversationId }
    emit(active, conversationId)
  }
  function sync() { if (!disposed) publish() }
  // Let activation listeners invalidate their stale thread and Vue publish the
  // pending state before restoring viewing after a backgrounded connection.
  function resume() { void nextTick(() => { void nextTick(sync) }) }
  function visibilityChanged() { if (document.visibilityState === 'visible') resume(); else sync() }

  onMounted(() => {
    owners.add(owner)
    document.addEventListener('visibilitychange', visibilityChanged)
    window.addEventListener('focus', resume)
    window.addEventListener('blur', sync)
    sync()
  })
  onBeforeUnmount(() => {
    disposed = true
    owners.delete(owner)
    document.removeEventListener('visibilitychange', visibilityChanged)
    window.removeEventListener('focus', resume)
    window.removeEventListener('blur', sync)
    if (owners.size) publish()
    else { lastPublished = null; emit(false) }
  })

  return (active: boolean, conversationId?: string | null) => {
    if (disposed) return
    owner.active = active
    owner.conversationId = active ? conversationId ?? null : null
    sync()
  }
}

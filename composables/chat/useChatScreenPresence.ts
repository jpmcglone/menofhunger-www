import { onBeforeUnmount, onMounted } from 'vue'

/** Only the foreground chat is being viewed; background sockets still receive messages. */
export function useChatScreenPresence(emit: (active: boolean, conversationId?: string | null) => void) {
  let active = false
  let conversationId: string | null = null
  let disposed = false

  function sync() {
    if (disposed || typeof document === 'undefined') return
    const viewing = active && document.visibilityState === 'visible' && document.hasFocus()
    emit(viewing, viewing ? conversationId : null)
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)
    window.addEventListener('blur', sync)
    sync()
  })
  onBeforeUnmount(() => {
    disposed = true
    document.removeEventListener('visibilitychange', sync)
    window.removeEventListener('focus', sync)
    window.removeEventListener('blur', sync)
    emit(false)
  })

  return (nextActive: boolean, nextConversationId?: string | null) => {
    active = nextActive
    conversationId = nextActive ? nextConversationId ?? null : null
    sync()
  }
}

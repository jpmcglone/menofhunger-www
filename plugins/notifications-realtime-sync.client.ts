/** The inbox survives route changes and synchronizes on session, foreground and reconnect. */
export default defineNuxtPlugin(() => {
  const { user } = useAuth()
  const presence = usePresence()
  const inbox = useNotifications()
  const sync = () => {
    if (user.value?.id) void inbox.fetchList({ forceRefresh: true })
  }
  watch(() => user.value?.id, sync, { immediate: true })
  watch(presence.isSocketConnected, connected => { if (connected) sync() })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync()
  })
})

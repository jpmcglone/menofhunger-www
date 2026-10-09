/** Radio/space chrome: which station is selected, where the player teleports, and lobby-count subscriptions. */
export function useAppLayoutRadio() {
  const { user } = useAuth()
  const { selectedSpaceId, currentSpace, loadLobbyCounts, subscribeLobbyCounts, unsubscribeLobbyCounts } = useSpaceLobby()
  const radioHasStation = computed(() => Boolean(selectedSpaceId.value && currentSpace.value))
  const radioTeleportTarget = ref<string | null>(null)

  function syncRadioTeleportTarget() {
    if (!import.meta.client) {
      radioTeleportTarget.value = null
      return
    }
    const md = window.matchMedia('(min-width: 768px)').matches
    radioTeleportTarget.value = md ? '#moh-radio-desktop > div' : '#moh-radio-mobile > div'
  }

  watch(
    () => Boolean(user.value?.id),
    (authed, wasAuthed) => {
      if (!import.meta.client) return
      if (authed) {
        void loadLobbyCounts()
        void subscribeLobbyCounts()
        return
      }
      if (wasAuthed) {
        unsubscribeLobbyCounts()
      }
    },
    { immediate: true },
  )

  watch(radioHasStation, (on) => {
    if (on) nextTick(() => syncRadioTeleportTarget())
  }, { immediate: true })

  onMounted(() => {
    syncRadioTeleportTarget()
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => syncRadioTeleportTarget()
    mq.addEventListener('change', onChange)
    onBeforeUnmount(() => mq.removeEventListener('change', onChange))
  })
  useSpacePlayPauseShortcut(radioHasStation)

  // Keep bottom spacing stable while the radio animates out.
  const radioChromePadActive = ref(false)
  watch(
    () => radioHasStation.value,
    (has) => {
      if (has) radioChromePadActive.value = true
    },
    { immediate: true },
  )


  return { radioHasStation, radioTeleportTarget, radioChromePadActive }
}

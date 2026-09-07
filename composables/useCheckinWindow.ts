import { checkinWindowKey, isCheckinOpen, nextCheckinBoundary } from '~/utils/checkin-schedule'

export function useCheckinWindow() {
  const nowMs = useState('checkin-window-now', () => Date.now())
  const now = computed(() => new Date(nowMs.value))
  const isOpen = computed(() => isCheckinOpen(now.value))
  const windowKey = computed(() => checkinWindowKey(now.value))
  let timer: ReturnType<typeof setTimeout> | undefined
  function sync() {
    clearTimeout(timer)
    nowMs.value = Date.now()
    timer = setTimeout(sync, Math.max(1, nextCheckinBoundary(now.value) - nowMs.value))
  }
  onMounted(() => {
    sync()
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
  })
  onBeforeUnmount(() => {
    clearTimeout(timer)
    window.removeEventListener('focus', sync)
    document.removeEventListener('visibilitychange', sync)
  })
  return { now, isOpen, windowKey }
}

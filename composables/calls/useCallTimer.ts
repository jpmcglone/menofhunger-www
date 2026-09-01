import type { Ref } from 'vue'

export function formatCallElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** "mm:ss" since `connectedAt`, ticking once a second while mounted. */
export function useCallTimer(connectedAt: Ref<number | null>) {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })

  const elapsed = computed(() => (connectedAt.value ? formatCallElapsed(now.value - connectedAt.value) : '00:00'))
  return { elapsed }
}

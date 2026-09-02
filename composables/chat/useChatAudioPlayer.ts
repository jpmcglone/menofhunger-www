import { ref } from 'vue'

/**
 * One shared HTMLAudioElement so only one voice note plays at a time.
 */
let shared: HTMLAudioElement | null = null
const currentId = ref<string | null>(null)
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const rate = ref(1)

function ensure(): HTMLAudioElement {
  if (shared) return shared
  shared = new Audio()
  shared.preload = 'metadata'
  shared.addEventListener('timeupdate', () => {
    currentTime.value = shared?.currentTime ?? 0
    duration.value = Number.isFinite(shared?.duration) ? (shared?.duration ?? 0) : duration.value
  })
  shared.addEventListener('loadedmetadata', () => {
    duration.value = Number.isFinite(shared?.duration) ? (shared?.duration ?? 0) : 0
  })
  shared.addEventListener('ended', () => {
    playing.value = false
    currentTime.value = 0
  })
  shared.addEventListener('pause', () => {
    playing.value = false
  })
  shared.addEventListener('play', () => {
    playing.value = true
  })
  return shared
}

export function useChatAudioPlayer() {
  function toggle(id: string, src: string) {
    const el = ensure()
    if (currentId.value === id) {
      if (el.paused) void el.play().catch(() => {})
      else el.pause()
      return
    }
    currentId.value = id
    el.src = src
    el.playbackRate = rate.value
    currentTime.value = 0
    void el.play().catch(() => {})
  }

  function seek(id: string, seconds: number) {
    const el = ensure()
    if (currentId.value !== id) return
    el.currentTime = Math.max(0, seconds)
    currentTime.value = el.currentTime
  }

  function cycleRate(id: string) {
    rate.value = rate.value === 1 ? 1.5 : 1
    const el = ensure()
    if (currentId.value === id) el.playbackRate = rate.value
  }

  return { currentId, playing, currentTime, duration, rate, toggle, seek, cycleRate }
}

import type { ComputedRef } from 'vue'
import type { PostMedia } from '~/types/api'

/** Inline single-video playback state: preload, mute toggles, poster fallback, and video-manager registration. */
export function usePostMediaGridVideo(props: { rowInView?: boolean; interactive?: boolean; direct?: boolean }, items: ComputedRef<PostMedia[]>, videoManager: ReturnType<typeof useEmbeddedVideoManager>, videoInstanceId: string) {
  const { activeId, reportPlayerAudio } = videoManager
  const singleVideoContainerRef = ref<HTMLElement | null>(null)
  const singleVideoEl = ref<HTMLVideoElement | null>(null)
  const singleVideoMuted = ref(true)
  const singleVideoActive = computed(() => activeId.value === videoInstanceId)
  /** Set when row is in view so the inline player is ready to play. */
  const singleVideoSrc = computed(() =>
    props.rowInView !== false && items.value[0]?.kind === 'video' && items.value[0]?.url
      ? items.value[0].url
      : undefined,
  )

  /** Off-screen videos don't load; in-view load metadata only (poster/duration) until play. */
  const singleVideoPreload = computed(() => (props.rowInView !== false ? 'metadata' : 'none'))

  /** Placeholder when video has no thumbnail (img src=video URL doesn't render). */
  const VIDEO_NO_THUMB_PLACEHOLDER =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect fill="%23374151" width="320" height="180"/></svg>',
    )

  function posterFor(m: PostMedia): string {
    if (m.kind === 'video') {
      const thumb = (m as { thumbnailUrl?: string | null }).thumbnailUrl
      if (thumb) return thumb
      return VIDEO_NO_THUMB_PLACEHOLDER
    }
    return m.url ?? ''
  }

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `0:${s.toString().padStart(2, '0')}`
  }

  /** Unmute in response to user tap (required on Safari). */
  function onTapUnmute() {
    const el = singleVideoEl.value
    if (!el) return
    videoManager.activate(videoInstanceId)
    el.muted = false
    singleVideoMuted.value = false
    reportPlayerAudio({ muted: false, volume01: el.volume })
  }

  function onTapMute() {
    const el = singleVideoEl.value
    if (!el) return
    el.muted = true
    singleVideoMuted.value = true
    reportPlayerAudio({ muted: true, volume01: el.volume })
  }

  watch([singleVideoEl, () => props.interactive, () => props.direct, () => items.value[0]?.url], ([el, interactive, direct], _old, onCleanup) => {
    if (!import.meta.client || direct || !interactive || !el || items.value.length !== 1) return
    onCleanup(videoManager.registerVideo(videoInstanceId, el, singleVideoContainerRef.value ?? el, `file:${items.value[0]?.url}`))
  }, { flush: 'post' })
  watch(() => videoManager.appWideSoundOn.value, on => { singleVideoMuted.value = !on })

  return {
    singleVideoContainerRef,
    singleVideoEl,
    singleVideoMuted,
    singleVideoActive,
    singleVideoSrc,
    singleVideoPreload,
    posterFor,
    formatDuration,
    onTapUnmute,
    onTapMute,
  }
}

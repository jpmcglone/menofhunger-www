import type { Ref } from 'vue'
import type { ComposerMediaItem } from '~/composables/composer/types'
import { useVoiceRecorder } from '~/composables/chat/useVoiceRecorder'
import { formatElapsedClock } from '~/utils/time-format'

type ComposerMediaQueue = {
  composerMedia: Ref<ComposerMediaItem[]>
  removeComposerMedia: (localId: string) => void
  enqueueAudio: (file: File, durationSeconds: number) => void
  waitForUploads: () => Promise<boolean>
}

/** Voice-note recording, preview, and upload-then-send for the DM composer. */
export function useDmVoiceComposer(opts: {
  canRecord: Ref<boolean>
  disabled: Ref<boolean>
  media: ComposerMediaQueue
  onSend: () => void
}) {
  const { composerMedia, removeComposerMedia, enqueueAudio, waitForUploads } = opts.media

  const voice = useVoiceRecorder()
  const pendingVoice = voice.draft
  const sendingVoice = ref(false)
  const voicePreviewUrl = ref<string | null>(null)
  const voicePreviewEl = ref<HTMLAudioElement | null>(null)
  watch(pendingVoice, (draft) => {
    if (voicePreviewUrl.value) URL.revokeObjectURL(voicePreviewUrl.value)
    voicePreviewUrl.value = draft ? URL.createObjectURL(draft.file) : null
  })
  function onVoiceVisibility() { if (document.hidden) { if (voice.starting.value) voice.cancel(); else if (voice.recording.value) void stopVoice() } }
  onMounted(() => document.addEventListener('visibilitychange', onVoiceVisibility))
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVoiceVisibility)
    voice.cancel()
    if (voicePreviewUrl.value) URL.revokeObjectURL(voicePreviewUrl.value)
  })
  const pendingVoiceSeconds = computed(() => pendingVoice.value?.durationSeconds ?? 0)

  async function onMicClick() {
    if (!opts.canRecord.value) {
      usePremiumUpsell().show('media')
      return
    }
    pendingVoice.value = null
    try {
      await voice.start()
    } catch {
      useAppToast().push({ title: 'Couldn’t access your microphone.', tone: 'error' })
    }
  }

  async function stopVoice() {
    const result = await voice.stop()
    pendingVoice.value = result
  }

  function cancelVoice() {
    voicePreviewEl.value?.pause()
    voice.cancel()
    pendingVoice.value = null
  }

  async function sendVoice() {
    const result = pendingVoice.value
    if (!result || sendingVoice.value || opts.disabled.value) return
    voicePreviewEl.value?.pause()
    sendingVoice.value = true
    try {
      for (const media of [...composerMedia.value]) removeComposerMedia(media.localId)
      enqueueAudio(result.file, result.durationSeconds)
      const ok = await waitForUploads()
      if (!ok) {
        for (const media of [...composerMedia.value]) removeComposerMedia(media.localId)
        useAppToast().push({ title: 'Couldn’t upload. Your recording is ready to retry.', tone: 'error' })
        return
      }
      pendingVoice.value = null
      opts.onSend()
    } finally { sendingVoice.value = false }
  }

  return { voice, pendingVoice, sendingVoice, voicePreviewUrl, voicePreviewEl, pendingVoiceSeconds, formatVoiceClock: formatElapsedClock, onMicClick, stopVoice, cancelVoice, sendVoice }
}

import type { ComputedRef, Ref } from 'vue'
import type { ComposerPollPayload, PostComposerProps } from './types'

/** Add-media / add-GIF / add-poll entry points, gated on verification and mutual exclusion. */
export function useComposerAttachmentActions(props: PostComposerProps,
  deps: {
    poll: Ref<ComposerPollPayload | null>
    hasPoll: ComputedRef<boolean>
    disableMedia: ComputedRef<boolean>
    viewerIsVerified: Ref<boolean>
    media: ReturnType<typeof useComposerMedia>
  },) {
  const { poll, hasPoll, disableMedia, viewerIsVerified, media } = deps
  const toast = useAppToast()

  function onClickAddMedia() {
    if (disableMedia.value) return
    if (hasPoll.value) return
    if (!viewerIsVerified.value) {
      toast.push({ title: 'Verify your account to post images and GIFs', to: '/tiers', durationMs: 3000 })
      return
    }
    media.openMediaPicker()
  }

  function onClickAddGiphy() {
    if (disableMedia.value) return
    if (hasPoll.value) return
    if (!viewerIsVerified.value) {
      toast.push({ title: 'Verify your account to use GIF search', to: '/tiers', durationMs: 3000 })
      return
    }
    media.openGiphyPicker()
  }

  function onUpdatePoll(v: ComposerPollPayload) {
    poll.value = v
  }

  function onClickAddPoll() {
    if (disableMedia.value) return
    if (props.replyTo) return
    if (hasPoll.value) return
    if (!viewerIsVerified.value) {
      toast.push({ title: 'Verify your account to create polls', to: '/tiers', durationMs: 3000 })
      return
    }
    if (media.composerMedia.value.length > 0) return
    poll.value = {
      options: [
        { text: '', image: null },
        { text: '', image: null },
      ],
      duration: { days: 1, hours: 0, minutes: 0 },
    }
  }

  return {
    onClickAddMedia,
    onClickAddGiphy,
    onUpdatePoll,
    onClickAddPoll,
  }
}

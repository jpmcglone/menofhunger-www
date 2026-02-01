/**
 * Modal shown when a non-premium user tries to upload a video.
 * "Let them try" then immediately reject and show this modal.
 */
export function usePremiumVideoModal() {
  const open = useState<boolean>('premium-video-modal-open', () => false)

  function show() {
    open.value = true
  }

  function hide() {
    open.value = false
  }

  return { open, show, hide }
}

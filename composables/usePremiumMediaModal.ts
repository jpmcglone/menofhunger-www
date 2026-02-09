/**
 * Modal shown when a non-premium user tries to add media (images/GIFs/video).
 */
export function usePremiumMediaModal() {
  const open = useState<boolean>('premium-media-modal-open', () => false)

  function show() {
    open.value = true
  }

  function hide() {
    open.value = false
  }

  return { open, show, hide }
}


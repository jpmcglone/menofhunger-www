/**
 * Thin wrapper around the Web Share API with a copy-to-clipboard fallback.
 *
 * On mobile browsers (and Safari/Edge/Chrome on desktop) `navigator.share`
 * triggers the native OS share sheet so the link can go to any app. On
 * browsers that don't support it, the link is copied to the clipboard and a
 * toast is shown.
 */

export type WebShareParams = {
  title: string
  text?: string
  url: string
}

export function useWebShare() {
  const toast = useAppToast()
  const { copyText } = useCopyToClipboard()

  const isSupported = computed(() => {
    if (!import.meta.client) return false
    return Boolean(navigator.share)
  })

  /**
   * Share via the native share sheet when available, falling back to
   * clipboard copy. Returns `true` if the share sheet opened or the link was
   * copied; `false` if the user cancelled the share sheet.
   */
  async function share(params: WebShareParams): Promise<boolean> {
    if (!import.meta.client) return false

    if (navigator.share) {
      try {
        await navigator.share({ title: params.title, text: params.text, url: params.url })
        return true
      } catch (err) {
        // AbortError = user cancelled — not a failure we need to surface.
        if (err instanceof Error && err.name === 'AbortError') return false
        // Any other error: fall through to clipboard.
      }
    }

    // Clipboard fallback
    try {
      await copyText(params.url)
      toast.push({ title: 'Link copied', tone: 'success', durationMs: 1600 })
      return true
    } catch {
      toast.push({ title: 'Could not copy link', tone: 'error', durationMs: 1800 })
      return false
    }
  }

  return { share, isSupported }
}

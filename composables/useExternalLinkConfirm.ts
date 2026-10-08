/** Host shown in the confirmation; falls back to the raw URL when it cannot be parsed. */
export function externalLinkHost(url: string): string {
  try { return new URL(url).host.replace(/^www\./i, '') } catch { return url }
}

/**
 * "Opens outside Men of Hunger" confirmation for external links in posts and previews.
 * Mirrors the iOS SafariHandoffConfirmationSheet. Modified clicks (new tab/window) pass through.
 */
export function useExternalLinkConfirm() {
  const pendingUrl = useState<string | null>('external-link-confirm-url', () => null)

  function request(url: string) { pendingUrl.value = url }
  function cancel() { pendingUrl.value = null }
  function confirm() {
    const url = pendingUrl.value
    pendingUrl.value = null
    if (url && import.meta.client) window.open(url, '_blank', 'noopener,noreferrer')
  }
  function onClick(event: MouseEvent, url: string | null | undefined) {
    if (!url || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    request(url)
  }
  return { pendingUrl, request, cancel, confirm, onClick }
}

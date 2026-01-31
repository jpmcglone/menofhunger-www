export function useCopyToClipboard() {
  async function copyText(text: string) {
    if (!import.meta.client) return
    const t = (text ?? '').toString()
    if (!t) return

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(t)
      return
    }

    // Fallback
    const ta = document.createElement('textarea')
    ta.value = t
    ta.setAttribute('readonly', 'true')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }

  return { copyText }
}


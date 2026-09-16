/** One permission request per browser app; promises are never shared across SSR users. */
const pending = new WeakMap<object, { promise: Promise<boolean>; resolve: (allowed: boolean) => void }>()

export function useAiConsent() {
  const app = useNuxtApp()
  const visible = useState<boolean>('ai-consent:visible', () => false)
  const target = useState<string | null>('ai-consent:target', () => null)
  function request(): Promise<boolean> {
    if (import.meta.server) return Promise.resolve(false)
    const existing = pending.get(app)
    if (existing) return existing.promise
    let resolve!: (allowed: boolean) => void
    const promise = new Promise<boolean>((done) => { resolve = done })
    pending.set(app, { promise, resolve })
    // Prefer the visible composer containing focus; otherwise use the newest
    // visible feature host. The main column is the fallback, never a new modal.
    const hosts = [...document.querySelectorAll<HTMLElement>('[data-marv-permission-host]')]
      .filter(host => host.checkVisibility())
    const focused = hosts.findLast(host => !host.dataset.fallback && host.parentElement?.contains(document.activeElement))
    target.value = (focused ?? hosts.findLast(host => !host.dataset.fallback) ?? hosts[0])?.id ?? null
    visible.value = true
    return promise
  }
  function finish(allowed: boolean) {
    const current = pending.get(app)
    pending.delete(app)
    visible.value = false
    target.value = null
    current?.resolve(allowed)
  }
  return { visible, target, request, finish }
}

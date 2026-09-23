/** One permission request per browser app; promises are never shared across SSR users. */
const pending = new WeakMap<object, { promise: Promise<boolean>; resolve: (allowed: boolean) => void }>()

export function useAiConsent() {
  const app = useNuxtApp()
  const visible = useState<boolean>('ai-consent:visible', () => false)
  function request(): Promise<boolean> {
    if (import.meta.server) return Promise.resolve(false)
    const existing = pending.get(app)
    if (existing) return existing.promise
    let resolve!: (allowed: boolean) => void
    const promise = new Promise<boolean>((done) => { resolve = done })
    pending.set(app, { promise, resolve })
    visible.value = true
    return promise
  }
  function finish(allowed: boolean) {
    const current = pending.get(app)
    pending.delete(app)
    visible.value = false
    current?.resolve(allowed)
  }
  return { visible, request, finish }
}

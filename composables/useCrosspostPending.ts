/** Destinations still waiting for a public link, keyed by post or article id. */
export function useCrosspostPending() {
  const pending = useState<Record<string, { pickax: boolean; x: boolean }>>('crosspost-pending', () => ({}))

  function expect(id: string, next: { pickax?: boolean; x?: boolean }) {
    const pickax = Boolean(next.pickax)
    const x = Boolean(next.x)
    if (!id || (!pickax && !x)) {
      settle(id, 'pickax')
      settle(id, 'x')
      return
    }
    pending.value = { ...pending.value, [id]: { pickax, x } }
  }

  function settle(id: string, destination: 'pickax' | 'x') {
    const current = pending.value[id]
    if (!current) return
    const next = { ...current, [destination]: false }
    const copy = { ...pending.value }
    if (!next.pickax && !next.x) delete copy[id]
    else copy[id] = next
    pending.value = copy
  }

  return { pending, expect, settle }
}

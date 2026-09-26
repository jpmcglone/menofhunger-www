/** `null` is the "Location not set" bucket. */
export type MomentKey = string | null

export type OnlineMoment = { kind: 'online' | 'offline'; state: MomentKey; count: number }

/** How long an online count must stay down before it reads as "went offline". */
export const OFFLINE_SETTLE_MS = 30_000

/**
 * Turns per-state online counts into online/offline moments without reconnect chatter.
 *
 * Increases fire right away. Decreases wait `settleMs`; if the state recovers first (a phone
 * reconnecting), the drop and the recovery cancel out and nothing fires. `reset` adopts new
 * counts silently — first load, after a reconnect, or returning to the tab — so catching up
 * never plays a burst of effects.
 */
export function createOnlineSettler(opts: { emit: (m: OnlineMoment) => void; settleMs?: number }) {
  const settleMs = opts.settleMs ?? OFFLINE_SETTLE_MS
  let baseline: Map<MomentKey, number> | null = null
  const pendingDown = new Map<MomentKey, { count: number; timer: ReturnType<typeof setTimeout> }>()

  function clearPending() {
    for (const p of pendingDown.values()) clearTimeout(p.timer)
    pendingDown.clear()
  }

  function reset(counts: Map<MomentKey, number>) {
    clearPending()
    baseline = new Map(counts)
  }

  function update(counts: Map<MomentKey, number>) {
    if (!baseline) {
      reset(counts)
      return
    }
    const keys = new Set<MomentKey>([...baseline.keys(), ...counts.keys()])
    for (const key of keys) {
      const next = counts.get(key) ?? 0
      const delta = next - (baseline.get(key) ?? 0)
      if (delta > 0) {
        const pending = pendingDown.get(key)
        const cancelled = Math.min(delta, pending?.count ?? 0)
        if (pending && cancelled > 0) {
          pending.count -= cancelled
          if (pending.count === 0) {
            clearTimeout(pending.timer)
            pendingDown.delete(key)
          }
        }
        if (delta - cancelled > 0) opts.emit({ kind: 'online', state: key, count: delta - cancelled })
      } else if (delta < 0) {
        const pending = pendingDown.get(key)
        if (pending) {
          pending.count += -delta
        } else {
          const entry = {
            count: -delta,
            timer: setTimeout(() => {
              pendingDown.delete(key)
              if (entry.count > 0) opts.emit({ kind: 'offline', state: key, count: entry.count })
            }, settleMs),
          }
          pendingDown.set(key, entry)
        }
      }
    }
    baseline = new Map(counts)
  }

  function dispose() {
    clearPending()
    baseline = null
  }

  return { reset, update, dispose }
}

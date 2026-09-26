import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOnlineSettler, type OnlineMoment } from '~/utils/presence-moments'

const counts = (entries: Array<[string | null, number]>) => new Map(entries)

describe('createOnlineSettler', () => {
  let emitted: OnlineMoment[]
  beforeEach(() => {
    vi.useFakeTimers()
    emitted = []
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('adopts the first counts silently and fires increases immediately', () => {
    const s = createOnlineSettler({ emit: (m) => emitted.push(m) })
    s.update(counts([['VA', 2]]))
    expect(emitted).toEqual([])
    s.update(counts([['VA', 3], [null, 1]]))
    expect(emitted).toEqual([
      { kind: 'online', state: 'VA', count: 1 },
      { kind: 'online', state: null, count: 1 },
    ])
  })

  it('waits out a drop before calling it offline', () => {
    const s = createOnlineSettler({ emit: (m) => emitted.push(m), settleMs: 30_000 })
    s.reset(counts([['VA', 3]]))
    s.update(counts([['VA', 2]]))
    vi.advanceTimersByTime(29_000)
    expect(emitted).toEqual([])
    vi.advanceTimersByTime(1_000)
    expect(emitted).toEqual([{ kind: 'offline', state: 'VA', count: 1 }])
  })

  it('cancels a drop and its recovery when someone reconnects quickly', () => {
    const s = createOnlineSettler({ emit: (m) => emitted.push(m), settleMs: 30_000 })
    s.reset(counts([['VA', 3]]))
    s.update(counts([['VA', 2]]))
    vi.advanceTimersByTime(5_000)
    s.update(counts([['VA', 3]]))
    vi.advanceTimersByTime(60_000)
    expect(emitted).toEqual([])
  })

  it('only nets out what was pending', () => {
    const s = createOnlineSettler({ emit: (m) => emitted.push(m) })
    s.reset(counts([['TX', 5]]))
    s.update(counts([['TX', 4]]))
    s.update(counts([['TX', 7]]))
    expect(emitted).toEqual([{ kind: 'online', state: 'TX', count: 2 }])
  })

  it('resets silently and drops pending offlines (reconnect or tab return)', () => {
    const s = createOnlineSettler({ emit: (m) => emitted.push(m) })
    s.reset(counts([['VA', 3]]))
    s.update(counts([['VA', 1]]))
    s.reset(counts([['VA', 9]]))
    vi.advanceTimersByTime(60_000)
    expect(emitted).toEqual([])
  })
})

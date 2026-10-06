import { describe, expect, it, vi } from 'vitest'
import { JourneyRecorder, type JourneySample } from '~/utils/performance-journeys'

describe('journey recorder', () => {
  it('finishes once and ignores an obsolete destination token', () => {
    let time = 0
    const samples: JourneySample[] = []
    const recorder = new JourneyRecorder(s => samples.push(s), () => time, false)
    const first = recorder.begin('thread_ready', 'navigation')
    time = 50
    const second = recorder.begin('thread_ready', 'navigation')
    recorder.finish('thread_ready', first)
    time = 200
    recorder.finish('thread_ready', second, 'success', 'cache')
    recorder.finish('thread_ready', second)
    expect(samples.map(s => [s.outcome, s.milliseconds])).toEqual([['navigation', 50], ['success', 150]])
    expect(samples[1]?.source).toBe('cache')
    expect(Object.keys(samples[1]!)).not.toContain('token')
  })
  it('separates errors, identity cancellation, and late readiness from success', () => {
    let time = 0
    const sink = vi.fn()
    const recorder = new JourneyRecorder(sink, () => time, false)
    recorder.begin('home_ready', 'startup')
    recorder.cancelAll()
    const error = recorder.begin('post_detail_ready', 'navigation')
    recorder.finish('post_detail_ready', error, 'error')
    const late = recorder.begin('composer_ready', 'presentation')
    time = 31_000
    recorder.finish('composer_ready', late)
    expect(sink.mock.calls.map(([s]) => s.outcome)).toEqual(['cancellation', 'error', 'timeout'])
  })
  it('automatically expires unfinished journeys after thirty seconds', () => {
    vi.useFakeTimers()
    try {
      const sink = vi.fn()
      const recorder = new JourneyRecorder(sink, () => Date.now())
      recorder.begin('inbox_ready', 'navigation')
      vi.advanceTimersByTime(30_000)
      expect(sink).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'timeout' }))
      expect(recorder.token('inbox_ready')).toBeUndefined()
    } finally { vi.useRealTimers() }
  })
})

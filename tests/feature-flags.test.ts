import { describe, expect, it, vi } from 'vitest'
import { subscribeFeatureFlag } from '~/composables/useFeatureFlag'

function fakeClient(flags: Record<string, string | boolean>) {
  const listeners: Array<() => void> = []
  return {
    flags,
    onFeatureFlags: vi.fn((cb: () => void) => {
      listeners.push(cb)
      return () => listeners.splice(listeners.indexOf(cb), 1)
    }),
    getFeatureFlag: vi.fn((key: string) => flags[key]),
    emit: () => listeners.forEach((cb) => cb()),
    listenerCount: () => listeners.length,
  }
}

describe('subscribeFeatureFlag', () => {
  it('reports the fallback without a PostHog client', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeFeatureFlag(null, 'new-composer', false, onChange)

    expect(onChange).not.toHaveBeenCalled()
    expect(() => unsubscribe()).not.toThrow()
  })

  it('reports evaluated values and later reloads', () => {
    const client = fakeClient({ 'new-composer': true })
    const onChange = vi.fn()

    subscribeFeatureFlag(client as never, 'new-composer', false, onChange)
    client.emit()
    client.flags['new-composer'] = 'variant-b'
    client.emit()

    expect(onChange.mock.calls).toEqual([[true], ['variant-b']])
  })

  it('reports the fallback for unknown flags', () => {
    const client = fakeClient({})
    const onChange = vi.fn()

    subscribeFeatureFlag(client as never, 'kill-switch', true, onChange)
    client.emit()

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('stops listening after unsubscribe', () => {
    const client = fakeClient({ 'new-composer': true })
    const unsubscribe = subscribeFeatureFlag(client as never, 'new-composer', false, vi.fn())

    unsubscribe()

    expect(client.listenerCount()).toBe(0)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { JourneyRecorder } from '~/utils/performance-journeys'
import { useJourneyReady } from '~/composables/useJourneyReady'

const app: { $journeys?: JourneyRecorder } = {}
mockNuxtImport('useNuxtApp', () => () => app)
afterEach(() => { vi.unstubAllGlobals() })

function fixture() {
  let time = 0
  const sink = vi.fn()
  const recorder = new JourneyRecorder(sink, () => time, false)
  app.$journeys = recorder
  const ready = ref(false)
  const context = ref('first')
  const failed = ref(false)
  let id = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id })
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key))
  recorder.begin('thread_ready', 'navigation')
  const wrapper = mount(defineComponent({ setup() {
    useJourneyReady('thread_ready', () => ready.value, {
      context: () => context.value, failed: () => failed.value, source: () => 'cache',
    })
    return () => h('button', { disabled: !ready.value }, ready.value ? 'Reply' : 'Loading')
  } }))
  const frame = async () => {
    await nextTick(); await nextTick()
    const pending = [...frames.values()]; frames.clear()
    time += 16
    pending.forEach(callback => callback(time))
  }
  return { recorder, sink, ready, context, failed, wrapper, frame }
}

describe('journey UI readiness', () => {
  it('waits for committed interactive UI and a frame, then finishes once', async () => {
    const f = fixture()
    f.ready.value = true
    await nextTick()
    expect(f.wrapper.get('button').attributes('disabled')).toBeUndefined()
    expect(f.sink).not.toHaveBeenCalled()
    await f.frame()
    expect(f.sink).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success', source: 'cache' }))
    await f.wrapper.get('button').trigger('click')
    f.ready.value = false
    await f.frame()
    f.ready.value = true
    await f.frame()
    f.wrapper.unmount()
    expect(f.sink).toHaveBeenCalledTimes(1)
  })
  it('does not finish a newer navigation from an obsolete pending frame', async () => {
    const f = fixture()
    f.ready.value = true
    await nextTick(); await nextTick()
    f.recorder.begin('thread_ready', 'navigation')
    f.context.value = 'second'
    f.ready.value = false
    await f.frame()
    expect(f.sink.mock.calls.map(([sample]) => sample.outcome)).toEqual(['navigation'])
    f.failed.value = true
    await f.frame()
    expect(f.sink.mock.calls.map(([sample]) => sample.outcome)).toEqual(['navigation', 'error'])
    f.wrapper.unmount()
  })
})

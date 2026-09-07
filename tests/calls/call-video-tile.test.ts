import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CallVideoTile from '~/components/app/calls/CallVideoTile.vue'

vi.mock('~/composables/calls/callMediaLog', () => ({ callMediaLog: vi.fn() }))

class Track extends EventTarget {
  id: string
  kind = 'video'
  readyState = 'live'
  muted = false
  enabled = true
  onmute = vi.fn()
  onunmute = vi.fn()
  onended = vi.fn()
  constructor(id: string) { super(); this.id = id }
}
class Stream extends EventTarget {
  constructor(readonly track: Track) { super() }
  getVideoTracks() { return [this.track] }
}
const wrappers: ReturnType<typeof mount>[] = []
async function render(stream: Stream) {
  const wrapper = mount(CallVideoTile, {
    props: { stream: stream as unknown as MediaStream, user: null, label: 'Presenting', micEnabled: true, cameraEnabled: true, variant: 'stage' },
    global: { stubs: { AppUserAvatar: true, Icon: true } },
  })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const sources = new WeakMap<HTMLMediaElement, MediaProvider | null>()
  vi.spyOn(HTMLMediaElement.prototype, 'srcObject', 'get').mockImplementation(function (this: HTMLMediaElement) { return sources.get(this) ?? null })
  vi.spyOn(HTMLMediaElement.prototype, 'srcObject', 'set').mockImplementation(function (this: HTMLMediaElement, value) { sources.set(this, value) })
})
afterEach(() => {
  wrappers.splice(0).forEach(w => w.unmount())
  vi.restoreAllMocks()
})

describe('call video tile media lifecycle', () => {
  it('keeps the video and source attached during interruptions and unrelated tile updates', async () => {
    const track = new Track('screen')
    const stream = new Stream(track)
    const handlers = [track.onmute, track.onunmute, track.onended]
    const wrapper = await render(stream)
    const video = wrapper.get('video').element
    const plays = vi.mocked(video.play).mock.calls.length
    expect(video.srcObject).toBe(stream)
    expect([track.onmute, track.onunmute, track.onended]).toEqual(handlers)
    for (let i = 0; i < 5; i++) {
      track.muted = true
      track.dispatchEvent(new Event('mute'))
      await wrapper.setProps({ speakingLevel: 0.5, label: 'Still presenting' })
      track.muted = false
      track.dispatchEvent(new Event('unmute'))
      await flushPromises()
      expect(wrapper.get('video').element).toBe(video)
      expect(video.srcObject).toBe(stream)
      expect(wrapper.get('video').classes()).toContain('opacity-100')
    }
    expect(vi.mocked(video.play).mock.calls.length).toBe(plays)
  })

  it('releases the old video and listeners when a screen track changes or the tile unmounts', async () => {
    const firstTrack = new Track('first-screen')
    const firstStream = new Stream(firstTrack)
    const removeTrack = vi.spyOn(firstTrack, 'removeEventListener')
    const removeStream = vi.spyOn(firstStream, 'removeEventListener')
    const wrapper = await render(firstStream)
    const firstVideo = wrapper.get('video').element
    const nextStream = new Stream(new Track('next-screen'))
    await wrapper.setProps({ stream: nextStream as unknown as MediaStream })
    await flushPromises()
    const nextVideo = wrapper.get('video').element
    expect(nextVideo).not.toBe(firstVideo)
    expect(firstVideo.srcObject).toBeNull()
    expect(nextVideo.srcObject).toBe(nextStream)
    expect(removeTrack).toHaveBeenCalledWith('ended', expect.any(Function))
    expect(removeStream).toHaveBeenCalledWith('addtrack', expect.any(Function))
    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    expect(nextVideo.srcObject).toBeNull()
  })

  it('updates the fallback on track end without replacing the transport handler', async () => {
    const track = new Track('screen')
    const handler = track.onended
    const wrapper = await render(new Stream(track))
    track.readyState = 'ended'
    track.dispatchEvent(new Event('ended'))
    await flushPromises()
    expect(track.onended).toBe(handler)
    expect(wrapper.get('video').classes()).toContain('opacity-0')
  })
})

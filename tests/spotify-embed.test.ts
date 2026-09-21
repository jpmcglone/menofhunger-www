import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, KeepAlive, ref, nextTick } from 'vue'
import SpotifyEmbed from '~/components/app/SpotifyEmbed.vue'
import { spotifyContent, isSpotifyShareUrl } from '~/utils/spotify-embed'
import { mediaFocus } from '~/utils/mediaFocus'
const fake = vi.hoisted(() => ({ listeners: {} as Record<string, (event: any) => void>, play: vi.fn(), pause: vi.fn(), destroy: vi.fn() }))
vi.mock('~/utils/media/spotify', () => ({ loadSpotifyAPI: async () => ({ createController(element: HTMLElement, _options: unknown, ready: (controller: unknown) => void) {
  const iframe = document.createElement('iframe'); element.replaceWith(iframe)
  ready({ play: fake.play, pause: fake.pause, destroy: () => { fake.destroy(); iframe.remove() }, addListener: (name: string, callback: (event: any) => void) => { fake.listeners[name] = callback } })
} }) }))
beforeEach(() => { vi.clearAllMocks(); mediaFocus.reset() })
afterEach(() => { mediaFocus.reset() })
const id = '4cOdK2wGLETKBW3PvgPWqT'
describe('Spotify previews', () => {
  it.each(['track', 'album', 'artist', 'playlist', 'episode', 'show'])('embeds %s without tracking parameters', kind => {
    const content = spotifyContent(`https://open.spotify.com/intl-de/${kind}/${id}?si=tracking`)
    expect(content?.url).toBe(`https://open.spotify.com/${kind}/${id}`)
    expect(content?.height).toBe(['track', 'episode'].includes(kind) ? 152 : 352)
    expect(content?.embedUrl).not.toContain('autoplay')
  })
  it('accepts legacy playlist and already embedded URLs', () => {
    expect(spotifyContent(`https://play.spotify.com/user/owner/playlist/${id}`)?.kind).toBe('playlist')
    expect(spotifyContent(`https://open.spotify.com/embed/track/${id}`)?.id).toBe(id)
  })
  it.each([`https://open.spotify.com.evil.test/track/${id}`, `https://evil@open.spotify.com/track/${id}`, `ftp://open.spotify.com/track/${id}`, `https://open.spotify.com/track/${id}/extra`, 'https://open.spotify.com/track/<script>', 'invalid'])('rejects unsafe or unsupported URL %s', url => {
    expect(spotifyContent(url)).toBeNull()
  })
  it('only recognizes explicit Spotify share hosts', () => {
    expect(isSpotifyShareUrl('https://spotify.link/abc')).toBe(true)
    expect(isSpotifyShareUrl('https://spoti.fi/abc')).toBe(true)
    expect(isSpotifyShareUrl('https://spotify.link.evil.test/abc')).toBe(false)
    expect(isSpotifyShareUrl('https://spotify.link')).toBe(false)
  })
  it('keeps player taps inside the post and provides recovery without a duplicate Spotify handoff', async () => {
    const content = spotifyContent(`https://open.spotify.com/track/${id}`)!
    const wrapper = await mountSuspended(SpotifyEmbed, { props: { content } })
    expect(wrapper.get('iframe').element.closest('a')).toBeNull()
    expect(wrapper.find('a').exists()).toBe(false)
    const stopVoice = vi.fn(); mediaFocus.claim('voice', stopVoice)
    await wrapper.get('button').trigger('click')
    expect(stopVoice).toHaveBeenCalledOnce(); expect(fake.play).toHaveBeenCalledOnce()
    fake.listeners.playback_update!({ data: { isPaused: true, position: 100, duration: 5000 } })
    expect(mediaFocus.currentId).toContain('spotify:')
    mediaFocus.claim('video:manual', vi.fn())
    expect(fake.pause).toHaveBeenCalled()
    fake.listeners.playback_started!({ data: {} }); expect(mediaFocus.currentId).toBe('video:manual')
    wrapper.unmount()
  })
  it('removes the player when a cached page deactivates', async () => {
    const visible = ref(true)
    const harness = defineComponent({ components: { SpotifyEmbed, KeepAlive }, setup: () => ({ visible, content: spotifyContent(`https://open.spotify.com/track/${id}`)! }), template: '<KeepAlive><SpotifyEmbed v-if="visible" :content="content" /></KeepAlive>' })
    const wrapper = await mountSuspended(harness)
    const child = wrapper.findComponent(SpotifyEmbed)
    visible.value = false
    await nextTick()
    await nextTick()
    expect(child.find('iframe').exists()).toBe(false)
    visible.value = true
    await nextTick()
    await nextTick()
    expect(wrapper.find('iframe').exists()).toBe(true)
    wrapper.unmount()
  })
})

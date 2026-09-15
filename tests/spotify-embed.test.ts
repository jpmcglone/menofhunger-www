import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, KeepAlive, ref, nextTick } from 'vue'
import SpotifyEmbed from '~/components/app/SpotifyEmbed.vue'
import { spotifyContent, isSpotifyShareUrl } from '~/utils/spotify-embed'
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
  it('keeps player taps inside the post and provides recovery and an external fallback', async () => {
    const content = spotifyContent(`https://open.spotify.com/track/${id}`)!
    const wrapper = await mountSuspended(SpotifyEmbed, { props: { content } })
    const player = wrapper.get('iframe')
    expect(player.attributes('src')).toBe(content.embedUrl)
    expect(player.attributes('allow')).toContain('encrypted-media')
    expect(player.element.closest('a')).toBeNull()
    const event = new MouseEvent('click', { bubbles: true })
    wrapper.element.dispatchEvent(event)
    expect(wrapper.emitted('click')).toBeUndefined()
    await player.trigger('error')
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.get('a').attributes('href')).toBe(content.url)
    await wrapper.get('button').trigger('click')
    expect(wrapper.find('iframe').exists()).toBe(true)
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

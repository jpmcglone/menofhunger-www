import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import LinkPreview from '~/components/app/composer/LinkPreview.vue'
import type { LinkMetadata } from '~/utils/link-metadata'

const { getLinkMetadata } = vi.hoisted(() => ({ getLinkMetadata: vi.fn() }))
vi.mock('~/utils/link-metadata', () => ({ getLinkMetadata, peekLinkMetadata: () => null }))
mockNuxtImport('useSpaces', () => () => ({
  getById: () => null,
  getByOwnerUsername: () => null,
  fetchSpaceById: vi.fn(),
  fetchSpaceByUsername: vi.fn(),
}))

function metadata(url: string, title: string): LinkMetadata {
  return { url, title, description: null, siteName: null, imageUrl: null, socialPost: null, videoEmbed: null }
}

describe('composer preview metadata lifecycle', () => {
  const wrappers: ReturnType<typeof mount>[] = []
  beforeEach(() => {
    vi.useFakeTimers()
    getLinkMetadata.mockReset()
    getLinkMetadata.mockImplementation(async (url: string) => metadata(url, 'Resolved preview'))
  })
  afterEach(() => {
    wrappers.forEach(wrapper => wrapper.unmount())
    wrappers.length = 0
    vi.useRealTimers()
  })
  function render(text: string) {
    const wrapper = mount(LinkPreview, { props: { text } })
    wrappers.push(wrapper)
    return wrapper
  }
  async function finishPreview() {
    await vi.advanceTimersByTimeAsync(350)
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
  }

  it('keeps resolved metadata visible and fetches once while prose changes', async () => {
    const wrapper = render('https://one.example first thought')
    await finishPreview()
    expect(wrapper.text()).toContain('Resolved preview')
    expect(getLinkMetadata).toHaveBeenCalledTimes(1)
    for (const text of ['https://one.example next', 'https://one.example next thought', 'See https://one.example next thought!']) {
      await wrapper.setProps({ text })
      expect(wrapper.text()).toContain('Resolved preview')
      await vi.advanceTimersByTimeAsync(750)
      expect(getLinkMetadata).toHaveBeenCalledTimes(1)
    }
  })

  it('preserves dismissal through prose edits and restores the card for another URL', async () => {
    const wrapper = render('https://one.example')
    await finishPreview()
    await wrapper.get('button[aria-label="Remove preview"]').trigger('click')
    expect(wrapper.find('button[aria-label="Remove preview"]').exists()).toBe(false)
    await wrapper.setProps({ text: 'https://one.example more words' })
    await vi.advanceTimersByTimeAsync(750)
    expect(wrapper.find('button[aria-label="Remove preview"]').exists()).toBe(false)
    expect(getLinkMetadata).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ text: 'https://two.example' })
    await finishPreview()
    expect(wrapper.find('button[aria-label="Remove preview"]').exists()).toBe(true)
    expect(getLinkMetadata).toHaveBeenCalledTimes(2)
  })

  it('retains the in-flight request during prose edits', async () => {
    let requestSignal: AbortSignal | undefined
    let resolveRequest!: (value: LinkMetadata) => void
    getLinkMetadata.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      requestSignal = options.signal
      return new Promise<LinkMetadata>(resolve => { resolveRequest = resolve })
    })
    const wrapper = render('https://one.example')
    await finishPreview()
    await wrapper.setProps({ text: 'https://one.example more words' })
    expect(requestSignal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(750)
    expect(getLinkMetadata).toHaveBeenCalledTimes(1)
    resolveRequest(metadata('https://one.example', 'In-flight preview'))
    await flushPromises()
    expect(wrapper.text()).toContain('In-flight preview')
  })

  it('aborts a replaced URL and ignores its late metadata response', async () => {
    const requests: Array<{ url: string; signal: AbortSignal; resolve: (value: LinkMetadata) => void }> = []
    getLinkMetadata.mockImplementation((url: string, options: { signal: AbortSignal }) => new Promise<LinkMetadata>(resolve => {
      requests.push({ url, signal: options.signal, resolve })
    }))
    const wrapper = render('https://one.example')
    await finishPreview()
    expect(requests).toHaveLength(1)
    await wrapper.setProps({ text: 'https://two.example' })
    expect(requests[0]!.signal.aborted).toBe(true)
    expect(wrapper.text()).not.toContain('one.example')
    await finishPreview()
    expect(requests).toHaveLength(2)
    requests[1]!.resolve(metadata('https://two.example', 'Current preview'))
    await flushPromises()
    requests[0]!.resolve(metadata('https://one.example', 'Stale preview'))
    await flushPromises()
    expect(wrapper.text()).toContain('Current preview')
    expect(wrapper.text()).not.toContain('Stale preview')
    expect(getLinkMetadata).toHaveBeenCalledTimes(2)
  })

  it('aborts and removes the card when its URL is deleted', async () => {
    let requestSignal: AbortSignal | undefined
    let resolveRequest!: (value: LinkMetadata) => void
    getLinkMetadata.mockImplementation((_url: string, options: { signal: AbortSignal }) => {
      requestSignal = options.signal
      return new Promise<LinkMetadata>(resolve => { resolveRequest = resolve })
    })
    const wrapper = render('https://one.example')
    await finishPreview()
    await wrapper.setProps({ text: 'Just prose now' })
    expect(requestSignal?.aborted).toBe(true)
    expect(wrapper.text()).not.toContain('one.example')
    resolveRequest(metadata('https://one.example', 'Deleted preview'))
    await finishPreview()
    expect(wrapper.text()).not.toContain('Deleted preview')
    expect(getLinkMetadata).toHaveBeenCalledTimes(1)
  })
})

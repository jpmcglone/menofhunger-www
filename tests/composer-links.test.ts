import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { composerStarterKit } from '../utils/composer-editor'
import { composerLinkTarget } from '../utils/composer-link-preview'
import LinkPreview from '../components/app/composer/LinkPreview.vue'

const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: fetchData }))

describe('editable composer links', () => {
  it('keeps typed URLs as editable text without anchors', () => {
    const editor = new Editor({ extensions: [composerStarterKit], content: '<p></p>' })
    try {
      editor.commands.insertContent('https://example.com john@example.com ')
      expect(editor.getText()).toContain('https://example.com')
      expect(editor.getHTML()).not.toContain('<a')
      expect(editor.schema.marks.link).toBeUndefined()
    } finally { editor.destroy() }
  })

  it('strips pasted anchor semantics but preserves their text', () => {
    const editor = new Editor({ extensions: [composerStarterKit], content: '<p></p>' })
    try {
      editor.commands.insertContent('<p><a href="https://example.com">https://example.com</a> and <a href="mailto:john@example.com">john@example.com</a></p>')
      expect(editor.getText()).toBe('https://example.com and john@example.com')
      expect(editor.getHTML()).not.toContain('<a')
    } finally { editor.destroy() }
  })

  it('selects internal posts before external links and ignores non-web links', () => {
    expect(composerLinkTarget('mailto:john@example.com')).toBeNull()
    expect(composerLinkTarget('https://menofhunger.com/p/abc\nhttps://youtu.be/jNQXAC9IVRw')?.postId).toBe('abc')
    expect(composerLinkTarget('https://one.example\nhttps://two.example')?.url).toBe('https://two.example')
  })
})

describe('composer link preview', () => {
  const wrappers: ReturnType<typeof mount>[] = []
  beforeEach(() => { vi.useFakeTimers(); fetchData.mockReset() })
  afterEach(() => { wrappers.forEach(w => w.unmount()); wrappers.length = 0; vi.useRealTimers() })
  function render(text: string) {
    const wrapper = mount(LinkPreview, { props: { text } })
    wrappers.push(wrapper)
    return wrapper
  }

  it('shows a YouTube thumbnail without any navigation or playable media', async () => {
    fetchData.mockResolvedValue({ title: 'Me at the zoo', siteName: 'YouTube', imageUrl: null })
    const wrapper = render('https://youtu.be/jNQXAC9IVRw')
    expect(wrapper.find('img').attributes('src')).toContain('/vi/jNQXAC9IVRw/')
    await vi.advanceTimersByTimeAsync(350)
    await flushPromises()
    expect(wrapper.text()).toContain('Me at the zoo')
    expect(wrapper.findAll('a, button, iframe, video, audio, [tabindex]').length).toBe(0)
    await wrapper.trigger('click')
    expect(wrapper.emitted('open')).toBeUndefined()
  })

  it('debounces edits, ignores stale metadata, and disappears when the link is removed', async () => {
    let finishFirst!: (value: unknown) => void
    fetchData.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve }))
      .mockResolvedValueOnce({ title: 'New preview', siteName: 'New site' })
    const wrapper = render('https://one.example')
    await vi.advanceTimersByTimeAsync(350)
    await wrapper.setProps({ text: 'https://two.example' })
    finishFirst({ title: 'Stale preview' })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Stale preview')
    await vi.advanceTimersByTimeAsync(350)
    await flushPromises()
    expect(wrapper.text()).toContain('New preview')
    await wrapper.setProps({ text: 'No URL now' })
    expect(wrapper.find('[data-testid="composer-link-preview"]').exists()).toBe(false)
  })

  it('uses permission-checked internal post data without mounting a post player', async () => {
    fetchData.mockResolvedValue({ body: 'Keep showing up', author: { username: 'john' }, media: [{ kind: 'video', url: 'https://example.com/video.mp4', thumbnailUrl: 'https://example.com/poster.jpg' }] })
    const wrapper = render('https://menofhunger.com/p/abc')
    await vi.advanceTimersByTimeAsync(350)
    await flushPromises()
    expect(fetchData).toHaveBeenCalledWith('/posts/abc', expect.anything())
    expect(wrapper.text()).toContain('Keep showing up')
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/poster.jpg')
    expect(wrapper.findAll('a, button, iframe, video, audio').length).toBe(0)
  })

  it('keeps a plain host preview when metadata fails', async () => {
    fetchData.mockRejectedValue(new Error('unavailable'))
    const wrapper = render('https://example.com/page')
    await vi.advanceTimersByTimeAsync(350)
    await flushPromises()
    expect(wrapper.text()).toContain('example.com')
    expect(wrapper.findAll('a, button, iframe, video, audio').length).toBe(0)
  })
})

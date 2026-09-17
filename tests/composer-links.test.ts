import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Editor } from '@tiptap/core'
import { mount } from '@vue/test-utils'
import { mockComponent } from '@nuxt/test-utils/runtime'
import { composerStarterKit } from '../utils/composer-editor'
import LinkPreview from '../components/app/composer/LinkPreview.vue'

mockComponent('AppPostRowLinkPreview', () => ({
  name: 'PublishedPreviewStub',
  props: { body: String, postId: String, hasMedia: Boolean, rowInView: Boolean, previewOnly: Boolean },
  template: '<div data-testid="published-preview">{{ body }}</div>',
}))

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


})

describe('composer uses the published preview renderer', () => {
  const wrappers: ReturnType<typeof mount>[] = []
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { wrappers.forEach(w => w.unmount()); wrappers.length = 0; vi.useRealTimers() })
  function render(text: string) {
    const wrapper = mount(LinkPreview, { props: { text } })
    wrappers.push(wrapper)
    return wrapper
  }

  it('debounces edits and hands the latest text to the published renderer', async () => {
    const wrapper = render('https://one.example')
    await vi.advanceTimersByTimeAsync(200)
    await wrapper.setProps({ text: 'https://two.example' })
    await vi.advanceTimersByTimeAsync(200)
    expect(wrapper.find('[data-testid="published-preview"]').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(150)
    expect(wrapper.text()).toContain('https://two.example')
    expect(wrapper.text()).not.toContain('https://one.example')
  })

  it('disables draft interaction and feed autoplay while preserving the complete body', async () => {
    const text = 'https://menofhunger.com/p/abc https://youtu.be/jNQXAC9IVRw John 3:16'
    const wrapper = render(text)
    await vi.advanceTimersByTimeAsync(350)
    expect(wrapper.find('[inert]').exists()).toBe(true)
    const preview = wrapper.findComponent({ name: 'PublishedPreviewStub' })
    expect(preview.props('body')).toBe(text)
    expect(preview.props('previewOnly')).toBe(true)
    expect(preview.props('rowInView')).toBe(true)
  })

  it('lets the published renderer choose previews when media is attached', async () => {
    const wrapper = render('https://menofhunger.com/p/abc')
    await wrapper.setProps({ hasMedia: true })
    await vi.advanceTimersByTimeAsync(350)
    expect(wrapper.findComponent({ name: 'PublishedPreviewStub' }).props('hasMedia')).toBe(true)
  })

  it('removes stale content immediately and cancels pending work on unmount', async () => {
    const wrapper = render('https://example.com')
    await vi.advanceTimersByTimeAsync(350)
    await wrapper.setProps({ text: '' })
    expect(wrapper.find('[data-testid="published-preview"]').exists()).toBe(false)
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(350)
    expect(vi.getTimerCount()).toBe(0)
  })
})

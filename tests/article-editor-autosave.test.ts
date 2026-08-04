/**
 * useArticleEditor autosave contract.
 *
 * The invariant that matters: opening the editor and walking away must leave no
 * row behind. A draft is created on the first piece of real content — title, body
 * text, thumbnail, or tags — and never before.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Article } from '~/types/api'

const apiFetchData = vi.fn()

mockNuxtImport('useApiClient', () => () => ({ apiFetchData }))

function makeArticle(override: Partial<Article> = {}): Article {
  return {
    id: 'article-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: null,
    title: '',
    slug: 'draft',
    body: '',
    excerpt: null,
    thumbnailUrl: null,
    thumbnailR2Key: null,
    visibility: 'public',
    isDraft: true,
    lastSavedAt: new Date().toISOString(),
    tags: [],
    ...override,
  } as Article
}

async function mountEditor(initial: Article | null = null) {
  const onCreated = vi.fn()
  let editor!: ReturnType<typeof useArticleEditor>
  const Comp = defineComponent({
    name: 'ArticleEditorHarness',
    setup() {
      editor = useArticleEditor(ref(initial), { onCreated })
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  await nextTick()
  return { editor, onCreated, wrapper }
}

/** A Tiptap document with a paragraph node but no text — what an untouched editor emits. */
const EMPTY_TIPTAP_DOC = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] })

const bodyWithText = (text: string) =>
  JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })

describe('useArticleEditor', () => {
  beforeEach(() => {
    apiFetchData.mockReset()
    apiFetchData.mockImplementation((path: string) =>
      Promise.resolve(makeArticle({ id: path === '/articles' ? 'created-1' : 'article-1' })),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('does not persist an empty draft', () => {
    it('makes no request when nothing has been entered', async () => {
      const { editor, onCreated } = await mountEditor()
      await editor.save()
      expect(apiFetchData).not.toHaveBeenCalled()
      expect(onCreated).not.toHaveBeenCalled()
    })

    it('treats an untouched Tiptap document as empty', async () => {
      const { editor } = await mountEditor()
      editor.body.value = EMPTY_TIPTAP_DOC
      expect(editor.hasContent.value).toBe(false)
      await editor.save()
      expect(apiFetchData).not.toHaveBeenCalled()
    })

    it('treats whitespace-only text as empty', async () => {
      const { editor } = await mountEditor()
      editor.title.value = '   '
      editor.body.value = bodyWithText('   ')
      expect(editor.hasContent.value).toBe(false)
      await editor.save()
      expect(apiFetchData).not.toHaveBeenCalled()
    })

    it('makes no request when the editor unmounts untouched', async () => {
      const { editor, wrapper } = await mountEditor()
      editor.markDirty()
      wrapper.unmount()
      await nextTick()
      expect(apiFetchData).not.toHaveBeenCalled()
    })
  })

  describe('creates the draft on the first real content', () => {
    it.each([
      ['a title', (e: ReturnType<typeof useArticleEditor>) => { e.title.value = 'Hello' }],
      ['body text', (e: ReturnType<typeof useArticleEditor>) => { e.body.value = bodyWithText('Hello') }],
      ['a thumbnail', (e: ReturnType<typeof useArticleEditor>) => { e.thumbnailR2Key.value = 'thumb-key' }],
      ['a tag', (e: ReturnType<typeof useArticleEditor>) => { e.tags.value = [{ tag: 'stoicism', label: 'Stoicism' }] }],
    ])('creates the row for %s', async (_label, apply) => {
      const { editor, onCreated } = await mountEditor()
      apply(editor)
      expect(editor.hasContent.value).toBe(true)
      await editor.save()
      expect(apiFetchData).toHaveBeenCalledWith('/articles', expect.objectContaining({ method: 'POST' }))
      expect(onCreated).toHaveBeenCalledTimes(1)
    })

    it('creates the row only once across repeated saves', async () => {
      const { editor, onCreated } = await mountEditor()
      editor.title.value = 'Hello'
      await editor.save()
      editor.title.value = 'Hello again'
      await editor.save()
      const creates = apiFetchData.mock.calls.filter(([path]) => path === '/articles')
      expect(creates).toHaveLength(1)
      expect(onCreated).toHaveBeenCalledTimes(1)
    })
  })

  describe('once the row exists', () => {
    it('persists clearing the article back to nothing', async () => {
      const { editor } = await mountEditor(makeArticle({ title: 'Existing', body: bodyWithText('words') }))
      editor.title.value = ''
      editor.body.value = EMPTY_TIPTAP_DOC
      expect(editor.hasContent.value).toBe(false)
      await editor.save()
      expect(apiFetchData).toHaveBeenCalledWith('/articles/article-1/save', expect.objectContaining({ method: 'PATCH' }))
    })

    it('never re-creates a row for an article it was handed', async () => {
      const { editor, onCreated } = await mountEditor(makeArticle({ title: 'Existing' }))
      await editor.save()
      expect(apiFetchData).not.toHaveBeenCalledWith('/articles', expect.anything())
      expect(onCreated).not.toHaveBeenCalled()
    })
  })

  it('checkpoints during sustained typing instead of deferring forever', async () => {
    vi.useFakeTimers()
    const { editor } = await mountEditor(makeArticle({ title: 'Existing' }))
    // Keep resetting the debounce, the way a fast typist would.
    for (let i = 0; i < 20; i++) {
      editor.markDirty()
      vi.advanceTimersByTime(1000)
    }
    expect(apiFetchData).toHaveBeenCalledWith('/articles/article-1/save', expect.objectContaining({ method: 'PATCH' }))
  })
})

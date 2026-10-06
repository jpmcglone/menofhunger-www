import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, provide, ref } from 'vue'
import PreviewDialog from '~/components/app/post/PostPreviewDialog.vue'
import { buildPostPreview } from '~/utils/post-preview'
import type { PostAuthor } from '~/types/api'
import { MOH_MIDDLE_SCROLLER_KEY } from '~/utils/injection-keys'

const author: PostAuthor = {
  id: 'preview-author', username: 'john', name: 'John McGlone',
  premium: false, premiumPlus: false, isOrganization: false,
  verifiedStatus: 'identity', avatarUrl: null,
}
const draft = { localId: 'preview', body: 'More energy for the people I love.', visibility: 'verifiedOnly' as const, media: [], author }
const prompt = "What's one reason fitness matters beyond appearance?"

afterEach(() => vi.useRealTimers())

describe('post preview', () => {
  it('includes the check-in context and Eastern day before UTC midnight rolls over', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T02:00:00Z'))
    const post = buildPostPreview({ ...draft, checkinPrompt: prompt })
    expect(post).toMatchObject({
      kind: 'checkin', checkinPrompt: prompt, checkinDayKey: '2026-09-30',
      body: draft.body, visibility: 'verifiedOnly', author,
      _pending: null, _pendingError: null, viewerCount: 1, totalViewCount: 1,
    })
    expect(post._localId).toBeUndefined()
  })

  it('keeps ordinary posts free of check-in context', () => {
    const post = buildPostPreview(draft)
    expect(post.checkinPrompt).toBeUndefined()
    expect(post.kind).not.toBe('checkin')
    expect(post.body).toBe(draft.body)
  })

  it('renders the prompt in the real post row and preserves cancel and confirm', async () => {
    const column = document.createElement('main')
    Object.defineProperty(column, 'offsetWidth', { value: 720 })
    const Harness = defineComponent({
      props: { scheduledLabel: { type: String, default: null } },
      setup(props) {
        provide(MOH_MIDDLE_SCROLLER_KEY, ref(column))
        return () => h(PreviewDialog, {
          post: buildPostPreview({ ...draft, checkinPrompt: prompt }),
          scheduledLabel: props.scheduledLabel,
        })
      },
    })
    const wrapper = await mountSuspended(Harness, {
      global: { stubs: { teleport: true, Icon: true } },
    })
    const dialog = wrapper.getComponent(PreviewDialog)
    try {
      expect(wrapper.text()).toContain(prompt)
      expect(wrapper.text()).toContain(draft.body)
      expect(wrapper.get('[role="dialog"]').attributes('style')).toContain('width: 720px')
      const buttons = wrapper.findAll('button')
      await buttons.find(button => button.text() === 'Cancel')!.trigger('click')
      expect(dialog.emitted('close')).toHaveLength(1)
      await buttons.find(button => button.text() === 'Post')!.trigger('click')
      expect(dialog.emitted('confirm')).toEqual([[{ crosspost: {} }]])
      await wrapper.setProps({ scheduledLabel: 'tomorrow at 6 PM' })
      expect(wrapper.text()).toContain('Publishes tomorrow at 6 PM')
      expect(wrapper.text()).toContain('Schedule post')
    } finally {
      wrapper.unmount()
    }
  })
  it('confirms selected destinations and clears selections that become unavailable', async () => {
    const wrapper = await mountSuspended(PreviewDialog, {
      props: { post: null, destinations: [{ id: 'x', modes: ['native'] }], initialSelection: { x: 'native' } },
      global: { stubs: { teleport: true, Icon: true } },
    })
    try {
      const confirm = () => wrapper.findAll('button').find(button => button.text() === 'Post')!.trigger('click')
      await confirm()
      expect(wrapper.emitted('confirm')?.at(-1)).toEqual([{ crosspost: { x: 'native' } }])
      await wrapper.get('input').setValue(false)
      await confirm()
      expect(wrapper.emitted('confirm')?.at(-1)).toEqual([{ crosspost: {} }])
      await wrapper.get('input').setValue(true)
      await wrapper.setProps({ destinations: [{ id: 'x', modes: [], disabled: true }] })
      await confirm()
      expect(wrapper.emitted('confirm')?.at(-1)).toEqual([{ crosspost: {} }])
    } finally { wrapper.unmount() }
  })

})

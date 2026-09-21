import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import PostMediaGrid from '~/components/app/PostMediaGrid.vue'
import type { PostMedia } from '~/types/api'

const video: PostMedia = {
  id: 'video', kind: 'video', source: 'upload', url: '/fixture.mp4', mp4Url: null,
  thumbnailUrl: null, width: 640, height: 360, durationSeconds: 10, alt: null, deletedAt: null,
}

describe('PostMediaGrid initialization (MENOFHUNGER-WWW-1T)', () => {
  it('mounts a video and responds to attachment replacement without a setup-order error', async () => {
    const wrapper = await mountSuspended(PostMediaGrid, { props: { media: [video], postId: 'post' } })
    expect(wrapper.get('video').attributes('src')).toBe('/fixture.mp4')
    await wrapper.setProps({ media: [] })
    expect(wrapper.find('video').exists()).toBe(false)
    await wrapper.setProps({ media: [{ ...video, url: '/replacement.mp4' }] })
    expect(wrapper.get('video').attributes('src')).toBe('/replacement.mp4')
    wrapper.unmount()
  })
})

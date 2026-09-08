import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ImageLightbox from '../components/app/ImageLightbox.vue'
import AvatarVideo from '../components/app/AvatarVideo.vue'
import DraftPreview from '../components/app/profile/edit/AvatarVideoDraftPreview.vue'
import { useImageLightbox } from '../composables/useImageLightbox'
import { useProfileSeo } from '../composables/useProfileSeo'
import type { PublicProfile } from '../composables/usePublicProfile'

mockNuxtImport('useScrollLock', () => () => {})
mockNuxtImport('useOverlayDismiss', () => () => {})
mockNuxtImport('usePageSeo', () => () => {})
mockNuxtImport('useHead', () => () => {})
mockNuxtImport('useEmbeddedVideoManager', () => () => ({ appWideSoundOn: ref(false), appWideVolume: ref(1),
  reportPlayerAudio: vi.fn(), applySharedAudioToVideo: vi.fn() }))

const asset = { id: 'avatar', url: 'https://cdn.test/avatar.mp4', durationMs: 7000, width: 320, height: 320 }
afterEach(() => vi.restoreAllMocks())

describe('video avatar viewers', () => {
  it('uses the profile avatar poster before the banner in sharing previews', () => {
    const profile = ref({ id: 'owner', username: 'owner', avatarUrl: 'https://cdn.test/poster.jpg', bannerUrl: 'https://cdn.test/banner.jpg' } as PublicProfile)
    const seo = useProfileSeo({ profile, normalizedUsername: ref('owner'), notFound: ref(false) })
    expect(seo.seoImage.value).toBe(profile.value.avatarUrl)
    expect(seo.twitterCard.value).toBe('summary')
    profile.value.avatarUrl = null
    expect(seo.seoImage.value).toBe(profile.value.bannerUrl)
  })
  it('carries the shared asset into avatar zoom and clears it on close', async () => {
    let viewer!: ReturnType<typeof useImageLightbox>
    const wrapper = mount(defineComponent({ setup() { viewer = useImageLightbox(); return () => h('div') } }))
    try {
      await viewer.openFromEvent(new MouseEvent('click'), 'https://cdn.test/poster.jpg', 'Avatar', 'avatar', { avatarVideo: asset })
      expect(viewer.avatarVideo.value).toEqual(asset)
      expect(viewer.target.value?.width).toBe(viewer.target.value?.height)
      viewer.close()
      expect(viewer.avatarVideo.value).toBeNull()
    } finally { wrapper.unmount() }
  })

  it('renders the shared player inside the zoomable avatar, without audio controls', async () => {
    const wrapper = shallowMount(ImageLightbox, { props: { visible: true, backdropVisible: true, src: 'https://cdn.test/poster.jpg',
      alt: 'Avatar', kind: 'avatar', avatarVideo: asset, target: {}, imageStyle: { width: '320px', height: '320px' },
      onClose: vi.fn(), onTransitionEnd: vi.fn() }, global: { stubs: { ClientOnly: { template: '<slot />' }, Teleport: true } } })
    try {
      expect(wrapper.findComponent(AvatarVideo).props('asset')).toEqual(asset)
      expect(wrapper.find('video[controls]').exists()).toBe(false)
      await wrapper.setProps({ visible: false })
      expect(wrapper.findComponent(AvatarVideo).exists()).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('plays the cropped local draft silently, loops the selected interval, and releases its URL', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:draft')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const wrapper = mount(DraftPreview, { props: { edit: { file: new File(['video'], 'clip.mp4'), poster: new Blob(['poster']),
      selection: { startSeconds: 2, durationSeconds: 7, crop: { x: 0.25, y: 0, width: 0.5, height: 1 } } } } })
    const video = wrapper.get('video')
    try {
      await flushPromises()
      await video.trigger('loadedmetadata')
      expect(play).toHaveBeenCalled()
      expect(video.element.muted).toBe(true)
      expect(video.element.currentTime).toBe(2)
      expect(video.element.style.width).toBe('200%')
      expect(video.element.style.left).toBe('-50%')
      video.element.currentTime = 9
      await video.trigger('timeupdate')
      expect(video.element.currentTime).toBe(2)
    } finally { wrapper.unmount() }
    expect(pause).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:draft')
  })
})

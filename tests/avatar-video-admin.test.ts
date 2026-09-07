import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { computed, ref } from 'vue'
import EditProfileDialog from '../components/app/profile/EditProfileDialog.vue'
import AvatarVideoDialog from '../components/app/profile/edit/AvatarVideoDialog.vue'

const { api, patchUser, syncCaches } = vi.hoisted(() => ({ api: vi.fn(), patchUser: vi.fn(), syncCaches: vi.fn() }))
// Nuxt transforms auto-imports into module imports; global stubs do not replace them.
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: api }))
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'admin', username: 'administrator' }), patchUser }))
mockNuxtImport('useFormCharCount', () => () => computed(() => 0))
mockNuxtImport('useAppConfirm', () => () => ({ confirm: vi.fn() }))
vi.mock('../composables/settings/useSyncUserCaches', () => ({ useSyncUserCaches: () => syncCaches }))
vi.mock('../utils/put-presigned-file', () => ({ putPresignedFile: vi.fn(async () => {}) }))

const target = { id: 'target', username: 'member', name: 'Member', bio: '', premium: false, verifiedStatus: 'none' as const,
  avatarUrl: 'https://cdn.test/old.jpg', avatarVideo: null }
const updated = { ...target, avatarUrl: 'https://cdn.test/poster.jpg', avatarVideo: { id: 'clip', url: 'https://cdn.test/clip.mp4', durationMs: 7000, width: 320, height: 320 } }

describe('admin video avatar editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    api.mockImplementation(async (path: string) => {
      if (path.endsWith('/capabilities')) return { canSet: true }
      if (path.endsWith('/init')) return { id: 'job', uploadUrl: 'https://storage.test/upload', headers: {} }
      if (path.endsWith('/job/commit')) return { status: 'ready', user: updated }
      if (path.endsWith('/profile')) return updated
      throw new Error(`Unexpected route: ${path}`)
    })
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('saves a seven-second clip on the selected user without replacing the admin session', async () => {
    const wrapper = shallowMount(EditProfileDialog, { props: { modelValue: true, profile: target, isSelf: false, targetUserId: target.id,
      profileAvatarUrl: target.avatarUrl, profileBannerUrl: null }, global: { stubs: { AppFormModal: true }, config: { warnHandler: () => {} } } })
    try {
      await flushPromises()
      const editor = wrapper.vm as unknown as { canSetVideoAvatar: boolean; stageVideo: (edit: unknown) => void; saveProfile: () => Promise<void> }
      expect(editor.canSetVideoAvatar).toBe(true)
      const selection = { startSeconds: 0, durationSeconds: 7, crop: { x: 0, y: 0, width: 1, height: 1 } }
      editor.stageVideo({ file: new File(['video'], 'avatar.mp4', { type: 'video/mp4' }), poster: new Blob(['poster']), selection })
      await editor.saveProfile()
      expect(api).toHaveBeenCalledWith('/admin/users/target/uploads/avatar/video/job/commit', { method: 'POST', body: selection })
      expect(api).toHaveBeenCalledWith('/admin/users/target/profile', expect.objectContaining({ method: 'PATCH' }))
      expect(api.mock.calls.every(([path]) => path.startsWith('/admin/users/target/'))).toBe(true)
      expect(patchUser).not.toHaveBeenCalled()
      expect(syncCaches).toHaveBeenCalledWith(updated, 'member')
      expect(wrapper.emitted('patchProfile')?.[0]).toEqual([{ avatarUrl: updated.avatarUrl, avatarVideo: updated.avatarVideo }])
    } finally { wrapper.unmount() }
  })
  it('removes an existing video through the target admin route and clears its metadata', async () => {
    const cleared = { ...target, avatarUrl: null, avatarVideo: null }
    api.mockImplementation(async (path: string) => {
      if (path.endsWith('/capabilities')) return { canSet: true }
      if (path.endsWith('/uploads/avatar')) return { user: cleared }
      if (path.endsWith('/profile')) return cleared
      throw new Error(`Unexpected route: ${path}`)
    })
    const wrapper = shallowMount(EditProfileDialog, { props: { modelValue: true, profile: updated, isSelf: false, targetUserId: target.id,
      profileAvatarUrl: updated.avatarUrl, profileBannerUrl: null }, global: { stubs: { AppFormModal: true }, config: { warnHandler: () => {} } } })
    try {
      await flushPromises()
      const editor = wrapper.vm as unknown as { pendingAvatarRemoval: boolean; saveProfile: () => Promise<void> }
      editor.pendingAvatarRemoval = true
      await editor.saveProfile()
      expect(api).toHaveBeenCalledWith('/admin/users/target/uploads/avatar', { method: 'DELETE' })
      expect(wrapper.emitted('patchProfile')?.[0]).toEqual([{ avatarUrl: null, avatarVideo: null }])
      expect(patchUser).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })

  it('offers seven seconds in the actual video crop editor', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const wrapper = shallowMount(AvatarVideoDialog, { props: { file: new File(['video'], 'avatar.mp4', { type: 'video/mp4' }) },
      global: { stubs: { Dialog: true }, renderStubDefaultSlot: true, config: { warnHandler: () => {} } } })
    try {
      const video = wrapper.get('video')
      Object.defineProperties(video.element, { duration: { value: 12 }, videoWidth: { value: 640 }, videoHeight: { value: 640 } })
      await video.trigger('loadedmetadata')
      expect(wrapper.get('input[aria-label="Clip length"]').attributes('max')).toBe('7')
      expect(wrapper.text()).toContain('Length · 7.0s')
      expect(wrapper.text()).toContain('Choose up to 7 seconds')
    } finally { wrapper.unmount() }
  })

})

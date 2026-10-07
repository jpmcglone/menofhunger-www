import type { ComponentPublicInstance, InjectionKey, MaybeRefOrGetter } from 'vue'
import type { AvatarVideoEdit } from '~/utils/avatar-video-upload'
import { avatarVideoBasePath } from '~/utils/avatar-video-upload'

export type BannerAvatarEditorVariant = 'user' | 'organization' | 'group' | 'crew'

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const BANNER_MAX_BYTES = 8 * 1024 * 1024
const VIDEO_MAX_BYTES = 100 * 1024 * 1024

export function useStagedBannerAvatarEdit(opts: {
  avatarUrl: MaybeRefOrGetter<string | null | undefined>
  bannerUrl: MaybeRefOrGetter<string | null | undefined>
  canEdit: MaybeRefOrGetter<boolean>
  allowAvatarRemoval: MaybeRefOrGetter<boolean>
  allowBannerRemoval?: MaybeRefOrGetter<boolean>
  allowVideo?: MaybeRefOrGetter<boolean>
  videoTargetUserId?: MaybeRefOrGetter<string | null | undefined>
  open?: MaybeRefOrGetter<boolean>
  bannerNoun?: string
  avatarNoun?: string
  error: Ref<string | null>
}) {
  const { confirm } = useAppConfirm()
  const { apiFetchData } = useApiClient()
  const { user: authUser } = useAuth()

  const bannerNoun = opts.bannerNoun ?? 'cover'
  const avatarNoun = opts.avatarNoun ?? 'avatar'
  const allowBannerRemoval = opts.allowBannerRemoval ?? opts.canEdit

  const avatarInputEl = ref<HTMLInputElement | null>(null)
  const bannerInputEl = ref<HTMLInputElement | null>(null)
  const pendingAvatarFile = ref<File | null>(null)
  const pendingAvatarPreviewUrl = ref<string | null>(null)
  const pendingAvatarRemoval = ref(false)
  const pendingBannerFile = ref<File | null>(null)
  const pendingBannerPreviewUrl = ref<string | null>(null)
  const pendingBannerRemoval = ref(false)
  const avatarCropOpen = ref(false)
  const avatarCropFile = ref<File | null>(null)
  const bannerCropOpen = ref(false)
  const bannerCropFile = ref<File | null>(null)
  const canSetVideoAvatar = ref(false)
  const videoEditorFile = ref<File | null>(null)
  const pendingVideoEdit = shallowRef<AvatarVideoEdit | null>(null)

  const editAvatarPreviewUrl = computed(() => {
    if (pendingAvatarFile.value && pendingAvatarPreviewUrl.value) return pendingAvatarPreviewUrl.value
    if (pendingAvatarRemoval.value) return null
    return toValue(opts.avatarUrl) ?? null
  })
  const editBannerPreviewUrl = computed(() => {
    if (pendingBannerFile.value && pendingBannerPreviewUrl.value) return pendingBannerPreviewUrl.value
    if (pendingBannerRemoval.value) return null
    return toValue(opts.bannerUrl) ?? null
  })

  const showAvatarTrash = computed(
    () =>
      toValue(opts.allowAvatarRemoval)
      && (Boolean(toValue(opts.avatarUrl)) || pendingAvatarRemoval.value)
      && !pendingAvatarFile.value,
  )
  const showBannerTrash = computed(
    () =>
      toValue(allowBannerRemoval)
      && (Boolean(toValue(opts.bannerUrl)) || pendingBannerRemoval.value)
      && !pendingBannerFile.value,
  )

  function clearPendingAvatar() {
    pendingVideoEdit.value = null
    videoEditorFile.value = null
    pendingAvatarFile.value = null
    if (pendingAvatarPreviewUrl.value) {
      URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
      pendingAvatarPreviewUrl.value = null
    }
    if (avatarInputEl.value) avatarInputEl.value.value = ''
  }

  function clearPendingBanner() {
    pendingBannerFile.value = null
    if (pendingBannerPreviewUrl.value) {
      URL.revokeObjectURL(pendingBannerPreviewUrl.value)
      pendingBannerPreviewUrl.value = null
    }
    if (bannerInputEl.value) bannerInputEl.value.value = ''
  }

  function clearAvatarCropState() {
    avatarCropOpen.value = false
    avatarCropFile.value = null
  }

  function clearBannerCropState() {
    bannerCropOpen.value = false
    bannerCropFile.value = null
  }

  function reset() {
    clearAvatarCropState()
    clearBannerCropState()
    clearPendingAvatar()
    clearPendingBanner()
    pendingAvatarRemoval.value = false
    pendingBannerRemoval.value = false
  }

  function stageAvatarFile(file: File) {
    pendingVideoEdit.value = null
    if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
    pendingAvatarFile.value = file
    pendingAvatarPreviewUrl.value = URL.createObjectURL(file)
    pendingAvatarRemoval.value = false
  }

  function stageBannerFile(file: File) {
    if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
    pendingBannerFile.value = file
    pendingBannerPreviewUrl.value = URL.createObjectURL(file)
    pendingBannerRemoval.value = false
  }

  function stageVideo(edit: AvatarVideoEdit) {
    clearPendingAvatar()
    pendingVideoEdit.value = edit
    pendingAvatarFile.value = edit.file
    pendingAvatarPreviewUrl.value = URL.createObjectURL(edit.poster)
    pendingAvatarRemoval.value = false
    videoEditorFile.value = null
  }

  async function requestAvatarRemoval() {
    if (!toValue(opts.canEdit)) return
    const ok = await confirm({
      header: `Remove ${avatarNoun}?`,
      message: `The ${avatarNoun} will be cleared when you save. The change is reversible until you save.`,
      confirmLabel: 'Remove',
      confirmSeverity: 'danger',
    })
    if (!ok) return
    clearPendingAvatar()
    pendingAvatarRemoval.value = true
  }

  function undoPendingAvatarRemoval() {
    pendingAvatarRemoval.value = false
  }

  async function requestBannerRemoval() {
    if (!toValue(opts.canEdit)) return
    const ok = await confirm({
      header: `Remove ${bannerNoun}?`,
      message: `The ${bannerNoun} will be cleared when you save. The change is reversible until you save.`,
      confirmLabel: 'Remove',
      confirmSeverity: 'danger',
    })
    if (!ok) return
    clearPendingBanner()
    pendingBannerRemoval.value = true
  }

  function undoPendingBannerRemoval() {
    pendingBannerRemoval.value = false
  }

  function openBannerPicker() {
    if (!toValue(opts.canEdit)) return
    bannerInputEl.value?.click()
  }

  function openAvatarPicker() {
    if (!toValue(opts.canEdit)) return
    avatarInputEl.value?.click()
  }

  function rejectImage(file: File, kind: 'avatar' | 'banner'): boolean {
    if (!IMAGE_TYPES.has(file.type)) {
      opts.error.value = 'Unsupported image type. Please upload a JPG, PNG, or WebP.'
      return true
    }
    const max = kind === 'banner' ? BANNER_MAX_BYTES : AVATAR_MAX_BYTES
    if (file.size > max) {
      opts.error.value = `${kind === 'banner' ? 'Banner' : 'Avatar'} is too large (max ${kind === 'banner' ? '8MB' : '5MB'}).`
      return true
    }
    return false
  }

  function handleBannerSelectedFile(file: File) {
    if (!toValue(opts.canEdit)) return
    if (rejectImage(file, 'banner')) {
      clearPendingBanner()
      return
    }
    opts.error.value = null
    bannerCropFile.value = file
    bannerCropOpen.value = true
  }

  function handleAvatarSelectedFile(file: File) {
    if (!toValue(opts.canEdit)) return
    if (file.type.startsWith('video/')) {
      if (!toValue(opts.allowVideo) || !canSetVideoAvatar.value) {
        opts.error.value = 'Video avatars require Premium or Premium Plus.'
        return
      }
      if (file.size > VIDEO_MAX_BYTES) {
        opts.error.value = 'Video must be under 100 MB.'
        return
      }
      videoEditorFile.value = file
      return
    }
    if (rejectImage(file, 'avatar')) {
      clearPendingAvatar()
      return
    }
    opts.error.value = null
    clearAvatarCropState()
    avatarCropFile.value = file
    avatarCropOpen.value = true
  }

  function onBannerInputChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null
    if (file) handleBannerSelectedFile(file)
  }

  function onAvatarInputChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0] ?? null
    if (file) handleAvatarSelectedFile(file)
  }

  function onAvatarCropCancelled() {
    clearAvatarCropState()
    clearPendingAvatar()
  }

  function onAvatarCropped(file: File) {
    stageAvatarFile(file)
    clearAvatarCropState()
    if (avatarInputEl.value) avatarInputEl.value.value = ''
  }

  function onBannerCropCancelled() {
    clearBannerCropState()
    clearPendingBanner()
  }

  function onBannerCropped(file: File) {
    stageBannerFile(file)
    clearBannerCropState()
    if (bannerInputEl.value) bannerInputEl.value.value = ''
  }

  watch(
    () => [toValue(opts.open), toValue(opts.allowVideo), authUser.value?.id, toValue(opts.videoTargetUserId)] as const,
    async ([open, allowVideo]) => {
      canSetVideoAvatar.value = false
      if (!open || !allowVideo) return
      const identity = authUser.value?.id
      const targetId = toValue(opts.videoTargetUserId)
      try {
        const capability = await apiFetchData<{ canSet: boolean }>(`${avatarVideoBasePath(targetId)}/capabilities`)
        if (authUser.value?.id === identity && toValue(opts.videoTargetUserId) === targetId && toValue(opts.open)) {
          canSetVideoAvatar.value = capability.canSet
        }
      } catch { /* Image upload stays available. */ }
    },
    { immediate: true },
  )

  function setBannerInputEl(el: Element | ComponentPublicInstance | null) {
    const node = el && '$el' in el ? el.$el : el
    bannerInputEl.value = node instanceof HTMLInputElement ? node : null
  }
  function setAvatarInputEl(el: Element | ComponentPublicInstance | null) {
    const node = el && '$el' in el ? el.$el : el
    avatarInputEl.value = node instanceof HTMLInputElement ? node : null
  }
  function clearVideoEditor() {
    videoEditorFile.value = null
  }

  onBeforeUnmount(() => {
    clearAvatarCropState()
    clearBannerCropState()
    if (pendingAvatarPreviewUrl.value) URL.revokeObjectURL(pendingAvatarPreviewUrl.value)
    if (pendingBannerPreviewUrl.value) URL.revokeObjectURL(pendingBannerPreviewUrl.value)
  })

  return reactive({
    avatarInputEl,
    bannerInputEl,
    pendingAvatarFile,
    pendingAvatarPreviewUrl,
    pendingAvatarRemoval,
    pendingBannerFile,
    pendingBannerPreviewUrl,
    pendingBannerRemoval,
    avatarCropOpen,
    avatarCropFile,
    bannerCropOpen,
    bannerCropFile,
    canSetVideoAvatar,
    videoEditorFile,
    pendingVideoEdit,
    editAvatarPreviewUrl,
    editBannerPreviewUrl,
    showAvatarTrash,
    showBannerTrash,
    clearPendingAvatar,
    clearPendingBanner,
    clearAvatarCropState,
    clearBannerCropState,
    reset,
    stageAvatarFile,
    stageBannerFile,
    stageVideo,
    requestAvatarRemoval,
    undoPendingAvatarRemoval,
    requestBannerRemoval,
    undoPendingBannerRemoval,
    openBannerPicker,
    openAvatarPicker,
    onBannerInputChange,
    onAvatarInputChange,
    onAvatarCropCancelled,
    onAvatarCropped,
    onBannerCropCancelled,
    onBannerCropped,
    setBannerInputEl,
    setAvatarInputEl,
    clearVideoEditor,
  })
}

export type StagedBannerAvatarEdit = ReturnType<typeof useStagedBannerAvatarEdit>
export const bannerAvatarEditorKey: InjectionKey<StagedBannerAvatarEdit> = Symbol('bannerAvatarEditor')

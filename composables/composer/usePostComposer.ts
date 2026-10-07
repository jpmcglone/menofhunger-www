import { nextTick, toRaw } from 'vue'
import { siteConfig } from '~/config/site'
import { VOICE } from '~/config/voice'
import { destinationDraftKey } from '~/utils/channels/drafts'
import { pollIsIncomplete } from '~/utils/composer-poll'
import { makeLocalId, type ComposerPollPayload, type PostComposerEmit, type PostComposerProps } from './types'
import type { CrosspostPayload } from '~/utils/crosspost'
import { useComposerDestination } from './useComposerDestination'
import { useComposerSchedule } from './useComposerSchedule'
import { useComposerStatus } from './useComposerStatus'
import { useComposerSubmit } from './useComposerSubmit'
import { useComposerTint } from './useComposerTint'
import { useDestinationComposerDraft } from './useDestinationComposerDraft'

export type { PostComposerEmit, PostComposerProps }

export function usePostComposer(props: PostComposerProps, emit: PostComposerEmit) {
  const route = useRoute()
  const { user, me, isAuthed, isPremium, isVerified: viewerIsVerified, isVerifiedMember } = useAuth()
  const { apiFetchData } = useApiClient()
  const toast = useAppToast()
  const { count: scheduledCount, increment: incScheduledCount, refresh: refreshScheduledCount } = useScheduledPostsCount()

  const mode = computed(() => props.mode ?? 'create')
  const editPostId = computed(() => (props.editPostId ?? '').trim() || null)
  const editPostIsDraft = computed(() => Boolean(props.editPostIsDraft))
  const disableMedia = computed(() =>
    Boolean(props.disableMedia) ||
    (mode.value === 'edit' && !editPostIsDraft.value && !((props.editScheduledId ?? '').trim())),
  )
  const disablePoll = computed(() => Boolean(props.disablePoll))
  const showDivider = computed(() => props.showDivider !== false)
  const enableAvatarStatusEditor = computed(() => Boolean(props.enableAvatarStatusEditor) && isVerifiedMember.value)
  const quotedPost = computed(() => props.quotedPost ?? null)
  const quotedPostUrl = computed(() => {
    const pid = quotedPost.value?.id
    if (!pid) return null
    return `${siteConfig.url}/p/${encodeURIComponent(pid)}`
  })
  const myProfilePath = computed(() => {
    const username = (user.value?.username ?? '').trim()
    return username ? `/u/${encodeURIComponent(username)}` : null
  })

  const draft = ref('')
  const composerEditorEl = ref<{ focus: () => void; insertAtCursor: (text: string) => void; clear: () => void } | null>(null)
  const emojiPickerEl = ref<{ close: () => void } | null>(null)
  const poll = ref<ComposerPollPayload | null>(null)
  const hasPoll = computed(() => poll.value != null)
  const pollIncomplete = computed(() => pollIsIncomplete(poll.value))
  const pollUploading = ref(false)
  const pollHasFailed = ref(false)
  function onPollStatus(v: { uploading: boolean; hasFailed: boolean }) {
    pollUploading.value = Boolean(v?.uploading)
    pollHasFailed.value = Boolean(v?.hasFailed)
  }

  let submittingRef: { value: boolean } | null = null
  let uploadingRef: { value: boolean } | null = null

  const dest = useComposerDestination({
    mode,
    replyTo: computed(() => props.replyTo),
    quotedPost,
    communityGroupId: computed(() => props.communityGroupId),
    lockedVisibility: computed(() => props.lockedVisibility ?? null),
    checkinPrompt: computed(() => props.checkinPrompt),
    groupComposer: computed(() => props.groupComposer),
    groupName: computed(() => props.groupName),
    hideVisibilityPicker: computed(() => props.hideVisibilityPicker),
    showChatDestinationProp: computed(() => props.showChatDestination),
    allowedVisibilities: computed(() => props.allowedVisibilities),
    viewerIsVerified,
    isAuthed,
    isPremium,
    isBusy: () => Boolean(submittingRef?.value || uploadingRef?.value),
  })

  const crosspostChoice = ref<CrosspostPayload>(props.initialCrosspost ?? {})
  const schedule = useComposerSchedule({
    isPremium,
    mode,
    editScheduledId: () => props.editScheduledId,
    refreshScheduledCount,
    apiFetchData,
    effectiveGroupId: dest.effectiveGroupId,
    crosspostChoice,
  })

  const status = useComposerStatus({
    enableAvatarStatusEditor,
    userId: computed(() => user.value?.id),
  })

  const tint = useComposerTint({
    useGroupScopeChrome: dest.useGroupScopeChrome,
    effectiveVisibility: dest.effectiveVisibility,
    scheduledAt: schedule.scheduledAt,
    checkinPrompt: computed(() => props.checkinPrompt),
    replyShowsGroupScope: dest.replyShowsGroupScope,
  })

  const media = useComposerMedia({
    maxSlots: 4,
    canAcceptImages: computed(() => Boolean(viewerIsVerified.value && !disableMedia.value && !hasPoll.value)),
    canAcceptVideo: computed(() => Boolean(isPremium.value && !disableMedia.value && !hasPoll.value)),
    onMediaRejectedNeedPremium: () => {
      if (disableMedia.value) return
      usePremiumMediaModal().show()
    },
  })
  uploadingRef = media.composerUploading

  const persistKey = computed(() => {
    if (!import.meta.client || !user.value?.id || mode.value !== 'create' || props.checkinPrompt || props.quotedPost) return null
    return destinationDraftKey({ identity: user.value.id, surface: 'post', destination: dest.effectiveGroupId.value ? `group:${dest.effectiveGroupId.value}` : `feed:${dest.effectiveVisibility.value}`, root: props.replyTo?.parentId })
  })

  function clearPoll() {
    poll.value = null
    pollUploading.value = false
    pollHasFailed.value = false
  }

  function clearComposer() {
    composerEditorEl.value?.clear()
    draft.value = ''
    media.clearAll()
    clearPoll()
  }

  const hasEditChanges = computed(() => draft.value.trim() !== (props.initialText ?? '').trim())
  const hasUnsavedContent = computed(
    () => (draft.value?.trim() ?? '') !== '' || (media.composerMedia.value?.length ?? 0) > 0 || hasPoll.value,
  )

  const destinationDrafts = useDestinationComposerDraft({
    key: persistKey,
    hasContent: () => hasUnsavedContent.value,
    preserveInitial: () => Boolean(props.initialText || props.initialMedia?.length || props.initialFiles?.length),
    snapshot: () => ({
      body: draft.value,
      media: media.composerMedia.value.map(item => {
        const { abortController: _abort, ...rest } = toRaw(item)
        return { ...rest, previewUrl: rest.previewUrl?.startsWith('blob:') ? '' : rest.previewUrl }
      }),
      poll: poll.value ? JSON.parse(JSON.stringify(poll.value)) as ComposerPollPayload : null,
      scheduledAt: schedule.scheduledAt.value?.toISOString() ?? null,
      crosspost: { ...crosspostChoice.value },
    }),
    restore: value => {
      media.clearAll()
      draft.value = value?.body ?? ''
      media.restoreDraftMedia(value?.media ?? [])
      poll.value = value?.poll ?? null
      schedule.scheduledAt.value = value?.scheduledAt ? new Date(value.scheduledAt) : null
      crosspostChoice.value = value?.crosspost ?? {}
    },
  })

  const canPost = computed(() => Boolean(!destinationDrafts.loading.value && isAuthed.value && (viewerIsVerified.value || dest.effectiveVisibility.value === 'onlyMe')))
  const composerHasFailedMedia = computed(
    () => media.composerMedia.value?.some((m) => m.source === 'upload' && m.uploadStatus === 'error') ?? false,
  )
  const postMaxLen = computed(() => (isPremium.value ? 1000 : 500))
  const postCharCount = computed(() => draft.value.length)
  const composerPlaceholder = computed(
    () =>
      (props.checkinPrompt ? 'Write your answer…' : props.placeholder) ??
      (props.replyTo ? 'Post your reply…' : (hasPoll.value ? 'Ask a question' : VOICE.feed.postHeading)),
  )
  const composerAcceptTypes = computed(
    () => 'image/*,video/mp4,video/quicktime,video/webm,video/x-m4v',
  )

  const submitApi = useComposerSubmit({
    mode,
    editPostId,
    editPostIsDraft,
    disableMedia,
    replyTo: computed(() => props.replyTo),
    quotedPost,
    checkinPrompt: computed(() => props.checkinPrompt),
    createPost: props.createPost,
    syncSubmit: computed(() => props.syncSubmit),
    groupComposer: computed(() => props.groupComposer),
    draft,
    poll,
    hasPoll,
    composerMedia: media.composerMedia,
    toCreatePayload: media.toCreatePayload,
    effectiveGroupId: dest.effectiveGroupId,
    effectiveVisibility: dest.effectiveVisibility,
    scheduledAt: schedule.scheduledAt,
    scheduledAtDisplay: schedule.scheduledAtDisplay,
    scheduledEditId: schedule.scheduledEditId,
    scheduleMore: schedule.scheduleMore,
    clearSchedule: schedule.clearSchedule,
    performSchedule: schedule.performSchedule,
    toScheduledPollBody: schedule.toScheduledPollBody,
    incScheduledCount,
    quotedPostUrl,
    hasEditChanges,
    destinationDrafts,
    clearComposer,
    user,
    isAuthed,
    viewerIsVerified,
    emit,
    apiFetchData,
    me,
    canPost,
    postCharCount,
    postMaxLen,
    composerUploading: media.composerUploading,
    composerHasFailedMedia,
    pollUploading,
    pollHasFailed,
    emojiPickerEl,
    crosspostChoice,
  })
  submittingRef = submitApi.submitting

  useJourneyReady('composer_ready', () => Boolean(composerEditorEl.value) && !submitApi.submitting.value, {
    source: () => 'local',
  })

  const initialTextApplied = ref(false)
  const initialFilesApplied = ref(false)
  const initialGroupApplied = ref(false)
  const initialPollApplied = ref(false)
  const initialVisibilityApplied = ref(false)
  const initialScheduledAtApplied = ref(false)

  function seedInitialFilesIfNeeded() {
    if (initialFilesApplied.value || disableMedia.value) return
    const files = Array.isArray(props.initialFiles) ? props.initialFiles.filter(Boolean) : []
    initialFilesApplied.value = true
    if (!files.length) return
    media.ingestMediaFiles(files, 'picker')
  }

  function seedInitialGroupIfNeeded() {
    if (initialGroupApplied.value) return
    initialGroupApplied.value = true
    const id = (props.initialGroupId ?? '').trim()
    if (!id || props.communityGroupId) return
    dest.selectedGroupId.value = id
    dest.rememberGroup(id)
  }

  function seedInitialMediaIfNeeded() {
    if (disableMedia.value) return
    const items = Array.isArray(props.initialMedia) ? props.initialMedia : null
    if (!items || items.length === 0) return
    if ((media.composerMedia.value?.length ?? 0) > 0) return
    const seeded = items
      .filter((m) => m && !m.deletedAt)
      .slice(0, 4)
      .map((m) => {
        const isVideo = m.kind === 'video'
        const previewUrl = isVideo ? (m.thumbnailUrl || m.url) : m.url
        return {
          localId: makeLocalId(),
          source: m.source,
          kind: m.kind,
          previewUrl,
          url: m.source === 'giphy' ? m.url : undefined,
          mp4Url: m.mp4Url ?? undefined,
          width: m.width ?? null,
          height: m.height ?? null,
          durationSeconds: (m as { durationSeconds?: number | null }).durationSeconds ?? null,
          altText: m.alt ?? null,
          existingId: m.id,
          uploadStatus: 'done' as const,
        }
      })
    media.composerMedia.value = seeded as typeof media.composerMedia.value
  }

  function applyInitialTextIfNeeded() {
    if (initialTextApplied.value) return
    const t = (props.initialText ?? '').toString()
    if (!t.trim()) {
      initialTextApplied.value = true
      return
    }
    if (!draft.value) draft.value = t
    initialTextApplied.value = true
  }

  function seedInitialPollIfNeeded() {
    if (initialPollApplied.value) return
    const src = props.initialPoll
    if (!src || !src.options?.length) {
      initialPollApplied.value = true
      return
    }
    if (poll.value) {
      initialPollApplied.value = true
      return
    }
    const h = src.durationHours ?? 24
    poll.value = {
      options: src.options.map((o) => ({ text: o.text, image: null })),
      duration: { days: Math.floor(h / 24), hours: h % 24, minutes: 0 },
    }
    initialPollApplied.value = true
  }

  function seedInitialVisibilityIfNeeded() {
    if (initialVisibilityApplied.value) return
    const v = props.initialVisibility
    if (!v) {
      initialVisibilityApplied.value = true
      return
    }
    if (!props.lockedVisibility) dest.visibility.value = v
    initialVisibilityApplied.value = true
  }

  function seedInitialScheduledAtIfNeeded() {
    if (initialScheduledAtApplied.value) return
    const s = props.initialScheduledAt
    if (!s) {
      initialScheduledAtApplied.value = true
      return
    }
    const d = new Date(s)
    if (isNaN(d.getTime())) {
      initialScheduledAtApplied.value = true
      return
    }
    schedule.scheduledAt.value = d
    schedule.rememberPickedSchedule(d)
    initialScheduledAtApplied.value = true
  }

  function handoffToChat() {
    const files = media.composerMedia.value
      .map((item) => item.file)
      .filter((file): file is File => file instanceof File)
    emit('handoff-chat', { body: draft.value, files })
  }

  function onClickAddMedia() {
    if (disableMedia.value) return
    if (hasPoll.value) return
    if (!viewerIsVerified.value) {
      toast.push({ title: 'Verify your account to post images and GIFs', to: '/tiers', durationMs: 3000 })
      return
    }
    media.openMediaPicker()
  }

  function onClickAddGiphy() {
    if (disableMedia.value) return
    if (hasPoll.value) return
    if (!viewerIsVerified.value) {
      toast.push({ title: 'Verify your account to use GIF search', to: '/tiers', durationMs: 3000 })
      return
    }
    media.openGiphyPicker()
  }

  function onUpdatePoll(v: ComposerPollPayload) {
    poll.value = v
  }

  function onClickAddPoll() {
    if (disableMedia.value) return
    if (props.replyTo) return
    if (hasPoll.value) return
    if (!viewerIsVerified.value) {
      toast.push({ title: 'Verify your account to create polls', to: '/tiers', durationMs: 3000 })
      return
    }
    if (media.composerMedia.value.length > 0) return
    poll.value = {
      options: [
        { text: '', image: null },
        { text: '', image: null },
      ],
      duration: { days: 1, hours: 0, minutes: 0 },
    }
  }

  function onDraftChange(value: string) {
    draft.value = value
  }

  function insertEmoji(emoji: string) {
    const e = (emoji ?? '').trim()
    if (!e) return
    composerEditorEl.value?.insertAtCursor(e)
  }

  function setEmojiPickerEl(el: unknown) {
    emojiPickerEl.value = el && typeof el === 'object' && 'close' in el && typeof (el as { close?: unknown }).close === 'function'
      ? el as { close: () => void }
      : null
  }

  function onUpdateAltText(localId: string, value: string) {
    media.patchComposerMedia(localId, { altText: value })
  }

  function draftSnapshot(): import('~/composables/useUnsavedDraftGuard').UnsavedDraftSnapshot {
    return {
      body: String(draft.value ?? ''),
      media: media.toCreatePayload(media.composerMedia.value ?? []),
    }
  }

  function focus() {
    nextTick(() => {
      composerEditorEl.value?.focus()
    })
  }

  const draftText = computed(() => draft.value)
  const shouldRegisterUnsavedGuard = computed(() =>
    props.registerUnsavedGuard !== false && mode.value === 'create',
  )
  let unregisterUnsavedGuard: (() => void) | null = null
  const unsavedGuardId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `composer:${crypto.randomUUID()}`
      : `composer:${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  function registerUnsavedGuardIfNeeded() {
    if (!import.meta.client) return
    if (!shouldRegisterUnsavedGuard.value) return
    if (unregisterUnsavedGuard) return
    const { register } = useUnsavedDraftGuard()
    unregisterUnsavedGuard = register({
      id: unsavedGuardId,
      hasUnsaved: () => Boolean(hasUnsavedContent.value) && (!persistKey.value || !destinationDrafts.saved.value),
      snapshot: () => draftSnapshot(),
      clear: () => clearComposer(),
    })
  }

  onMounted(() => {
    registerUnsavedGuardIfNeeded()
    if (isAuthed.value && mode.value === 'create' && !props.replyTo) {
      if (!submitApi.pickaxIntegration.status.value) void submitApi.pickaxIntegration.refresh()
      if (!submitApi.xIntegration.status.value) void submitApi.xIntegration.refresh()
    }
    if (isAuthed.value && !props.communityGroupId) dest.loadMyGroups()
    applyInitialTextIfNeeded()
    seedInitialMediaIfNeeded()
    seedInitialFilesIfNeeded()
    seedInitialGroupIfNeeded()
    seedInitialPollIfNeeded()
    seedInitialVisibilityIfNeeded()
    seedInitialScheduledAtIfNeeded()
  })

  onActivated(() => {
    registerUnsavedGuardIfNeeded()
    void destinationDrafts.persist()
    if (isAuthed.value && !props.communityGroupId) void dest.loadMyGroups()
  })

  onBeforeUnmount(() => {
    unregisterUnsavedGuard?.()
    unregisterUnsavedGuard = null
  })

  watch(() => props.initialText, () => { applyInitialTextIfNeeded() })
  watch(() => props.initialMedia, () => { seedInitialMediaIfNeeded() })

  const loginTo = computed(() => {
    const redirect = encodeURIComponent(route.fullPath || '/home')
    return `/login?redirect=${redirect}`
  })
  const { show: showAuthActionModal } = useAuthActionModal()
  function showLoginPrompt() {
    showAuthActionModal({ kind: 'login', action: 'post' })
  }

  return {
    user,
    isAuthed,
    isPremium,
    viewerIsVerified,
    mode,
    disableMedia,
    disablePoll,
    showDivider,
    enableAvatarStatusEditor,
    quotedPost,
    myProfilePath,
    draft,
    composerEditorEl,
    emojiPickerEl,
    poll,
    hasPoll,
    pollIncomplete,
    pollUploading,
    pollHasFailed,
    onPollStatus,
    onUpdatePoll,
    clearPoll,
    onClickAddPoll,
    ...dest,
    ...schedule,
    ...status,
    ...tint,
    ...media,
    scheduledCount,
    persistKey,
    destinationDrafts,
    hasEditChanges,
    hasUnsavedContent,
    canPost,
    composerHasFailedMedia,
    postMaxLen,
    postCharCount,
    composerPlaceholder,
    composerAcceptTypes,
    ...submitApi,
    crosspostChoice,
    onDraftChange,
    insertEmoji,
    setEmojiPickerEl,
    onUpdateAltText,
    onClickAddMedia,
    onClickAddGiphy,
    handoffToChat,
    loginTo,
    showLoginPrompt,
    clearComposer,
    focus,
    draftText,
    draftSnapshot,
  }
}

import { nextTick, toRaw } from 'vue'
import { siteConfig } from '~/config/site'
import { VOICE } from '~/config/voice'
import { destinationDraftKey } from '~/utils/channels/drafts'
import { pollIsIncomplete } from '~/utils/composer-poll'
import type { ComposerPollPayload, PostComposerEmit, PostComposerProps } from './types'
import type { CrosspostPayload } from '~/utils/crosspost'
import { useComposerDestination } from './useComposerDestination'
import { useComposerInitialSeed } from './useComposerInitialSeed'
import { useComposerUnsavedGuard } from './useComposerUnsavedGuard'
import { useComposerAttachmentActions } from './useComposerAttachmentActions'
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
      usePremiumUpsell().show('media')
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

  const { applyInitialTextIfNeeded, seedInitialMediaIfNeeded, seedAll: seedInitialState } = useComposerInitialSeed(props, { draft, poll, disableMedia, media, dest, schedule })
  function handoffToChat() {
    const files = media.composerMedia.value
      .map((item) => item.file)
      .filter((file): file is File => file instanceof File)
    emit('handoff-chat', { body: draft.value, files })
  }

  const { onClickAddMedia, onClickAddGiphy, onUpdatePoll, onClickAddPoll } = useComposerAttachmentActions(props, { poll, hasPoll, disableMedia, viewerIsVerified, media })
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
  const { registerUnsavedGuardIfNeeded } = useComposerUnsavedGuard({
    enabled: computed(() => props.registerUnsavedGuard !== false && mode.value === 'create'),
    hasUnsaved: () => Boolean(hasUnsavedContent.value) && (!persistKey.value || !destinationDrafts.saved.value),
    snapshot: () => draftSnapshot(),
    clear: () => clearComposer(),
  })

  onMounted(() => {
    registerUnsavedGuardIfNeeded()
    if (isAuthed.value && mode.value === 'create' && !props.replyTo) {
      if (!submitApi.pickaxIntegration.status.value) void submitApi.pickaxIntegration.refresh()
      if (!submitApi.xIntegration.status.value) void submitApi.xIntegration.refresh()
    }
    if (isAuthed.value && !props.communityGroupId) dest.loadMyGroups()
    seedInitialState()
  })

  onActivated(() => {
    registerUnsavedGuardIfNeeded()
    void destinationDrafts.persist()
    if (isAuthed.value && !props.communityGroupId) void dest.loadMyGroups()
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
    selectDestinationVisibility: (value: Parameters<typeof dest.selectDestinationVisibility>[0]) => destinationDrafts.changeDestination(() => dest.selectDestinationVisibility(value)),
    selectGroup: (id: string | null) => destinationDrafts.changeDestination(() => dest.selectGroup(id)),
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

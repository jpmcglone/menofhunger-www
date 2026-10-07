import type { ComputedRef, Ref } from 'vue'
import type { CreatePostData, FeedPost, PostAuthor, PostStreakReward, PostVisibility, ScheduledPost } from '~/types/api'
import { seedPermalinkPost } from '~/utils/permalink-seed'
import { buildPostedToastParams } from '~/utils/posted-toast'
import { buildOptimisticPost } from '~/utils/optimistic-post'
import { buildPostPreview } from '~/utils/post-preview'
import { crosspostOptions, crosspostSkipMessage, xContainsLink, type CrosspostDraft, type CrosspostPayload } from '~/utils/crosspost'
import type { CrosspostDestinationView } from '~/components/app/post/CrosspostDestinations.vue'
import { makePendingLocalId } from '~/composables/usePendingPostsManager'
import { recordWelcomeProgress } from '~/utils/welcome-progress'
import { useFormSubmit } from '~/composables/useFormSubmit'
import type { ComposerMediaItem, ComposerPollPayload, CreateMediaPayload } from './types'

export function useComposerSubmit(opts: {
  mode: ComputedRef<'create' | 'edit'>
  editPostId: ComputedRef<string | null>
  editPostIsDraft: ComputedRef<boolean>
  disableMedia: ComputedRef<boolean>
  replyTo: ComputedRef<{ parentId: string; mentionUsernames: string[] } | null | undefined>
  quotedPost: ComputedRef<unknown>
  checkinPrompt: ComputedRef<string | undefined>
  createPost?: (
    body: string,
    visibility: PostVisibility,
    media: CreateMediaPayload[],
    poll?: ComposerPollPayload | null,
  ) => Promise<{ id: string } | FeedPost | null>
  syncSubmit: ComputedRef<boolean | undefined>
  groupComposer: ComputedRef<boolean | undefined>
  draft: Ref<string>
  poll: Ref<ComposerPollPayload | null>
  hasPoll: ComputedRef<boolean>
  composerMedia: Ref<ComposerMediaItem[]>
  toCreatePayload: (media: ComposerMediaItem[]) => CreateMediaPayload[]
  effectiveGroupId: ComputedRef<string | null>
  effectiveVisibility: ComputedRef<PostVisibility>
  scheduledAt: Ref<Date | null>
  scheduledAtDisplay: ComputedRef<string>
  scheduledEditId: ComputedRef<string | null>
  scheduleMore: { value: boolean }
  clearSchedule: () => void
  performSchedule: (
    submitBody: string,
    vis: PostVisibility,
    mediaPayload: CreateMediaPayload[],
    pollPayload: ComposerPollPayload | null,
  ) => Promise<ScheduledPost>
  toScheduledPollBody: (payload: ComposerPollPayload) => { options: Array<{ text: string }>; durationHours: number }
  incScheduledCount: () => void
  quotedPostUrl: ComputedRef<string | null>
  hasEditChanges: ComputedRef<boolean>
  destinationDrafts: {
    persist: () => Promise<unknown> | unknown
    capture: () => { key: string | null; revision: string; saving: Promise<void> }
    unchanged: (draft: { key: string | null; revision: string; saving: Promise<void> }) => boolean
    submitted: (draft: { key: string | null; revision: string; saving: Promise<void> }) => Promise<unknown> | unknown
    loading: Ref<boolean>
  }
  clearComposer: () => void
  user: Ref<{ id: string; username?: string | null; name?: string | null; premium?: boolean; premiumPlus?: boolean; isOrganization?: boolean; verifiedStatus?: PostAuthor['verifiedStatus']; avatarUrl?: string | null; avatarVideo?: PostAuthor['avatarVideo'] } | null>
  isAuthed: ComputedRef<boolean>
  viewerIsVerified: ComputedRef<boolean>
  emit: {
    (e: 'posted', payload: { id: string; visibility: PostVisibility; post?: FeedPost }): void
    (e: 'edited', payload: { id: string; post: FeedPost }): void
    (e: 'scheduled', payload: { scheduledPost: ScheduledPost }): void
    (e: 'scheduled-updated', updated: ScheduledPost): void
    (e: 'pending', payload: { localId: string; optimisticPost: FeedPost; perform: () => Promise<FeedPost | { id: string } | null | undefined> }): void
  }
  apiFetchData: <T>(url: string, init: Record<string, unknown>) => Promise<T>
  me: () => Promise<unknown>
  canPost: ComputedRef<boolean>
  postCharCount: ComputedRef<number>
  postMaxLen: ComputedRef<number>
  composerUploading: Ref<boolean>
  composerHasFailedMedia: ComputedRef<boolean>
  pollUploading: Ref<boolean>
  pollHasFailed: Ref<boolean>
  emojiPickerEl: Ref<{ close: () => void } | null>
  crosspostChoice: Ref<CrosspostPayload>
}) {
  const toast = useAppToast()
  const { apiFetchData } = { apiFetchData: opts.apiFetchData }
  const pickaxIntegration = usePickaxIntegration()
  const xIntegration = useXIntegration()
  const actionSounds = useActionSounds()
  const { crosspostChoice } = opts

  const STREAK_MULTIPLIER_MILESTONES = new Set([8, 15, 22])
  function pushStreakToast(reward: PostStreakReward) {
    const isMilestone = STREAK_MULTIPLIER_MILESTONES.has(reward.streakDays)
    const coinWord = reward.coinsEarned === 1 ? 'coin' : 'coins'
    if (isMilestone) {
      toast.push({
        title: `Streak milestone! Day ${reward.streakDays}`,
        message: `Your multiplier is now ${reward.multiplier}x — you earned ${reward.coinsEarned} ${coinWord} today!`,
        tone: 'success',
        to: '/coins',
        durationMs: 4000,
      })
    } else {
      toast.push({
        title: `+${reward.coinsEarned} ${coinWord} from your streak`,
        message: `Day ${reward.streakDays} · ${reward.multiplier}x multiplier`,
        tone: 'success',
        to: '/coins',
        durationMs: 3000,
      })
    }
  }

  function buildSubmitBody(): string {
    const quotedUrl = opts.quotedPostUrl.value
    if (!quotedUrl) return opts.draft.value
    return [opts.draft.value.trim(), quotedUrl].filter(Boolean).join('\n\n')
  }

  function performCreate(
    submitBody: string,
    vis: PostVisibility,
    mediaPayload: CreateMediaPayload[],
    pollPayload: ComposerPollPayload | null,
    crosspost: CrosspostPayload = {},
    groupId: string | null = opts.effectiveGroupId.value,
  ) {
    if (opts.createPost) {
      return opts.createPost(submitBody, vis, mediaPayload, pollPayload)
    }
    // No x-marv-mode header — Marv always uses auto routing in post threads.
    return apiFetchData<CreatePostData>('/posts', {
      method: 'POST',
      body: opts.replyTo.value
        ? {
            body: submitBody,
            visibility: vis,
            parent_id: opts.replyTo.value.parentId,
            mentions: opts.replyTo.value.mentionUsernames,
            media: mediaPayload,
          }
        : {
            body: submitBody,
            visibility: vis,
            media: mediaPayload,
            ...(pollPayload ? { poll: pollPayload } : {}),
            ...(groupId ? { community_group_id: groupId } : {}),
            ...(Object.keys(crosspost).length ? { crosspost } : {}),
          },
    })
  }

  function mediaAllImages(media: CreateMediaPayload[]): boolean {
    return media.every((m) => {
      if (m.source !== 'existing') return m.source === 'upload' && m.kind === 'image'
      const existing = opts.composerMedia.value.find((item) => item.existingId === m.id)
      return existing?.source === 'upload' && existing.kind === 'image'
    })
  }

  function crosspostDraft(media: CreateMediaPayload[]): CrosspostDraft {
    return {
      visibility: opts.effectiveVisibility.value,
      body: opts.draft.value,
      mediaCount: media.length,
      mediaAllUploadedImages: mediaAllImages(media),
      hasPoll: opts.hasPoll.value,
      isReply: Boolean(opts.replyTo.value),
      isQuote: Boolean(opts.quotedPost.value),
      isCheckin: Boolean(opts.checkinPrompt.value),
      groupId: opts.effectiveGroupId.value,
      scheduled: Boolean(opts.scheduledAt.value),
    }
  }

  const useOptimisticCreate = computed(
    () => opts.mode.value !== 'edit' && !opts.syncSubmit.value && !opts.createPost,
  )

  const previewOpen = ref(false)
  const previewApproved = ref(false)
  const previewSupported = computed(
    () => (opts.mode.value === 'create' || Boolean(opts.scheduledEditId.value)) && !opts.replyTo.value && !opts.quotedPost.value,
  )

  function makeOptimisticAuthor(): PostAuthor | null {
    const u = opts.user.value
    if (!u?.id) return null
    return {
      id: u.id,
      username: (u.username ?? '') || null,
      name: (u as { name?: string | null }).name ?? null,
      premium: Boolean(u.premium),
      premiumPlus: Boolean((u as { premiumPlus?: boolean }).premiumPlus),
      isOrganization: Boolean((u as { isOrganization?: boolean }).isOrganization),
      verifiedStatus: ((u as { verifiedStatus?: PostAuthor['verifiedStatus'] }).verifiedStatus ?? 'none') as PostAuthor['verifiedStatus'],
      avatarUrl: (u as { avatarUrl?: string | null }).avatarUrl ?? null, avatarVideo: u.avatarVideo ?? null,
    }
  }

  const previewPost = computed<FeedPost | null>(() => {
    const author = makeOptimisticAuthor()
    if (!author) return null
    return buildPostPreview({
      localId: 'preview',
      body: buildSubmitBody(),
      visibility: opts.effectiveVisibility.value,
      media: opts.composerMedia.value as never,
      poll: opts.poll.value ? opts.poll.value : null,
      communityGroupId: opts.effectiveGroupId.value,
      checkinPrompt: opts.checkinPrompt.value,
      author,
    })
  })

  function destinationRow(
    id: 'pickax' | 'x',
    media: CreateMediaPayload[],
  ): CrosspostDestinationView | null {
    const connected = id === 'pickax' ? pickaxIntegration.connected.value : xIntegration.connected.value
    if (!connected) return null
    if (!opts.viewerIsVerified.value) return { id, modes: [], disabled: true, disabledNote: 'Verify your MOH account to share outward', premiumHref: '/settings/verification' }
    if (id === 'x' && xIntegration.status.value?.connected && !xIntegration.status.value.canPost) {
      return { id, modes: [], disabled: true, disabledNote: 'Verify your MOH account to post to X', premiumHref: '/settings/verification' }
    }
    const options = crosspostOptions(crosspostDraft(media), id, xIntegration.status.value?.linksEnabled === true, xIntegration.status.value?.capabilities)
    const modes = options.modes
    let allowanceNote: string | undefined
    if (id === 'x' && xIntegration.status.value?.allowance) {
      const allowance = xIntegration.status.value.allowance
      const hasLink = xContainsLink(crosspostDraft(media).body)
      const remaining = hasLink ? allowance.linkPostsLeft : allowance.nativePostsLeft
      allowanceNote = hasLink ? 'Estimated $0.20 · Uses your shared high-cost allowance' : `${remaining} posts left this month`
      if (opts.scheduledAt.value) allowanceNote += ' · Checked again at publishing'
      else if (remaining <= 0) return {
        id, modes: [], disabled: true, allowanceNote, disabledNote: "You've used this month's X posts.",
      }
    }
    if (!modes.length) return { id, modes, disabled: true, disabledNote: options.blockedReason, allowanceNote }
    return { id, modes, linkOnlyReason: options.linkOnlyReason, allowanceNote }
  }

  const previewDestinations = computed<CrosspostDestinationView[] | null>(() => {
    if ((opts.mode.value !== 'create' && !opts.scheduledEditId.value) || opts.createPost || opts.groupComposer.value) return null
    const media = opts.toCreatePayload(opts.composerMedia.value)
    const rows = [destinationRow('pickax', media), destinationRow('x', media)].filter((row): row is CrosspostDestinationView => Boolean(row))
    return rows.length ? rows : null
  })

  async function onPreviewConfirm(options: { crosspost: CrosspostPayload }) {
    crosspostChoice.value = options.crosspost
    previewApproved.value = true
    previewOpen.value = false
    await submit()
  }

  function notifyCrosspostSkipped(created: unknown) {
    const crossposts = (created as CreatePostData | null | undefined)?.crossposts
    const pickax = crossposts?.pickax ?? (created as CreatePostData | null | undefined)?.pickax
    if (pickax?.status === 'skipped') {
      toast.push({ title: crosspostSkipMessage('Pickax', pickax.reason), durationMs: 3500 })
    }
    if (crossposts?.x?.status === 'skipped') {
      toast.push({ title: crosspostSkipMessage('X', crossposts.x.reason), durationMs: 3500 })
    }
  }

  function unwrapCreated(created: unknown): { post: FeedPost | null; streakReward: PostStreakReward | null } {
    const wrapped = created as CreatePostData | null | undefined
    const post = (wrapped?.post ?? (created as FeedPost | null | undefined)) ?? null
    const streakReward = wrapped?.streakReward ?? null
    return { post: post && (post as FeedPost).id ? (post as FeedPost) : null, streakReward }
  }

  const { submit: submitPost, submitting, submitError } = useFormSubmit(
    async () => {
      await opts.destinationDrafts.persist()
      const submittedDraft = opts.destinationDrafts.capture()
      if (opts.scheduledEditId.value) {
        const id = opts.scheduledEditId.value
        const vis = opts.effectiveVisibility.value
        const mediaPayload: CreateMediaPayload[] = opts.hasPoll.value ? [] : opts.toCreatePayload(opts.composerMedia.value)
        const pollPayload = opts.poll.value ? opts.poll.value : null
        const groupId = opts.effectiveGroupId.value
        const patchBody: Record<string, unknown> = {
          body: buildSubmitBody(),
          crosspost: crosspostChoice.value,
          visibility: vis,
          ...(opts.scheduledAt.value ? { scheduled_at: opts.scheduledAt.value.toISOString() } : {}),
          media: mediaPayload,
          ...(pollPayload ? { poll: opts.toScheduledPollBody(pollPayload) } : { poll: null }),
          ...(groupId ? { community_group_id: groupId } : {}),
        }
        const updated = await apiFetchData<ScheduledPost>(
          `/posts/scheduled/${encodeURIComponent(id)}`,
          { method: 'PATCH', body: patchBody },
        )
        opts.emit('scheduled-updated', updated)
        toast.push({ title: 'Saved', tone: 'success', durationMs: 1600 })
        return
      }

      if (opts.mode.value === 'edit') {
        if (!opts.hasEditChanges.value) return
        const id = opts.editPostId.value
        if (!id) throw new Error('Missing editPostId.')
        const basePath = opts.editPostIsDraft.value ? '/drafts/' : '/posts/'
        const patchBody: Record<string, unknown> = { body: opts.draft.value }
        if (opts.editPostIsDraft.value && !opts.disableMedia.value) {
          const mediaPayload: CreateMediaPayload[] = opts.toCreatePayload(opts.composerMedia.value)
          patchBody.media = mediaPayload
        }
        const updatedPost = await apiFetchData<FeedPost>(`${basePath}${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: patchBody,
        })
        opts.emit('edited', { id, post: updatedPost })
        toast.push({ title: 'Saved', tone: 'success', durationMs: 1600 })
        return
      }

      const pollPayload = opts.poll.value ? opts.poll.value : null
      const mediaPayload: CreateMediaPayload[] = opts.hasPoll.value ? [] : opts.toCreatePayload(opts.composerMedia.value)
      const vis = opts.effectiveVisibility.value
      const submitBody = buildSubmitBody()

      if (opts.scheduledAt.value && !opts.replyTo.value && !opts.quotedPost.value) {
        const displayTime = opts.scheduledAtDisplay.value
        const wantsMore = opts.scheduleMore.value
        const scheduledPost = await opts.performSchedule(submitBody, vis, mediaPayload, pollPayload)
        opts.incScheduledCount()
        if (opts.destinationDrafts.unchanged(submittedDraft)) opts.clearComposer()
        await opts.destinationDrafts.submitted(submittedDraft)
        if (!wantsMore) {
          opts.clearSchedule()
        }
        opts.emit('scheduled', { scheduledPost })
        toast.push({
          title: 'Post scheduled',
          message: `Publishes ${displayTime}`,
          tone: 'success',
          to: '/scheduled',
          durationMs: 4000,
        })
        return
      }

      const created = await performCreate(submitBody, vis, mediaPayload, pollPayload, crosspostChoice.value)
      const { post, streakReward } = unwrapCreated(created)
      notifyCrosspostSkipped(created)

      if (opts.destinationDrafts.unchanged(submittedDraft)) opts.clearComposer()
      await opts.destinationDrafts.submitted(submittedDraft)

      if (post?.id) {
        recordWelcomeProgress(post.author.id, { posted: true })
        opts.emit('posted', { id: post.id, visibility: vis, post })
        pushPostedToast(post)
        if (streakReward) pushStreakToast(streakReward)
      }
    },
    {
      defaultError: opts.mode.value === 'edit' ? 'Failed to save.' : 'Failed to post.',
      onError: (message) => {
        toast.push({ title: message, tone: 'error', durationMs: 2500 })
      },
    },
  )

  function pushPostedToast(post: FeedPost) {
    void actionSounds.play(post.kind === 'checkin' ? 'checkin' : 'publish')
    seedPermalinkPost(post)
    toast.push(buildPostedToastParams(post, { isReply: Boolean(opts.replyTo.value) }))
  }

  function submitOptimistic(): boolean {
    void opts.destinationDrafts.persist()
    const author = makeOptimisticAuthor()
    if (!author) return false

    const vis = opts.effectiveVisibility.value
    const pollPayload = opts.poll.value ? opts.poll.value : null
    const mediaPayload: CreateMediaPayload[] = opts.hasPoll.value ? [] : opts.toCreatePayload(opts.composerMedia.value)
    const submitBody = buildSubmitBody()

    const localId = makePendingLocalId()
    const optimisticPost = buildOptimisticPost({
      localId,
      body: submitBody,
      visibility: vis,
      media: opts.composerMedia.value as never,
      poll: pollPayload,
      parentId: opts.replyTo.value?.parentId ?? null,
      communityGroupId: opts.effectiveGroupId.value,
      author,
    })
    optimisticPost._crosspostPending = {
      pickax: Boolean(crosspostChoice.value.pickax),
      x: Boolean(crosspostChoice.value.x),
    }

    const snapshot = {
      body: submitBody,
      vis,
      mediaPayload,
      pollPayload,
      crosspost: crosspostChoice.value,
      groupId: opts.effectiveGroupId.value,
      identity: opts.user.value?.id,
      draft: opts.destinationDrafts.capture(),
    }

    opts.emit('pending', {
      localId,
      optimisticPost,
      perform: async () => {
        if (opts.user.value?.id !== snapshot.identity) throw new Error('Your account changed. Reopen this draft to send it.')
        const created = await performCreate(snapshot.body, snapshot.vis, snapshot.mediaPayload, snapshot.pollPayload, snapshot.crosspost, snapshot.groupId)
        await opts.destinationDrafts.submitted(snapshot.draft)
        const { post } = unwrapCreated(created)
        notifyCrosspostSkipped(created)
        if (post) {
          const wrapped = created as CreatePostData | null | undefined
          const pickax = wrapped?.crossposts?.pickax ?? wrapped?.pickax
          post._crosspostPending = {
            pickax: pickax?.status === 'queued' && !post.pickaxUrl,
            x: wrapped?.crossposts?.x?.status === 'queued' && !post.xUrl,
          }
          seedPermalinkPost(post)
        }
        return post
      },
    })

    opts.clearComposer()
    submitError.value = null
    return true
  }

  watch(
    [opts.draft, opts.composerMedia, opts.poll],
    () => {
      if (submitError.value) submitError.value = null
    },
    { deep: true },
  )

  const submit = async () => {
    if (!opts.isAuthed.value) {
      try {
        await opts.me()
      } catch {
        // best-effort; normal canPost checks below handle final state
      }
    }
    if (!opts.canPost.value) {
      if (!opts.isAuthed.value) {
        toast.push({
          title: 'Session expired',
          message: 'Please log in again to post your draft.',
          tone: 'error',
          durationMs: 2600,
        })
      }
      return
    }
    if (opts.mode.value === 'edit' && !opts.scheduledEditId.value) {
      if (!opts.draft.value.trim()) return
    } else {
      if (!(opts.draft.value.trim() || opts.composerMedia.value.length || opts.hasPoll.value)) return
    }
    if (opts.postCharCount.value > opts.postMaxLen.value) return
    if (opts.composerUploading.value) return
    if (opts.composerHasFailedMedia.value) return
    if (opts.pollUploading.value) return
    if (opts.pollHasFailed.value) return
    if (opts.hasPoll.value && opts.poll.value) {
      const pollOpts = (opts.poll.value.options ?? []).filter(Boolean) as Array<{ image: { r2Key?: string } | null }>
      const anyHasImage = pollOpts.some((o) => Boolean(o?.image?.r2Key))
      const allHaveImages = pollOpts.every((o) => Boolean(o?.image?.r2Key))
      if (anyHasImage && !allHaveImages) {
        toast.push({
          title: 'Poll images must be all or none',
          message: 'If you add an image to any choice, every choice must have an image.',
          tone: 'error',
          durationMs: 2600,
        })
        return
      }
    }

    opts.emojiPickerEl.value?.close()

    if (previewSupported.value && !previewApproved.value) {
      previewOpen.value = true
      void pickaxIntegration.refresh()
      void xIntegration.refresh()
      return
    }
    previewApproved.value = false
    submitError.value = null

    const isScheduling = Boolean(
      (opts.scheduledAt.value || opts.scheduledEditId.value) && !opts.replyTo.value && !opts.quotedPost.value,
    )
    if (useOptimisticCreate.value && !isScheduling) {
      if (submitOptimistic()) return
    }
    await submitPost()
  }

  return {
    pickaxIntegration,
    xIntegration,
    previewOpen,
    previewApproved,
    previewSupported,
    previewPost,
    previewDestinations,
    onPreviewConfirm,
    submitting,
    submitError,
    submit,
    useOptimisticCreate,
  }
}

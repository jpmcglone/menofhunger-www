import type { CreatePostData, FeedPost, PostAuthor, PostStreakReward } from '~/types/api'
import { crosspostSkipMessage } from '~/utils/crosspost'
import type { ComposerPollPayload } from './types'

type Toast = ReturnType<typeof useAppToast>

const STREAK_MULTIPLIER_MILESTONES = new Set([8, 15, 22])
export function pushStreakToast(toast: Toast, reward: PostStreakReward) {
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

export type AuthorSource = {
  id: string
  username?: string | null
  name?: string | null
  premium?: boolean
  premiumPlus?: boolean
  isOrganization?: boolean
  verifiedStatus?: PostAuthor['verifiedStatus']
  avatarUrl?: string | null
  avatarVideo?: PostAuthor['avatarVideo']
}

export function makeOptimisticAuthor(u: AuthorSource | null | undefined): PostAuthor | null {
  if (!u?.id) return null
  return {
    id: u.id,
    username: (u.username ?? '') || null,
    name: u.name ?? null,
    premium: Boolean(u.premium),
    premiumPlus: Boolean(u.premiumPlus),
    isOrganization: Boolean(u.isOrganization),
    verifiedStatus: u.verifiedStatus ?? 'none',
    avatarUrl: u.avatarUrl ?? null, avatarVideo: u.avatarVideo ?? null,
  }
}

export function notifyCrosspostSkipped(toast: Toast, created: unknown) {
  const crossposts = (created as CreatePostData | null | undefined)?.crossposts
  const pickax = crossposts?.pickax ?? (created as CreatePostData | null | undefined)?.pickax
  if (pickax?.status === 'skipped') {
    toast.push({ title: crosspostSkipMessage('Pickax', pickax.reason), durationMs: 3500 })
  }
  if (crossposts?.x?.status === 'skipped') {
    toast.push({ title: crosspostSkipMessage('X', crossposts.x.reason), durationMs: 3500 })
  }
}

export function unwrapCreated(created: unknown): { post: FeedPost | null; streakReward: PostStreakReward | null } {
  const wrapped = created as CreatePostData | null | undefined
  const post = (wrapped?.post ?? (created as FeedPost | null | undefined)) ?? null
  const streakReward = wrapped?.streakReward ?? null
  return { post: post && (post as FeedPost).id ? (post as FeedPost) : null, streakReward }
}

/** Fields the submit guard reads; matches the composer submit options. */
export type SubmitPreconditionOpts = {
  isAuthed: { value: boolean }
  me: () => Promise<unknown>
  canPost: { value: boolean }
  mode: { value: string }
  scheduledEditId: { value: string | null | undefined }
  draft: { value: string }
  composerMedia: { value: unknown[] }
  hasPoll: { value: boolean }
  poll: { value: ComposerPollPayload | null }
  postCharCount: { value: number }
  postMaxLen: { value: number }
  composerUploading: { value: boolean }
  composerHasFailedMedia: { value: boolean }
  pollUploading: { value: boolean }
  pollHasFailed: { value: boolean }
}

/** Validates a submit attempt; surfaces the user-facing reason (toast) when it fails. */
export async function submitPreconditionsMet(opts: SubmitPreconditionOpts, toast: Toast): Promise<boolean> {
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
    return false
  }
  if (opts.mode.value === 'edit' && !opts.scheduledEditId.value) {
    if (!opts.draft.value.trim()) return false
  } else {
    if (!(opts.draft.value.trim() || opts.composerMedia.value.length || opts.hasPoll.value)) return false
  }
  if (opts.postCharCount.value > opts.postMaxLen.value) return false
  if (opts.composerUploading.value) return false
  if (opts.composerHasFailedMedia.value) return false
  if (opts.pollUploading.value) return false
  if (opts.pollHasFailed.value) return false
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
      return false
    }
  }
  return true
}

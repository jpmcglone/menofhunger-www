import { crosspostOptions, xContainsLink, type CrosspostDraft } from '~/utils/crosspost'
import type { ComposerMediaItem, CreateMediaPayload } from './types'
import type { CrosspostDestinationView } from '~/components/app/post/CrosspostDestinations.vue'
import type { usePickaxIntegration } from '~/composables/usePickaxIntegration'
import type { useXIntegration } from '~/composables/useXIntegration'

/** Crosspost destination row (Pickax or X) for the composer preview; null when not connected. */
export function crosspostDestinationRow(args: {
  id: 'pickax' | 'x'
  pickaxIntegration: ReturnType<typeof usePickaxIntegration>
  xIntegration: ReturnType<typeof useXIntegration>
  viewerIsVerified: boolean
  scheduled: boolean
  draft: CrosspostDraft
}): CrosspostDestinationView | null {
  const { id, pickaxIntegration, xIntegration, viewerIsVerified, scheduled, draft } = args
  const connected = id === 'pickax' ? pickaxIntegration.connected.value : xIntegration.connected.value
  if (!connected) return null
  if (!viewerIsVerified) return { id, modes: [], disabled: true, disabledNote: 'Verify your MOH account to share outward', premiumHref: '/settings/verification' }
  if (id === 'x' && xIntegration.status.value?.connected && !xIntegration.status.value.canPost) {
    return { id, modes: [], disabled: true, disabledNote: 'Verify your MOH account to post to X', premiumHref: '/settings/verification' }
  }
  const options = crosspostOptions(draft, id, xIntegration.status.value?.linksEnabled === true, xIntegration.status.value?.capabilities)
  const modes = options.modes
  let allowanceNote: string | undefined
  if (id === 'x' && xIntegration.status.value?.allowance) {
    const allowance = xIntegration.status.value.allowance
    const hasLink = xContainsLink(draft.body)
    const remaining = hasLink ? allowance.linkPostsLeft : allowance.nativePostsLeft
    allowanceNote = hasLink ? 'Estimated $0.20 · Uses your shared high-cost allowance' : `${remaining} posts left this month`
    if (scheduled) allowanceNote += ' · Checked again at publishing'
    else if (remaining <= 0) return {
      id, modes: [], disabled: true, allowanceNote, disabledNote: "You've used this month's X posts.",
    }
  }
  if (!modes.length) return { id, modes, disabled: true, disabledNote: options.blockedReason, allowanceNote }
  return { id, modes, linkOnlyReason: options.linkOnlyReason, allowanceNote }
}

type DraftSource = {
  effectiveVisibility: { value: CrosspostDraft['visibility'] }
  draft: { value: string }
  composerMedia: { value: ComposerMediaItem[] }
  hasPoll: { value: boolean }
  replyTo: { value: unknown }
  quotedPost: { value: unknown }
  checkinPrompt: { value: unknown }
  effectiveGroupId: { value: string | null }
  scheduledAt: { value: unknown }
}

function mediaAllImages(opts: DraftSource, media: CreateMediaPayload[]): boolean {
  return media.every((m) => {
    if (m.source !== 'existing') return m.source === 'upload' && m.kind === 'image'
    const existing = opts.composerMedia.value.find((item) => item.existingId === m.id)
    return existing?.source === 'upload' && existing.kind === 'image'
  })
}

/** Snapshot of the composer state that crosspost rules depend on. */
export function buildCrosspostDraft(opts: DraftSource, media: CreateMediaPayload[]): CrosspostDraft {
  return {
    visibility: opts.effectiveVisibility.value,
    body: opts.draft.value,
    mediaCount: media.length,
    mediaAllUploadedImages: mediaAllImages(opts, media),
    hasPoll: opts.hasPoll.value,
    isReply: Boolean(opts.replyTo.value),
    isQuote: Boolean(opts.quotedPost.value),
    isCheckin: Boolean(opts.checkinPrompt.value),
    groupId: opts.effectiveGroupId.value,
    scheduled: Boolean(opts.scheduledAt.value),
  }
}

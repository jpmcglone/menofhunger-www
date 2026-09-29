/**
 * Mirrors the API's Pickax eligibility (`postCrosspostBlocker`) so the composer only offers the
 * choice when Pickax can actually take the post — and only sends `crossPostToPickax` when the
 * author turned it on.
 */
export type PickaxCrosspostDraft = {
  connected: boolean
  visibility: string
  body: string
  mediaCount: number
  mediaAllUploadedImages: boolean
  hasPoll: boolean
  isReply: boolean
  isQuote: boolean
  isCheckin: boolean
  groupId?: string | null
  scheduled: boolean
}

export const PICKAX_POST_MAX_LENGTH = 1000

export function pickaxCrosspostEligible(draft: PickaxCrosspostDraft): boolean {
  if (!draft.connected) return false
  if (draft.isReply || draft.isQuote || draft.isCheckin) return false
  if (draft.groupId || draft.scheduled || draft.hasPoll) return false
  if (draft.visibility !== 'public') return false
  const text = draft.body.trim()
  if (!text && draft.mediaCount === 0) return false
  if (text.length > PICKAX_POST_MAX_LENGTH) return false
  return draft.mediaAllUploadedImages
}

/** The flag sent to `POST /posts`: on only when the post qualifies and the author opted in. */
export function pickaxCrosspostWanted(draft: PickaxCrosspostDraft, toggleOn: boolean): boolean {
  return toggleOn && pickaxCrosspostEligible(draft)
}

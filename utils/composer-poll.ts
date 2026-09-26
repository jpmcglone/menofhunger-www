type PollDraft = { options: Array<{ text?: string | null; image?: unknown | null }> } | null | undefined

/** A poll needs two options with text or an image before the post can publish. */
export function pollIsIncomplete(poll: PollDraft): boolean {
  if (!poll) return false
  const filled = poll.options.filter(o => Boolean(o.text?.trim()) || Boolean(o.image)).length
  return filled < 2
}

import { buildOptimisticPost } from '~/utils/optimistic-post'
import { easternDateKey } from '~/utils/eastern-time'
import type { FeedPost } from '~/types/api'

/** Use the published row's data shape, including its check-in prompt context. */
export function buildPostPreview(
  input: Parameters<typeof buildOptimisticPost>[0] & { checkinPrompt?: string },
): FeedPost {
  const post = buildOptimisticPost(input)
  return {
    ...post,
    ...(input.checkinPrompt ? {
      kind: 'checkin' as const,
      checkinPrompt: input.checkinPrompt,
      checkinDayKey: easternDateKey(new Date(post.createdAt)),
    } : {}),
    _localId: undefined,
    _pending: null,
    _pendingError: null,
    viewerCount: 1,
    totalViewCount: 1,
  }
}

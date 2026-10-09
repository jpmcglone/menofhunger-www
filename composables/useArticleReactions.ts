import { ref, watch, type Ref } from 'vue'
import type { ArticleReactionSummary } from '~/types/api'
import { useApiClient } from '~/composables/useApiClient'
import { useAsyncAction } from '~/composables/useAsyncAction'

export function useArticleReactions(
  entityType: 'article' | 'comment',
  entityId: Ref<string>,
  initialReactions: Ref<ArticleReactionSummary[]>,
) {
  const { apiFetchData } = useApiClient()
  const { run } = useAsyncAction()

  const reactions = ref<ArticleReactionSummary[]>(JSON.parse(JSON.stringify(initialReactions.value)))
  const pendingEntities = new Set<string>()

  watch(initialReactions, (v) => { reactions.value = JSON.parse(JSON.stringify(v)) }, { deep: true })

  function basePath() {
    if (entityType === 'article') return `/articles/${entityId.value}/reactions`
    return `/articles/comments/${entityId.value}/reactions`
  }

  async function toggle(reactionId: string, emoji: string) {
    const path = basePath()
    if (pendingEntities.has(path)) return
    pendingEntities.add(path)
    const previous = reactions.value
    const existing = previous.find((r) => r.reactionId === reactionId)
    const viewerHasReacted = existing?.viewerHasReacted ?? false

    if (viewerHasReacted) {
      reactions.value = previous
        .map((r) => r.reactionId === reactionId
          ? { ...r, count: Math.max(0, r.count - 1), viewerHasReacted: false }
          : r)
        .filter((r) => r.count > 0)
    } else if (existing) {
      reactions.value = previous.map((r) => r.reactionId === reactionId
        ? { ...r, count: r.count + 1, viewerHasReacted: true }
        : r)
    } else {
      reactions.value = [...previous, { reactionId, emoji, count: 1, viewerHasReacted: true }]
    }
    const optimistic = reactions.value

    try {
      await run(() => viewerHasReacted
        ? apiFetchData(`${path}/${reactionId}`, { method: 'DELETE' })
        : apiFetchData(path, { method: 'POST', body: { reactionId } }), {
        error: 'Something went wrong.',
        rollback: () => {
          // Preserve a fresh server snapshot or a newly opened article/comment.
          if (basePath() === path && reactions.value === optimistic) reactions.value = previous
        },
      })
    } finally {
      pendingEntities.delete(path)
    }
  }

  return { reactions, toggle }
}

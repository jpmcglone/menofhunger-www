import type { ArticleReactionSummary } from '~/types/api'

export function useArticleReactions(
  entityType: 'article' | 'comment',
  entityId: Ref<string>,
  initialReactions: Ref<ArticleReactionSummary[]>,
) {
  const { apiFetchData } = useApiClient()
  const toast = useAppToast()

  const reactions = ref<ArticleReactionSummary[]>(JSON.parse(JSON.stringify(initialReactions.value)))

  watch(initialReactions, (v) => { reactions.value = JSON.parse(JSON.stringify(v)) }, { deep: true })

  function basePath() {
    if (entityType === 'article') return `/articles/${entityId.value}/reactions`
    return `/articles/comments/${entityId.value}/reactions`
  }

  async function toggle(reactionId: string, emoji: string) {
    const existing = reactions.value.find((r) => r.reactionId === reactionId)
    const viewerHasReacted = existing?.viewerHasReacted ?? false

    if (viewerHasReacted) {
      if (existing) {
        existing.count = Math.max(0, existing.count - 1)
        existing.viewerHasReacted = false
        if (existing.count === 0) reactions.value = reactions.value.filter((r) => r.reactionId !== reactionId)
      }
      try {
        await apiFetchData(`${basePath()}/${reactionId}`, { method: 'DELETE' })
      } catch (e: any) {
        if (existing) { existing.count += 1; existing.viewerHasReacted = true }
        else reactions.value.push({ reactionId, emoji, count: 1, viewerHasReacted: true })
        toast.push({ title: e?.data?.meta?.errors?.[0]?.message ?? 'Something went wrong.', tone: 'error' })
      }
    } else {
      if (existing) {
        existing.count += 1
        existing.viewerHasReacted = true
      } else {
        reactions.value.push({ reactionId, emoji, count: 1, viewerHasReacted: true })
      }
      try {
        await apiFetchData(basePath(), { method: 'POST', body: { reactionId } })
      } catch (e: any) {
        if (existing) { existing.count = Math.max(0, existing.count - 1); existing.viewerHasReacted = false }
        else reactions.value = reactions.value.filter((r) => r.reactionId !== reactionId)
        toast.push({ title: e?.data?.meta?.errors?.[0]?.message ?? 'Something went wrong.', tone: 'error' })
      }
    }
  }

  return { reactions, toggle }
}

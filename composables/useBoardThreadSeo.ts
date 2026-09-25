import type { Ref } from 'vue'
import type { BoardComment, BoardThread } from '~/types/api'

function trimText(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

/**
 * Share metadata for Board threads and comment permalinks. Gated threads expose only the
 * trimmed teaser title, scope, and counts; they are never indexed.
 */
export function useBoardThreadSeo(thread: Ref<BoardThread | null | undefined>, comment?: Ref<BoardComment | null | undefined>) {
  const scopeLabel = computed(() => (thread.value?.visibility === 'premiumOnly' ? 'Premium' : 'Verified'))
  const gated = computed(() => Boolean(thread.value && !thread.value.viewerCanAccess))
  const restricted = computed(() => Boolean(thread.value && thread.value.visibility !== 'public'))

  usePageSeo({
    title: computed(() => {
      const t = thread.value
      if (!t) return 'Board'
      if (comment?.value && !gated.value) return `${comment.value.author.username ?? 'Comment'} on “${trimText(t.title, 60)}”`
      return t.title
    }),
    description: computed(() => {
      const t = thread.value
      if (!t) return 'A plain, tag-based message board on Men of Hunger.'
      const count = `${t.commentCount} ${t.commentCount === 1 ? 'comment' : 'comments'}`
      if (gated.value || restricted.value) return `${scopeLabel.value} discussion on the Men of Hunger Board · ${count}. Join to read.`
      if (comment?.value?.body) return trimText(comment.value.body, 200)
      if (t.body) return trimText(t.body, 200)
      return `${t.domain ? `${t.domain} · ` : ''}${t.points} points · ${count} on the Men of Hunger Board.`
    }),
    image: computed(() => (thread.value && !restricted.value && thread.value.image?.url ? thread.value.image.url : undefined)),
    imageAlt: computed(() => (restricted.value ? `${scopeLabel.value} discussion on the Board` : undefined)),
    ogType: 'article',
    noindex: computed(() => restricted.value),
  })
}

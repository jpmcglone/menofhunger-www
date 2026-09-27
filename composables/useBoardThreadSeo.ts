import type { Ref } from 'vue'
import type { BoardComment, BoardThread } from '~/types/api'
import { getYouTubePosterUrls } from '~/utils/link-utils'

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
  const { apiFetchData } = useApiClient()
  const { data: linkMeta } = useAsyncData(
    () => `board-seo:${thread.value?.id ?? 'none'}:${thread.value?.url ?? ''}`,
    async () => {
      const t = thread.value
      if (!t?.url || !t.viewerCanAccess || t.visibility !== 'public' || t.image?.url || getYouTubePosterUrls(t.url)) return null
      try {
        return await apiFetchData<{ imageUrl?: string | null; title?: string | null; description?: string | null; siteName?: string | null } | null>('/link-metadata', {
          method: 'GET',
          query: { url: t.url },
          timeout: 3000,
        })
      } catch {
        return null
      }
    },
    { watch: [() => thread.value?.id, () => thread.value?.url] },
  )

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
      if (linkMeta.value?.description) return trimText(linkMeta.value.description, 200)
      const site = linkMeta.value?.siteName || t.domain
      return `${site ? `${site} · ` : ''}${t.points} points · ${count} on the Men of Hunger Board.`
    }),
    image: computed(() => {
      const t = thread.value
      if (!t || restricted.value || gated.value) return undefined
      if (t.image?.url) return t.image.url
      const poster = t.url ? getYouTubePosterUrls(t.url)?.fallback : undefined
      return poster || linkMeta.value?.imageUrl || undefined
    }),
    imageAlt: computed(() => (restricted.value ? `${scopeLabel.value} discussion on the Board` : undefined)),
    ogType: 'article',
    noindex: computed(() => restricted.value),
  })
}

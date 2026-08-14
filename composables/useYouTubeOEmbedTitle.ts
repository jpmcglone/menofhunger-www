import { youtubeOEmbedRequestUrl } from '~/utils/link-utils'

/** Best-effort YouTube title via the public oEmbed endpoint. Client-only. */
export function useYouTubeOEmbedTitle(url: MaybeRefOrGetter<string | null | undefined>) {
  const title = ref<string | null>(null)

  watch(
    () => toValue(url)?.trim() || null,
    (watchUrl, _prev, onCleanup) => {
      title.value = null
      if (!watchUrl || !import.meta.client) return
      const endpoint = youtubeOEmbedRequestUrl(watchUrl)
      if (!endpoint) return

      let cancelled = false
      onCleanup(() => {
        cancelled = true
      })

      fetch(endpoint)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (cancelled || !json) return
          const next = typeof json.title === 'string' ? json.title.trim() : ''
          if (next) title.value = next
        })
        .catch(() => {
          /* best-effort */
        })
    },
    { immediate: true },
  )

  return title
}

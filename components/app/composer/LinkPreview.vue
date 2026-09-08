<template>
  <div
    v-if="target"
    class="flex items-start gap-3 rounded-xl border moh-border moh-surface-2 p-3 text-left"
    role="group"
    aria-label="Link preview"
    data-testid="composer-link-preview"
  >
    <img
      v-if="imageUrl && !imageFailed"
      :src="imageUrl"
      alt=""
      class="h-16 w-[88px] shrink-0 rounded-lg object-cover"
      draggable="false"
      @error="imageFailed = true"
    >
    <div class="min-w-0 flex-1">
      <div class="line-clamp-2 break-words text-sm font-semibold leading-5 moh-text">{{ title }}</div>
      <div class="mt-1 truncate text-xs leading-4 moh-text-muted">{{ site }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArticleSharePreview, GetPostData } from '~/types/api'
import type { LinkMetadata } from '~/utils/link-metadata'
import { composerLinkHost, composerLinkTarget } from '~/utils/composer-link-preview'
import { getYouTubePosterUrls } from '~/utils/link-utils'

const props = defineProps<{ text: string }>()
const { apiFetchData } = useApiClient()
const target = computed(() => composerLinkTarget(props.text))
type Preview = { title: string, site: string, imageUrl: string | null }
const resolved = ref<Preview | null>(null)
const imageFailed = ref(false)
const youtubePoster = computed(() => target.value ? getYouTubePosterUrls(target.value.url)?.fallback : null)
const title = computed(() => resolved.value?.title || (youtubePoster.value ? 'YouTube video' : target.value?.postId ? 'Men of Hunger post' : target.value?.internal ? 'Men of Hunger' : composerLinkHost(target.value?.url ?? '')))
const site = computed(() => resolved.value?.site || (youtubePoster.value ? 'YouTube' : composerLinkHost(target.value?.url ?? '')))
const imageUrl = computed(() => resolved.value?.imageUrl || youtubePoster.value || null)
watch(imageUrl, () => { imageFailed.value = false })

watch(() => target.value?.url, (_url, _old, onCleanup) => {
  resolved.value = null
  imageFailed.value = false
  const link = target.value
  if (!link || !import.meta.client) return
  const abort = new AbortController()
  // Wait for typing to settle; stale results must never replace a newer draft's preview.
  const timer = setTimeout(async () => {
    try {
      let preview: Preview | null = null
      if (link.postId) {
        const post = await apiFetchData<GetPostData>(`/posts/${encodeURIComponent(link.postId)}`, { signal: abort.signal })
        const media = post.media?.[0]
        preview = { title: post.body || 'Men of Hunger post', site: `Men of Hunger · @${post.author.username}`, imageUrl: media?.thumbnailUrl || (media?.kind === 'image' ? media.url : null) }
      } else if (link.articleId) {
        const article = await apiFetchData<ArticleSharePreview>(`/articles/${encodeURIComponent(link.articleId)}`, { signal: abort.signal })
        preview = { title: article.title, site: 'Men of Hunger', imageUrl: article.thumbnailUrl }
      } else {
        const meta = await apiFetchData<LinkMetadata | null>('/link-metadata', { query: { url: link.url, v: 3 }, signal: abort.signal, mohDedupe: true })
        if (meta) preview = { title: meta.title || composerLinkHost(link.url), site: meta.siteName || composerLinkHost(link.url), imageUrl: meta.videoEmbed?.thumbnailUrl || meta.imageUrl }
      }
      if (!abort.signal.aborted) resolved.value = preview
    } catch {
      // The URL/host preview stays useful when metadata is unavailable or access is denied.
    }
  }, 350)
  onCleanup(() => { clearTimeout(timer); abort.abort() })
}, { immediate: true })
</script>

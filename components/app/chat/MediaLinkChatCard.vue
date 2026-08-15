<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="group mt-2 block w-full max-w-full overflow-hidden rounded-lg border border-current/20 bg-black"
    :aria-label="ariaLabel"
    @click.stop
  >
    <div class="relative aspect-video w-full overflow-hidden" aria-hidden="true">
      <img
        v-if="posterSrc"
        :src="posterSrc"
        alt=""
        class="absolute inset-0 h-full w-full object-cover moh-img-outline"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
        @error="onPosterError"
      >
      <div v-if="kind === 'video'" class="absolute inset-0 flex items-center justify-center">
        <div class="rounded-full bg-black/60 p-2.5">
          <Icon
            name="tabler:player-play-filled"
            class="translate-x-px text-lg text-white"
            aria-hidden="true"
          />
        </div>
      </div>
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-8">
        <div
          v-if="title"
          class="line-clamp-2 text-pretty text-[12px] font-semibold leading-4 text-white"
        >
          {{ title }}
        </div>
        <div class="text-[10px] text-white/70" :class="title ? 'mt-0.5' : ''">
          {{ authorName ? `${authorName} · ${provider}` : provider }}
        </div>
      </div>
    </div>
  </a>
</template>

<script setup lang="ts">
import { getLinkMetadata } from '~/utils/link-metadata'
import {
  getYouTubePosterUrls,
  parseMediaPreviewUrl,
  vimeoOEmbedRequestUrl,
  youtubeOEmbedRequestUrl,
} from '~/utils/link-utils'

const props = defineProps<{
  href: string
  /** Viewport latch — skip remote fetches until the row has been near the screen. */
  enabled?: boolean
}>()

const preview = computed(() => parseMediaPreviewUrl(props.href))
const kind = computed(() => preview.value?.kind ?? 'video')
const provider = computed(() => preview.value?.provider ?? 'Link')

const youtubePosters = computed(() => getYouTubePosterUrls(props.href))
const usingMaxres = ref(true)
const remotePoster = ref<string | null>(null)
const posterFailed = ref(false)

const posterSrc = computed(() => {
  if (posterFailed.value) return null
  if (youtubePosters.value) {
    return usingMaxres.value ? youtubePosters.value.maxres : youtubePosters.value.fallback
  }
  if (remotePoster.value) return remotePoster.value
  if (kind.value === 'image') return props.href
  return null
})

function onPosterError() {
  if (youtubePosters.value && usingMaxres.value) {
    usingMaxres.value = false
    return
  }
  posterFailed.value = true
}

const title = ref<string | null>(null)
const authorName = ref<string | null>(null)

const ariaLabel = computed(() => {
  if (kind.value === 'image') {
    return title.value ? `View ${title.value}` : `View on ${provider.value}`
  }
  return title.value ? `Watch ${title.value} on ${provider.value}` : `Watch on ${provider.value}`
})

function resetMeta() {
  usingMaxres.value = true
  remotePoster.value = null
  posterFailed.value = false
  title.value = null
  authorName.value = null
}

watch(
  [() => props.href, () => props.enabled],
  ([href, enabled], _prev, onCleanup) => {
    resetMeta()
    if (!import.meta.client || !enabled || !href) return

    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })

    const youtubeEndpoint = youtubeOEmbedRequestUrl(href)
    if (youtubeEndpoint) {
      fetch(youtubeEndpoint)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (cancelled || !json) return
          const nextTitle = typeof json.title === 'string' ? json.title.trim() : ''
          const nextAuthor = typeof json.author_name === 'string' ? json.author_name.trim() : ''
          if (nextTitle) title.value = nextTitle
          if (nextAuthor) authorName.value = nextAuthor
        })
        .catch(() => {
          /* best-effort */
        })
      return
    }

    const vimeoEndpoint = vimeoOEmbedRequestUrl(href)
    if (vimeoEndpoint) {
      fetch(vimeoEndpoint)
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (cancelled || !json) return
          const nextTitle = typeof json.title === 'string' ? json.title.trim() : ''
          const nextAuthor = typeof json.author_name === 'string' ? json.author_name.trim() : ''
          const thumb = typeof json.thumbnail_url === 'string' ? json.thumbnail_url.trim() : ''
          if (nextTitle) title.value = nextTitle
          if (nextAuthor) authorName.value = nextAuthor
          if (thumb) remotePoster.value = thumb
        })
        .catch(() => {
          /* best-effort */
        })
      return
    }

    try {
      if (kind.value === 'image' && /\.(?:jpe?g|png|gif|webp|avif)$/i.test(new URL(href).pathname)) {
        return
      }
    } catch {
      return
    }

    void getLinkMetadata(href)
      .then((meta) => {
        if (cancelled || !meta) return
        const nextTitle = (meta.title ?? '').trim()
        const nextAuthor = (meta.siteName ?? '').trim()
        const thumb = (meta.videoEmbed?.thumbnailUrl ?? meta.imageUrl ?? '').trim()
        if (nextTitle) title.value = nextTitle
        if (nextAuthor && nextAuthor.toLowerCase() !== provider.value.toLowerCase()) {
          authorName.value = nextAuthor
        }
        if (thumb) remotePoster.value = thumb
      })
      .catch(() => {
        /* best-effort */
      })
  },
  { immediate: true },
)
</script>

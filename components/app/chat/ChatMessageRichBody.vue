<template>
  <div class="min-w-0">
    <p class="whitespace-pre-wrap break-words">
      <template v-for="(seg, idx) in displayBodySegments" :key="idx">
        <a
          v-if="seg.href"
          :href="seg.href"
          target="_blank"
          rel="noopener noreferrer"
          class="underline decoration-current/35 underline-offset-2 hover:decoration-current"
          @click.stop
        >
          {{ seg.text }}
        </a>
        <span v-else>{{ seg.text }}</span>
      </template>
    </p>

    <a
      v-if="showLinkPreview"
      :href="previewLink || undefined"
      target="_blank"
      rel="noopener noreferrer"
      class="group mt-2 block overflow-hidden rounded-lg border border-current/20 bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
      aria-label="Open link"
      @click.stop
    >
      <div class="flex gap-2.5 p-2">
        <div
          v-if="linkMeta?.imageUrl"
          class="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black/10 dark:bg-white/10"
          aria-hidden="true"
        >
          <img :src="linkMeta.imageUrl" class="h-full w-full object-cover" alt="" loading="lazy">
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[12px] font-semibold">
            {{ linkMeta?.title || previewLinkHost || 'Link' }}
          </div>
          <div v-if="linkMeta?.description" class="truncate text-[11px] opacity-80">
            {{ linkMeta.description }}
          </div>
          <div class="truncate text-[10px] opacity-70">
            {{ previewLinkDisplay }}
          </div>
        </div>
        <div class="shrink-0 opacity-60" aria-hidden="true">
          <Icon name="tabler:external-link" class="text-[11px]" aria-hidden="true" />
        </div>
      </div>
    </a>
  </div>
</template>

<script setup lang="ts">
import LinkifyIt from 'linkify-it'
import { extractLinksFromText, safeUrlDisplay, safeUrlHostname } from '~/utils/link-utils'
import type { LinkMetadata } from '~/utils/link-metadata'
import { getLinkMetadata } from '~/utils/link-metadata'

type TextSegment = { text: string; href?: string }

const props = defineProps<{
  body: string
}>()

const linkify = new LinkifyIt()

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const capturedLinks = computed(() => extractLinksFromText((props.body ?? '').toString()))

const previewLink = computed(() => {
  const xs = capturedLinks.value
  return xs.length ? xs[xs.length - 1] ?? null : null
})

const displayBody = computed(() => {
  const input = (props.body ?? '').toString()
  const last = (previewLink.value ?? '').trim()
  if (!last) return input
  const re = new RegExp(String.raw`(?:\s*)${escapeRegExp(last)}\s*$`)
  if (!re.test(input)) return input
  return input.replace(re, '').replace(/\s+$/, '')
})

const showLinkPreview = computed(() => Boolean(previewLink.value))
const previewLinkHost = computed(() => (previewLink.value ? safeUrlHostname(previewLink.value) : null))
const previewLinkDisplay = computed(() => (previewLink.value ? safeUrlDisplay(previewLink.value) : ''))

const displayBodySegments = computed<TextSegment[]>(() => {
  const input = (displayBody.value ?? '').toString()
  if (!input) return [{ text: '' }]

  const matches = linkify.match(input) ?? []
  if (!matches.length) return [{ text: input }]

  const out: TextSegment[] = []
  let cursor = 0

  for (const m of matches) {
    const start = typeof (m as any).index === 'number' ? ((m as any).index as number) : -1
    const end = typeof (m as any).lastIndex === 'number' ? ((m as any).lastIndex as number) : -1
    if (start < 0 || end < 0 || end <= start) continue
    if (start > cursor) out.push({ text: input.slice(cursor, start) })

    const text = input.slice(start, end)
    const href = (m.url ?? '').trim()
    if (href && /^https?:\/\//i.test(href)) out.push({ text, href })
    else out.push({ text })
    cursor = end
  }

  if (cursor < input.length) out.push({ text: input.slice(cursor) })
  return out.length ? out : [{ text: input }]
})

const linkMeta = ref<LinkMetadata | null>(null)
watch(
  previewLink,
  async (url) => {
    linkMeta.value = null
    if (!import.meta.client) return
    if (!url) return
    linkMeta.value = await getLinkMetadata(url)
  },
  { immediate: true },
)
</script>

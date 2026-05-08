<template>
  <span class="whitespace-pre-wrap break-words">
    <template v-for="(seg, idx) in segments" :key="idx">
      <a
        v-if="seg.href"
        :href="seg.href"
        target="_blank"
        rel="noopener noreferrer"
        class="underline decoration-gray-300 underline-offset-2 hover:decoration-gray-500 dark:decoration-zinc-700 dark:hover:decoration-zinc-500"
        @click.stop
      >{{ seg.text }}</a>
      <NuxtLink
        v-else-if="seg.username"
        :to="`/u/${encodeURIComponent(seg.username)}`"
        class="font-semibold no-underline hover:underline"
        :style="tierStyle(seg.username)"
        @click.stop
        @mouseenter="(e) => onEnter(seg.username!, e)"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >{{ seg.text }}</NuxtLink>
      <span v-else>{{ seg.text }}</span>
    </template>
  </span>
</template>

<script setup lang="ts">
import LinkifyIt from 'linkify-it'
import { splitTextByMentionsDisplay } from '~/utils/mention-autocomplete'
import { mentionTierToStyle } from '~/utils/mention-tier-style'
import { tierFromMentionUser } from '~/composables/useMentionAutocomplete'
import type { UserColorTier } from '~/utils/user-tier'
import type { UserPreviewBatchEntry } from '~/types/api'

const props = defineProps<{ text: string }>()

const { onEnter, onMove, onLeave } = useUserPreviewMultiTrigger()

type Segment = { text: string; href?: string; username?: string }

const linkify = new LinkifyIt()

// Map from lowercase username → resolved tier (populated async after mount).
const tierMap = ref<Map<string, UserColorTier>>(new Map())

// Extract unique @usernames from the bio text.
const mentionedUsernames = computed<string[]>(() => {
  const segs = splitTextByMentionsDisplay(props.text ?? '')
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of segs) {
    if (!s.mention) continue
    const lower = s.mention.usernameLower
    if (!seen.has(lower)) {
      seen.add(lower)
      out.push(lower)
    }
  }
  return out
})

// Batch-fetch tier info for all @mentioned usernames.
const { apiFetchData } = useApiClient()
async function fetchTiers(usernames: string[]) {
  if (!usernames.length) return
  try {
    const res = await apiFetchData<{ results: UserPreviewBatchEntry[] }>(
      '/users/preview/batch',
      { method: 'POST', body: { usernames } },
    )
    const results = res?.results ?? []
    const next = new Map(tierMap.value)
    for (const entry of results) {
      const key = (entry.username ?? '').toLowerCase().trim()
      if (!key || !entry.id) continue
      next.set(key, tierFromMentionUser(entry))
    }
    tierMap.value = next
  } catch {
    // Non-critical — mentions just render without tier color on failure.
  }
}

watch(
  mentionedUsernames,
  (usernames) => { fetchTiers(usernames) },
  { immediate: true },
)

function tierStyle(username: string | undefined) {
  if (!username) return undefined
  const tier = tierMap.value.get(username.toLowerCase())
  return mentionTierToStyle(tier)
}

const segments = computed<Segment[]>(() => {
  const text = (props.text ?? '').toString()
  if (!text) return []

  const urlMatches = linkify.match(text) ?? []
  if (!urlMatches.length) return buildMentionSegments(text)

  const out: Segment[] = []
  let cursor = 0
  for (const m of urlMatches) {
    const start = (m as any).index as number
    const end = (m as any).lastIndex as number
    if (start > cursor) out.push(...buildMentionSegments(text.slice(cursor, start)))
    const href = (m.url ?? '').trim()
    if (href && /^https?:\/\//i.test(href)) {
      out.push({ text: text.slice(start, end), href })
    } else {
      out.push(...buildMentionSegments(text.slice(start, end)))
    }
    cursor = end
  }
  if (cursor < text.length) out.push(...buildMentionSegments(text.slice(cursor)))
  return out.length ? out : [{ text }]
})

function buildMentionSegments(text: string): Segment[] {
  return splitTextByMentionsDisplay(text).map((s) =>
    s.mention ? { text: s.text, username: s.mention.username } : { text: s.text },
  )
}
</script>

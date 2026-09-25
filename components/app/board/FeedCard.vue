<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=890-4579 -->
<template>
  <NuxtLink
    :to="href"
    class="mt-2 block rounded-xl border p-3 transition-colors hover:bg-[var(--moh-surface-hover)]"
    :style="{ borderColor: tone ? `var(--moh-${tone})` : 'var(--moh-border)' }"
    data-post-row-interactive
  >
    <div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide moh-text-soft">
      <Icon name="tabler:layout-list" class="text-xs" aria-hidden="true" />
      <span>{{ isComment ? 'Board comment' : 'Board' }}</span>
      <span v-if="board?.domain" class="normal-case font-normal tracking-normal">· {{ board.domain }}</span>
    </div>

    <template v-if="board">
      <p class="mt-1 flex items-start gap-1.5 text-[15px] font-semibold leading-snug moh-text break-words">
        <Icon v-if="!canAccess" name="tabler:lock" class="mt-0.5 shrink-0 text-sm moh-text-muted" aria-hidden="true" />
        {{ board.title }}
      </p>
      <p v-if="canAccess && excerpt" class="mt-1 line-clamp-3 text-sm moh-text-muted whitespace-pre-wrap">{{ excerpt }}</p>
      <img
        v-if="canAccess && imageUrl"
        :src="imageUrl"
        alt=""
        class="mt-2 max-h-72 w-full rounded-lg object-cover"
        loading="lazy"
      >
      <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs moh-text-soft">
        <span
          v-for="tag in board.tags"
          :key="tag"
          class="rounded-full border moh-border px-2 py-px text-[11px] moh-text-muted"
        >{{ tag }}</span>
        <span>{{ post.boostCount }} {{ post.boostCount === 1 ? 'point' : 'points' }} · {{ post.commentCount ?? 0 }} {{ (post.commentCount ?? 0) === 1 ? 'comment' : 'comments' }}</span>
        <span class="font-semibold" :style="{ color: tone ? `var(--moh-${tone})` : 'var(--moh-verified)' }">{{ canAccess ? 'Join the discussion →' : 'Unlock to read →' }}</span>
      </div>
    </template>
    <p v-else class="mt-1 line-clamp-4 whitespace-pre-wrap text-sm moh-text">{{ post.body }}</p>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { FeedPost } from '~/types/api'

const props = defineProps<{ post: FeedPost; href: string }>()

const board = computed(() => props.post.board ?? null)
const isComment = computed(() => Boolean(props.post.parentId))
const canAccess = computed(() => props.post.viewerCanAccess !== false)
const tone = computed(() => boardScopeTone(props.post.visibility))
const excerpt = computed(() => (props.post.body ?? '').trim())
const imageUrl = computed(() => {
  const media = (props.post.media ?? []).find((m) => !m.deletedAt && m.kind === 'image')
  return media?.thumbnailUrl || media?.url || props.post.article?.thumbnailUrl || null
})
</script>

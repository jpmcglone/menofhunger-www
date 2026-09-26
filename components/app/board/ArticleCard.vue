<template>
  <NuxtLink
    :to="articleHref"
    class="group flex overflow-hidden rounded-xl border moh-border transition-colors moh-surface-hover moh-focus"
  >
    <img
      v-if="thread.image?.url"
      :src="thread.image.thumbnailUrl || thread.image.url"
      :alt="thread.image.alt || ''"
      class="h-auto w-28 shrink-0 object-cover sm:w-40"
      loading="lazy"
    >
    <div class="min-w-0 flex-1 p-3">
      <div class="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide moh-text-soft">
        <Icon name="tabler:article" aria-hidden="true" />
        Article
      </div>
      <p class="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug moh-text group-hover:underline">{{ thread.title }}</p>
      <p class="mt-1 text-xs moh-text-muted">{{ meta }}</p>
      <p class="mt-2 text-xs font-semibold" style="color: var(--moh-verified)">Read and comment →</p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { BoardThread } from '~/types/api'
import { boardArticleMeta, boardThreadOpenHref } from '~/composables/useBoardApi'

const props = defineProps<{ thread: BoardThread }>()

const articleHref = computed(() => boardThreadOpenHref(props.thread))
const meta = computed(() => boardArticleMeta(props.thread))
</script>

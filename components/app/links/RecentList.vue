<template>
  <section aria-labelledby="links-recent-heading">
    <h2 id="links-recent-heading" class="mb-2 px-1 text-sm font-semibold moh-text-muted">Recent on {{ siteName }}</h2>
    <ul class="space-y-2">
      <li v-for="item in items" :key="`${item.kind}:${item.id}`">
        <NuxtLink
          :to="hrefFor(item)"
          class="block rounded-2xl border moh-border bg-[var(--moh-surface)] px-4 py-3 transition-colors hover:bg-[var(--moh-surface-hover)]"
        >
          <template v-if="item.kind === 'article'">
            <span class="block text-[11px] font-semibold uppercase tracking-[0.1em] moh-text-muted">Article</span>
            <span class="mt-1 block text-[15px] font-semibold leading-snug text-gray-900 dark:text-gray-50">{{ item.title || item.excerpt }}</span>
          </template>
          <span v-else class="line-clamp-3 block text-[15px] leading-snug text-gray-900 dark:text-gray-50">{{ item.excerpt }}</span>
          <span class="mt-1.5 block text-sm moh-text-muted">{{ dateLabel(item.createdAt) }}</span>
        </NuxtLink>
      </li>
    </ul>
    <Button
      as="NuxtLink"
      :to="`/u/${encodeURIComponent(username)}`"
      :label="`See all posts by ${firstName}`"
      severity="secondary"
      rounded
      class="mt-3 w-full min-h-11"
    />
  </section>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import type { LinksPageRecentItem } from '~/types/api'
import { formatShortDate } from '~/utils/time-format'

defineProps<{
  items: LinksPageRecentItem[]
  username: string
  firstName: string
}>()

const siteName = siteConfig.name

function hrefFor(item: LinksPageRecentItem): string {
  return `${item.kind === 'article' ? '/a' : '/p'}/${encodeURIComponent(item.id)}`
}

/** Fixed locale and UTC so the server and the browser print the same text. */
function dateLabel(iso: string): string {
  return formatShortDate(iso, { timeZone: 'UTC' })
}
</script>

<!-- Figma: https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=447-7 -->
<template>
  <section v-if="items.length || error || failedIds.length" aria-label="New article activity" class="border-b moh-border">
    <h2 class="moh-gutter-x py-4 text-sm font-semibold moh-text">New activity</h2>
    <div v-for="item in items" :key="articleActivityKey(item)" :ref="el => observe(el, item)" class="relative border-t moh-border bg-[var(--moh-surface)]">
      <NuxtLink :to="articleActivityHref(item)!" class="moh-focus absolute inset-0 z-[1]" :aria-label="item.type === 'single' ? `Open article update: ${item.notification.title || item.notification.body || 'New activity'}` : 'Open article update'" />
      <div class="pointer-events-none relative z-[2] [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <AppNotificationRow v-if="item.type === 'single'" :notification="item.notification" />
      </div>
    </div>
    <div v-if="error || failedIds.length" class="moh-gutter-x py-3" role="alert">
      <p class="text-sm moh-text-muted">{{ error || 'Couldn’t clear these updates from your badge.' }}</p>
      <button class="moh-focus min-h-11 text-sm text-[var(--moh-brass)]" @click="retry">Retry</button>
    </div>
    <button v-if="nextCursor" :disabled="loading" class="moh-focus min-h-11 w-full text-sm moh-text-muted" @click="load(false)">More activity</button>
  </section>
</template>
<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { NotificationFeedItem } from '~/types/api'
import { articleActivityHref, articleActivityKey, useArticleActivity } from '~/composables/useArticleActivity'
const { items, nextCursor, loading, failedIds, error, load, acknowledge, retry } = useArticleActivity()
let observer: IntersectionObserver | undefined
const ids = new Map<Element, string>()
function observe(el: Element | ComponentPublicInstance | null, item: NotificationFeedItem) {
  if (!(el instanceof Element) || item.type !== 'single' || ids.has(el)) return
  ids.set(el, item.notification.id)
  observer?.observe(el)
}
function refreshVisibility() {
  if (document.visibilityState !== 'visible') return
  ids.forEach((_, el) => { observer?.unobserve(el); observer?.observe(el) })
}
onMounted(() => {
  document.addEventListener('visibilitychange', refreshVisibility)
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || document.visibilityState !== 'visible') continue
      const id = ids.get(entry.target)
      if (id) void acknowledge(id)
    }
  }, { threshold: 0.5 })
  ids.forEach((_, el) => observer!.observe(el))
})
onBeforeUnmount(() => { document.removeEventListener('visibilitychange', refreshVisibility); observer?.disconnect(); ids.clear() })
</script>

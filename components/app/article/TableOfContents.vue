<template>
  <nav
    v-if="items.length >= 2"
    class="my-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-800/60"
    aria-label="Table of contents"
  >
    <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500">
      Contents
    </p>
    <ol class="space-y-1">
      <li
        v-for="item in items"
        :key="item.id"
        :class="item.level === 3 ? 'pl-4' : ''"
      >
        <a
          :href="`#${item.id}`"
          class="text-sm text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:underline underline-offset-2 transition-colors"
          @click.prevent="scrollTo(item.id)"
        >
          {{ item.text }}
        </a>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
export type TocItem = {
  id: string
  text: string
  level: 2 | 3
}

const props = defineProps<{
  html: string
}>()

const items = computed<TocItem[]>(() => {
  if (!props.html) return []
  const parser = new DOMParser()
  const doc = parser.parseFromString(props.html, 'text/html')
  const headings = Array.from(doc.querySelectorAll('h2, h3'))
  const seen = new Map<string, number>()
  return headings.map((el) => {
    const text = el.textContent?.trim() ?? ''
    const level = el.tagName === 'H2' ? 2 : 3
    const baseId = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      || `heading-${Math.random().toString(36).slice(2, 7)}`
    const count = seen.get(baseId) ?? 0
    const id = count === 0 ? baseId : `${baseId}-${count}`
    seen.set(baseId, count + 1)
    return { id, text, level: level as 2 | 3 }
  })
})

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

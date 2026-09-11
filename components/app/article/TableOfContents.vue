<template>
  <nav
    v-if="items.length >= 2"
    class="my-6 rounded-xl moh-surface-2 px-3.5 py-3"
    aria-label="Table of contents"
  >
    <p class="mb-1.5 text-[11px] font-semibold moh-text-soft">
      On this page
    </p>
    <ol class="space-y-1">
      <li
        v-for="item in items"
        :key="item.id"
        :class="item.level === 3 ? 'pl-4' : ''"
      >
        <a
          :href="`#${item.id}`"
          class="text-[13px] moh-text-muted hover:text-[var(--moh-text)] hover:underline underline-offset-2 transition-colors"
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

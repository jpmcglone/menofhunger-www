<template>
  <div>
    <div v-if="loading && !threads.length" class="py-10 text-center moh-meta">Searching…</div>
    <div v-else-if="threads.length" class="moh-divide">
      <AppBoardThreadRow v-for="t in threads" :key="t.id" :thread="t" />
    </div>
    <p v-else-if="query.length >= 2" class="px-4 py-10 text-center moh-meta">No Board threads match “{{ query }}”.</p>
    <button
      v-if="nextCursor"
      type="button"
      class="w-full border-t moh-border py-3 text-sm moh-text-muted hover:bg-[var(--moh-surface-hover)]"
      @click="load(false)"
    >Load more</button>
  </div>
</template>

<script setup lang="ts">
import type { BoardThread } from '~/types/api'

const props = defineProps<{ query: string }>()
const api = useBoardApi()
const threads = ref<BoardThread[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(false)
let seq = 0

async function load(reset = true) {
  const q = props.query.trim()
  if (q.length < 2) {
    threads.value = []
    nextCursor.value = null
    return
  }
  const current = ++seq
  loading.value = true
  try {
    const res = await api.listThreads({ q, sort: 'new', cursor: reset ? null : nextCursor.value })
    if (current !== seq) return
    threads.value = reset ? res.threads : [...threads.value, ...res.threads]
    nextCursor.value = res.nextCursor
  } finally {
    if (current === seq) loading.value = false
  }
}

watch(() => props.query, () => { void load(true) })
onMounted(() => { void load(true) })
</script>
